# Validation Summary: How to Restrict Application Access by Device Security Posture with BeyondCorp

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Google Cloud BeyondCorp Enterprise / Chrome Enterprise Premium
- Endpoint Verification
- Access Context Manager access levels
- Identity-Aware Proxy (IAP)
- IAM Conditions
- Cloud Identity Devices API
- Cloud Monitoring dashboards

## Sources Consulted
- Access Context Manager access level attributes: https://docs.cloud.google.com/access-context-manager/docs/access-level-attributes
- Access Context Manager access levels REST reference: https://docs.cloud.google.com/access-context-manager/docs/reference/rest/v1/accessPolicies.accessLevels
- Access Context Manager DeviceManagementLevel enum reference: https://docs.cloud.google.com/access-context-manager/docs/reference/rest/Shared.Types/DeviceManagementLevel
- Creating basic access levels with gcloud: https://docs.cloud.google.com/access-context-manager/docs/create-basic-access-level
- Custom access level specification and device attributes: https://docs.cloud.google.com/access-context-manager/docs/custom-access-level-spec
- Context-aware access with IAP: https://docs.cloud.google.com/iap/docs/cloud-iap-context-aware-access-howto
- Creating and applying access levels to IAP-secured resources: https://docs.cloud.google.com/chrome-enterprise-premium/docs/access-levels
- gcloud iap web add-iam-policy-binding reference: https://docs.cloud.google.com/sdk/gcloud/reference/iap/web/add-iam-policy-binding
- IAP customization settings: https://docs.cloud.google.com/iap/docs/customizing
- gcloud iap settings set reference: https://docs.cloud.google.com/sdk/gcloud/reference/iap/settings/set
- Cloud Identity Devices API overview: https://docs.cloud.google.com/identity/docs/concepts/overview-devices
- Cloud Identity devices.list reference: https://docs.cloud.google.com/identity/docs/reference/rest/v1/devices/list
- Cloud Identity Device resource reference: https://docs.cloud.google.com/identity/docs/reference/rest/v1/devices

## Issues Found
- Access level names used hyphens, but Access Context Manager level names must begin with a letter and include only letters, numbers, and underscores. Changed examples and IAP condition references to use underscore names such as `disk_encrypted` and `full_posture`.
- `allowedDeviceManagementLevels` used `ADVANCED`, which is not a valid Access Context Manager enum. Changed it to `COMPLETE`.
- The device signal list included policy attributes that are not supported as basic device policy fields. Replaced those with supported Access Context Manager and custom access level device attributes.
- `requireVerifiedChromeOs: false` was shown on non-ChromeOS OS constraints. Removed those fields and kept `requireVerifiedChromeOs` only on the ChromeOS constraint.
- Monitoring examples used a non-official `gcloud endpoint-verification list` command group. Replaced them with Cloud Identity Devices API `curl` examples using documented device fields.
- The IAP custom error page command used a non-existent `--access-denied-page-uri` flag. Added an `iap-settings.yaml` example and changed the command to pass that file to `gcloud iap settings set`.
- The rollout section referred to a monitor-only mode for posture enforcement. Changed it to review IAP audit logs for the access levels users already satisfy, which matches the documented IAP logging behavior.

## Review Notes
The post is technically valid after fixes. Some examples still use placeholders such as `POLICY_NUMBER`, `ACCESS_TOKEN`, project IDs, and backend service names; readers must replace these with real environment values. The Cloud Identity Devices API examples require appropriate Devices API authorization, commonly via domain-wide delegation.
