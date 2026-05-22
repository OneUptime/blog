# Validation Summary: How to Configure Holdoff Application Start Until Sidecar Ready

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar injection
- Kubernetes pods, init containers, native sidecars, and probes
- IstioOperator and ProxyConfig settings
- kubectl JSONPath commands
- Python requests and tenacity retry examples
- Go net/http retry example

## Sources Consulted
- Istio Sidecar Injection Problems: https://istio.io/latest/docs/ops/common-problems/injection/
- Istio Global Mesh Options / ProxyConfig: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio pilot-discovery command environment variables: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio 1.27 Upgrade Notes: https://istio.io/latest/news/releases/1.27.x/announcing-1.27/upgrade-notes/
- Kubernetes Sidecar Containers: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes Container Lifecycle Hooks: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Istio Application Requirements / Ports used by Istio: https://istio.io/latest/docs/ops/deployment/application-requirements/

## Issues Found
- The post incorrectly described `holdApplicationUntilProxyStarts` as generic Kubernetes behavior where Kubernetes waits for a sidecar `postStart` hook before starting other containers. Updated the explanation to match Istio documentation: Istio injects the sidecar at the start of the pod container list and configures blocking behavior until the proxy is ready. Also clarified this is Istio-specific injection behavior, because Kubernetes lifecycle hook documentation says `PostStart` runs concurrently with the container entrypoint and is not a general dependency mechanism.
- The native sidecar section treated Kubernetes 1.28+ as uniformly ready for production use. Updated the text to state that Kubernetes 1.28 requires the `SidecarContainers` feature gate, Kubernetes 1.29 enables it by default, and Kubernetes 1.33 marks it stable.
- The decision tree claimed "Kubernetes 1.28+ and Istio 1.20+" should use native sidecars. Replaced it with a version-aware recommendation: use native sidecars when Kubernetes native sidecar support and Istio native sidecar injection are available, with a note that Istio 1.27 enables native sidecars by default for eligible pods.
- The startup probe example assumed `curl` was available in the application image. Added that assumption explicitly.

## Review Notes
The remaining examples and commands are technically valid as illustrative snippets. The Go example is a function snippet rather than a complete standalone file, so it would still need the usual package and imports in a real program.
