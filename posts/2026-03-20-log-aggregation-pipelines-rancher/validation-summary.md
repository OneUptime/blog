# Validation Summary: How to Configure Log Aggregation Pipelines in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Fluent Bit
- Fluentd
- Grafana Loki
- Elasticsearch
- LogQL

## Sources Consulted
- Rancher logging overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/logging
- Rancher logging architecture: https://ranchermanager.docs.rancher.com/integrations-in-rancher/logging/logging-architecture
- Rancher outputs and cluster outputs: https://ranchermanager.docs.rancher.com/integrations-in-rancher/logging/custom-resource-configuration/outputs-and-clusteroutputs
- Fluent Bit forward output plugin: https://docs.fluentbit.io/manual/data-pipeline/outputs/forward
- Fluent Bit Kubernetes filter: https://docs.fluentbit.io/manual/data-pipeline/filters/kubernetes
- Fluent Bit tail input: https://docs.fluentbit.io/manual/data-pipeline/inputs/tail
- Fluentd forward input plugin: https://docs.fluentd.org/input/forward
- Fluentd parser filter: https://docs.fluentd.org/filter/parser
- Fluentd buffer configuration: https://docs.fluentd.org/configuration/buffer-section
- Fluentd Helm chart README: https://raw.githubusercontent.com/fluent/helm-charts/main/charts/fluentd/README.md
- Fluentd Helm chart values: https://raw.githubusercontent.com/fluent/helm-charts/main/charts/fluentd/values.yaml
- Fluent Bit Helm chart README: https://raw.githubusercontent.com/fluent/helm-charts/main/charts/fluent-bit/README.md
- Fluent Bit Helm chart values: https://raw.githubusercontent.com/fluent/helm-charts/main/charts/fluent-bit/values.yaml
- Grafana Loki Fluentd client docs: https://grafana.com/docs/loki/latest/send-data/fluentd/

## Issues Found
- The Helm install commands targeted the `observability` namespace but did not create it. I added `--create-namespace` so the commands work on a fresh cluster.
- The Fluent Bit and Fluentd forward configuration mixed in shared-key authentication incorrectly. The Fluent Bit example used `Shared_Key` without TLS, and the Fluentd `forward` source used `shared_key` outside the current `in_forward` security configuration model. I removed the shared-key settings so the example is valid plain Forward/TCP.
- The Fluentd chart values did not match the current official chart behavior. `replicaCount` is only used for `Deployment` or `StatefulSet`, the service does not expose port `24224` unless `service.ports` is set, and the Loki output plugin is not present unless it is installed. I added `kind: Deployment`, exposed port `24224`, and added `plugins: [fluent-plugin-grafana-loki]`.
- The Fluentd parser filter was technically unsafe in this pipeline. Fluent Bit already merged JSON logs and removed the `log` field on success, while Fluentd’s parser filter emits invalid records to `@ERROR` by default when `log` is missing or not JSON. I removed that filter block.
- The Loki output example placed `flush_interval` at the match level. I moved it under a `<buffer>` section to match current Fluentd/Loki plugin configuration guidance.
- The Rancher UI instructions were outdated. Current Rancher logging is installed from the cluster’s **Apps** page and managed through **Cluster Management > Explore > Logging** with `Flows`, `ClusterFlows`, `Outputs`, and `ClusterOutputs`. I updated that section accordingly.
- The example LogQL query used `namespace="production"`, but the configuration labels the real Kubernetes namespace name, not the derived environment string. I changed the query example to use a namespace placeholder instead.

## Review Notes
- Rancher’s built-in logging already deploys and manages its own Fluent Bit and Fluentd via the Logging operator. The manual Helm deployment path and the Rancher-managed path are best treated as alternative management models, not simultaneous required steps.
- The post description and architecture mention Elasticsearch and S3, but the concrete output example only configures Loki. That is not incorrect, but the post currently validates only the Loki path in executable detail.
- The official `fluent/helm-charts` repository now recommends the newer `fluent-bit-collector` and `fluent-bit-aggregator` charts when possible. The legacy `fluent/fluent-bit` chart is still available, so the post remains valid, but a future refresh could switch to the newer chart split.
