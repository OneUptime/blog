# Validation Summary: How to Deploy the OpenTelemetry Collector as a StatefulSet in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib components
- OpenTelemetry Operator Target Allocator
- Kubernetes StatefulSets
- Kubernetes Services, RBAC, Secrets, ConfigMaps, and PersistentVolumeClaims
- Kubernetes StorageClasses and CSI VolumeSnapshots
- Kubernetes HorizontalPodAutoscaler
- Prometheus scraping and Prometheus Remote Write

## Sources Consulted
- Kubernetes StatefulSet concepts: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes StatefulSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes StorageClass concepts: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes volumes documentation for deprecated in-tree AWS EBS volume plugin guidance: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes VolumeSnapshot documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector receivers documentation: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Operator Target Allocator documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/target-allocator/
- OpenTelemetry Operator Target Allocator README: https://github.com/open-telemetry/opentelemetry-operator/tree/main/cmd/otel-allocator
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- The StatefulSet diagram used PVC names like `data-collector-0`, but Kubernetes names PVCs created from `volumeClaimTemplates` as `<claim-name>-<pod-name>`. Updated the diagram to use `data-otel-collector-0`, `data-otel-collector-1`, and `data-otel-collector-2`.
- The main manifest referenced a `backend-credentials` Secret but did not define it. Added a placeholder Secret with `prometheus-token` so the manifest is complete.
- The RBAC rules were incomplete for the Target Allocator and broader Kubernetes service discovery. Added access for EndpointSlices, ingresses, configmaps, and the `/metrics` non-resource URL based on the OpenTelemetry Target Allocator documentation.
- The Prometheus pod scrape relabeling replaced `__address__` with only the annotated port. Updated the relabel rule to preserve the pod host and replace only the port.
- The `k8sattributes` example extracted `k8s.deployment.name` for a StatefulSet deployment. Changed it to `k8s.statefulset.name`.
- The Collector config used the deprecated `logging` exporter name. Updated it to the current `debug` exporter and changed pipeline references accordingly.
- The pprof extension comment described it as the Prometheus metrics endpoint. Updated the comment to identify it as a pprof diagnostic endpoint.
- The StatefulSet set `podManagementPolicy: Parallel` while surrounding text and commands described ordered pod creation. Changed it to `OrderedReady` so the manifest matches the explanation.
- The AWS EBS StorageClass used the older in-tree `kubernetes.io/aws-ebs` provisioner. Updated it to the CSI provisioner `ebs.csi.aws.com`.
- The Target Allocator ConfigMap used `label_selector`, which is not the documented key, and did not align the default Target Allocator listen port with the Service. Updated it to use `collector_namespace`, `collector_selector`, and `listen_addr: 0.0.0.0:8080`, with the container and Service targeting port 8080.
- The backup CronJob used `alpine:3.18` but called `kubectl`, which is not present in that image, and `kubectl cp` would also depend on archive tooling in the source container. Replaced the example with CSI `VolumeSnapshot` resources for the StatefulSet PVCs.

## Review Notes
- YAML fenced blocks were parsed successfully after the fixes.
- The examples still contain environment-specific placeholders such as `prometheus.example.com`, `jaeger.example.com`, `standard`, `fast-ssd`, `csi-snapshot-class`, and `replace-with-your-token`; users must replace these for their clusters and backends.
- The Kubernetes manifests were not applied to a live cluster during this review.
