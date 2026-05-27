# Validation Summary: How to Set Up Endpoint Verification for BeyondCorp Device Trust in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- BeyondCorp Enterprise / Chrome Enterprise Premium
- Endpoint Verification
- Google Admin console
- Access Context Manager access levels
- Identity-Aware Proxy
- Cloud Identity Devices API
- Google Cloud CLI
- Cloud Monitoring

## Sources Consulted
- Google Workspace Admin Help: Turn endpoint verification on or off: https://support.google.com/a/answer/9007320
- Access Context Manager: Access level attributes: https://cloud.google.com/access-context-manager/docs/access-level-attributes
- Access Context Manager REST reference: accessPolicies.accessLevels: https://cloud.google.com/access-context-manager/docs/reference/rest/v1/accessPolicies.accessLevels
- Access Context Manager shared type: DeviceManagementLevel: https://cloud.google.com/access-context-manager/docs/reference/rest/Shared.Types/DeviceManagementLevel
- Google Cloud CLI reference: gcloud iap web add-iam-policy-binding: https://cloud.google.com/sdk/gcloud/reference/iap/web/add-iam-policy-binding
- IAM Conditions attribute reference: request.auth.access_levels: https://cloud.google.com/iam/docs/conditions-attribute-reference
- IAP context-aware access guide: https://cloud.google.com/iap/docs/cloud-iap-context-aware-access-howto
- Cloud Identity Devices API: devices.list: https://cloud.google.com/identity/docs/reference/rest/v1/devices/list
- Cloud Identity Devices API: Device resource: https://cloud.google.com/identity/docs/reference/rest/v1/devices
- Cloud Monitoring metrics reference: https://cloud.google.com/monitoring/api/metrics

## Issues Found
- The prerequisite command enabled `endpoint-verification.googleapis.com`, which is not a documented Google Cloud API service for this workflow. Replaced it with the documented APIs used by the post: Access Context Manager, IAP, and Cloud Identity.
- The Admin console navigation for enabling Endpoint Verification was outdated. Updated it to the current Device signals path and setting name.
- The force-install steps omitted the documented extension-by-ID flow and certificate-management options. Updated the steps to match Google Workspace Admin Help.
- The native helper app section overstated that the helper is always required for deeper signals and used outdated package URLs. Updated the wording to reflect that the helper is required only for certain integrations or older Chrome versions, and replaced the URLs with Google's current helper app downloads.
- The `gcloud endpoint-verification list` examples used a non-existent gcloud command group. Replaced them with Cloud Identity Devices API `curl` examples that use documented device fields.
- The sample Access Context Manager level names used hyphens, but level names may only include letters, numbers, and underscores. Updated the examples and IAP condition reference to use underscores.
- The combined access level example claimed OR behavior while showing a single AND condition. Corrected the comment and added a separate `flexible-spec.yaml` example for OR logic across conditions.
- The Cloud Monitoring alert example used an undocumented monitored resource and metric type for Endpoint Verification disk encryption. Replaced it with guidance to export device inventory or create a custom metric because Cloud Monitoring does not expose a built-in Endpoint Verification disk-encryption metric.
- The device management level snippets used `ADVANCED`, which is not a valid Access Context Manager `DeviceManagementLevel` enum. Replaced it with `COMPLETE`.
- Troubleshooting and summary text implied the helper app is universally required. Updated those lines to match the current helper-app requirements.

## Review Notes
The post remains a practical tutorial, but command-line device inventory checks depend on credentials authorized for the Cloud Identity Devices API, which commonly requires domain-wide delegation in production automation.
