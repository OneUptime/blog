# Validation Summary: How to Set Up Istio with Multiple Replicas of Istiod

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istiod
- Envoy xDS
- Kubernetes Services
- Kubernetes Deployments
- Kubernetes PodDisruptionBudget
- Kubernetes pod anti-affinity
- Helm
- Prometheus

## Sources Consulted
- Istio `istioctl proxy-status` documentation: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio installation with `istioctl`: https://istio.io/latest/docs/setup/install/istioctl/
- Istio Helm installation documentation: https://istio.io/latest/docs/setup/install/helm/
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio deployment model documentation: https://istio.io/latest/docs/ops/deployment/deployment-models/
- Istio Security FAQ for workload certificate lifetime: https://istio.io/latest/about/faq/security/
- Istio source, istiod Helm values and templates: https://github.com/istio/istio/tree/master/manifests/charts/istio-control/istio-discovery
- Istio source, XDS metric definition: https://github.com/istio/istio/blob/master/pilot/pkg/xds/monitoring.go
- Istio source, leader election names and lock behavior: https://github.com/istio/istio/blob/master/pilot/pkg/leaderelection/leaderelection.go
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes pod affinity and anti-affinity documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes `kubectl rollout` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- The Helm example used `--set replicaCount=3`, but the current Istio chart enables autoscaling by default and only applies `replicaCount` directly when autoscaling is disabled. I changed the Helm example to set `autoscaleMin=3` and `autoscaleMax=5`.
- The IstioOperator example set only `replicaCount`. I added `hpaSpec.minReplicas` and `hpaSpec.maxReplicas` so the desired replica floor remains accurate when HPA is used.
- The `istioctl proxy-status` sample omitted the current `VERSION` column. I updated the sample output and changed the proxy-count command from `awk '{print $NF}'` to `awk 'NR > 1 {print $(NF-1)}'`, because the last field is the version, not the istiod pod.
- The post stated that Kubernetes Services use round-robin for new connections. I changed this to say Services load-balance across ready endpoints and that the exact algorithm depends on the kube-proxy or service implementation.
- The leader-election command assumed all relevant leader locks are Kubernetes Lease objects. Current Istio uses a mix of locks, including the legacy `istio-leader` ConfigMap. I updated the command and example output to check both leases and configmaps.
- The probe section said default liveness and readiness probes run on port 15014. Current istiod has a readiness probe on `/ready` at port 8080, while port 15014 is used for monitoring/debug. I corrected the section title, command, and bullet list.
- The Prometheus example used `pilot_xds{type="ads"}`. The current `pilot_xds` gauge represents XDS-connected endpoints and does not use a `type="ads"` label. I changed it to `pilot_xds`.
- The alert used `count(kube_pod_status_ready{condition="true"}) < 2`, which counts time series even when their value is 0. I changed it to `sum(...) < 2` so it counts ready istiod pods.

## Review Notes
- `helm` and `istioctl` were not installed in the local environment, so CLI behavior was verified against official Istio documentation and current Istio chart/source files.
- The post's recommendation for multiple istiod replicas, PodDisruptionBudget usage, anti-affinity, certificate TTL, and proxy behavior during control-plane outage is consistent with the consulted Istio and Kubernetes documentation.
