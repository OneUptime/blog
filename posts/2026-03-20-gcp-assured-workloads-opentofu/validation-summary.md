# Validation Summary: How to Configure GCP Assured Workloads with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Assured Workloads
- OpenTofu / Terraform-style HCL
- Google Cloud Terraform provider (`google_assured_workloads_workload`)
- FedRAMP, IL4, CJIS, ITAR, and healthcare compliance control packages

## Sources Consulted
- Terraform Registry: `google_assured_workloads_workload` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/assured_workloads_workload
- Google Cloud Assured Workloads overview: https://cloud.google.com/assured-workloads/docs/overview
- Google Cloud Assured Workloads `ComplianceRegime` reference: https://cloud.google.com/assured-workloads/docs/reference/rest/Shared.Types/ComplianceRegime
- Google Cloud Assured Workloads workloads REST reference: https://cloud.google.com/assured-workloads/docs/reference/rest/v1/organizations.locations.workloads
- Google Cloud key management guidance for Assured Workloads: https://cloud.google.com/assured-workloads/docs/key-management
- Terraform provider source for `google_assured_workloads_workload`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/google/services/assuredworkloads/resource_assured_workloads_workload.go

## Issues Found
- The IL4 example used the deprecated `kms_settings` block. I removed it and replaced it with a standard `resource_settings` folder example because Google marks `kms_settings` as deprecated and recommends `resource_settings` for key-related resources.
- The IL4 example incorrectly stated that IL4 requires CMEK with KMS keys. Google’s current key-management guidance says CMEK is optional for IL4, while CJIS, ITAR, and IL5 are the control packages with mandated CMEK and separation of duties.
- The output example assumed `resources[0]` was the folder resource. I changed it to filter `resources` by `resource_type == "CONSUMER_FOLDER"` so the output does not depend on resource ordering.
- The output comment said Assured Workloads creates “KMS keys.” Google’s documentation says Assured Workloads creates a key ring and that customers then create or import keys as needed, so I corrected that wording.
- The examples and regime table used older pre-June-2025 control-package enum names such as `FEDRAMP_MODERATE`, `IL4`, and `CJIS`, and included deprecated `HIPAA`. I updated them to the current documented enum names and replaced the deprecated healthcare entry with `US_DATA_BOUNDARY_FOR_HEALTHCARE_AND_LIFE_SCIENCES`.

## Review Notes
- Google renamed several Assured Workloads control-package enums in June 2025. The REST API documents the old enum names as backwards compatible, but recommends the newer names.
- The current Terraform provider source still describes many of the older enum names in its field documentation, but the provider treats `compliance_regime` as a string and passes it through to the API.
- `opentofu` and `terraform` CLIs were not installed in the local review environment, so I did not run a live `tofu validate` or `terraform validate` check.
