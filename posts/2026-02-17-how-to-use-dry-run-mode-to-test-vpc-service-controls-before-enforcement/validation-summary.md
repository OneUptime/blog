# Validation Summary: How to Use Dry Run Mode to Test VPC Service Controls Before Enforcement

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Platform
- VPC Service Controls
- Access Context Manager
- Google Cloud CLI (`gcloud`)
- Cloud Logging
- BigQuery log exports
- YAML ingress and egress policy configuration

## Sources Consulted
- Google Cloud SDK reference: `gcloud access-context-manager perimeters dry-run create` - https://cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/dry-run/create
- Google Cloud SDK reference: `gcloud access-context-manager perimeters dry-run update` - https://cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/dry-run/update
- Google Cloud documentation: Manage dry run configurations - https://docs.cloud.google.com/vpc-service-controls/docs/manage-dry-run-configurations
- Google Cloud documentation: View logs routed to BigQuery - https://cloud.google.com/logging/docs/export/bigquery
- Access Context Manager REST reference: ServicePerimeter and ingress/egress policy schemas - https://cloud.google.com/access-context-manager/docs/reference/rest/v1/accessPolicies.servicePerimeters

## Issues Found
- The new dry-run-only perimeter example used `--resources`, `--restricted-services`, and `--title`. Those flags are for creating a dry-run configuration on an existing perimeter. For a new dry-run-only perimeter, the current `gcloud` syntax uses `--perimeter-resources`, `--perimeter-restricted-services`, and `--perimeter-title`. Updated the command accordingly.
- The dry-run behavior explanation said the actual API call still succeeds unconditionally. That is only true for violations that exist only in the dry-run configuration; an already-enforced perimeter can still deny requests. Clarified the wording.
- The dry-run log filters used a lower-level metadata type filter. Replaced them with the official documented Cloud Logging dry-run filter pattern using `log_id("cloudaudit.googleapis.com/policy")`, `severity="error"`, and `protoPayload.metadata.dryRun`.
- The BigQuery queries referenced `protopayload_auditlog.metadata.dryRun`, but routed audit log metadata is exported to BigQuery as `protopayload_auditlog.metadataJson`. Updated the queries to use `JSON_VALUE(protopayload_auditlog.metadataJson, '$.dryRun') = 'true'`.

## Review Notes
The Cloud SDK was not installed in the local environment, so command verification was performed against current official Google Cloud SDK and VPC Service Controls documentation rather than local `gcloud --help` output.
