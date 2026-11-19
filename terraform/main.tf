# Detects the caller's current public IP so the security group can be scoped to it.
data "http" "my_public_ip" {
  url = "https://api.ipify.org?format=text"
}

locals {
  my_ip_cidr = "${chomp(data.http.my_public_ip.response_body)}/32"
}

resource "google_project_service" "compute" {
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}

data "google_compute_image" "ubuntu" {
  family  = "ubuntu-2204-lts"
  project = "ubuntu-os-cloud"
}

# This project has no default VPC (common under org policies that disable auto-created
# default networks), so a minimal custom VPC + subnet is created instead.
resource "google_compute_network" "vpc" {
  name                    = "${var.instance_name}-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "${var.instance_name}-subnet"
  network       = google_compute_network.vpc.id
  region        = var.region
  ip_cidr_range = "10.10.0.0/24"
}

resource "tls_private_key" "ssh" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "local_file" "ssh_private_key" {
  content         = tls_private_key.ssh.private_key_pem
  filename        = "${path.module}/ssh_key"
  file_permission = "0600"
}

resource "local_file" "ssh_public_key" {
  content  = tls_private_key.ssh.public_key_openssh
  filename = "${path.module}/ssh_key.pub"
}

resource "google_compute_instance" "airs_evaluator" {
  name         = var.instance_name
  machine_type = var.machine_type
  zone         = var.zone
  tags         = ["airs-evaluator"]

  depends_on = [google_project_service.compute]

  boot_disk {
    initialize_params {
      image = data.google_compute_image.ubuntu.self_link
      size  = var.boot_disk_size_gb
      type  = "pd-ssd"
    }
  }

  network_interface {
    network    = google_compute_network.vpc.id
    subnetwork = google_compute_subnetwork.subnet.id
    access_config {}
  }

  metadata = {
    ssh-keys = "${var.ssh_user}:${tls_private_key.ssh.public_key_openssh}"
  }
}
