# Validation Summary: How to Create a Cloud Spanner Instance and Database Using the gcloud CLI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud
- Cloud Spanner
- Google Cloud CLI
- Spanner GoogleSQL DDL

## Sources Consulted
- Google Cloud CLI reference: `gcloud spanner instances create` - https://docs.cloud.google.com/sdk/gcloud/reference/spanner/instances/create
- Google Cloud CLI reference: `gcloud spanner databases create` - https://docs.cloud.google.com/sdk/gcloud/reference/spanner/databases/create
- Google Cloud CLI reference: `gcloud spanner databases ddl describe` - https://docs.cloud.google.com/sdk/gcloud/reference/spanner/databases/ddl/describe
- Google Cloud CLI reference: `gcloud spanner databases execute-sql` - https://docs.cloud.google.com/sdk/gcloud/reference/spanner/databases/execute-sql
- Cloud Spanner guide: Create and query a database using the Google Cloud CLI - https://docs.cloud.google.com/spanner/docs/getting-started/gcloud
- Cloud Spanner guide: Create and manage instances - https://docs.cloud.google.com/spanner/docs/create-manage-instances
- Cloud Spanner guide: Compute capacity, nodes and processing units - https://docs.cloud.google.com/spanner/docs/compute-capacity
- Cloud Spanner guide: Performance overview - https://docs.cloud.google.com/spanner/docs/performance
- Cloud Spanner guide: Make schema updates - https://docs.cloud.google.com/spanner/docs/schema-updates
- Cloud Spanner guide: Commit timestamps in GoogleSQL-dialect databases - https://docs.cloud.google.com/spanner/docs/commit-timestamp

## Issues Found
- The instance creation command used `--display-name`, but the current `gcloud spanner instances create` command requires `--description` for the value shown as the display name. Changed the command and surrounding wording to use `--description`.
- The post stated that each 1000 processing units provides roughly 10,000 reads per second or 2,000 writes per second. Current Spanner performance guidance lists higher regional SSD estimates of roughly 22,500 reads per second and 3,500 writes per second per 1000 processing units, with workload and schema caveats. Updated the claim.
- The post said multiple DDL statements can be passed by repeating `--ddl`. The documented `gcloud spanner databases create` behavior is a semicolon-separated `--ddl` value or `--ddl-file`. Changed the example to use one semicolon-separated `--ddl` value.
- The post described multi-region configurations without noting current edition constraints. Updated the wording to state that multi-region configurations require Enterprise Plus.

## Review Notes
The commands could not be tested locally because `gcloud` is not installed in this workspace, so validation was performed against current official Google Cloud documentation.
