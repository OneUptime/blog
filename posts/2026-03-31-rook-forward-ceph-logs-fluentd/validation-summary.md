# Validation Summary: How to Forward Ceph Logs to Fluentd

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Fluentd (v1.16)
- Rook-Ceph
- Kubernetes (DaemonSet, ConfigMap)
- Elasticsearch 8.x (fluent-plugin-elasticsearch)
- AWS S3 (fluent-plugin-s3)

## Sources Consulted
- Fluentd official documentation — https://docs.fluentd.org/
- Fluentd `tail` input plugin docs — https://docs.fluentd.org/input/tail
- Fluentd `record_transformer` filter docs — https://docs.fluentd.org/filter/record_transformer
- Fluentd `copy` output plugin docs — https://docs.fluentd.org/output/copy
- Fluentd buffer plugin docs — https://docs.fluentd.org/configuration/buffer-section
- fluent-plugin-elasticsearch documentation — https://github.com/uken/fluent-plugin-elasticsearch
- Elasticsearch 8.x removal of mapping types — https://www.elastic.co/guide/en/elasticsearch/reference/8.0/removal-of-types.html
- fluent-plugin-s3 documentation — https://github.com/fluent/fluent-plugin-s3
- Kubernetes DaemonSet API reference — https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/daemon-set-v1/
- fluentd-kubernetes-daemonset Docker images — https://github.com/fluent/fluentd-kubernetes-daemonset

## Issues Found
1. **Removed `type_name _doc` from Elasticsearch output configuration.** The DaemonSet uses the image `fluent/fluentd-kubernetes-daemonset:v1.16-debian-elasticsearch8-1`, which targets Elasticsearch 8.x. Elasticsearch 8.x completely removed support for mapping types (the `_type` field). The `type_name` parameter in fluent-plugin-elasticsearch is unnecessary and incorrect for ES 8.x, and will produce deprecation warnings or errors. Removed the `type_name _doc` line from the `<match>` block.

## Review Notes
- The `serviceAccountName: fluentd` assumes a pre-existing ServiceAccount with appropriate RBAC permissions. Users will need to create this separately.
- The Fluentd buffer configuration (`retry_forever true`) is aggressive — in production, operators may want to set `retry_max_times` to avoid indefinite retries that could mask persistent backend failures.
- The S3 output in the multi-output example uses inline AWS credentials via environment variables. In production Kubernetes environments, using IAM Roles for Service Accounts (IRSA) or pod identity would be more secure.
