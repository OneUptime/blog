# Validation Summary: How to Set Up Multi-Cluster Logging in Rancher

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Rancher (rancher-logging chart)
- Banzai Cloud / kube-logging Logging Operator (`logging.banzaicloud.io/v1beta1`)
- Kubernetes (Helm, kubectl)
- Fluentd / Fluent Bit
- Elasticsearch
- Splunk HEC
- Grafana Loki (mentioned)
- Vector (mentioned)

## Sources Consulted
- Rancher Logging docs: https://ranchermanager.docs.rancher.com/integrations-in-rancher/logging
- kube-logging Logging Operator docs: https://kube-logging.dev/docs/
- Logging Operator GitHub source: https://github.com/kube-logging/logging-operator
  - `pkg/sdk/logging/model/output/splunk_hec.go` — verified `hec_token` field name
  - `pkg/sdk/logging/model/output/elasticsearch.go` — verified Elasticsearch output field names
  - `pkg/sdk/logging/model/filter/record_transformer.go` — verified filter format
  - `pkg/sdk/logging/model/filter/tagnormaliser.go` — verified tag_normaliser
  - `clusterflow_types.go` — verified ClusterFlowSpec fields
- kube-logging "Flow and ClusterFlow" routing docs (match/select/exclude semantics)

## Issues Found
- **Step 4 (Splunk ClusterOutput): wrong field name `token`.** The Banzai Cloud / kube-logging Logging Operator's `SplunkHecOutput` Go struct defines the HEC token field as `hec_token` (`HecToken *secret.Secret \`json:"hec_token"\``), not `token`. Using `token` would fail CRD validation. Changed `token:` to `hec_token:` in the YAML snippet. The inner `secretKeyRef.key: token` remains unchanged since that's just the key name inside the user's Kubernetes Secret.

## Review Notes
- The `match: - select: {}` pattern is valid for "match all pods" — empty `ClusterSelect` matches everything per the operator's routing semantics.
- All other Logging Operator field names verified against upstream Go source: `record_transformer` filter, `tag_normaliser` filter, ClusterFlow `globalOutputRefs`, namespaced Flow `localOutputRefs`, Elasticsearch `host`/`port`/`scheme`/`index_name`/`user`/`password`/`buffer.flush_interval`/`buffer.chunk_limit_size`.
- Helm repo `https://charts.rancher.io` and chart `rancher-charts/rancher-logging` are correct per current Rancher docs.
- The `app.kubernetes.io/name=fluentd` label selector matches the Fluentd StatefulSet pods deployed by the operator.
- The `logging.banzaicloud.io/v1beta1` API group is the long-standing v1beta1 API and remains current; readers on very new operator versions may eventually need to consult upstream for any future API group rename, but no deprecation has shipped as of the post date.
