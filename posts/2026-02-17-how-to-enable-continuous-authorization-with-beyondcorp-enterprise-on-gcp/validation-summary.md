# Validation Summary: How to Enable Continuous Authorization with BeyondCorp Enterprise on GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Identity-Aware Proxy (IAP)
- Access Context Manager access levels
- Endpoint Verification
- Chrome Enterprise Premium / BeyondCorp Enterprise
- Google Cloud CLI
- Cloud Audit Logs and logs-based metrics
- JavaScript Fetch API

## Sources Consulted
- IAP reauthentication documentation: https://docs.cloud.google.com/iap/docs/configuring-reauth
- IAP session management documentation: https://docs.cloud.google.com/iap/docs/sessions-howto
- IAP settings API reference: https://docs.cloud.google.com/iap/docs/reference/rest/v1/IapSettings
- `gcloud iap settings set` reference: https://docs.cloud.google.com/sdk/gcloud/reference/iap/settings/set
- Access Context Manager access level attributes: https://docs.cloud.google.com/access-context-manager/docs/access-level-attributes
- Access Context Manager access level YAML example: https://docs.cloud.google.com/access-context-manager/docs/example-yaml-file
- Access Context Manager access level management: https://docs.cloud.google.com/access-context-manager/docs/manage-access-levels
- IAP context-aware access documentation: https://docs.cloud.google.com/iap/docs/cloud-iap-context-aware-access-howto
- Chrome Enterprise Premium access levels documentation: https://docs.cloud.google.com/chrome-enterprise-premium/docs/access-levels
- Endpoint Verification device attributes: https://docs.cloud.google.com/endpoint-verification/docs/device-information
- Endpoint Verification sync documentation: https://docs.cloud.google.com/endpoint-verification/docs/sync-data
- Endpoint Verification certificate-based access documentation: https://cloud.google.com/chrome-enterprise-premium/docs/cba-endpoint-verification-certs
- Cloud Monitoring metrics list: https://cloud.google.com/monitoring/api/metrics

## Issues Found
- The post treated IAP reauthentication as the continuous authorization re-evaluation interval. Updated the explanation to distinguish reauthentication from IAP's per-request IAM authorization checks.
- The `gcloud iap settings set` example used a nonexistent `--access-settings-reauthentication-frequency` flag and omitted the required settings file positional argument. Replaced it with an `IapSettings` YAML file and the documented command syntax.
- The IAP settings YAML omitted `policyType` and used the settings file as if it enabled continuous access-level verification. Updated it to a valid reauthentication policy and moved access-level enforcement to IAM conditional bindings.
- The Endpoint Verification sync interval instructions claimed administrators could configure a 15-minute sync interval. Replaced this with the documented automatic reporting and posture update behavior.
- The session binding section overstated Endpoint Verification behavior. Reframed it as certificate-based access using Endpoint Verification or enterprise PKI certificates.
- The Cloud Logging filters referenced unsupported or undocumented fields and method names for device state and session revocation. Updated the examples to inspect access levels on IAP audit log entries.
- The monitoring alert example used a nonexistent `iap.googleapis.com/session_revocations` metric. Replaced it with a logs-based metric for denied IAP requests.
- The AJAX handling example assumed IAP would provide a `Location` header on a `401`. Updated it to follow IAP's documented AJAX session refresh pattern.
- Updated product naming from BeyondCorp Enterprise license to Chrome Enterprise Premium, noting the former product name.

## Review Notes
The guide is technically salvageable, but "continuous authorization" in this context depends on the freshness of the signals being evaluated. IAP re-checks IAM authorization on HTTP requests, while device posture changes are only reflected after Endpoint Verification reports updated device state. WebSocket connections are a caveat because IAP authorizes only the initial upgrade request and does not continuously monitor the persistent connection.
