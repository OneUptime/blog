# Validation Summary: How to Set Up GCP Instance Templates with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Compute Engine
- GCP instance templates
- Managed Instance Groups (MIGs)
- Confidential VM
- Shielded VM
- OpenTofu
- HCL

## Sources Consulted
- Google Cloud Compute Engine: Instance templates — https://cloud.google.com/compute/docs/instance-templates
- Google Cloud Compute Engine: Create instance templates — https://cloud.google.com/compute/docs/instance-templates/create-instance-templates
- Google Cloud Compute Engine REST API: `instanceTemplates.insert` — https://cloud.google.com/compute/docs/reference/rest/v1/instanceTemplates/insert
- Google Cloud Confidential VM: Overview — https://cloud.google.com/confidential-computing/confidential-vm/docs/confidential-vm-overview
- Google Cloud Confidential VM: Supported configurations — https://cloud.google.com/confidential-computing/confidential-vm/docs/supported-configurations
- Google Cloud Confidential VM: Create a Confidential VM instance — https://cloud.google.com/confidential-computing/confidential-vm/docs/create-your-first-confidential-vm-instance
- OpenTofu: `lifecycle` meta-argument — https://opentofu.org/docs/language/meta-arguments/lifecycle/
- Google provider docs: `google_compute_instance_template` — https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_instance_template.html.markdown
- Google provider docs: `google_compute_region_instance_template` — https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_region_instance_template.html.markdown
- Google provider implementation: `resource_compute_instance_template.go` — https://github.com/hashicorp/terraform-provider-google/blob/main/google/services/compute/resource_compute_instance_template.go

## Issues Found
- The overview said OpenTofu manages template "versioning and rollout strategies." I changed this to clarify that OpenTofu manages template replacement, while managed instance groups control rollout behavior.
- The post said `create_before_destroy` ensures zero-downtime template updates. I corrected this to the actual behavior: it keeps a replacement template available before the old one is removed, but rollout and downtime characteristics depend on the managed instance group configuration.
- The Confidential VM example was incomplete for the documented AMD SEV-on-N2D configuration. I added `min_cpu_platform = "AMD Milan"`, set `confidential_instance_type = "SEV"`, added `scheduling { on_host_maintenance = "MIGRATE" }`, and replaced the outdated comment that implied AMD is required for all Confidential VMs.

## Review Notes
- Google Cloud supports both global and regional instance templates, and recommends regional instance templates unless you need cross-region reuse. The post's use of `google_compute_instance_template` is still valid.
- The Step 1 startup script installs packages from the internet, so instances need outbound connectivity such as an external IP or Cloud NAT.
- Debian 12 is supported, but Google documents that Debian 12 on AMD SEV and AMD SEV-SNP doesn't support attestation.
- I verified that the additional non-boot persistent disk example is valid as a blank disk configuration against the Compute Engine API behavior and the provider implementation.
