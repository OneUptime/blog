# Validation Summary: How to Implement VPC Service Controls to Protect Sensitive Data in a GCP Project

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud VPC Service Controls
- Access Context Manager
- Google Cloud CLI (`gcloud`)
- Cloud Logging
- Cloud Monitoring alerting policies
- BigQuery, Cloud Storage, Cloud SQL Admin API, Spanner, Dataflow, and Pub/Sub service perimeter configuration

## Sources Consulted
- Google Cloud CLI reference: `gcloud access-context-manager policies create` - https://docs.cloud.google.com/sdk/gcloud/reference/access-context-manager/policies/create
- Google Cloud CLI reference: `gcloud access-context-manager levels create` - https://docs.cloud.google.com/sdk/gcloud/reference/access-context-manager/levels/create
- Access Context Manager access level YAML reference - https://docs.cloud.google.com/access-context-manager/docs/example-yaml-file
- Access Context Manager access level attributes - https://docs.cloud.google.com/access-context-manager/docs/access-level-attributes
- VPC Service Controls create service perimeters - https://docs.cloud.google.com/vpc-service-controls/docs/create-service-perimeters
- Google Cloud CLI reference: `gcloud access-context-manager perimeters dry-run create` - https://docs.cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/dry-run/create
- VPC Service Controls ingress and egress rules - https://docs.cloud.google.com/vpc-service-controls/docs/ingress-egress-rules
- VPC Service Controls secure data exchange examples - https://docs.cloud.google.com/vpc-service-controls/docs/secure-data-exchange
- VPC Service Controls audit logging - https://docs.cloud.google.com/vpc-service-controls/docs/audit-logging
- VPC Service Controls manage dry run configurations - https://docs.cloud.google.com/vpc-service-controls/docs/manage-dry-run-configurations
- Google Cloud CLI reference: `gcloud monitoring policies create` - https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create

## Issues Found
- The combined access level example used `--combine-function=AND`, but the current `gcloud access-context-manager levels create` command accepts lowercase `and` or `or`. Changed it to `--combine-function=and`.
- The dry-run perimeter creation command used enforced-perimeter flags such as `--title`, `--resources`, `--restricted-services`, and `--access-levels`. For creating a new dry-run perimeter, the documented flags are `--perimeter-title`, `--perimeter-resources`, `--perimeter-restricted-services`, and `--perimeter-access-levels`. Updated the command and added `--perimeter-type=regular`.
- The BigQuery ingress rule used a fully qualified method name that is not the recommended selector form for BigQuery ingress/egress rules. Changed it to the supported permission selector `bigquery.jobs.create`.
- The BigQuery egress rule used an invalid `TableDataService.Tabledata` method selector. Replaced it with supported BigQuery permission selectors for reading a shared dataset: `bigquery.datasets.get`, `bigquery.tables.get`, and `bigquery.tables.getData`.
- The Cloud Monitoring alert command used non-existent flags: `--condition-threshold-value`, `--condition-comparison`, `--aggregation-alignment-period`, and `--aggregation-per-series-aligner`. Replaced them with current `gcloud monitoring policies create` flags: `--if`, `--duration`, `--aggregation`, and `--combiner`.

## Review Notes
The post is technically relevant and accurate after the fixes. Google recommends against relying on the `members` access-level attribute in some perimeter communication scenarios, but it remains supported by Access Context Manager; ingress and egress rules are usually the more precise mechanism for perimeter exceptions.
