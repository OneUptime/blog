# Validation Summary: How to Deploy Portainer on Google Cloud Compute Engine

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- OpenTofu / Terraform HCL
- Google Cloud Compute Engine
- Google Cloud VPC firewall rules
- Google Cloud static external IP addresses
- Docker Engine
- Portainer CE

## Sources Consulted
- Google Cloud Compute Engine startup scripts: https://docs.cloud.google.com/compute/docs/instances/startup-scripts
- Google Cloud VPC firewall rules: https://docs.cloud.google.com/firewall/docs/using-firewalls
- Google Cloud static external IP addresses: https://docs.cloud.google.com/compute/docs/ip-addresses/configure-static-external-ip-address
- Google Cloud OS image details: https://docs.cloud.google.com/compute/docs/images/os-details
- Google Cloud sample for reserving a regional static external IP: https://docs.cloud.google.com/compute/docs/samples/compute-regional-external-vm-address
- Terraform Registry `google_compute_instance`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- Terraform Registry `google_compute_firewall`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall
- Portainer CE install on Docker for Linux: https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Docker Engine install on Ubuntu: https://docs.docker.com/installation/ubuntulinux/
- Docker CLI `docker run` reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker volumes reference: https://docs.docker.com/engine/storage/volumes/

## Issues Found
- The startup script used `curl` before ensuring it was installed. I added `apt-get install -y ca-certificates curl` so the script does not assume those packages are already present.
- The Portainer container image used `portainer/portainer-ce:latest`, while the current Portainer CE install docs deploy the `lts` tag. I changed the image reference to `portainer/portainer-ce:lts` to match the current official guidance.
- The firewall snippet referenced `var.admin_ip_cidr` without declaring the input variable. I added a `variable "admin_ip_cidr"` block so the HCL is valid as written.
- I clarified the `access_config {}` inline comment to note that it creates an ephemeral public IP unless a static address is attached.

## Review Notes
- The `metadata_startup_script` approach is valid for Ubuntu Compute Engine images because startup scripts are executed from instance metadata by the Google guest agent.
- Reserving `google_compute_address` in `us-central1` is correct for an instance in zone `us-central1-a` because static external IPv4 addresses are regional.
- Exposing only port `9443` is acceptable for Portainer CE. Port `8000` is documented as optional unless you need Edge Agent features.
- The Docker convenience script at `get.docker.com` is official and works for non-interactive provisioning, but Docker documents it as a convenience method that should be tested carefully before production use.
