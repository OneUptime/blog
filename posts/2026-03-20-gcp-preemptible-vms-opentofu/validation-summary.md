# Validation Summary: How to Set Up GCP Preemptible VMs with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Compute Engine
- GCP preemptible VMs
- GCP Spot VMs
- OpenTofu / Terraform Google provider
- Managed instance groups
- Cloud Storage
- Debian 12 on Compute Engine

## Sources Consulted
- Google Cloud: Preemptible VM instances - https://docs.cloud.google.com/compute/docs/instances/preemptible
- Google Cloud: Create and use Spot VMs - https://docs.cloud.google.com/compute/docs/instances/create-use-spot
- Google Cloud: Run shutdown scripts - https://docs.cloud.google.com/compute/docs/shutdownscript
- Google Cloud: Operating system details - https://docs.cloud.google.com/compute/docs/images/os-details
- Google Cloud: Create instance templates - https://docs.cloud.google.com/compute/docs/instance-templates/create-instance-templates
- Terraform Google provider: `google_compute_instance` - https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_instance.html.markdown
- Terraform Google provider: `google_compute_instance_template` - https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_instance_template.html.markdown
- Terraform Google provider: `google_compute_instance_group_manager` - https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_instance_group_manager.html.markdown

## Issues Found
- The overview said preemptions happen with a 30-second warning. Google documents this as a best-effort shutdown period of up to 30 seconds, so I corrected the wording and added the current 24-hour maximum runtime limit for preemptible VMs.
- The post did not mention that Google recommends Spot VMs for new workloads and treats them as the latest version of preemptible VMs. I added that clarification in the overview and summary to keep the guidance current.
- The startup script used `ls` against a `gs://` path, which would not work. I replaced it with `gsutil ls`, then read the selected object with `gsutil cat`.
- The startup script called `process_task` without defining it. I added a minimal shell function so the example is internally consistent and runnable as a sample.
- The shutdown-script comment implied a guaranteed 30-second warning. I updated it to describe the preemption notice as best effort.

## Review Notes
- The HCL resource structure is valid for the current Google provider docs, including `scheduling.preemptible`, `automatic_restart = false`, `on_host_maintenance = "TERMINATE"`, `metadata_startup_script`, and the managed instance group `version.instance_template` reference.
- The Debian 12 Compute Engine images currently include the Google Cloud CLI by default, so using `gsutil` inside these examples is plausible on the selected image family.
