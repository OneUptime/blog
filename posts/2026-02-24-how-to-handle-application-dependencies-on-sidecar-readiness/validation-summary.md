# Validation Summary: How to Handle Application Dependencies on Sidecar Readiness

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar injection
- Istio ProxyConfig
- Kubernetes native sidecar containers
- Kubernetes Jobs and readiness probes
- kubectl
- Python requests and tenacity
- Go net/http

## Sources Consulted
- Istio sidecar injection problems documentation: https://istio.io/latest/docs/ops/common-problems/injection/
- Istio 1.7 change notes for `values.global.proxy.holdApplicationUntilProxyStarts`: https://istio.io/latest/news/releases/1.7.x/announcing-1.7/change-notes/
- Istio 1.8 change notes for pod-level `holdApplicationUntilProxyStarts`: https://istio.io/latest/news/releases/1.8.x/announcing-1.8/change-notes/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/#ProxyConfig
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio application requirements and sidecar ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio native sidecars blog: https://istio.io/latest/blog/2023/native-sidecars/
- Kubernetes sidecar containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes adopting sidecar containers tutorial: https://kubernetes.io/docs/tutorials/configuration/pod-sidecar-containers/
- Kubernetes `kubectl version` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/

## Issues Found
- The introduction said the sidecar establishes mTLS connections during startup. Istio configures listeners, clusters, and certificates during startup, while workload mTLS connections are established when traffic is sent. Changed this to say the sidecar prepares certificates for mTLS connections.
- The explanation of `holdApplicationUntilProxyStarts` said Kubernetes starts containers in order when lifecycle hooks are in play. Istio documents the behavior as injecting the sidecar at the start of the container list and adding hooks that block other containers until the proxy is ready. Updated the explanation to match Istio's documented behavior.
- The cluster version check used `kubectl version --short`, which is not present in the current generated kubectl reference. Replaced it with `kubectl version`.
- The native sidecar feature-state text said the feature is beta and enabled by default in Kubernetes 1.29+. Current Kubernetes docs mark sidecar containers stable in Kubernetes v1.33, with the feature alpha in 1.28 and beta/default-on starting in 1.29. Updated the text accordingly.
- The sidecar injection example used the deprecated `sidecar.istio.io/inject` annotation. Istio's current annotation reference deprecates the annotation in favor of the label, so the example now uses `metadata.labels`.

## Review Notes
- The Job `/quitquitquit` pattern is still valid for legacy sidecars, but native Kubernetes sidecars avoid the stuck-Job problem because native sidecars do not block Pod completion.
- The sidecar readiness endpoint at `localhost:15021/healthz/ready` is consistent with Istio's documented health-check port. Istio's `statusPort` defaults to 15020 for agent administrative functions, so future edits should avoid confusing general health checks with rewritten application probe paths.
