---
name: define-custom-adapter
description: Generate a custom target adapter script — the Python an adapter author submits — that conforms to the adapter SDK contract. Use when creating, scaffolding, or converting a target's API into a custom target adapter for the red-teaming platform.
argument-hint: "<optional: target name or short description>"
---

# Define Custom Target Adapter

This file is the **complete, self-contained contract** for writing a **custom target adapter**:
a single Python script that lets a red-teaming platform talk to *your* AI target. It is
provider-neutral — it works with any AI assistant (Claude, Gemini, GPT/Codex, Cursor, Copilot,
Aider, or a plain chat model).

Follow this contract exactly. The adapter is loaded and run by the platform in a sandboxed
runner via `compile()` + `exec()`; the names listed under "Injected names" are put into the
script's namespace for you — **do not import them**.

## How to use this file

- **As a skill** (Claude Code and similar): run `/define-custom-adapter` to start from scratch,
  or `/define-custom-adapter Acme chat API, OAuth2, POST /chat -> {"reply": ...}` to provide
  details inline; the assistant asks only for what's missing.
- **Agentic coding tools** (Cursor, Copilot, Codex, Gemini CLI, …): keep this file next to
  where you're working so the assistant can read it as context, then ask it to write the
  adapter for your target.
- **Plain chat models** (ChatGPT, Gemini, Claude chat, …): paste this whole file into the chat
  along with your target's API details (endpoint, auth scheme, request/response JSON shape) and
  ask for the adapter script.

Either way, provide at least: the endpoint URL, the auth scheme, and the request/response JSON
shape. If any of those are missing, ask before writing.

---

## What an adapter is

An adapter turns one red-team prompt into a call to your target and returns the target's reply
as text. The platform drives the conversation; the adapter only describes *how to reach this
specific target*.

The script must implement **exactly one** of two request patterns, plus optional auth/session
hooks:

| Function | Pattern | Required? | Purpose |
|---|---|---|---|
| `pre_process(context, inference_input)` | A | Required for A | Build the HTTP request; the platform sends it. |
| `post_process(context, raw_response)` | A | Required for A | Extract the reply from the target's response. |
| `call_target(context, inference_input)` | B | Required for B | Make the call(s) yourself and return the reply. |
| `authenticate(context)` | either | Optional | Log in / fetch a token; cached by the platform. |
| `session_pre_process(context)` | either | Optional | One-time setup on the first turn of a conversation. |

**Choosing a pattern.** If the target is reachable over normal request/response HTTP (even
across several calls), use **Pattern A** — less code, and the platform handles the HTTP call and
error classification for you. Use **Pattern B** only when you need full control of the
transport: WebSocket, GraphQL, an SDK client, streaming, or custom framing. If both are
defined, `call_target` wins and `pre_process`/`post_process` are ignored — ship only one
pattern.

---

## Golden rules (read before writing code)

1. **Implement one pattern only** — `call_target`, OR both `pre_process` and
   `post_process`. Defining just one half of Pattern A is invalid.
2. **Return the declared `*Result` type** — never a bare string or dict. A bare
   return is treated as an adapter error.
3. **Never import the injected names** (`PreProcessResult`, `raise_rate_limited`,
   `context` types, …). They are provided; importing them fails.
4. **Never use module-level / global state to carry data between turns.** The
   script is re-executed fresh every turn, so globals are wiped. Carry state via
   `session_state` (see Multi-turn).
5. **Put all imports at the top** of the script (standard library + bundled
   packages only — see Available packages).
6. **Read secrets from `context.secrets`, never hard-code them.** Config comes
   from `context.vars` (non-secret) and `context.secrets` (secret).
7. **Keep every call bounded** — set explicit timeouts on anything you do outside
   `context.http`, and avoid unbounded loops. The whole call is killed at 110 s.
8. **Signal expected target conditions** (rate limit, auth failure, content
   filter) with the `raise_*` helpers instead of returning them as text.

---

## Injected names (available WITHOUT importing)

```
InferenceInput, PreProcessResult, PostProcessResult, CallTargetResult,
AuthResult, SessionPreProcessResult, RawResponse
raise_rate_limited(), raise_auth_error(), raise_target_error(), raise_content_filtered()
```

For everything else use the Python standard library and `context.http`.

### `context` — passed to every function (read-only; you never construct it)

```python
context.vars      # dict[str, str]  non-secret config you declared (shown in the UI)
context.secrets   # dict[str, str]  secret config you declared (redacted in UI/logs)
context.auth      # dict | None     what authenticate() returned; None if not defined
context.session   # dict | None     what session_pre_process() returned, carried across turns; None if unused
context.http      # httpx.Client    preconfigured HTTP client — use this for HTTP
```

### `inference_input` — passed to `pre_process` and `call_target`

```python
inference_input.prompt             # str | None     this turn's red-team input
inference_input.previous_messages  # list[Message]  prior turns (platform-built, read-only); empty on the first/only turn
# each Message:
#   message.role     # str  "user" or "assistant"
#   message.content  # str  the message text
```

`previous_messages` is built and owned by the platform. You can read it; you
cannot modify it.

### `raw_response` — passed to `post_process` (Pattern A only)

```python
raw_response.status_code   # int
raw_response.headers       # dict[str, str]
raw_response.text          # str                  raw body
raw_response.json_body     # dict | list | None   parsed body, or None if not JSON
```

---

## Return types

Set only the fields you need; the rest have defaults.

```python
PreProcessResult(
    url="https://api.example.com/chat",  # REQUIRED — request URL
    method="POST",                       # optional — default "POST"
    headers={},                          # optional
    json_body=None,                      # optional — JSON body (dict or list)
    data=None,                           # optional — form/raw body
    params=None,                         # optional — query-string params
)  # Set json_body OR data, not both. If both are set, data wins.

PostProcessResult(
    output="the target's reply",  # REQUIRED — reply text
    session_state=None,           # optional — set ONLY if state changed this turn; None keeps existing session
)

CallTargetResult(
    output="the target's reply",  # REQUIRED — reply text
    session_state=None,           # optional — set ONLY if state changed this turn; None keeps existing session
)

AuthResult(
    ttl=3600,               # REQUIRED — seconds to cache before re-authenticating
    data={"token": "..."},  # REQUIRED — any dict; read it back as context.auth
)

SessionPreProcessResult(
    session_state={"session_id": "..."},  # REQUIRED — any dict; read it back as context.session
)
```

**`session_state` nullability differs by function — do not conflate them:**

- `SessionPreProcessResult.session_state` is **required** — it initializes the
  session.
- `PostProcessResult` / `CallTargetResult` `session_state` is **optional** —
  `None` means "keep the existing session"; set it only when the state actually
  changed this turn.

---

## The functions

### Pattern A — `pre_process` + `post_process`

The platform sends the request you describe, then hands you the response to parse.

```python
def pre_process(context, inference_input):
    return PreProcessResult(
        url=context.vars["endpoint"],
        method="POST",
        headers={"Authorization": f"Bearer {context.secrets['api_key']}"},
        json_body={"message": inference_input.prompt},
    )

def post_process(context, raw_response):
    if raw_response.status_code == 429:
        raise_rate_limited(retry_after=30)
    return PostProcessResult(output=raw_response.json_body["reply"])
```

### Pattern B — `call_target`

Full control: you make the call yourself and return the reply. Use for non-plain
HTTP (WebSocket, GraphQL, SDK clients, streaming). Defining this disables
`pre_process`/`post_process`.

```python
def call_target(context, inference_input):
    resp = context.http.post(
        context.vars["endpoint"],
        headers={"Authorization": f"Bearer {context.secrets['api_key']}"},
        json={"message": inference_input.prompt},
    )
    return CallTargetResult(output=resp.json()["reply"])
```

### `authenticate(context)` — optional

Log in or fetch a token. The platform owns the lifecycle: it calls
`authenticate()`, caches the returned `data` for `ttl` seconds, exposes it as
`context.auth` in your other functions, and re-authenticates automatically on
expiry or on an auth failure (one retry). You only write the "how".

```python
def authenticate(context):
    resp = context.http.post(
        context.vars["token_url"],
        data={
            "grant_type": "client_credentials",
            "client_id": context.secrets["client_id"],
            "client_secret": context.secrets["client_secret"],
        },
    )
    if resp.status_code != 200:
        raise_auth_error(f"token endpoint returned {resp.status_code}")
    body = resp.json()
    return AuthResult(ttl=body.get("expires_in", 3600), data={"token": body["access_token"]})
```

> **Per-request signing (HMAC, AWS SigV4, …) is NOT `authenticate()`** — it
> depends on the specific request, so do it in `pre_process`/`call_target` where
> you have the full request.

### `session_pre_process(context)` — optional

One-time setup on the **first turn** of a conversation — e.g. create a
server-side session. The returned `session_state` is exposed as `context.session`
in your other functions on that turn and every later turn. It runs on the first
turn of **every** conversation, including single-turn attacks, and is **not**
gated by the target's multi-turn setting.

```python
def session_pre_process(context):
    resp = context.http.post(
        context.vars["base_url"] + "/sessions",
        headers={"Authorization": f"Bearer {context.auth['token']}"},
    )
    return SessionPreProcessResult(session_state={"session_id": resp.json()["id"]})
```

---

## Multi-turn conversations

**Stateful target** — the target tracks the session server-side; create it once,
then send its id each turn:

```python
def session_pre_process(context):
    resp = context.http.post(
        context.vars["base_url"] + "/sessions",
        headers={"Authorization": f"Bearer {context.auth['token']}"},
    )
    return SessionPreProcessResult(session_state={"session_id": resp.json()["id"]})

def pre_process(context, inference_input):
    return PreProcessResult(
        url=context.vars["base_url"] + "/chat",
        headers={"Authorization": f"Bearer {context.auth['token']}"},
        json_body={
            "session_id": context.session["session_id"],
            "message": inference_input.prompt,
        },
    )
```

**Stateless target** — resend the full history each turn:

```python
def pre_process(context, inference_input):
    messages = [
        {"role": m.role, "content": m.content}
        for m in inference_input.previous_messages
    ]
    messages.append({"role": "user", "content": inference_input.prompt})
    return PreProcessResult(
        url=context.vars["endpoint"],
        headers={"Authorization": f"Bearer {context.secrets['api_key']}"},
        json_body={"messages": messages},
    )
```

To update session state mid-conversation, return it on the `session_state` field
of `PostProcessResult`/`CallTargetResult`; it replaces `context.session` next
turn. This does not change `inference_input.previous_messages`, which the platform
manages.

---

## Signaling errors

For *expected* target conditions, signal them so the platform classifies and
reacts correctly. These are the **only** signaling helpers (note the spelling
`raise_rate_limited`):

| Helper | Use when | Platform reaction |
|---|---|---|
| `raise_rate_limited(message, retry_after=N)` | Target rate-limited you (e.g. HTTP 429) | Retries after `retry_after` seconds |
| `raise_auth_error(message)` | Token rejected / expired (e.g. HTTP 401) | Invalidates cached auth, retries once |
| `raise_content_filtered(message)` | Target blocked/filtered the response (often HTTP 200 with a filter flag) | Records the turn as *filtered*, no retry |
| `raise_target_error(message)` | Target failed in a way worth retrying | Retries |

**Network errors depend on the pattern:**

- **Pattern A** — the platform makes the call, so timeouts/connection errors are
  classified automatically. Do not raise them yourself.
- **Pattern B** — you make the calls, so the platform can't see them. Catch
  network errors and `raise_target_error(...)`. An **uncaught exception** is
  reported as an *adapter* error (your code's fault), not a retryable target
  error — wrap risky calls.

**Content-filter detection is the highest-value signal** — the platform can't tell
a filtered HTTP 200 from a normal one, but you know your target's shape:

```python
def post_process(context, raw_response):
    if raw_response.status_code == 429:
        raise_rate_limited(retry_after=int(raw_response.headers.get("Retry-After", 30)))
    if raw_response.status_code == 401:
        raise_auth_error("token expired")
    body = raw_response.json_body or {}
    if body.get("error", {}).get("code") == "content_filter":
        raise_content_filtered("blocked by safety filter")
    return PostProcessResult(output=body["reply"])
```

---

## Available packages

- **Python 3.12** with the full standard library (`json`, `base64`, `uuid`,
  `time`, `datetime`, `hmac`, `hashlib`, `re`, …).
- **`httpx`** — bundled, exposed as `context.http`. Use it for HTTP rather than
  importing another client.
- **`websockets`** — bundled, for WebSocket targets (use from `call_target`).

No other third-party libraries are available (e.g. `requests`, `grpcio` are
**not** bundled). If the target needs one beyond the bundled set, contact your
red-teaming platform provider to have it added — do not assume it is present.

---

## Limits

| Constraint | Value |
|---|---|
| Request patterns per adapter | One — Pattern A **or** Pattern B (`call_target` wins if both defined) |
| Overall execution time per call | 110 s |
| HTTP timeout for `context.http` | 100 s |
| Carried state size (`auth` + `session`, serialized) | 64 KB (oversized session state ends the conversation) |
| Packages | standard library + bundled `httpx`/`websockets` only |

**Upload-time validation** checks that the script: is valid Python; defines
`call_target` **or** both `pre_process` and `post_process`; and keeps carried
state within 64 KB. Whether `authenticate()` is defined is detected
automatically. Write safe, self-contained code regardless — do not rely on
validation to catch logic errors.

---

## Minimal starter (Pattern A)

```python
def pre_process(context, inference_input):
    return PreProcessResult(
        url=context.vars["endpoint"],
        headers={"Authorization": f"Bearer {context.secrets['api_key']}"},
        json_body={"message": inference_input.prompt},
    )

def post_process(context, raw_response):
    if raw_response.status_code == 429:
        raise_rate_limited(retry_after=30)
    return PostProcessResult(output=raw_response.json_body["reply"])
```

The minimal starter above is already a complete Pattern A adapter. When the target
needs auth or sessions, scaffold from the full reference adapter below.

## Complete reference adapter (all functions)

Every supported function with realistic bodies, in one file. Scaffold from this,
then **delete the pattern you don't use** — keep `call_target` (Pattern B) *or*
`pre_process`/`post_process` (Pattern A) — and drop `authenticate` /
`session_pre_process` if the target doesn't need them.

```python
import time
import uuid


def authenticate(context):
    """OPTIONAL. OAuth2 client_credentials -> bearer token, cached for ttl seconds."""
    resp = context.http.post(
        context.vars["token_url"],
        data={
            "grant_type": "client_credentials",
            "client_id": context.secrets["client_id"],
            "client_secret": context.secrets["client_secret"],
        },
    )
    if resp.status_code != 200:
        raise_auth_error(f"token endpoint returned {resp.status_code}")
    body = resp.json()
    return AuthResult(ttl=body.get("expires_in", 3600), data={"token": body["access_token"]})


def session_pre_process(context):
    """OPTIONAL. Create a server-side session once at the start of a conversation."""
    session_id = str(uuid.uuid4())
    resp = context.http.post(
        context.vars["session_url"],
        headers={"Authorization": f"Bearer {context.auth['token']}"},
        json={"session_id": session_id},
    )
    if resp.status_code not in (200, 201):
        raise_target_error(f"session create returned {resp.status_code}")
    return SessionPreProcessResult(session_state={"session_id": session_id})


# --- Pattern A: pre_process + post_process (platform makes the HTTP call) ---

def pre_process(context, inference_input):
    """Pattern A, REQUIRED. Build the request to send to the target."""
    return PreProcessResult(
        url=context.vars["endpoint"],
        method="POST",
        headers={"Authorization": f"Bearer {context.auth['token']}"},
        json_body={
            "session_id": context.session["session_id"],
            "message": inference_input.prompt,
        },
    )


def post_process(context, raw_response):
    """Pattern A, REQUIRED. Extract the reply; signal known failures."""
    if raw_response.status_code == 429:
        raise_rate_limited(retry_after=int(raw_response.headers.get("Retry-After", 30)))
    if raw_response.status_code == 401:
        raise_auth_error("token expired")
    body = raw_response.json_body or {}
    if body.get("error", {}).get("code") == "content_filter":
        raise_content_filtered("blocked by safety filter")
    return PostProcessResult(output=body["reply"])


# --- Pattern B: call_target (you make the call yourself) ---
# Use INSTEAD OF pre/post for non-plain-HTTP targets. Defining this disables A.

def call_target(context, inference_input):
    """Pattern B. Make the call(s) yourself and return the reply text."""
    body = {
        "session_id": context.session["session_id"],
        "turn_id": str(uuid.uuid4()),
        "timestamp": int(time.time()),
        "prompt": inference_input.prompt,
    }
    resp = context.http.post(
        context.vars["turn_url"],
        headers={"Authorization": f"Bearer {context.auth['token']}"},
        json=body,
    )
    if resp.status_code == 429:
        raise_rate_limited(retry_after=30)
    if resp.status_code == 401:
        raise_auth_error("turn rejected: token invalid or expired")
    if resp.status_code != 200:
        raise_target_error(f"turn endpoint returned {resp.status_code}")
    return CallTargetResult(output=resp.json()["response"])
```

---

## Process (when generating an adapter)

1. **Gather the target's details.** Ask for anything not provided:
   - Endpoint URL(s) and HTTP method.
   - Request shape — how the red-team prompt maps into body / headers / params.
   - Response shape — where the reply text lives (JSON path, header, raw text).
   - Auth — none / API key / OAuth2 / login handshake / per-request signing.
   - Turns — single-turn, stateful (server-side session), or stateless (resend
     history each turn).
   - Transport — plain request/response HTTP, or non-HTTP (WebSocket, GraphQL,
     SDK client, streaming).
   - Config split — which values are non-secret (`vars`) vs secret (`secrets`).
   - Failure signals — how the target reports rate limits, auth failures, and
     content filtering (status codes / body flags).
2. **Choose the pattern:** plain request/response HTTP → Pattern A; full transport
   control → Pattern B. Add `authenticate` when a token/login is needed
   (per-request signing goes in `pre_process`/`call_target`, not here); add
   `session_pre_process` when a server-side session must be created once per
   conversation.
3. **Write the script** per the contract above (one pattern only; correct `*Result`
   returns; no imports of injected names; secrets from `context.secrets`; bounded
   calls; `raise_*` for expected failures; state via `session_state`).
4. **Self-verify** against the Pre-submit checklist below.
5. **Output:** the complete adapter in one ```python block; the list of `vars` and
   `secrets` the author must declare (every key read from `context.vars` /
   `context.secrets`); and one line stating the chosen pattern + hooks and why.

---

## Pre-submit checklist

- [ ] Exactly one request pattern (`call_target`, or both `pre_process` +
      `post_process`) — not a half of Pattern A, not both patterns.
- [ ] Every function returns the correct `*Result` type (never a bare
      string/dict).
- [ ] No imports of injected names; all real imports at the top of the file.
- [ ] No module-level state carried between turns — use `session_state`.
- [ ] Secrets read from `context.secrets`; config from `context.vars`; nothing
      hard-coded.
- [ ] Expected failures signaled via `raise_*` helpers (especially
      `raise_content_filtered` for filtered 200s).
- [ ] Only standard library + `httpx` (`context.http`) + `websockets` used.
- [ ] Calls are bounded (explicit timeouts, no unbounded loops); well under the
      110 s budget.
