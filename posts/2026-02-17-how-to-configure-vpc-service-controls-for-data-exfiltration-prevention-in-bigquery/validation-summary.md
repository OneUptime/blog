# Validation Summary: How to Configure VPC Service Controls for Data Exfiltration Prevention

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud VPC Service Controls
- Access Context Manager
- BigQuery
- Cloud Storage
- Cloud Logging
- Cloud Monitoring
- Google Cloud CLI

## Sources Consulted
- Google Cloud SDK reference for `gcloud access-context-manager perimeters dry-run`: https://docs.cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/dry-run
- Google Cloud SDK reference for `gcloud access-context-manager perimeters dry-run create`: https://docs.cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/dry-run/create
- Google Cloud SDK reference for `gcloud access-context-manager perimeters dry-run update`: https://docs.cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/dry-run/update
- Google Cloud SDK reference for `gcloud access-context-manager perimeters update`: https://docs.cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/update
- Google Cloud Access Context Manager documentation for creating access policies: https://docs.cloud.google.com/access-context-manager/docs/create-access-policy
- Google Cloud Access Context Manager documentation for basic access levels: https://cloud.google.com/access-context-manager/docs/create-basic-access-level
- Google Cloud Access Context Manager access level attributes reference: https://docs.cloud.google.com/access-context-manager/docs/access-level-attributes
- Google Cloud VPC Service Controls ingress and egress rules documentation: https://docs.cloud.google.com/vpc-service-controls/docs/ingress-egress-rules
- Google Cloud VPC Service Controls supported method restrictions: https://docs.cloud.google.com/vpc-service-controls/docs/supported-method-restrictions
- Google Cloud VPC Service Controls audit logging documentation: https://docs.cloud.google.com/vpc-service-controls/docs/audit-logging
- Google Cloud SDK reference for `gcloud logging metrics create`: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Google Cloud SDK reference for `gcloud alpha monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create

## Issues Found
- The conceptual description said resources inside a perimeter can only communicate with resources inside the same perimeter. Updated it to clarify that this applies to protected services and that external access can be explicitly allowed.
- The access level example used `EU` as a `regions` value. Access Context Manager requires ISO 3166-1 alpha-2 geographic codes, so this was changed to `GB`.
- The dry-run perimeter creation command used `--title`, but the documented flag for `perimeters dry-run create` is `--perimeter-title`. Updated the command.
- The audit log filters used `protoPayload.metadata.@type`; Cloud Logging field paths with `@type` should quote that path component. Updated filters to use `protoPayload.metadata."@type"`.
- The ingress and egress examples used fully qualified BigQuery method names such as `google.cloud.bigquery.v2.JobService.InsertJob`. VPC Service Controls method selectors use documented method restriction names such as `JobService.InsertJob` and `TableDataService.InsertAll`. Updated the YAML snippets.
- The perimeter exception update command targeted the enforced perimeter with `gcloud access-context-manager perimeters update` even though the flow was still in dry-run mode. Updated it to `gcloud access-context-manager perimeters dry-run update`.
- The logs-based metric command used `--filter`, but `gcloud logging metrics create` uses `--log-filter`. Updated the command.
- The alert policy command used unsupported threshold flags for `gcloud alpha monitoring policies create`. Updated it to use the documented `--if="> 0"` and `--duration="60s"` flags.

## Review Notes
The overall guidance to begin with dry-run mode, review VPC Service Controls audit logs, and then enforce the perimeter is consistent with Google Cloud documentation. The Cloud Monitoring command uses an alpha CLI surface, which is valid but may change; using a policy YAML file or the GA monitoring commands would be a more stable future improvement.
