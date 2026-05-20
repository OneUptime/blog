# Validation Summary: How to Deploy Fluentbit and Fluentd with ArgoCD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ArgoCD Applications and sync options
- Helm wrapper charts and chart dependencies
- Fluent Bit Helm chart and classic configuration
- Fluentd Helm chart and configuration files
- Kubernetes DaemonSets, StatefulSets, Services, and kubectl verification commands
- Prometheus Operator ServiceMonitor resources
- Elasticsearch, Grafana Loki, and Amazon S3 Fluentd outputs

## Sources Consulted
- Fluent Helm chart repository and chart values: https://github.com/fluent/helm-charts
- Fluent Bit Helm chart values and templates: https://raw.githubusercontent.com/fluent/helm-charts/main/charts/fluent-bit/values.yaml
- Fluentd Helm chart values and templates: https://raw.githubusercontent.com/fluent/helm-charts/main/charts/fluentd/values.yaml
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Fluent Bit buffering and storage documentation: https://docs.fluentbit.io/manual/3.0/administration/buffering-and-storage
- Fluent Bit Kubernetes filter documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/kubernetes/
- Fluentd forward input documentation: https://docs.fluentd.org/input/forward
- Fluentd parser filter documentation: https://docs.fluentd.org/filter/parser
- Fluentd buffer configuration documentation: https://docs.fluentd.org/configuration/buffer-section
- Fluentd copy output documentation: https://docs.fluentd.org/output/copy
- Fluentd S3 output documentation: https://docs.fluentd.org/output/s3
- Grafana Loki Fluentd client documentation: https://grafana.com/docs/loki/latest/send-data/fluentd/

## Issues Found
- The Fluent Bit custom parser path pointed to `/fluent-bit/etc/custom_parsers.conf`, but the official Helm chart mounts chart-generated config files under `/fluent-bit/etc/conf`. Updated the `Parsers_File` path to `/fluent-bit/etc/conf/custom_parsers.conf`.
- The Fluent Bit Kubernetes filter used `Keep_Log Off` while Fluentd later parsed `key_name log`. Because `Keep_Log Off` can remove the `log` field after merge, updated it to `Keep_Log On` so the downstream Fluentd parser has the field it references.
- The Fluent Bit forward output used `fluentd-aggregator.logging.svc.cluster.local`, but the shown ArgoCD Application and dependency chart would render the default Fluentd service as `fluentd`. Updated the host to `fluentd.logging.svc.cluster.local`.
- The Fluent Bit Helm values used `volumeMounts` and `volumes` for additional storage, but the chart expects `extraVolumeMounts` and `extraVolumes` for user-supplied mounts. Updated those keys.
- The Fluent Bit ServiceMonitor labels used `additionalLabels`, which is not the key consumed by the Fluent Bit chart template. Updated it to `selector`, which the chart renders into ServiceMonitor metadata labels.
- The Fluentd example enabled persistence while using `kind: Deployment`. The Fluentd chart documents and renders persistence for StatefulSets, so updated the workload kind to `StatefulSet`.
- The Fluentd service port used `port`, but the Fluentd chart expects `containerPort` in `service.ports` and uses it for both the Service port and target port. Updated the field name.
- The Fluentd buffer paths used `/var/log/fluentd/buffers`, which would not use the chart's persistent buffer volume. Updated buffer paths and the verification command to use `/var/log/fluent/buffers`.
- The Fluentd ServiceMonitor values were placed at `serviceMonitor`, but the chart expects `metrics.serviceMonitor`. Moved the configuration under the correct key.
- The Fluentd outputs referenced Loki and S3 plugins that are not guaranteed in the base chart image. Added the chart-supported `plugins` list for `fluent-plugin-grafana-loki` and `fluent-plugin-s3`.
- The dispatch example claimed namespace-based routing with a tag match that would not reliably match Kubernetes namespaces. Updated the example to route matching Kubernetes logs to multiple outputs directly.
- The buffer verification command referenced `deploy/fluentd`, but the corrected persistent deployment is a StatefulSet. Updated it to `sts/fluentd`.

## Review Notes
The examples are technically valid as GitOps and Helm chart patterns, but production deployments should still pin plugin versions, configure authentication/TLS for forward input and outputs, and confirm that destination-specific plugins and storage classes match the target cluster.
