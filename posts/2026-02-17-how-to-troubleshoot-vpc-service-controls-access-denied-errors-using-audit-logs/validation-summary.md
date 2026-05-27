# Validation Summary: How to Troubleshoot VPC Service Controls Access Denied Errors Using Audit Logs

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Google Cloud VPC Service Controls
- Cloud Audit Logs
- Google Cloud CLI (`gcloud`)
- Cloud Logging logs-based metrics
- Cloud Monitoring alert policies
- VPC Service Controls violation analyzer

## Sources Consulted
- Google Cloud VPC Service Controls audit logging: https://docs.cloud.google.com/vpc-service-controls/docs/audit-logging
- Google Cloud VPC Service Controls troubleshooting guide: https://docs.cloud.google.com/vpc-service-controls/docs/troubleshooting
- Google Cloud VPC Service Controls violation analyzer classic report guide: https://docs.cloud.google.com/vpc-service-controls/docs/troubleshooter
- Google Cloud VPC Service Controls violation analyzer guide: https://docs.cloud.google.com/vpc-service-controls/docs/violation-analyzer
- Google Cloud VPC Service Controls violation dashboard guide: https://docs.cloud.google.com/vpc-service-controls/docs/violation-dashboard
- Google Cloud SDK `gcloud logging metrics create` reference: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Google Cloud SDK `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Policy Troubleshooter IAM documentation: https://docs.cloud.google.com/policy-intelligence/docs/troubleshoot-access

## Issues Found
- The audit log queries used `protoPayload.metadata.@type`, but Google Cloud's documented query syntax quotes special field names as `protoPayload.metadata."@type"`. Updated all relevant queries.
- The unique-ID lookup searched `protoPayload.status.message`; the documented VPC Service Controls query uses `protoPayload.metadata.vpcServiceControlsUniqueId`. Updated the command to use the structured metadata field.
- The sample metadata used `securityPolicy`; current documentation describes `securityPolicyInfo` with `servicePerimeterName`. Updated the JSON example.
- The violation reason table listed `SERVICE_NOT_ALLOWED`; Google Cloud documents this scenario as `SERVICE_NOT_ALLOWED_FROM_VPC` for VPC accessible services. Updated the reason, meaning, and fix.
- The service agent fix suggested adding a Google-managed project to access levels, which is not how access levels work. Updated the fix to use ingress or egress rules for the service agent identity and service-specific VPC SC guidance.
- The post showed the IAM Policy Troubleshooter API as a VPC SC troubleshooter API. Google Cloud documents that Policy Troubleshooter does not diagnose VPC Service Controls denials; the VPC SC violation analyzer is available in the console. Replaced the API example with that clarification.
- The console instructions referred to a "Troubleshoot" top-menu action. Current Google Cloud documentation uses the VPC Service Controls "Violation analyzer" page with a "Troubleshooting token (or unique ID)" field. Updated the section wording and steps.
- The Cloud Monitoring alert example used non-current flags `--condition-threshold-value` and `--condition-threshold-duration`. Updated them to `--if` and `--duration`.
- The logs-based metric example used `--filter`; `gcloud logging metrics create` uses `--log-filter`. Updated the command.

## Review Notes
The post is technically relevant and useful after corrections. Google Cloud also provides a built-in VPC Service Controls violation dashboard, which may be preferable to a custom log-based metric and alert policy for organization-wide analysis.
