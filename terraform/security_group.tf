# GCP's equivalent of a security group: firewall rules scoped to the caller's detected public IP only.

resource "google_compute_firewall" "allow_ssh_from_my_ip" {
  name    = "${var.instance_name}-allow-ssh"
  network = google_compute_network.vpc.id

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = [local.my_ip_cidr]
  target_tags   = ["airs-evaluator"]
}

resource "google_compute_firewall" "allow_dashboard_from_my_ip" {
  name    = "${var.instance_name}-allow-dashboard"
  network = google_compute_network.vpc.id

  allow {
    protocol = "tcp"
    ports    = [tostring(var.app_port)]
  }

  source_ranges = [local.my_ip_cidr]
  target_tags   = ["airs-evaluator"]
}
