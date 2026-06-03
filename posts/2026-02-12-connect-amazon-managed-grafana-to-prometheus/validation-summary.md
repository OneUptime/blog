# Validation Summary: How to Connect Amazon Managed Grafana to Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Managed Grafana
- Amazon Managed Service for Prometheus
- AWS IAM
- AWS CLI
- Grafana data sources and HTTP API
- Prometheus and PromQL
- Kubernetes metrics, node-exporter metrics, and recording rules

## Sources Consulted
- Amazon Managed Grafana documentation: Connect to Amazon Managed Service for Prometheus and open-source Prometheus data sources: https://docs.aws.amazon.com/grafana/latest/userguide/prometheus-data-source.html
- Amazon Managed Grafana documentation: Use AWS data source configuration to add Amazon Managed Service for Prometheus as a data source: https://docs.aws.amazon.com/grafana/latest/userguide/AMP-adding-AWS-config.html
- Amazon Managed Grafana documentation: Connect to an Amazon Managed Service for Prometheus data source: https://docs.aws.amazon.com/grafana/latest/userguide/amazon-prometheus-data-source.html
- Amazon Managed Service for Prometheus documentation: Set up Grafana for querying AMP: https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-onboard-query-standalone-grafana.html
- AWS Service Authorization Reference for Amazon Managed Service for Prometheus IAM actions/resources: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonmanagedserviceforprometheus.html
- AWS CLI Command Reference for `amp describe-workspace`: https://docs.aws.amazon.com/cli/latest/reference/amp/describe-workspace.html
- AWS CLI Command Reference for `iam put-role-policy`: https://docs.aws.amazon.com/cli/latest/reference/iam/put-role-policy.html
- AWS CLI Command Reference for AMP rule group namespaces: https://docs.aws.amazon.com/cli/latest/reference/amp/create-rule-groups-namespace.html
- Grafana documentation: Data source HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/data_source/
- Grafana documentation: Connect to Amazon Managed Service for Prometheus / SigV4 authentication: https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/prometheus/configure/aws-authentication/
- Grafana Labs dashboard pages for dashboard IDs 315, 3119, 1860, and 7362.

## Issues Found
- The IAM example put `aps:ListWorkspaces` in the same statement as workspace-scoped actions. `ListWorkspaces` does not support workspace resource ARNs, so I moved it to a separate statement with `Resource: "*"`.
- The AMP endpoint example omitted the `/api/v1/` suffix returned as `prometheusEndpoint` by `aws amp describe-workspace`. I updated the example and clarified that Grafana should use the workspace URL without `/api/v1/`.
- The Grafana setup used the core Prometheus data source as the primary current path. Amazon Managed Grafana v12 uses the Amazon Managed Service for Prometheus data source, and SigV4 support was removed from the core Prometheus plugin in AMG v12. I updated the UI text and API `type` to `grafana-amazonprometheus-datasource`, while preserving guidance for older core Prometheus data source setups.

## Review Notes
The PromQL examples are syntactically valid, but they depend on metric and label names provided by the user's scrape setup. Imported community dashboards may also require specific exporters, labels, or older panel plugins depending on the dashboard revision.
