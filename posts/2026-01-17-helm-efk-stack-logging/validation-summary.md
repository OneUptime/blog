# Validation Summary: Deploying EFK Stack (Elasticsearch, Fluentd, Kibana) with Helm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Kubernetes
- Elasticsearch
- Kibana
- Fluentd
- Fluent Bit
- Index Lifecycle Management
- Prometheus monitoring

## Sources Consulted
- Elastic Helm charts repository and values files: https://github.com/elastic/helm-charts
- Elastic ECK Helm chart documentation: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/managing-deployments-using-helm-chart
- Elasticsearch ILM rollover documentation: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-rollover
- Elasticsearch breaking changes documentation: https://www.elastic.co/docs/release-notes/elasticsearch/breaking-changes
- Kibana data views documentation: https://www.elastic.co/docs/explore-analyze/find-and-organize/data-views
- Fluent Helm charts repository and values files: https://github.com/fluent/helm-charts
- Fluent Bit Kubernetes installation documentation: https://docs.fluentbit.io/manual/installation/kubernetes

## Issues Found
- The Elasticsearch values configured transport TLS with `elastic-certificates.p12`, but the archived `elastic/elasticsearch` chart creates `tls.key`, `tls.crt`, and `ca.crt` and injects the matching TLS settings when `createCert` is enabled. Removed the incorrect TLS settings from `esConfig`.
- The Elasticsearch values set `xpack.ilm.enabled`, which is obsolete for modern 8.x Elasticsearch because ILM is enabled by default. Removed the custom `esConfig` block because the remaining cluster and network settings are already handled by chart values.
- The Fluentd values manually redefined `varlog`, `varlibdockercontainers`, and a config volume even though the Fluentd chart already manages the log mounts and ConfigMap generated from `fileConfigs`. Replaced the duplicate mounts with the chart's `mountVarLogDirectory` and `mountDockerContainersDirectory` values.
- Fluentd buffered to `/var/log/fluentd-buffers`, which can conflict with host log collection paths. Added an `emptyDir` buffer volume mounted at `/buffers` and updated the buffer path.
- The Fluentd source parser handled only JSON log lines. Updated it to a multi-format parser so it also handles common CRI/containerd log lines.
- The Fluent Bit example used the older `fluent/fluent-bit` repository and a pinned `2.2.0` image tag. Updated the image repository to the chart's current official default, `cr.fluentbit.io/fluent/fluent-bit`, and let the chart select its app version.
- The Fluent Bit input used only `Parser docker`, which misses common CRI/containerd log formats. Updated it to use `multiline.parser docker, cri`, matching current chart defaults.
- The ILM policy used the deprecated `max_size` rollover condition. Replaced it with `max_primary_shard_size`.
- The ILM policy used the deprecated/no-op `freeze` action in the cold phase. Removed it and kept the priority change.
- The index template set `index.lifecycle.rollover_alias` without creating a matching initial write index and alias, which would make alias-based rollover fail. Removed the rollover alias from the template for the daily `logstash_format` index naming used by Fluentd and Fluent Bit in the post.
- Kibana now documents these as data views rather than index patterns. Updated the Kibana instructions from Index Patterns to Data Views.
- The monitoring section used `metrics.enabled` and `serviceMonitor.enabled` values that are not present in the archived `elastic/elasticsearch` chart. Replaced the invalid snippet with a note to use a separate exporter or ECK-based monitoring.

## Review Notes
The `elastic/elasticsearch` and `elastic/kibana` Helm charts used by this post are archived and top out at Elastic Stack 8.5.1. Elastic's current Kubernetes guidance recommends ECK and its Helm charts for operator-managed deployments. The examples remain valid for the archived chart family after the corrections above, but future updates should consider migrating the tutorial to ECK.
