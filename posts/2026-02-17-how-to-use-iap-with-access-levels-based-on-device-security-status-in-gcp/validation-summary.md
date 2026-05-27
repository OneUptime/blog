# Validation Summary: How to Use IAP with Access Levels Based on Device Security Status in GCP

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Identity-Aware Proxy (IAP)
- Access Context Manager access levels
- Endpoint Verification
- IAM Conditions and CEL expressions
- Google Cloud CLI
- Terraform Google provider
- Cloud Logging

## Sources Consulted
- Google Cloud SDK reference for `gcloud access-context-manager levels create`: https://docs.cloud.google.com/sdk/gcloud/reference/access-context-manager/levels/create
- Google Cloud Access Context Manager basic access level guide: https://cloud.google.com/access-context-manager/docs/create-basic-access-level
- Google Cloud Access Context Manager access level attributes: https://docs.cloud.google.com/access-context-manager/docs/access-level-attributes
- Google Cloud Access Context Manager REST reference for `AccessLevel`, `DevicePolicy`, and `OsConstraint`: https://cloud.google.com/access-context-manager/docs/reference/rest/v1/accessPolicies.accessLevels
- Google Cloud IAM Conditions overview and access level expression examples: https://cloud.google.com/iam/docs/conditions-overview
- Google Cloud SDK reference for `gcloud iap web add-iam-policy-binding`: https://docs.cloud.google.com/sdk/gcloud/reference/iap/web/add-iam-policy-binding
- Google Cloud Endpoint Verification deployment documentation: https://docs.cloud.google.com/endpoint-verification/docs/deploying-with-admin-console
- Google Cloud Endpoint Verification device attributes documentation: https://docs.cloud.google.com/endpoint-verification/docs/device-information
- HashiCorp Google provider documentation for `google_access_context_manager_access_level`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/access_context_manager_access_level

## Issues Found
- Access level IDs in the `gcloud access-context-manager levels create` examples used hyphens, but Access Context Manager access level IDs must begin with a letter and contain only letters, numbers, and underscores. Changed the examples to use names such as `basic_device_security`, `managed_device`, `current_os`, and `company_device`.
- The `--basic-level-spec` YAML examples used a top-level `conditions:` key. The `gcloud` flag expects a YAML-formatted list of `Condition` objects. Removed the wrapper so each file starts with `- devicePolicy:`.
- The IAP IAM condition examples referenced access level resource names without quoting them as CEL string literals. Updated the expressions to use quoted access level strings, for example `'accessPolicies/POLICY_ID/accessLevels/basic_device_security' in request.auth.access_levels`.
- Updated the IAP condition examples to reference the corrected underscore-based access level IDs.

## Review Notes
- The Terraform examples already used the correct Google provider field names for device policies, including `require_screen_lock`, `allowed_encryption_statuses`, `allowed_device_management_levels`, and `os_constraints`.
- The article's Endpoint Verification overview is accurate at a high level. Some organizations might also need the Endpoint Verification helper app depending on device type, Chrome version, and desired device attributes.
