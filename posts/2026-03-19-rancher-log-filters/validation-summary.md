# Validation Summary: How to Configure Log Filters in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Rancher Logging
- Logging Operator
- Fluentd
- kubectl

## Sources Consulted
- SUSE Rancher logging overview: https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/latest/en/observability/logging/logging.html
- SUSE Rancher Outputs and ClusterOutputs: https://documentation.suse.com/cloudnative/rancher-manager/v2.14/en/observability/logging/custom-resource-configuration/outputs-and-clusteroutputs.html
- SUSE Rancher logging RBAC: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/observability/logging/rbac-for-logging.html
- Logging Operator Flow and ClusterFlow docs: https://kube-logging.dev/docs/configuration/flow/
- Logging Operator Fluentd log routing docs: https://kube-logging.dev/docs/configuration/log-routing/
- Logging Operator FlowSpec CRD reference: https://kube-logging.dev/docs/configuration/crds/v1beta1/flow_types/
- Logging Operator ClusterFlow CRD reference: https://kube-logging.dev/docs/configuration/crds/v1beta1/clusterflow_types/
- Logging Operator Fluentd filters index: https://kube-logging.dev/docs/configuration/plugins/filters/
- Logging Operator Tag Normaliser filter: https://kube-logging.dev/docs/configuration/plugins/filters/tagnormaliser/
- Logging Operator Exception Detector filter: https://kube-logging.dev/docs/configuration/plugins/filters/detect_exceptions/
- Logging Operator Parser filter: https://kube-logging.dev/docs/configuration/plugins/filters/parser/
- Logging Operator Record Transformer filter: https://kube-logging.dev/docs/configuration/plugins/filters/record_transformer/
- Fluentd parser filter docs: https://docs.fluentd.org/filter/parser
- Fluentd record_transformer docs: https://docs.fluentd.org/filter/record_transformer
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The prerequisites section was too vague about access requirements. I changed it to reflect Rancher’s documented RBAC split: cluster admin access is needed for `ClusterFlow` and `ClusterOutput`, while namespaced `Flow` and `Output` can be managed with project or namespace-level permissions.
- The “Rename Fields” subsection was not actually renaming fields; the example copies one value and derives another. I renamed that subsection to “Copy or Derive Fields” so it matches what the configuration really does.
- The post did not mention that `detectExceptions` and `tag_normaliser` are mutually exclusive in the same flow. I added that note because the Logging Operator documents the incompatibility explicitly.
- The `tag_normaliser` placeholder list included `${container_id}`, which is not a documented placeholder. I replaced it with the documented metadata keys, including `${pod_id}`, `${labels}`, and `${docker_id}`.
- The pipeline example used `suppress_parse_error_log`, which Fluentd removed from the v1 parser filter. I replaced it with `emit_invalid_record_to_error: false`, which is the documented current alternative.
- The verification commands used `kubectl logs ... | head -100`, but `kubectl logs` defaults to 10 lines when a label selector is used. I changed that to `--tail=100` and updated the error scan to a portable `grep -Ei` form.
- The `kubectl run` test command omitted `--restart=Never`, even though the current command defaults the pod restart policy to `Always`. I added `--restart=Never` so the test pod behaves as described and exits cleanly.

## Review Notes
- Current kube-logging routing docs typically show an explicit catch-all `match` such as `- select: {}` for select-all flows, while Rancher’s examples often omit it. I left the post’s filter-focused examples intact because Rancher still documents catch-all `ClusterFlow` examples without an explicit `match`, and the operator continues to support that behavior.
- The nested `remove_keys` example using `$.kubernetes.*` paths is valid; Fluentd’s `record_transformer` supports nested field deletion through `record_accessor` syntax.
