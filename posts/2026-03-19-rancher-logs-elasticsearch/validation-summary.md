# Validation Summary: How to Send Logs to Elasticsearch from Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Logging
- Kubernetes
- Logging operator / Fluentd
- Elasticsearch
- Amazon OpenSearch Service
- Elastic Cloud
- `kubectl`

## Sources Consulted
- SUSE Rancher docs, Outputs and ClusterOutputs: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/observability/logging/custom-resource-configuration/outputs-and-clusteroutputs.html
- Logging operator, Output and ClusterOutput: https://kube-logging.dev/docs/configuration/output/
- Logging operator, Elasticsearch output: https://kube-logging.dev/docs/configuration/plugins/outputs/elasticsearch/
- Logging operator, OpenSearch output: https://kube-logging.dev/docs/configuration/plugins/outputs/opensearch/
- Logging operator, Secret definition: https://kube-logging.dev/docs/configuration/plugins/outputs/secret/
- Logging operator, Parser filter: https://kube-logging.dev/docs/configuration/plugins/filters/parser/
- Kubernetes docs, `kubectl create secret generic`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Fluentd docs, `record_transformer`: https://docs.fluentd.org/filter/record_transformer
- Fluent plugin Elasticsearch upstream README: https://github.com/uken/fluent-plugin-elasticsearch
- Elastic docs, removal of mapping types: https://www.elastic.co/docs/manage-data/data-store/mapping/removal-of-mapping-types
- Elastic docs, ILM rollover requirements: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-rollover
- AWS docs, fine-grained access control in Amazon OpenSearch Service: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/fgac.html

## Issues Found
- The `ca_file` example used a raw file path. In Rancher Logging / Logging operator, CA files are referenced as mounted secrets, so the snippet was changed to `mountFrom.secretKeyRef`.
- The Elasticsearch examples explicitly set `type_name: "_doc"`. Mapping types are removed in Elasticsearch 8, so the explicit type field was removed from the current examples.
- The namespace-specific index example used `index_name: "kubernetes-${$.kubernetes.namespace_name}"`, which is not a valid Logging operator example as written. It was replaced with a supported `record_transformer` plus `target_index_key` pattern.
- The index template example mixed daily `logstash` indices with `index.lifecycle.rollover_alias`. Rollover aliases require rollover-style index management, not simple daily `logstash` index naming, so the alias setting was removed.
- The ILM example used a rollover action while the post configures daily `logstash` indices. The ILM example was changed to a non-rollover policy that fits daily indices.
- The parser filter used `suppress_parse_error_log`, which is not exposed by the current Logging operator parser CRD. It was replaced with the supported `emit_invalid_record_to_error: false`.
- The Amazon OpenSearch example used the `elasticsearch` output block for an OpenSearch-specific section. It was updated to use the `opensearch` output and clarified that the example assumes HTTP basic authentication with the internal user database.
- The verification commands relied on a short Elasticsearch hostname and a specific Fluentd label selector. They were adjusted to use pod discovery plus the same Elasticsearch service DNS name used earlier in the post.

## Review Notes
- The Amazon OpenSearch snippet now reflects the basic-auth path documented by AWS. If a domain requires IAM-signed requests instead, Rancher Logging's `awsElasticsearch` output is the better fit.
- The post still targets Rancher Logging resources such as `ClusterOutput` and `ClusterFlow`, which remain valid, but exact UI wording and chart packaging vary across Rancher releases.
