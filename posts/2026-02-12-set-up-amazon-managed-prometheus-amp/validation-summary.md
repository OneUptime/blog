# Validation Summary: How to Set Up Amazon Managed Prometheus (AMP)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Managed Service for Prometheus (AMP)
- AWS CLI
- AWS IAM and IRSA
- Amazon EKS
- Prometheus remote write and PromQL
- AWS Distro for OpenTelemetry (ADOT)
- Grafana Alloy
- Helm
- awscurl

## Sources Consulted
- Amazon Managed Service for Prometheus User Guide: https://docs.aws.amazon.com/prometheus/latest/userguide/what-is-Amazon-Managed-Service-Prometheus.html
- Amazon Managed Service for Prometheus customer managed collectors: https://docs.aws.amazon.com/prometheus/latest/userguide/self-managed-collectors.html
- Amazon Managed Service for Prometheus ADOT ingestion guide: https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-onboard-ingest-metrics-OpenTelemetry.html
- Amazon Managed Service for Prometheus existing Prometheus ingestion guide: https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-onboard-ingest-metrics-existing-Prometheus.html
- AWS CLI `amp create-workspace`: https://docs.aws.amazon.com/cli/latest/reference/amp/create-workspace.html
- AWS CLI `amp describe-workspace`: https://docs.aws.amazon.com/cli/latest/reference/amp/describe-workspace.html
- AWS CLI `amp create-rule-groups-namespace`: https://docs.aws.amazon.com/cli/latest/reference/amp/create-rule-groups-namespace.html
- AWS CLI `amp update-workspace-configuration`: https://docs.aws.amazon.com/cli/latest/reference/amp/update-workspace-configuration.html
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus remote write tuning: https://prometheus.io/docs/practices/remote_write/
- Amazon Managed Service for Prometheus pricing: https://aws.amazon.com/prometheus/pricing/
- Grafana Agent EOL notice: https://grafana.com/docs/agent/latest/
- Grafana Agent to Alloy migration documentation: https://grafana.com/docs/alloy/latest/set-up/migrate/
- Grafana Alloy `prometheus.remote_write`: https://grafana.com/docs/alloy/latest/reference/components/prometheus/prometheus.remote_write/
- Grafana Alloy `discovery.kubernetes`: https://grafana.com/docs/alloy/latest/reference/components/discovery/discovery.kubernetes/
- Grafana Alloy `prometheus.scrape`: https://grafana.com/docs/alloy/latest/reference/components/prometheus/prometheus.scrape/

## Issues Found
- The `describe-workspace` endpoint example omitted `/api/v1/` from `prometheusEndpoint`. Updated the example and derived remote write/query URLs to match AWS CLI output.
- The ADOT `sigv4auth` example omitted `service: aps`. Added it because AWS documentation states the SigV4 extension must specify the AMP service name.
- The post recommended Grafana Agent, which reached end-of-life on November 1, 2025. Replaced the example with a current Grafana Alloy configuration.
- The recording rules command passed raw heredoc content directly to the `--data` blob argument. Updated it to write a rules file and pass it with `fileb://`, which is compatible with AWS CLI v2 blob handling.
- The retention section said AMP retention was not configurable. Updated it to state the current 150-day default and configurable retention up to 1095 days.
- The pricing section described storage and query pricing as per-10-million stored/queried samples. Updated it to reflect current AWS pricing concepts: ingestion samples, GB-month storage for samples and metadata, and query samples processed.

## Review Notes
The Prometheus remote write, IAM `aps:RemoteWrite`, Helm chart values, `awscurl` query shape, and internal OneUptime cross-links were otherwise technically plausible. The snippets still use placeholder workspace IDs, account IDs, cluster names, and policy ARNs that readers must replace.
