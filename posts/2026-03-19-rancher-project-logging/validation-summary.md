# Validation Summary: How to Configure Project-Level Logging in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Rancher Logging / Logging operator
- Fluentd
- Elasticsearch
- Grafana Loki

## Sources Consulted
- Rancher Integration with Logging Services: https://ranchermanager.docs.rancher.com/integrations-in-rancher/logging
- Role-based Access Control for Logging: https://ranchermanager.docs.rancher.com/integrations-in-rancher/logging/rbac-for-logging
- Flows and ClusterFlows: https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/logging/custom-resource-configuration/flows-and-clusterflows
- Outputs and ClusterOutputs: https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/logging/custom-resource-configuration/outputs-and-clusteroutputs
- Logging Architecture: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/observability/logging/logging-architecture.html
- Logging operator FlowSpec: https://kube-logging.dev/4.11/docs/configuration/crds/v1beta1/flow_types/
- Logging operator Parser filter: https://kube-logging.dev/4.8/docs/configuration/plugins/filters/parser/
- Logging operator Record Transformer filter: https://kube-logging.dev/4.2/docs/configuration/plugins/filters/record_transformer/
- Logging operator Grep filter: https://kube-logging.dev/4.0/docs/configuration/plugins/filters/grep/
- Logging operator Elasticsearch output: https://kube-logging.dev/4.0/docs/configuration/plugins/outputs/elasticsearch/
- Logging operator Loki output: https://kube-logging.dev/docs/configuration/plugins/outputs/loki/
- Logging operator Secret definition: https://kube-logging.dev/4.7/docs/configuration/plugins/outputs/secret/
- kubectl create secret generic: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- kubectl logs: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- Corrected the RBAC explanation in the introduction, prerequisites, architecture section, and summary. Rancher documents that project owners can create namespaced `Flow` and `Output` resources, while project members are view-only.
- Corrected the Rancher UI navigation steps to match the current documented path: `Cluster Management` > target cluster > `Explore` > `Logging`.
- Clarified the multiple-output example so it accurately states that error logs are also sent to a dedicated output rather than implying exclusive routing.
- Clarified the `record_transformer` example to reflect that `remove_keys` removes top-level fields instead of generically “redacting sensitive data.”
- Corrected the `kubectl logs` troubleshooting commands to use `--tail=-1`. With a label selector, `kubectl logs` defaults to only the last 10 lines unless `--tail` is set explicitly.

## Review Notes
- The post’s CRD group/version `logging.banzaicloud.io/v1beta1` matches current Rancher and Logging operator documentation as of 2026-05-07.
- The YAML structures for `Flow`, `Output`, `localOutputRefs`, `globalOutputRefs`, `match`, `parser`, `grep`, Elasticsearch secrets, and Loki output configuration align with the official documentation reviewed.
