# Validation Summary: OpenTofu vs Google Deployment Manager: Choosing for GCP

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- OpenTofu (HCL, `google` provider)
- Google Cloud Deployment Manager (YAML)
- Google Cloud Config Connector (Kubernetes operator)
- Google Cloud Infrastructure Manager (managed Terraform service)
- GCP resources: `google_compute_network`, `google_compute_subnetwork`, `google_compute_instance`
- terraform-google-modules/kubernetes-engine module
- Checkov (GCP security checks)

## Sources Consulted
- [Deployment Manager deprecation | Google Cloud Documentation](https://cloud.google.com/deployment-manager/docs/deprecations)
- [Infrastructure Manager overview | Google Cloud Documentation](https://docs.cloud.google.com/infrastructure-manager/docs/overview)
- [Infrastructure Manager: Provision Cloud with HashiCorp Terraform | Google Cloud Blog](https://cloud.google.com/blog/products/management-tools/introducing-infrastructure-manager-powered-by-terraform)
- [ComputeNetwork | Config Connector | Google Cloud](https://cloud.google.com/config-connector/docs/reference/resource-docs/compute/computenetwork)
- [terraform-google-modules/kubernetes-engine/google | Terraform Registry](https://registry.terraform.io/modules/terraform-google-modules/kubernetes-engine/google/latest)
- [Cloud Deployment Manager V2 API | Google Cloud Marketplace](https://console.cloud.google.com/marketplace/product/google/deploymentmanager.googleapis.com)

## Issues Found
1. **Misleading "Deployment Manager v2" reference in the introduction.** The original intro stated Deployment Manager was "now partly superseded by Config Connector and Deployment Manager v2." In reality, "v2" is the API version (GA since 2015) of Deployment Manager itself — it is not a separate or successor product. The actual Google-recommended successors are **Infrastructure Manager** (a managed Terraform service) and **Config Connector**. I rewrote the intro to remove the v2 confusion and to mention Infrastructure Manager as a successor.

2. **Outdated "Maintenance mode" status.** The post described Deployment Manager as in "maintenance mode," but Google has officially scheduled end of support for **March 31, 2026** — a date already passed as of the validation date (2026-04-27). I updated the comparison matrix row, the "Important Note" section, the "Avoid Deployment Manager for" list, and the conclusion to reflect the end-of-support date.

3. **Missing mention of Infrastructure Manager.** The "Important Note" section only referenced Config Connector as a successor, omitting Infrastructure Manager (Google's managed Terraform service, the primary successor). I added Infrastructure Manager to the relevant sections.

4. **Stale module version pin.** The example used `version = "~> 43.0"` previously pinned to `~> 30.0`. The terraform-google-modules/kubernetes-engine module is at 43.0.0 as of January 2026, so I bumped the example pin to `~> 43.0` to reflect current usage.

## Review Notes
- The HCL examples (`google_compute_network`, `google_compute_subnetwork`, `google_compute_instance`, `boot_disk`/`initialize_params`/`network_interface` blocks) are syntactically correct and use current resource arguments from the Google provider.
- The Deployment Manager YAML example uses correct resource type identifiers (`compute.v1.network`, `compute.v1.subnetwork`, `compute.v1.instance`) and the proper `$(ref.<name>.selfLink)` reference syntax.
- The Config Connector example uses the correct `compute.cnrm.cloud.google.com/v1beta1` apiVersion and `ComputeNetwork` kind, matching official Config Connector docs.
- Checkov check IDs `CKV_GCP_62`, `CKV_GCP_65`, `CKV_GCP_79` are valid existing GCP checks in Checkov.
- License claim (MPL 2.0 for OpenTofu) is accurate.
- Since Deployment Manager has now reached end of support, future revisions of this post may want to reframe the comparison primarily as OpenTofu vs Infrastructure Manager / Config Connector, since Deployment Manager is no longer a viable choice for new workloads.
