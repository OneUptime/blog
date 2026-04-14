# Validation Summary: How to Use Dapr Logging with Fluentd

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Dapr (sidecar logging, annotations, JSON log format)
- Fluentd (DaemonSet deployment, configuration, plugins)
- Fluent Bit (lightweight alternative)
- Kubernetes (RBAC, DaemonSet, ConfigMap, ServiceAccount)
- Elasticsearch (log storage backend)
- Kibana (log querying and visualization)

## Sources Consulted
- Dapr documentation: sidecar annotations and structured logging configuration (https://docs.dapr.io/operations/configuration/logging/)
- Dapr documentation: Kubernetes annotations reference (https://docs.dapr.io/reference/arguments-annotations-overview/)
- Fluentd documentation: input tail plugin, parser filter, rewrite_tag_filter, elasticsearch output (https://docs.fluentd.org/)
- Fluentd Kubernetes DaemonSet image documentation (https://github.com/fluent/fluentd-kubernetes-daemonset)
- Fluent Bit Helm chart values reference (https://github.com/fluent/helm-charts/tree/main/charts/fluent-bit)
- Elasticsearch 8.x documentation: removal of mapping types (https://www.elastic.co/guide/en/elasticsearch/reference/current/removal-of-types.html)
- Kubernetes API reference: DaemonSet, RBAC, PodSpec (https://kubernetes.io/docs/reference/)

## Issues Found

### 1. Fluent Bit Helm command would not work (Fixed)
**What was wrong:** The `--set config.outputs="[OUTPUT]\n    Name  es\n    Host  ..."` approach does not work because Helm's `--set` flag treats `\n` as literal characters, not newlines. The resulting configuration string would be malformed and Fluent Bit would fail to parse it.
**What was changed:** Replaced the inline `--set` approach with a proper values file (`fluent-bit-values.yaml`) and `-f` flag, which correctly handles multi-line configuration. Also added the missing `Match *` directive which is required for the output to receive any logs.

### 2. Kibana query code block language tag (Fixed)
**What was wrong:** The example Kibana query was enclosed in a ` ```yaml ` code block, but it is Kibana Query Language (KQL) syntax, not YAML.
**What was changed:** Changed the code fence to plain ` ``` ` (no language specifier) to avoid syntax highlighting confusion.

### 3. Deprecated `type_name _doc` in Elasticsearch output (Fixed)
**What was wrong:** Both Elasticsearch output sections included `type_name _doc`. Mapping types were deprecated in Elasticsearch 7.x and completely removed in Elasticsearch 8.x. Since ES 8.x is the current standard, including this parameter is unnecessary and could cause warnings or errors with newer versions of `fluent-plugin-elasticsearch`.
**What was changed:** Removed `type_name _doc` from both `<match dapr.**>` and `<match kubernetes.app>` Elasticsearch output blocks.

## Review Notes
- The `serviceAccount` field in the DaemonSet PodSpec (line 222 in original) is deprecated in favor of `serviceAccountName`. Both are specified, which is redundant but harmless. Future updates could remove the `serviceAccount` line.
- The `@type cri` parser in the Fluentd source block requires the `fluent-plugin-parser-cri` gem, which is included in the `fluent/fluentd-kubernetes-daemonset` image but may not be available in custom Fluentd installations.
- The `@type multi_format` parser requires the `fluent-plugin-multi-format-parser` gem, also included in the standard DaemonSet image.
- The `rewrite_tag_filter` plugin requires `fluent-plugin-rewrite-tag-filter`, also included in the standard image.
- The Dapr JSON log format examples are representative but the exact fields may vary slightly between Dapr versions. The `ver` field in the example shows `1.13.0` which is accurate for the annotation format shown.
- The Fluentd DaemonSet only mounts `/var/log`, which works for containerd-based Kubernetes clusters (the modern standard) since container log symlinks resolve within `/var/log/pods/`. Docker-based clusters would additionally need `/var/lib/docker/containers` mounted.
