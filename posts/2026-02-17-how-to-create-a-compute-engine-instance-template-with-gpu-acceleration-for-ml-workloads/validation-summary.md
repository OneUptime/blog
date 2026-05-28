# Validation Summary: How to Create a Compute Engine Instance Template with GPU Acceleration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Compute Engine
- Compute Engine GPUs
- Compute Engine instance templates
- Google Cloud CLI
- Deep Learning VM Images
- NVIDIA GPU drivers and CUDA
- Terraform Google provider
- Managed instance groups
- PyTorch CUDA verification

## Sources Consulted
- Google Cloud Compute Engine GPU machine types: https://docs.cloud.google.com/compute/docs/gpus
- Google Cloud GPU host maintenance events: https://docs.cloud.google.com/compute/docs/gpus/gpu-host-maintenance
- Google Cloud GPU driver installation: https://docs.cloud.google.com/compute/docs/gpus/install-drivers-gpu
- Google Cloud Deep Learning VM image selection: https://docs.cloud.google.com/deep-learning-vm/docs/images
- Google Cloud CLI `gcloud compute instance-templates create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instance-templates/create
- Google Cloud instance templates and Terraform examples: https://docs.cloud.google.com/compute/docs/instance-templates/create-instance-templates
- Terraform Google provider `google_compute_instance_template` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance_template

## Issues Found
- The N1 GPU-to-vCPU table used V100 limits while the surrounding examples use T4 GPUs. Updated the table to show T4-specific limits from the current Compute Engine GPU machine type documentation.
- The Deep Learning VM image families used Debian 11 names that are now deprecated. Updated the PyTorch and base image families to current Ubuntu-based Deep Learning VM image families.
- The manual NVIDIA driver installation script mixed unrelated NVIDIA container-toolkit repository setup with a direct `apt-get install nvidia-driver-535`, which is not the current Google-recommended approach for Compute Engine GPU VMs. Replaced it with Google's current CUDA installer startup-script pattern.
- The standard Debian instance template example used `install-nvidia-driver=True` metadata as though it installed drivers on the standard OS image. Updated the command to attach the explicit startup script with `--metadata-from-file`.
- The Terraform `google_compute_instance_template` example included a `region` argument on the global instance template resource. Removed it to match the documented global template resource pattern; regional templates should use `google_compute_region_instance_template`.

## Review Notes
- The Google Cloud CLI examples use documented flags such as `--accelerator`, `--maintenance-policy=TERMINATE`, `--restart-on-failure`, image family/project flags, boot disk flags, scopes, and managed instance group creation flags.
- The post correctly notes that GPU instances cannot live-migrate and must stop for host maintenance events, with automatic restart available after maintenance.
- Deep Learning VM image family names change over time. Future reviews should re-check the image family list before publication.
