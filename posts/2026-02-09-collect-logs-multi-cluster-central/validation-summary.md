# Validation Summary: How to Collect Logs from Multiple Kubernetes Clusters into a Central Backend

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Kubernetes logging architecture
- Grafana Loki
- Grafana Alloy
- Helm
- LogQL
- Elasticsearch and Elastic Cloud on Kubernetes
- Fluent Bit
- AWS CloudWatch Logs
- Google Cloud Logging with Fluentd
- Go zap logging
- Python structlog
- PrometheusRule alerts

## Sources Consulted
- Kubernetes Logging Architecture: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Grafana Loki Helm installation: https://grafana.com/docs/loki/latest/setup/install/helm/
- Grafana Loki storage configuration and TSDB recommendation: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki Promtail EOL notice: https://grafana.com/docs/loki/latest/clients/promtail/
- Grafana Alloy Kubernetes log collection: https://grafana.com/docs/alloy/latest/collect/logs-in-kubernetes/
- Grafana Alloy Kubernetes installation: https://grafana.com/docs/alloy/latest/set-up/install/kubernetes/
- Grafana Alloy `loki.write` reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.write/
- Grafana Loki LogQL documentation: https://grafana.com/docs/loki/latest/logql/
- Fluent Bit Kubernetes installation and CRI parser guidance: https://docs.fluentbit.io/manual/2.2/installation/kubernetes
- Fluent Bit Elasticsearch output reference: https://docs.fluentbit.io/manual/pipeline/outputs/elasticsearch
- Fluent Bit monitoring metrics reference: https://docs.fluentbit.io/manual/2.2/administration/monitoring
- Fluent Bit CloudWatch output reference: https://docs.fluentbit.io/manual/pipeline/outputs/cloudwatch
- Elastic Cloud on Kubernetes node configuration: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/node-configuration
- Elasticsearch ILM actions and rollover reference: https://www.elastic.co/guide/en/elasticsearch/reference/current/_actions.html and https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-rollover.html
- Elasticsearch 8 migration notes for ILM freeze no-op: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/migrating-8.0.html
- Google Cloud Logging agent configuration: https://docs.cloud.google.com/stackdriver/docs/solutions/agents/logging/configuration

## Issues Found
- Promtail was presented as a current collector and described as pull-based. Promtail is EOL as of March 2, 2026, and it pushes logs to Loki. Replaced the section with Grafana Alloy and corrected the architecture explanation.
- The Loki example used the deprecated `loki-distributed` Helm chart and BoltDB shipper with schema v11. Updated it to the current `grafana/loki` chart, distributed deployment mode, TSDB, and schema v13.
- Loki multi-tenancy was enabled without configuring matching gateway authentication. Added tenant and gateway basic-auth configuration to align with the Alloy client.
- LogQL examples used empty-compatible selectors (`{}` and `{cluster=~".*"}`), which Loki rejects. Replaced them with non-empty matchers.
- Fluent Bit used the Docker parser and `/var/lib/docker/containers` mount, which is not generally correct for modern Kubernetes clusters using CRI/containerd. Updated the example to use a CRI parser and `/var/log/containers`.
- Fluent Bit metrics alerts referenced a nonexistent histogram bucket and a nonexistent `pod` label. Replaced them with documented Fluent Bit Prometheus metrics.
- Elasticsearch ILM used the `freeze` action, which is a no-op in Elasticsearch 8.x. Replaced it with a searchable snapshot action.
- The Go zap example referenced an undefined `duration` variable and was not syntactically self-contained. Rewrote it as a minimal complete Go example.

## Review Notes
The examples still use placeholder credentials, hostnames, bucket names, storage classes, and secret names that must be adapted for a real environment. The Elasticsearch manifest is structurally aligned with ECK, but production deployments should use a currently supported Elasticsearch version and tune node roles, data tiers, TLS verification, shard counts, and ILM policies for the actual workload.
