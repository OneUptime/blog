# Validation Summary: How to Configure Pre-Stop Hook for Istio Sidecar

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes lifecycle hooks
- Kubernetes pod termination behavior
- Istio sidecar injection
- Istio proxy lifecycle and drain behavior
- Helm-based Istio configuration

## Sources Consulted
- Kubernetes documentation: Container Lifecycle Hooks - https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Istio documentation: Resource Annotations - https://istio.io/latest/docs/reference/config/annotations/
- Istio documentation: Global Mesh Options / ProxyConfig - https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/#ProxyConfig
- Istio documentation: Installing the Sidecar - https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio source: sidecar injection template - https://github.com/istio/istio/blob/master/manifests/charts/istio-control/istio-discovery/files/injection-template.yaml
- Istio source: pilot-agent status server - https://github.com/istio/istio/blob/master/pilot/cmd/pilot-agent/status/server.go
- Istio Helm values source - https://github.com/istio/istio/blob/master/manifests/charts/istio-control/istio-discovery/values.yaml

## Issues Found
- The Helm command used `values.global.proxy.lifecycle...`, which is the IstioOperator nesting, not the Helm chart values path. Changed it to `global.proxy.lifecycle...`.
- The post claimed Istio 1.18+ supports `sidecar.istio.io/proxyLifecycle`. This annotation is not present in the current official Istio annotation reference. Reworded the section to explain that `proxy.istio.io/config` tunes proxy configuration such as `terminationDrainDuration`, but does not set a Kubernetes lifecycle hook on the sidecar container.
- The per-workload explanation said the sidecar preStop could be configured through the proxy config annotation. Corrected this to IstioOperator or a custom injection template.
- The shutdown timeline showed SIGTERM being sent before preStop hooks. Kubernetes documents that the PreStop hook must complete before the TERM signal is sent to that container, so the timeline was corrected.
- The post recommended `/quitquitquit` as a drain trigger. Istio's source shows `/drain` starts drain, while `/quitquitquit` tells `pilot-agent` to exit and disables drain. Updated the section and example to use `/drain`, with a note about `/quitquitquit`.
- The verification section implied successful lifecycle hook execution appears in pod events. Kubernetes documents that hook logs are not exposed in events and failures are reported as `FailedPreStopHook`, so the verification guidance was corrected.

## Review Notes
The post is technically relevant and contains implementation guidance. The main remaining caveat is that exact sidecar shutdown sequencing can vary with Kubernetes native sidecar behavior and Istio injection settings, so deployment-specific testing remains important.
