# Validation Summary: How to Configure Ingress Rules for VPC Service Controls Perimeters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud VPC Service Controls
- Access Context Manager
- Google Cloud CLI
- Cloud Logging audit logs
- Cloud Storage
- BigQuery
- Google Kubernetes Engine

## Sources Consulted
- Google Cloud VPC Service Controls ingress and egress rules: https://docs.cloud.google.com/vpc-service-controls/docs/ingress-egress-rules
- Google Cloud Access Context Manager Service Perimeters REST reference: https://docs.cloud.google.com/access-context-manager/docs/reference/rest/v1/accessPolicies.servicePerimeters
- Google Cloud CLI `gcloud access-context-manager perimeters update` reference: https://cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/update
- Google Cloud CLI `gcloud access-context-manager perimeters dry-run update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/dry-run/update
- Google Cloud VPC Service Controls supported service method restrictions: https://docs.cloud.google.com/vpc-service-controls/docs/supported-method-restrictions
- Google Cloud VPC Service Controls audit logging: https://docs.cloud.google.com/vpc-service-controls/docs/audit-logging
- Google Cloud VPC Service Controls troubleshooting guide: https://docs.cloud.google.com/vpc-service-controls/docs/troubleshooting

## Issues Found
- The opening description said VPC Service Controls perimeters block all API access from outside the boundary. Updated it to clarify that perimeters block outside access to protected resources for restricted services.
- The partner BigQuery example said ingress rules allow access to specific BigQuery datasets. Updated it to clarify that ingress rules target protected project resources and API methods, while dataset-level access should be limited with IAM.
- BigQuery method selectors used fully qualified `google.cloud.bigquery.v2.*` names. Updated them to the method names listed in the official supported method restrictions table, such as `JobService.InsertJob`.
- The Logging method selector used `google.logging.v2.LoggingServiceV2.ListLogEntries`. Updated it to `LoggingServiceV2.ListLogEntries`, matching the official supported method restrictions table.
- Cloud Logging filters referenced `protoPayload.metadata.@type`. Updated them to quote the special field name as `protoPayload.metadata."@type"`, matching Google Cloud audit log query examples.
- The dry-run audit log filter used `RESOURCES_NOT_IN_SAME_SERVICE_PERIMETER`. Updated it to the documented `RESOURCE_NOT_IN_SAME_SERVICE_PERIMETER` value.

## Review Notes
The Google Cloud CLI was not installed in the local workspace, so CLI flags were verified against the official Google Cloud CLI reference instead of local `gcloud --help` output.
