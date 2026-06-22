# Validation Summary: How to Set Up Kubernetes Cluster Logging with Fluentd and Fluent Bit

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Fluent Bit
- Fluentd
- Elasticsearch
- Grafana Loki
- Prometheus Operator ServiceMonitor
- YAML configuration

## Sources Consulted
- Fluent Bit Tail input official documentation: https://docs.fluentbit.io/manual/data-pipeline/inputs/tail
- Fluent Bit Kubernetes filter official documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/kubernetes
- Fluent Bit Loki output official documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/loki
- Fluent Bit Multiline filter official documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/multiline-stacktrace
- Fluent Bit release notes: https://fluentbit.io/announcements/
- Fluent Bit and Fluentd comparison documentation: https://docs.fluentbit.io/manual/about/fluentd-and-fluent-bit
- Fluentd parser filter official documentation: https://docs.fluentd.org/filter/parser
- Fluentd record_transformer official documentation: https://docs.fluentd.org/filter/record_transformer
- Fluentd config file match pattern documentation: https://docs.fluentd.org/configuration/config-file
- Fluentd Kubernetes DaemonSet Docker tags: https://hub.docker.com/r/fluent/fluentd-kubernetes-daemonset/tags
- Kubernetes StatefulSet official documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Prometheus Operator ServiceMonitor CRD documentation: https://github.com/prometheus-operator/prometheus-operator/blob/main/example/prometheus-operator-crd/monitoring.coreos.com_servicemonitors.yaml

## Issues Found
- Updated the Fluent Bit vs Fluentd comparison table to match current official documentation for Fluentd memory usage and Fluent Bit built-in plugin count.
- Updated the Fluent Bit image from `fluent/fluent-bit:2.2` to `fluent/fluent-bit:5.0.7`, the current release available on June 22, 2026.
- Moved Fluent Bit tail offset databases from `/var/log` to `/var/lib/fluent-bit` and added a writable hostPath mount. The original DaemonSet mounted `/var/log` read-only, so Fluent Bit could not write its SQLite DB files there.
- Added a `Service` for Fluent Bit metrics so the later `ServiceMonitor` has a Kubernetes Service to select.
- Corrected the container runtime mount comment from containerd to Docker because `/var/lib/docker/containers` is Docker-specific.
- Updated the Loki example DB path to use the same writable Fluent Bit state directory.
- Corrected Fluentd namespace routing examples. Fluentd `<match>` routes by tag, so the previous `kube.production.**` and `kube.staging.**` patterns would not match the expanded `kube.*` tags produced by the earlier Fluent Bit tail input. The examples now use regex tag matches for Kubernetes container log tags containing the namespace.
- Updated the Fluentd image to a current Elasticsearch 8-compatible v1.19 tag.
- Added `clusterIP: None` to the Elasticsearch Service because Kubernetes StatefulSets require a headless Service for stable pod DNS identities.
- Fixed the sample application Deployment by adding the required selector and pod template labels, and moved the Fluent Bit parser annotation onto the pod template metadata so it applies to pods.
- Changed the multi-line Fluent Bit config fence from `yaml` to `ini` because the snippet is Fluent Bit classic configuration, not YAML.

## Review Notes
- The YAML snippets were parsed successfully with PyYAML after the corrections.
- The Elasticsearch example disables `xpack.security.enabled`; this can be acceptable for a simplified internal example, but production deployments should enable authentication and TLS or use Elastic Cloud on Kubernetes.
- The Fluentd namespace routing regex assumes the standard Kubernetes container log filename shape: `<pod>_<namespace>_<container>-<id>.log`.
