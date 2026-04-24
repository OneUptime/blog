# Validation Summary: How to Configure Horizontal Pod Autoscaler via Portainer - K8s Hpa

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler (HPA)
- Portainer
- Metrics Server
- Prometheus Adapter / custom and external metrics APIs
- `kubectl`
- YAML manifests

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling concepts: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HPA walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Kubernetes feature gates reference (`HPAScaleToZero`): https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Metrics Server official documentation: https://kubernetes-sigs.github.io/metrics-server/
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API access documentation (`X-API-Key` authentication): https://docs.portainer.io/2.21/api/access
- Portainer published OpenAPI docs (current API spec): https://api-docs.portainer.io/?edition=ce&version=2.39.1
- Portainer Kubernetes kubeconfig / proxy documentation: https://docs.portainer.io/sts/user/kubernetes/kubeconfig

## Issues Found
- The prerequisites implied that Metrics Server was sufficient for every example. I added a prerequisite noting that the custom-metrics example also requires Prometheus Adapter or another adapter that serves `custom.metrics.k8s.io` and/or `external.metrics.k8s.io`.
- The memory example described `AverageValue` as “memory utilization”. I corrected the comments to describe it as average memory usage, which matches the `autoscaling/v2` resource metric semantics.
- Several inline comments described HPA targets as simple thresholds. I updated those comments to target-based wording so they better match how HPA reconciles toward target values.
- The `scaleDown.stabilizationWindowSeconds` comment called the setting a “cooldown”. I changed that wording to “stabilization window”, which is the documented behavior field semantics.
- The `kubectl get hpa` sample output omitted the `/scale` suffix in the `REFERENCE` column. I updated the example to match the current Kubernetes walkthrough output format.
- The best-practices comment said `minReplicas: 2` means “Never scale to 0”. I changed that to an availability-oriented note because scale-to-zero exists only behind the alpha `HPAScaleToZero` feature gate and only for Object/External metrics.

## Review Notes
- The Metrics Server install URL uses `releases/latest/download/components.yaml`, which is the current official install path, but it always tracks the newest Metrics Server release. Older Kubernetes clusters may need a version chosen from the Metrics Server compatibility matrix instead of `latest`.
- The Portainer API example relies on Portainer's API gateway/proxy behavior. The current Portainer docs still document Portainer as a gateway to the underlying Docker/Kubernetes APIs, so the example remains plausible, but exact behavior can depend on Portainer version and environment permissions.
