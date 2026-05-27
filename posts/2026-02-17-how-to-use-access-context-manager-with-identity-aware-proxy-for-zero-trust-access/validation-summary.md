# Validation Summary: How to Use Access Context Manager with Identity-Aware Proxy

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Access Context Manager
- Google Cloud Identity-Aware Proxy
- IAM Conditions and CEL
- Endpoint Verification / Chrome Enterprise Premium
- Google Cloud CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud: Setting up context-aware access with Identity-Aware Proxy: https://docs.cloud.google.com/iap/docs/cloud-iap-context-aware-access-howto
- Google Cloud: Access Context Manager REST resource for access levels: https://docs.cloud.google.com/access-context-manager/docs/reference/rest/v1/accessPolicies.accessLevels
- Google Cloud: Managing access levels: https://docs.cloud.google.com/access-context-manager/docs/manage-access-levels
- Google Cloud: Custom access level specification: https://docs.cloud.google.com/access-context-manager/docs/custom-access-level-spec
- Google Cloud SDK: gcloud iap web add-iam-policy-binding: https://docs.cloud.google.com/sdk/gcloud/reference/iap/web/add-iam-policy-binding
- Google Cloud SDK: gcloud iap web enable: https://docs.cloud.google.com/sdk/gcloud/reference/iap/web/enable
- Google Cloud: Enabling IAP for App Engine: https://docs.cloud.google.com/iap/docs/enabling-app-engine
- Google Cloud: Enable IAP for Compute Engine: https://docs.cloud.google.com/iap/docs/enabling-compute-howto
- Google Cloud: Endpoint Verification overview: https://docs.cloud.google.com/endpoint-verification/docs/overview
- Terraform Registry: google_access_context_manager_access_level: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/access_context_manager_access_level
- Terraform Registry: google_iap_web_iam: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iap_web_iam

## Issues Found
- Access level names used hyphens, such as `managed-device` and `zero-trust-full`. Access Context Manager access level resource IDs must start with a letter and contain only alphanumeric characters or underscores, so these were changed to underscore names throughout the commands, file names, and IAM condition references.
- IAM condition examples used unquoted access level resource names in CEL expressions. CEL requires the access level resource name to be a string literal before checking membership in `request.auth.access_levels`, so the `gcloud` examples now wrap the resource names in double quotes inside single-quoted shell arguments.
- The Terraform IAM condition had the same unquoted CEL string issue. The expression now escapes quotes around the interpolated access level resource name.
- The combined access level example claimed to require other access levels but duplicated basic condition fields instead. It now uses `requiredAccessLevels` to reference the managed device and corporate network access levels.
- Endpoint Verification was described only as a Chrome extension and listed "presence of specific security software" as a direct reported attribute. The wording now mentions the helper app on supported desktop platforms and describes third-party posture signals as available when integrated.

## Review Notes
The core approach is technically valid: IAP can enforce Access Context Manager access levels through IAM Conditions using `request.auth.access_levels`. Device-based access levels require Endpoint Verification and the relevant Chrome Enterprise Premium/BeyondCorp licensing. The local workspace did not have `gcloud` installed, so CLI validation was performed against official Google Cloud SDK documentation rather than local `--help` output.
