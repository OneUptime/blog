# Validation Summary: How to Create Context-Aware Access Policies for BeyondCorp Enterprise

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud
- BeyondCorp Enterprise / Chrome Enterprise Premium
- Access Context Manager
- Identity-Aware Proxy
- IAM Conditions
- Common Expression Language (CEL)
- Google Cloud CLI

## Sources Consulted
- Access Context Manager: Create a basic access level: https://docs.cloud.google.com/access-context-manager/docs/create-basic-access-level
- Access Context Manager: Access level attributes: https://docs.cloud.google.com/access-context-manager/docs/access-level-attributes
- Access Context Manager: Custom access level specification: https://docs.cloud.google.com/access-context-manager/docs/custom-access-level-spec
- Access Context Manager REST reference for access levels and device policy enums: https://docs.cloud.google.com/access-context-manager/docs/reference/rest/v1/accessPolicies.accessLevels
- Google Cloud CLI reference for `gcloud access-context-manager levels create`: https://cloud.google.com/sdk/gcloud/reference/access-context-manager/levels/create
- Google Cloud CLI reference for `gcloud access-context-manager policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/access-context-manager/policies/create
- Google Cloud CLI reference for `gcloud iap web add-iam-policy-binding`: https://docs.cloud.google.com/sdk/gcloud/reference/iap/web/add-iam-policy-binding
- IAP context-aware access guide: https://docs.cloud.google.com/iap/docs/cloud-iap-context-aware-access-howto
- IAP audit logging guide: https://docs.cloud.google.com/iap/docs/audit-log-howto
- IAM condition linting guide and CLI reference: https://docs.cloud.google.com/iam/docs/linting-policies and https://docs.cloud.google.com/sdk/gcloud/reference/alpha/iam/policies/lint-condition

## Issues Found
- Access level IDs used hyphens, but Access Context Manager level names must use letters, numbers, and underscores. Changed examples such as `corp-network`, `managed-device`, `allowed-regions`, `flexible-access`, `custom-time-based`, and `strict-access` to underscore-based IDs and updated references.
- The company-owned device example used `allowedDeviceManagementLevels: ADVANCED`, which is not a valid Access Context Manager device management enum. Changed it to `COMPLETE`.
- The custom access level nesting example used `request.auth.access_levels`, which is for IAM Conditions on IAP bindings, not for custom Access Context Manager CEL. Changed it to use the documented `levels.managed_device && levels.corp_network` syntax.
- The IAP binding referenced `strict_access` without first creating that access level. Added a matching `gcloud access-context-manager levels create strict_access` command after the strict access YAML.
- The testing section used a nonexistent `gcloud access-context-manager levels test-iam-permissions` command. Replaced it with the documented IAM condition linting command using `gcloud alpha iam policies lint-condition`.
- The monitoring log filter used an unsupported-looking `AuthorizeUser` method name. Changed the filter to use IAP service name plus the documented `iap.webServiceVersions.accessViaIAP` authorization permission.
- The introductory claim said access is granted only when all conditions are satisfied, which was too broad because the post also explains OR logic. Adjusted it to say access is granted when the configured policy logic is satisfied.

## Review Notes
- `gcloud` was not installed in the local workspace, so command verification was performed against official Google Cloud CLI reference documentation instead of local `--help` output.
- The IAP `--condition` examples are syntactically consistent with the Google Cloud CLI reference, but production use should account for regional backend services by adding `--region` when the backend service is regional.
