# Validation Summary: Debug Kubernetes Horizontal Pod Autoscaler Not Scaling from Missing Metrics

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes Metrics API and metrics-server
- Kubernetes Custom Metrics API and External Metrics API
- Prometheus Adapter
- Helm
- KEDA
- kube-state-metrics Prometheus alert metrics
- kubectl

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes External Metrics API reference: https://kubernetes.io/docs/reference/external-api/external-metrics.v1beta1/
- metrics-server official repository and installation documentation: https://github.com/kubernetes-sigs/metrics-server
- metrics-server v0.8.1 deployment manifest: https://github.com/kubernetes-sigs/metrics-server/releases/download/v0.8.1/components.yaml
- Prometheus Adapter configuration documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md
- prometheus-community prometheus-adapter Helm chart values: https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus-adapter
- KEDA deployment documentation: https://keda.sh/docs/2.20/deploy/
- KEDA FAQ for external.metrics.k8s.io behavior: https://keda.sh/docs/2.20/reference/faq/
- Amazon EKS best practices for HPA metric APIs: https://docs.aws.amazon.com/eks/latest/best-practices/application.html

## Issues Found
- The post stated that HPA will not scale whenever metrics are unavailable. Updated this to reflect Kubernetes behavior: if multiple metrics are configured, HPA can still scale up when an available metric recommends more replicas, but skips scale-down when another metric cannot be fetched.
- The metrics-server patch snippet used the outdated image `registry.k8s.io/metrics-server/metrics-server:v0.6.4` and `--secure-port=4443`. Updated the snippet to `v0.8.1` and `--secure-port=10250`, matching the current metrics-server release manifest.
- The Prometheus Adapter Helm command installed into `monitoring` without creating that namespace. Added `--create-namespace`.
- The sample HPA output showed `http_requests` even though the configured adapter rule exposes `http_requests_per_second`. Updated the example output to use the configured metric name.
- The AWS CloudWatch external metrics command pointed to a kube-state-metrics GitHub directory, which is not an external metrics adapter and is not a valid `kubectl apply -f` manifest URL. Replaced it with the official KEDA Helm installation command for AWS CloudWatch external metric use cases.
- The missing metrics alert used `ScalingLimited=True`, which indicates replica limits rather than missing metric availability. Changed it to alert on `ScalingActive=False`, which is the HPA condition used when HPA cannot compute scaling from metrics.
- The event watch used `reason=ScalingReplicaSet`, which watches Deployment/ReplicaSet events rather than HPA rescale events. Changed it to `reason=SuccessfulRescale`.

## Review Notes
The post is technically valid after the corrections. For a future deeper revision, the external metrics section could add provider-specific resources, such as a KEDA `ScaledObject` for CloudWatch or a Stackdriver external metric example, because installing an external metrics provider alone does not define which external metric should be exposed.
