variable "project_id" {
  description = "GCP project ID to deploy into"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone"
  type        = string
  default     = "us-central1-a"
}

variable "instance_name" {
  description = "Name of the Compute Engine instance"
  type        = string
  default     = "airs-evaluator-server"
}

variable "machine_type" {
  description = "Compute Engine machine type (system_requirements.md calls for 4+ vCPU, 16GB RAM recommended)"
  type        = string
  default     = "e2-standard-4"
}

variable "boot_disk_size_gb" {
  description = "Boot disk size in GB (system_requirements.md calls for 20GB+ SSD)"
  type        = number
  default     = 30
}

variable "ssh_user" {
  description = "Admin username for SSH access"
  type        = string
  default     = "ubuntu"
}

variable "app_port" {
  description = "Port the Web Interface (dashboard) listens on"
  type        = number
  default     = 8000
}
