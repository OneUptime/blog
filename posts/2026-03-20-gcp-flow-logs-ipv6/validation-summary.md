# Validation Summary: How to Monitor IPv6 Traffic on GCP with Flow Logs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud VPC Flow Logs
- Google Cloud VPC dual-stack subnets and IPv6
- Cloud Logging and Logs Explorer
- Google Cloud CLI (`gcloud`)
- BigQuery and the `bq` CLI
- Terraform `google_compute_subnetwork`

## Sources Consulted
- Google Cloud VPC Flow Logs overview: https://docs.cloud.google.com/vpc/docs/flow-logs
- Configure VPC Flow Logs: https://docs.cloud.google.com/vpc/docs/using-flow-logs
- Access flow logs: https://docs.cloud.google.com/vpc/docs/access-flow-logs
- About VPC Flow Logs records: https://docs.cloud.google.com/vpc/docs/about-flow-logs-records
- Cloud Logging query language: https://docs.cloud.google.com/logging/docs/view/logging-query-language
- Route logs to supported destinations: https://docs.cloud.google.com/logging/docs/export/configure_export_v2
- View logs routed to BigQuery: https://docs.cloud.google.com/logging/docs/export/bigquery
- `gcloud compute networks subnets create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/create
- `gcloud compute networks subnets update` reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update
- `gcloud logging sinks create` reference: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- BigQuery `bq` CLI reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- BigQuery dataset IAM/access controls: https://cloud.google.com/bigquery/docs/control-access-to-resources-iam
- Terraform Registry `google_compute_subnetwork`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork

## Issues Found
- The `gcloud compute networks subnets` examples used incorrect flag values for `--logging-aggregation-interval` and `--logging-metadata`. I changed them from API-style enum values like `INTERVAL_5_MIN` and `INCLUDE_ALL_METADATA` to the CLI values `interval-5-min` and `include-all`, which match the current `gcloud` reference.
- The new subnet example used `--ipv6-access-type=INTERNAL` without the required ULA-enabled network prerequisite. I changed it to `EXTERNAL` so the example is generally valid for a standard dual-stack subnet example.
- The Cloud Logging filters targeted only `resource.type="gce_subnetwork"` and relied on an ungrouped `AND`/`OR` expression. I added the exact VPC Flow Logs `logName` filter and grouped the IPv6 conditions so the queries correctly target `compute.googleapis.com/vpc_flows`.
- The Log Explorer example for port `443` used the port as a quoted string. I changed it to a numeric comparison because `dest_port` is numeric in VPC Flow Logs.
- The Log Explorer example labeled as "Dropped IPv6 packets" was inaccurate. `jsonPayload.reporter="SRC"` indicates the reporting side of the flow, not that packets were dropped. I relabeled the example to describe source-reported IPv6 flows.
- The BigQuery sink section used `bq add-iam-policy-binding` against a dataset. BigQuery's CLI reference says that command doesn't support datasets. I replaced it with `gcloud projects add-iam-policy-binding ... --role=roles/bigquery.dataEditor`, which matches Google Cloud's sink-permission guidance.
- The BigQuery sample query described as covering the "last 24 hours" only filtered by table suffix, which can include more than 24 hours of data. I added a `timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ...)` predicate so the time windows are accurate while preserving shard pruning.
- The conclusion claimed that `flow_sampling = 1.0` provides complete IPv6 traffic visibility. Google Cloud documents that VPC Flow Logs always applies an uncontrollable primary sampling stage. I corrected the statement to explain that `1.0` retains all flow logs produced by the primary sampler, not all packets.

## Review Notes
- Google Cloud currently recommends enabling subnet flow logs through the Network Management API, but the Compute Engine API-based subnet examples in this post remain supported after the corrections above.
- The BigQuery SQL examples assume the default date-sharded sink output because the sink command doesn't use `--use-partitioned-tables`. If the sink is created with partitioned tables instead, the table name and partition filter pattern would need to change.
