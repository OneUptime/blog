# Validation Summary: How to Handle Edge Node Failures with Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio DestinationRule and VirtualService traffic policies
- Istio outlier detection, retries, locality failover, and istiod availability
- Kubernetes Deployments, probes, topology spread constraints, tolerations, and node failure handling
- K3s server configuration
- istioctl and Envoy proxy diagnostics

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio locality failover task: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/failover/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio deployment best practices: https://preliminary.istio.io/latest/docs/ops/best-practices/deployment/
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes kube-controller-manager reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes kube-apiserver reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- K3s server configuration reference: https://docs.k3s.io/cli/server

## Issues Found
- The istiod failure section said new pods "will not get sidecar injection" when istiod is down. With the default injection webhook failure policy, pod creation in injection-enabled namespaces can be rejected while istiod is unavailable. Updated the wording to describe rejection risk and configuration update loss more accurately.
- The faster pod eviction section used `pod-eviction-timeout` as a kube-controller-manager setting. That flag is not present in the current Kubernetes controller-manager reference. Updated the K3s example to keep `node-monitor-grace-period` on the controller manager and use the current kube-apiserver `default-not-ready-toleration-seconds` and `default-unreachable-toleration-seconds` flags, while preserving the explicit pod toleration example.

## Review Notes
- The Istio outlier detection, retry, locality failover, and `istioctl proxy-config endpoints` examples match current Istio documentation.
- The Kubernetes readiness probe, topology spread, and explicit `NoExecute` toleration examples match current Kubernetes behavior.
- The cross-cluster failover example assumes the `from` and `to` values match Istio locality region labels on the participating endpoints.
