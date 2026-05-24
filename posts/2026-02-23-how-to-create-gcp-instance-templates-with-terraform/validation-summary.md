# Validation Summary: How to Create GCP Instance Templates with Terraform

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Terraform (HashiCorp Configuration Language)
- Google Cloud Platform (GCP)
- GCP Compute Engine
- GCP Instance Templates (`google_compute_instance_template`)
- GCP VPC Networks and Subnetworks
- GCP IAM (service accounts and role bindings)
- GCP Spot VMs / Preemptible Instances
- GCP GPU instances (guest accelerators)
- GCP Shielded VM
- GCP OS Login

## Sources Consulted
- Terraform google provider docs for `google_compute_instance_template`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance_template
- Terraform google provider docs for `google_compute_network`, `google_compute_subnetwork`, `google_service_account`, `google_project_iam_member`
- GCP Compute Engine documentation on Spot VMs and `provisioning_model`
- GCP documentation on Shielded VM and OS Login metadata key (`enable-oslogin`)
- GCP documentation on disk device naming (`/dev/disk/by-id/google-*`)

## Issues Found
No technical issues found.

Items verified during review:
- The `region` argument on `google_compute_instance_template` is a valid optional argument. While instance templates are global resources, this argument can be used to restrict the template to a region (e.g., when it references regional resources like subnetworks).
- The Spot VM `scheduling` block correctly combines `preemptible = true`, `provisioning_model = "SPOT"`, `automatic_restart = false`, `on_host_maintenance = "TERMINATE"`, and `instance_termination_action = "STOP"`.
- The `disk` block correctly uses `device_name` (which appears as `/dev/disk/by-id/google-<device_name>`), matching the startup script's `DEVICE="/dev/disk/by-id/google-data-disk"` lookup.
- The `source_image` format `<project>/<family>` (e.g., `debian-cloud/debian-12`) is valid.
- `labels` and `tags` are both valid top-level arguments on `google_compute_instance_template`.
- The `name_prefix` + `create_before_destroy` lifecycle pattern is the correct approach for safely updating templates referenced by MIGs.
- IAM bindings use the correct role names (`roles/logging.logWriter`, `roles/monitoring.metricWriter`).
- The `guest_accelerator` block and required `scheduling { on_host_maintenance = "TERMINATE" }` for GPU instances is correct.

## Review Notes
- The basic template example intentionally uses a fixed `name` to motivate the `name_prefix` pattern in the next section — this is a pedagogical choice and works as written, though as the post notes, it cannot be safely updated when in use.
- The GPU example references a specific deep-learning image (`deeplearning-platform-release/common-cu121-v20240128-debian-11-py310`); deep-learning VM images are version-stamped and may eventually be deprecated, so readers may need to pick a current image from the family when running this in the future.
- Setting `region` on a global `google_compute_instance_template` is somewhat unusual but valid — readers wanting a true regional instance template should consider `google_compute_region_instance_template` instead. This is not a correctness issue with the post as written.
