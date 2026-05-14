# Validation Summary: How to Deploy Fluentd with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRepository, HelmRelease, and Kustomization APIs
- Fluentd
- Fluentd Helm chart
- Kubernetes DaemonSet, ConfigMap, RBAC, and hostPath log mounts
- Fluentd Kubernetes metadata, parser, grep, Elasticsearch, S3, systemd, and copy plugins

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease CLI reference: https://fluxcd.io/flux/cmd/flux_create_helmrelease/
- Fluent Helm charts repository and chart values/templates: https://github.com/fluent/helm-charts/tree/main/charts/fluentd
- Fluentd Kubernetes DaemonSet image repository and variant Gemfiles: https://github.com/fluent/fluentd-kubernetes-daemonset
- Fluentd parser filter documentation: https://docs.fluentd.org/filter/parser
- Fluentd grep filter documentation: https://docs.fluentd.org/filter/grep
- Fluentd output plugin documentation: https://docs.fluentd.org/output
- Fluentd Kubernetes metadata filter documentation: https://github.com/fluent-plugins-nursery/fluent-plugin-kubernetes_metadata_filter
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes logging architecture documentation: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Kubernetes volume documentation: https://kubernetes.io/docs/concepts/storage/volumes/

## Issues Found
- The custom Fluentd ConfigMap was named `fluentd-config`, but the Fluentd Helm chart mounts entries from `configMapConfigs` as ConfigMaps named `<entry>-<release-name>`. Changed the ConfigMap name to `fluentd-config-fluentd` for the shown `HelmRelease` name.
- The custom configuration duplicated the chart-generated `@FLUENT_LOG` label. Removed that duplicate label block and renamed the custom file to `kubernetes.conf`, leaving the chart's main `fluent.conf` to include it through `configMapConfigs`.
- The HelmRelease manually defined `/var/log` and `/var/lib/docker/containers` volumes and mounts that the chart already creates by default. Replaced the duplicate volume definitions with the chart values `mountVarLogDirectory: true` and `mountDockerContainersDirectory: true`.
- The example enabled `persistence` while deploying the chart as a DaemonSet. The upstream chart documents and templates persistence as StatefulSet-only, so this would create an invalid DaemonSet pod spec. Removed the persistence block.
- The multi-destination example was shown as an additional `kubernetes.**` match, but Fluentd routes an event to the first matching output. Updated the text and snippet to make it a replacement for the earlier Elasticsearch-only match block.
- The S3 output example used `@type s3`, but the default Elasticsearch chart variant does not include `fluent-plugin-s3`. Added the required `plugins: - fluent-plugin-s3` Helm value for that scenario.

## Review Notes
The Flux API versions used in the post are current for Flux v2. The Elasticsearch example assumes HTTPS and credentials are enabled on the target Elasticsearch service; clusters using plain HTTP or different authentication need to adjust those values.
