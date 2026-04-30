# Validation Summary: How to Create GCP Spot VMs with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Compute Engine
- Google Cloud Spot VMs
- GPUs on Compute Engine
- Managed Instance Groups (MIGs)
- OpenTofu / Terraform-compatible HCL

## Sources Consulted
- Google Cloud: Spot VMs - https://docs.cloud.google.com/compute/docs/instances/spot
- Google Cloud: Create and use Spot VMs - https://docs.cloud.google.com/compute/docs/instances/create-use-spot
- Google Cloud: Create a PyTorch Deep Learning VM instance - https://docs.cloud.google.com/deep-learning-vm/docs/pytorch_start_instance
- Google Cloud: Accelerator (GPU and TPU) locations - https://docs.cloud.google.com/compute/docs/regions-zones/accelerator-zones
- Google provider docs: `google_compute_instance` - https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_instance.html.markdown
- Google provider docs: `google_compute_instance_template` - https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_instance_template.html.markdown

## Issues Found
- The Spot VM `scheduling` blocks omitted `preemptible = true`. I added it to all Spot examples because Google Cloud's Terraform sample and the Google provider docs show Spot VMs configured with `preemptible = true`, `provisioning_model = "SPOT"`, and `automatic_restart = false`.
- The GPU example did not install an NVIDIA driver. I added `metadata = { "install-nvidia-driver" = "True" }` because Google Cloud's Deep Learning VM GPU guidance requires the driver to be installed for GPU workloads.
- The post said Spot VMs use the "same interruption model" as Preemptible VMs and that `instance_termination_action = "STOP"` preserves VM state. I corrected that wording because official docs say Spot VMs do not have the 24-hour maximum runtime of preemptible VMs, and `STOP` leaves the VM in `TERMINATED` while preserving the instance and attached persistent disks rather than full in-memory runtime state.

## Review Notes
- The GPU example's `zone` and accelerator type are still subject to per-zone GPU availability and project quota, so readers might need to adjust them if `nvidia-tesla-t4` capacity is unavailable in the chosen zone.
- The MIG example uses a global `google_compute_instance_template`, which is valid. Google also documents `google_compute_region_instance_template` as an option when you want stronger regional scoping.
