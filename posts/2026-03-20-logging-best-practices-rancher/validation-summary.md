# Validation Summary: How to Implement Logging Best Practices in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher Logging
- Logging Operator
- Fluent Bit
- Fluentd
- Grafana Loki
- Kubernetes audit logging
- Kubernetes EventTailer and HostTailer
- Node.js
- Pino

## Sources Consulted
- Rancher logging integration docs: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/logging
- Rancher chart repository index: https://charts.rancher.io/index.yaml
- Rancher Logging chart package: https://charts.rancher.io/assets/rancher-logging/rancher-logging-109.0.0+up4.10.0-rancher.23.tgz
- Rancher Logging CRD chart package: https://charts.rancher.io/assets/rancher-logging-crd/rancher-logging-crd-109.0.0+up4.10.0-rancher.23.tgz
- Logging Operator overview: https://kube-logging.dev/docs/
- Logging Operator CRD namespace rules: https://kube-logging.dev/docs/configuration/crds/
- Logging Operator ClusterFlow docs: https://kube-logging.dev/docs/configuration/crds/v1beta1/clusterflow_types/
- Logging Operator Loki output docs: https://kube-logging.dev/docs/configuration/plugins/outputs/loki/
- Logging Operator HostTailer docs: https://kube-logging.dev/docs/configuration/extensions/kubernetes-host-tailer/
- Logging Operator EventTailer docs: https://kube-logging.dev/4.0/docs/configuration/extensions/kubernetes-event-tailer/
- Grafana Loki retention docs: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki metric query docs: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki log query docs: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki tutorial with structured log filtering examples: https://grafana.com/docs/enterprise-logs/latest/get-started/quick-start/tutorial/
- Kubernetes audit logging docs: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Rancher downstream audit log docs: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/enable-api-audit-log-in-downstream-clusters
- Pino README: https://github.com/pinojs/pino

## Issues Found
- The Rancher UI path was outdated. I changed `Cluster > Apps > Charts > Logging` to `Cluster > Apps > Logging` to match current Rancher docs.
- The Helm install example was incomplete for current Rancher charts. I changed it to install `rancher-logging-crd` first, then `rancher-logging`, and added `logging.enabled=true` and `logging.controlNamespace=cattle-logging-system` because the packaged chart does not enable the logging resource by default.
- The description of Rancher Logging internals was too loose. I clarified that the example uses the Logging Operator with Fluent Bit collecting logs and Fluentd forwarding them to Loki.
- The main `ClusterFlow` parsed every log as JSON, which is unsafe for cluster-wide collection because system logs are often plain text. I changed the parser to a documented `multi_format` fallback so JSON logs are parsed and non-JSON logs are kept.
- The Loki output example used custom label mappings that were not grounded in the current official examples. I simplified the output to keep the static `cluster` label and use the documented buffer settings.
- The Node.js `pino` example was missing the import, so it would not run as written. I added `const pino = require('pino');`.
- The Loki retention section mixed current compactor-based retention with deprecated `table_manager` retention as if both were standard current options. I replaced it with the current compactor-based approach and kept a note that Table Manager is deprecated and only for legacy index types.
- The `HighErrorRate` LogQL example filtered for a plain-text pattern that did not match the structured JSON example in the post. I changed it to parse JSON and filter `level="ERROR"` correctly.
- The `OOMKillDetected` alert relied on a non-standard label. I changed it to an EventTailer-based JSON query and explicitly marked it as an example that depends on Kubernetes events being shipped to Loki.
- The audit forwarding section was technically incorrect. Matching kube-apiserver pod labels does not forward file-based Kubernetes audit logs, and `loki-audit-output` was referenced without being defined. I replaced that section with a HostTailer-based audit file example, a dedicated `ClusterOutput`, and a `ClusterFlow` that matches the audit tailer.
- The cluster-wide log flow would have duplicated audit logs once the dedicated audit tailer was added. I excluded the `kube-audit` tailer from the main `all-logs` flow so audit logs remain separated.

## Review Notes
- The post is now technically consistent with Rancher v2.14-era docs and the current Rancher Logging chart packaging I verified on April 29, 2026.
- The audit log path shown, `/var/log/kube-audit/audit-log.json`, is Rancher's documented example path for collected kube-audit logs, but it still depends on audit logging already being enabled for the target cluster.
- The Rancher chart version I verified was `109.0.0+up4.10.0-rancher.23`, which packages Logging Operator `4.10.0`; future Rancher/chart releases may change UI wording or install defaults.
