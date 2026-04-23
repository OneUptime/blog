# Validation Summary: How to Configure Log Aggregation Pipelines in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Rancher Logging
- Logging operator
- Fluent Bit
- Fluentd
- Grafana Loki
- Elasticsearch
- Helm

## Sources Consulted
- Rancher Integration with Logging Services: https://ranchermanager.docs.rancher.com/integrations-in-rancher/logging
- rancher-logging Helm Chart Options: https://ranchermanager.docs.rancher.com/v2.12/integrations-in-rancher/logging/logging-helm-chart-options
- Rancher charts index and packaged chart metadata: https://charts.rancher.io/index.yaml
- Logging operator FlowSpec CRD reference: https://kube-logging.dev/docs/configuration/crds/v1beta1/flow_types/
- Logging operator Flow and ClusterFlow docs: https://kube-logging.dev/4.0/docs/configuration/flow/
- Logging operator log routing docs: https://kube-logging.dev/docs/configuration/log-routing/
- Logging operator Fluentd filters reference: https://kube-logging.dev/docs/configuration/plugins/filters/
- Logging operator Record Transformer filter: https://kube-logging.dev/docs/configuration/plugins/filters/record_transformer/
- Logging operator Grafana Loki output: https://kube-logging.dev/docs/configuration/plugins/outputs/loki/
- Logging operator Elasticsearch output: https://kube-logging.dev/5.2/docs/configuration/plugins/outputs/elasticsearch/
- Fluent Bit Kubernetes filter: https://docs.fluentbit.io/manual/data-pipeline/filters/kubernetes/
- Fluent Bit Loki output plugin: https://docs.fluentbit.io/manual/data-pipeline/outputs/loki
- Fluent Bit Helm chart values: https://github.com/fluent/helm-charts/blob/main/charts/fluent-bit/values.yaml
- Grafana Loki retention docs: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki Helm installation docs: https://grafana.com/docs/loki/latest/setup/install/helm/
- Fluentd parser filter docs: https://docs.fluentd.org/filter/parser
- Fluentd JSON parser docs: https://docs.fluentd.org/parser/json
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Helm install reference: https://helm.sh/docs/helm/helm_install/

## Issues Found
- The original Helm install step only installed `rancher-logging`. Rancher publishes the CRDs as a separate `rancher-logging-crd` chart, and the main chart leaves `logging.enabled` disabled by default. I updated Step 1 to install the CRD chart, refresh the repo, and enable the default `Logging` resource so the operator can actually reconcile a logging stack.
- The original `ClusterFlow` example used `kubernetes_metadata`, which is not a supported Fluentd filter in the Logging operator CRD, and it omitted a required `match` section. I replaced the unsupported filter with supported configuration and added an explicit `match` so the flow selects logs correctly.
- The catch-all `ClusterFlow` and the namespaced `Flow` would have both matched `production` logs, causing duplicate delivery to Loki. I changed the cluster-wide example to exclude the `production` namespace so the namespaced flow owns that routing path.
- The namespaced `Flow` example parsed the wrong field (`message` instead of the raw container log field), omitted `reserve_data`, used an invalid `record_transformer.records` shape, and attempted per-match `outputRefs`, which is not how the CRD routes outputs. I corrected the parser configuration, fixed the `records` list format, and split the routing into valid `globalOutputRefs` and `localOutputRefs`.
- The Elasticsearch output used `type_name: log`, which is outdated for modern Elasticsearch behavior. I changed it to `_doc`, which aligns with current Fluentd Elasticsearch plugin behavior for Elasticsearch 7+ and is ignored on Elasticsearch 8.
- The Fluent Bit alternative mixed a custom CRI parser with the Kubernetes `Merge_Log` path and used `Match *error*` for the Elasticsearch output. In Fluent Bit, `Match` operates on tags, not log content, so that configuration would not filter error messages as described. I switched the input to the documented `multiline.parser docker, cri`, removed the conflicting parser blocks, and made the Elasticsearch output an explicit optional secondary sink that matches the actual `kube.*` tag.
- The Loki retention example was a standalone `ConfigMap` that did not match how current Loki retention is configured. I replaced it with a valid Helm values fragment using `loki.compactor` and `loki.limits_config.retention_stream`, which is how current Loki enables retention.
- The Loki query example passed the LogQL selector inline in the URL instead of using URL encoding, and the prerequisites omitted `jq` even though the command used it. I fixed the query example and added `jq` to the prerequisites.
- The description mentioned Vector even though the post did not cover Vector and the Rancher logging examples were built around the Logging operator, Fluent Bit, and Fluentd. I removed the unsupported reference.

## Review Notes
- Rancher Logging sets `systemdLogPath` to `/run/log/journal` by default. Clusters that persist journald elsewhere, such as `/var/log/journal`, may need to override that value, especially on some K3s and RKE2 deployments.
- The Loki retention example now reflects the current configuration model, but `delete_request_store` must match the storage backend configured for the Loki deployment.
- The direct Fluent Bit DaemonSet example is an alternative to the Rancher Logging operator path, not something that should be deployed in parallel with it unless duplicate collection is intentional.
