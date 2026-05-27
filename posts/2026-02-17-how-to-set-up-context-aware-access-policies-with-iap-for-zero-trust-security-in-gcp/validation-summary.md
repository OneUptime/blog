# Validation Summary: How to Set Up Context-Aware Access Policies with IAP for Zero-Trust Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Identity-Aware Proxy
- Access Context Manager
- Context-Aware Access
- IAM Conditions / CEL
- Endpoint Verification
- Cloud Audit Logs / Cloud Logging
- Google Cloud CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud IAP context-aware access guide: https://docs.cloud.google.com/iap/docs/cloud-iap-context-aware-access-howto
- Google Cloud Access Context Manager basic access level guide: https://docs.cloud.google.com/access-context-manager/docs/create-basic-access-level
- Access Context Manager accessLevels REST reference: https://docs.cloud.google.com/access-context-manager/docs/reference/rest/v1/accessPolicies.accessLevels
- IAM Conditions attribute reference for `request.auth.access_levels`: https://docs.cloud.google.com/iam/docs/conditions-attribute-reference
- Google Cloud SDK `gcloud iap web add-iam-policy-binding` reference: https://docs.cloud.google.com/sdk/gcloud/reference/iap/web/add-iam-policy-binding
- IAP programmatic authentication guide: https://docs.cloud.google.com/iap/docs/authentication-howto
- Identity-Aware Proxy audit logging guide: https://docs.cloud.google.com/iap/docs/audit-log-howto
- Endpoint Verification device-based access level guide: https://docs.cloud.google.com/endpoint-verification/docs/creating-device-access-level
- Endpoint Verification overview and device attributes documentation: https://docs.cloud.google.com/endpoint-verification/docs/overview and https://docs.cloud.google.com/endpoint-verification/docs/device-information
- Terraform Google provider `google_access_context_manager_access_level` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/access_context_manager_access_level
- Terraform Google provider `google_iap_web_backend_service_iam` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iap_web_backend_service_iam

## Issues Found
- Access level IDs used hyphens, such as `corporate-network`, `managed-devices`, and `strict-access`. Access Context Manager level IDs must begin with a letter and contain only alphanumeric characters and underscores. Changed them to `corporate_network`, `managed_devices`, and `strict_access` throughout the commands and access level references.
- The strict access level title included a hyphen. Access level titles are documented as allowing letters, numbers, underscores, and spaces. Changed it to `Strict Access Corp Network and Managed Device`.
- The combining-conditions explanation said multiple conditions use OR logic by default. The Access Context Manager API defaults to AND for multiple condition blocks, while OR requires the combine function to be set. Updated the explanation.
- The `gcloud iap web add-iam-policy-binding` examples used unquoted access level names in CEL expressions. `request.auth.access_levels` checks require the access level full name as a string literal. Added the required CEL quotes and adjusted shell quoting.
- The curl test used `gcloud auth print-identity-token` without an audience and implied it would work directly for IAP. IAP programmatic access requires an IAP-accepted credential, such as an OAuth 2.0 ID token with the IAP OAuth client ID as audience or a service account JWT for the target URL. Replaced the token command with an `IAP_TOKEN` placeholder and clarified the requirement.
- The device posture prerequisites omitted the Chrome Enterprise Premium requirement for device-based access levels. Added it to the prerequisites and clarified that Endpoint Verification may require the native helper in addition to the Chrome extension.
- The audit log query filtered on `resource.type="iap_web"` and `protoPayload.methodName="AuthorizeUser"`, which does not match the current documented IAP audit logging guidance. Updated the filter to use `protoPayload.serviceName="iap.googleapis.com"` and the IAP web access permission, and clarified that logs list access levels that were met rather than all blocked levels.

## Review Notes
`gcloud` was not installed in the local workspace, so CLI validation was performed against official Google Cloud SDK documentation instead of local `--help` output. The Terraform snippets match the documented Google provider schemas for Access Context Manager access levels and IAP backend service IAM member resources.
