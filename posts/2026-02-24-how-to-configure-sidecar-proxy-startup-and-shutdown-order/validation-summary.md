# Validation Summary: How to Configure Sidecar Proxy Startup and Shutdown Order

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar injection and ProxyConfig
- Kubernetes pod lifecycle hooks and termination grace periods
- Kubernetes native sidecar containers
- kubectl and istioctl CLI commands
- Envoy sidecar health and draining behavior

## Sources Consulted
- Istio sidecar injection troubleshooting: https://istio.io/latest/docs/ops/common-problems/injection/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio global MeshConfig and ProxyConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio pilot-agent command/environment reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio Kubernetes native sidecars blog: https://istio.io/latest/blog/2023/native-sidecars/
- Istio 1.27.0 change notes: https://istio.io/latest/news/releases/1.27.x/announcing-1.27/change-notes/
- Kubernetes sidecar containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes container lifecycle hooks documentation: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/

## Issues Found
- The native sidecar IstioOperator example configured `values.global.proxy.startupProbe`, which does not enable native sidecar injection. Changed it to set `values.pilot.env.ENABLE_NATIVE_SIDECARS: "true"`.
- The post used `kubectl version --short`, but current kubectl reference documents `kubectl version` with `-o json|yaml` and no `--short` option. Changed the command to `kubectl version`.
- The native sidecar version note only mentioned Kubernetes 1.28 with the feature gate enabled. Updated it to clarify that the feature was introduced as alpha in 1.28, enabled by default since 1.29, and stable in 1.33 and later.
- The shutdown timing guidance did not count application `preStop` time against sidecar drain and pod termination grace periods. Updated the timeout relationship and example to include the preStop delay.
- The shutdown sequence implied a pod-level preStop delay before SIGTERM to both application and sidecar containers. Kubernetes preStop hooks are per-container, so the sequence was corrected to say the application preStop runs before SIGTERM is sent to that application container, while containers receive SIGTERM as their own preStop hooks complete.

## Review Notes
- The core guidance remains valid for legacy Istio sidecars. In Istio 1.27 and newer, native sidecar injection is enabled by default for eligible pods, but explicitly setting `ENABLE_NATIVE_SIDECARS` is still a clear opt-in for installations where it is not already enabled.
