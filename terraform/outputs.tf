output "instance_public_ip" {
  description = "Public IP address of the Ubuntu server"
  value       = google_compute_instance.airs_evaluator.network_interface[0].access_config[0].nat_ip
}

output "detected_public_ip" {
  description = "Your public IP that firewall access was restricted to"
  value       = local.my_ip_cidr
}

output "ssh_command" {
  description = "Command to SSH into the server"
  value       = "ssh -i ${path.module}/ssh_key ${var.ssh_user}@${google_compute_instance.airs_evaluator.network_interface[0].access_config[0].nat_ip}"
}

output "dashboard_tunnel_command" {
  description = "SSH tunnel command to reach the dashboard at http://localhost:<app_port> locally (useful if direct access to the dashboard port is ever blocked)"
  value       = "ssh -i ${path.module}/ssh_key -N -L ${var.app_port}:localhost:${var.app_port} ${var.ssh_user}@${google_compute_instance.airs_evaluator.network_interface[0].access_config[0].nat_ip}"
}
