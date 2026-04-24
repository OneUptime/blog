# Validation Summary: How to Deploy Portainer on Google Cloud Compute Engine - Part 3

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Compute Engine
- Google Cloud VPC firewall rules
- Google Cloud Persistent Disk
- Google Artifact Registry
- Google Cloud Ops Agent / Cloud Monitoring
- Docker Engine on Ubuntu
- Portainer CE
- SSH / OpenSSH

## Sources Consulted
- Google Cloud Free Program: https://cloud.google.com/free/docs/gcp-free-tier
- Create a Linux VM instance in Compute Engine: https://cloud.google.com/compute/docs/create-linux-vm-instance
- Operating system details for Compute Engine images: https://cloud.google.com/compute/docs/images/os-details
- Connect to Linux VMs: https://cloud.google.com/compute/docs/connect/standard-ssh
- gcloud compute firewall-rules create reference: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- gcloud compute instances attach-disk reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/attach-disk
- Format and mount a non-boot disk on a Linux VM: https://cloud.google.com/compute/docs/disks/format-mount-disk-linux
- Configure authentication to Artifact Registry for Docker: https://cloud.google.com/artifact-registry/docs/docker/authentication
- Installing the Ops Agent on individual VMs: https://cloud.google.com/stackdriver/docs/solutions/agents/ops-agent/installation
- General-purpose machine family for Compute Engine: https://cloud.google.com/compute/docs/general-purpose-machines
- Install Docker Engine on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Linux post-installation steps for Docker Engine: https://docs.docker.com/engine/install/linux-postinstall/
- Install Portainer CE with Docker on Linux: https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Add a custom registry in Portainer: https://docs.portainer.io/admin/registries/add/custom
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites

## Issues Found
- The post described `e2-micro` as a generic free-tier option without the important location and resource limits. I updated the introduction, instance guidance, and conclusion to specify the supported US regions and the need to stay within free-tier-eligible resources.
- The `gcloud compute instances create` example used `--image-family=ubuntu-2404-lts`, but current Compute Engine Ubuntu 24.04 x86 images use `ubuntu-2404-lts-amd64`. I corrected the CLI example.
- The SSH fallback was labeled as OS Login, but the command shown was the standard OpenSSH flow after adding an SSH key to the VM. I corrected the wording so it matches Google Cloud's SSH documentation.
- The Docker installation step used the convenience script. Docker's Ubuntu docs say that script is only recommended for testing and development, so I replaced it with the official apt-repository installation flow for Ubuntu.
- The Portainer deployment used `portainer/portainer-ce:latest`. Portainer's current documented Linux Docker installation uses the `:lts` tag, so I updated the image reference.
- The Artifact Registry section implied `gcloud auth configure-docker` was part of Portainer authentication. I clarified that it configures the VM's local Docker CLI, while Portainer itself uses the JSON service account key entered in the registry form.

## Review Notes
- Portainer's primary secure UI/API port is `9443`; the post still exposes port `9000` for optional legacy HTTP access.
- Google documents JSON service account keys for Artifact Registry, but recommends more secure alternatives when possible. The Portainer workflow shown here still works with `_json_key`.
- The persistent disk section is technically correct: it formats the disk, mounts it, and uses the filesystem UUID in `/etc/fstab` so the mount persists across reboots.
