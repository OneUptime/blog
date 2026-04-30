# Validation Summary: How to Configure Harvester Logging - Config

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- Rancher Logging
- Logging Operator
- Fluent Bit
- Fluentd
- Elasticsearch
- Splunk HEC
- Kubernetes

## Sources Consulted
- Harvester v1.7 logging documentation: https://docs.harvesterhci.io/v1.7/logging/harvester-logging/
- Logging Operator `Output` and `ClusterOutput` documentation: https://kube-logging.dev/docs/configuration/output/
- Logging Operator Fluentd match/routing documentation: https://kube-logging.dev/docs/configuration/log-routing/
- Logging Operator Elasticsearch output documentation: https://kube-logging.dev/docs/configuration/plugins/outputs/elasticsearch/
- Logging Operator Splunk HEC output documentation: https://kube-logging.dev/docs/configuration/plugins/outputs/splunk_hec/
- Logging Operator buffer documentation: https://kube-logging.dev/docs/configuration/plugins/outputs/buffer/
- Logging Operator parser filter documentation: https://kube-logging.dev/docs/configuration/plugins/filters/parser/
- Logging Operator record transformer documentation: https://kube-logging.dev/docs/configuration/plugins/filters/record_transformer/
- Logging Operator grep filter documentation: https://kube-logging.dev/docs/configuration/plugins/filters/grep/
- Harvester official source documentation for built-in system logging components: https://github.com/harvester/harvester/blob/master/enhancements/20220525-system-logging.md

## Issues Found
- The introduction incorrectly claimed Harvester collects logs from all nodes, VMs, and workloads. Harvester documents collection of cluster Pod logs, kernel logs from each node, and logs from select systemd services, so the opening description was corrected to match that scope.
- The UI enablement path was incorrect. Harvester exposes logging as the `rancher-logging` addon, so the instructions were corrected to `Advanced -> Addons -> rancher-logging -> Enable`.
- The Elasticsearch `ClusterOutput` example explicitly set `type_name: fluentd`. Current Logging Operator documentation does not require that field for this example, so it was removed.
- The namespaced `Flow` example referenced a `ClusterOutput` through `localOutputRefs`, filtered the wrong log field (`log` instead of Harvester's `message` field), and ordered `select` before `exclude` even though match rules are order-sensitive. The example was corrected to use `globalOutputRefs`, match `message`, and place `exclude` before `select`.
- The node-log section claimed Harvester supports arbitrary `/var/log` or journald collection and matched on an unverified `component: systemd` label. Harvester's documentation says the built-in addon does not support changing which logs are collected, so that section was corrected to explain the limitation and show routing by `hosts` instead.
- The Fluentd verification command would fail against Harvester's multi-container Fluentd pod without `--all-containers=true`, and the pod selection needed to avoid the configcheck pod. The commands were updated to target Harvester's built-in Fluent Bit and Fluentd pod names more reliably.
- The high-volume buffer example used an unquoted numeric `retry_exponential_backoff_base`, while the CRD documents that field as a string. It was corrected to `"2"`.
- The Prometheus best-practice line said to "tail" Fluentd buffer size in Prometheus. That wording was incorrect, so it was corrected to "monitor".

## Review Notes
- Harvester's built-in logging addon supports changing destinations and applying Flow or ClusterFlow filtering, but Harvester explicitly documents that changing the set of collected logs is not supported.
- The post does not pin a Harvester version, so this review was validated against the Harvester v1.7 documentation available on April 30, 2026.
