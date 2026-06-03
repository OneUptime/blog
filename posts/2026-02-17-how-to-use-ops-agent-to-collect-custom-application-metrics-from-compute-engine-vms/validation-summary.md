# Validation Summary: Use Ops Agent to Collect Custom Application Metrics from Compute Engine VMs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Ops Agent
- Compute Engine
- Cloud Monitoring
- Managed Service for Prometheus / Prometheus metrics
- Python Flask
- Prometheus Python client
- StatsD
- JVM / JMX
- gcloud CLI
- Cloud Monitoring API

## Sources Consulted
- Google Cloud Ops Agent installation documentation: https://docs.cloud.google.com/monitoring/agent/ops-agent/installation
- Google Cloud Ops Agent configuration documentation: https://docs.cloud.google.com/monitoring/agent/ops-agent/configuration
- Google Cloud Ops Agent Prometheus receiver documentation: https://docs.cloud.google.com/monitoring/agent/ops-agent/prometheus
- Google Cloud Ops Agent JVM integration documentation: https://docs.cloud.google.com/monitoring/agent/ops-agent/third-party/jvm
- Google Cloud Ops Agent troubleshooting documentation: https://docs.cloud.google.com/monitoring/agent/ops-agent/troubleshooting
- Cloud Monitoring timeSeries.list API documentation: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/list
- gcloud monitoring policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud Monitoring PromQL alert policy documentation: https://cloud.google.com/monitoring/promql/create-promql-alerts
- Cloud Monitoring AlertPolicy API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Prometheus Python client documentation: https://prometheus.github.io/client_python/
- Prometheus StatsD exporter project: https://github.com/prometheus/statsd_exporter

## Issues Found
- The Ops Agent configuration section described three top-level sections including `combined`, which is not part of the documented configuration model. Changed the wording to describe the documented `receivers`, `processors`, and `service` building blocks used under metrics and logging.
- The Flask metrics endpoint returned a generic `text/plain` content type. Updated it to use `CONTENT_TYPE_LATEST` from the Prometheus Python client.
- The StatsD section showed a native Ops Agent `type: statsd` receiver, which is not supported in the current Ops Agent configuration. Replaced it with the supported pattern of running a StatsD-to-Prometheus exporter and scraping that endpoint with the Ops Agent Prometheus receiver.
- The Java section used `type: jmx`, nested fields under `config`, and a `target_system` field. Updated the example to use the documented `type: jvm` receiver with `endpoint` directly on the receiver.
- The Java command omitted the recommended `com.sun.management.jmxremote.rmi.port` setting. Added it with the same port as the JMX endpoint.
- The metric namespace description incorrectly said StatsD metrics collected by Ops Agent appear under `custom.googleapis.com`. Updated the wording to describe Prometheus-scraped metrics under `prometheus.googleapis.com` and JVM metrics under `workload.googleapis.com/jvm.*`.
- The `gcloud monitoring time-series list` example used a command that is not in the current stable gcloud Monitoring command reference. Replaced it with a `curl` example that calls the documented Cloud Monitoring `projects.timeSeries.list` API.
- The alerting command used non-existent `gcloud monitoring policies create` flags and did not compute P95 from histogram buckets. Replaced it with a PromQL alert policy file using `conditionPrometheusQueryLanguage` and `gcloud monitoring policies create --policy-from-file`.
- The troubleshooting section used an undocumented diagnostics command path and flag. Replaced it with the documented journal-based Ops Agent health-check log inspection command.

## Review Notes
The tutorial is now technically aligned with current Google Cloud documentation. Future improvements could add a concrete StatsD exporter installation command and mention OS-specific package commands for verifying the agent version, but those are optional enhancements rather than correctness fixes.
