# Validation Summary: How to Set Up Ops Agent with StatsD and Prometheus Endpoints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Ops Agent
- Compute Engine
- Cloud Monitoring
- Prometheus receiver
- StatsD
- statsd_exporter
- Python StatsD and Prometheus client examples
- gcloud CLI

## Sources Consulted
- Google Cloud Ops Agent configuration documentation: https://docs.cloud.google.com/monitoring/agent/ops-agent/configuration
- Google Cloud Ops Agent installation documentation: https://docs.cloud.google.com/monitoring/agent/ops-agent/installation
- Google Cloud Prometheus receiver for Ops Agent on Compute Engine: https://docs.cloud.google.com/stackdriver/docs/managed-prometheus/setup-opsagent
- Google Cloud legacy Monitoring agent StatsD plugin documentation: https://docs.cloud.google.com/monitoring/agent/plugins/statsd
- Google Cloud CLI dashboard creation reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Google Cloud CLI alerting policy creation reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud alerting policies API guide: https://docs.cloud.google.com/monitoring/alerts/policies-in-api
- Google Cloud Monitoring metricDescriptors.list REST reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.metricDescriptors/list
- Prometheus statsd_exporter documentation: https://github.com/prometheus/statsd_exporter
- Prometheus Python client HTTP exporter documentation: https://prometheus.github.io/client_python/exporting/http/
- Prometheus Python client histogram documentation: https://prometheus.github.io/client_python/instrumenting/histogram/
- Python StatsD documentation: https://statsd.readthedocs.io/

## Issues Found
- The post incorrectly stated that the Ops Agent can act as a native StatsD receiver using `type: statsd`, `listen_address`, and `listen_port`. Current Google Cloud Ops Agent documentation does not define a StatsD receiver; Google's StatsD plugin documentation applies to the legacy Stackdriver Monitoring agent. I changed the StatsD path to use `statsd_exporter` and configured the Ops Agent to scrape the exporter's Prometheus endpoint.
- The Prometheus receiver was placed in the same metrics pipeline as `hostmetrics` and the claimed StatsD receiver. Google Cloud documents that Prometheus receiver pipelines must contain Prometheus receivers only and no processors. I split the configuration into separate `default_pipeline`, `statsd_pipeline`, and `prometheus_pipeline` entries.
- The post said Prometheus metrics might appear under `workload.googleapis.com/`. Google Cloud documents metrics from the Ops Agent Prometheus receiver as `prometheus.googleapis.com` metrics. I updated the verification command and explanation.
- The metric descriptor verification command used a `gcloud monitoring metrics-descriptors list` form that is not documented in the current Google Cloud CLI monitoring reference. I replaced it with the documented `projects.metricDescriptors.list` REST API call.
- The Ops Agent version check used a diagnostics command that is not the documented way to determine the installed package version. I replaced it with the documented Debian/Ubuntu `dpkg-query` command.
- The alerting policy example used non-current `gcloud alpha monitoring policies create` threshold flags. I replaced it with the current `gcloud monitoring policies create` flags: `--condition-filter`, `--if`, `--duration`, and `--aggregation`.
- The troubleshooting section described a Cloud Monitoring API scope issue as "firewall blocking." I changed it to an authorization/API enablement issue and mentioned metric write permissions.
- The StatsD Python example referred to the local Ops Agent and contained an undefined placeholder function. I changed the comment to reference `statsd_exporter` and added a minimal `process_request()` placeholder so the snippet is self-contained.

## Review Notes
The tutorial now uses the supported Ops Agent path for Prometheus scraping. In a production version, the `statsd_exporter` command should usually be wrapped in a systemd unit or another process manager, and teams should add a mapping file for stable metric names and labels.
