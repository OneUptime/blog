# Validation Summary: How to Set Up RHEL with GCP Ops Agent for Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Google Cloud Ops Agent
- Google Cloud Monitoring
- Google Cloud Logging
- Google Cloud CLI
- Prometheus scraping
- Fluent Bit and OpenTelemetry Collector

## Sources Consulted
- Google Cloud documentation: Installing the Ops Agent on individual VMs: https://docs.cloud.google.com/monitoring/agent/ops-agent/installation
- Google Cloud documentation: Configure the Ops Agent: https://docs.cloud.google.com/monitoring/agent/ops-agent/configuration
- Google Cloud documentation: Use the Ops Agent on Compute Engine for Prometheus metrics: https://docs.cloud.google.com/stackdriver/docs/managed-prometheus/setup-opsagent
- Google Cloud SDK reference: gcloud logging metrics create: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Google Cloud SDK reference: gcloud monitoring policies create: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud documentation: Ops Agent metrics: https://cloud.google.com/monitoring/api/metrics_opsagent
- Google Cloud documentation: Monitoring filters: https://docs.cloud.google.com/monitoring/api/v3/filters

## Issues Found
- The agent status verification command used `sudo systemctl status google-cloud-ops-agent`, but Google documents `sudo systemctl status google-cloud-ops-agent"*"` so the status check includes the Ops Agent components. Updated the command.
- The RHEL version check used `google_cloud_ops_agent_engine --version`, which is not the documented RHEL/CentOS method. Replaced it with the documented `rpm --query --queryformat ... google-cloud-ops-agent` command.
- The `parse_json` processor included `field: message`, but the current Ops Agent `parse_json` processor configuration does not support a `field` option. Removed the unsupported field.
- The alerting policy command used `--condition-threshold-value` and `--condition-threshold-duration`, which are not current `gcloud monitoring policies create` flags. Replaced them with `--if='> 0.8'` and `--duration=300s`.

## Review Notes
- The Prometheus receiver requires Ops Agent version 2.25.0 or later; installing the latest Ops Agent as shown satisfies this for new installs.
- The example keeps using `gcloud alpha monitoring policies create`; the same documented flag pattern is also available on the GA `gcloud monitoring policies create` command.
