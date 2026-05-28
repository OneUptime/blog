# Validation Summary: How to Choose the Right Cloud Spanner Instance Size for Your Workload

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Spanner
- Spanner processing units and nodes
- Google Cloud CLI
- Cloud Monitoring dashboards
- Spanner Autoscaler
- Cloud Run functions

## Sources Consulted
- Google Cloud Spanner compute capacity documentation: https://docs.cloud.google.com/spanner/docs/compute-capacity
- Google Cloud Spanner performance overview: https://docs.cloud.google.com/spanner/docs/performance
- Google Cloud Spanner quotas and limits: https://docs.cloud.google.com/spanner/quotas
- Google Cloud Spanner storage utilization metrics: https://docs.cloud.google.com/spanner/docs/storage-utilization
- Google Cloud Spanner table sizes statistics: https://docs.cloud.google.com/spanner/docs/introspection/table-sizes-statistics
- Google Cloud Spanner CPU utilization metrics: https://docs.cloud.google.com/spanner/docs/cpu-utilization
- Google Cloud Spanner autoscaling overview: https://cloud.google.com/spanner/docs/autoscaling-overview
- Google Cloud Spanner Autoscaler tool documentation: https://docs.cloud.google.com/spanner/docs/autoscaler-tool-overview
- Google Cloud Spanner Autoscaler on Cloud Run functions: https://docs.cloud.google.com/spanner/docs/set-up-autoscaling-cloud-run
- Google Cloud Spanner pricing: https://cloud.google.com/spanner/pricing
- Google Cloud CLI reference for `gcloud spanner databases describe`: https://cloud.google.com/sdk/gcloud/reference/spanner/databases/describe
- Google Cloud CLI reference for `gcloud spanner databases execute-sql`: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/databases/execute-sql
- Google Cloud CLI reference for `gcloud spanner instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/instances/create
- Google Cloud CLI reference for `gcloud spanner instances update`: https://cloud.google.com/sdk/gcloud/reference/spanner/instances/update
- Google Cloud CLI reference for `gcloud monitoring dashboards create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create

## Issues Found
- Updated per-node throughput estimates. The post used older approximate values of 10,000 reads per second and 2,000 writes per second. Current Spanner documentation lists higher peak estimates by configuration type, including 22,500 regional SSD reads per second and 3,500 regional SSD writes per second per node.
- Corrected storage capacity guidance. The post incorrectly stated 10 GB as a recommended per-node maximum and 2 TB as a hard limit. Current documentation lists 10 TiB per node for instances of 1 node or larger, and 1024 GiB per 100 processing units for smaller instances.
- Updated the data-volume, read-throughput, write-throughput, and combined sizing examples so the arithmetic matches the corrected storage and throughput values.
- Replaced the `gcloud spanner databases describe` data-size example with a documented `gcloud spanner databases execute-sql` query against `SPANNER_SYS.TABLE_SIZES_STATS_1HOUR`, because `describe` returns database metadata rather than table and index size statistics.
- Fixed the `gcloud spanner instances create` example by adding the required `--description` flag.
- Updated scaling timing language. Current documentation says most compute-capacity changes complete within a few minutes, while rare scale-ups can take up to an hour.
- Updated autoscaler wording from Cloud Functions to Cloud Run functions to match current Google Cloud documentation for the open-source Spanner Autoscaler deployment path.
- Updated pricing examples to reflect current US regional Standard edition on-demand rates and clarified that dual-region and multi-region pricing depends on edition and configuration.
- Changed storage pricing wording from GB to GiB to match Google Cloud billing units.

## Review Notes
The Google Cloud CLI was not installed in the local environment, so command validation was performed against official Google Cloud CLI reference documentation instead of local `gcloud --help` output.
