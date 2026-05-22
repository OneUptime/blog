# Validation Summary: How to Configure Envoy Proxy Connection Draining

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes Deployments
- Kubernetes Pod lifecycle and termination
- PodDisruptionBudget
- Fortio

## Sources Consulted
- Istio MeshConfig / ProxyConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio 1.12 change notes for `EXIT_ON_ZERO_ACTIVE_CONNECTIONS`: https://istio.io/latest/news/releases/1.12.x/announcing-1.12/change-notes/
- Envoy draining architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/operations/draining
- Envoy admin interface reference: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Kubernetes Pod termination flow: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination
- Kubernetes Deployment rolling update documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment
- Kubernetes disruptions and PodDisruptionBudget documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Fortio official documentation and CLI flag reference: https://github.com/fortio/fortio

## Issues Found
- The pod termination sequence listed endpoint removal before `preStop` and SIGTERM. Updated it to match Kubernetes documentation: the pod is marked terminating, `preStop` runs before TERM for the relevant container, and EndpointSlice updates happen concurrently with kubelet shutdown.
- The post described `drainDuration` and `parentShutdownDuration` as normal pod termination settings. Current Istio documentation describes `drainDuration` as hot-restart drain duration, and does not document `parentShutdownDuration` in current ProxyConfig. Removed those settings from pod shutdown examples and used `terminationDrainDuration`.
- The explanation of `terminationDrainDuration` said it runs when an endpoint is removed before SIGTERM. Updated it to the documented Istio behavior: `istio-agent` receives SIGTERM or SIGINT, tells Envoy to drain, sleeps for `terminationDrainDuration`, then kills remaining Envoy processes.
- The `EXIT_ON_ZERO_ACTIVE_CONNECTIONS` description said Envoy waits until all active connections complete, up to `terminationGracePeriodSeconds`. Updated it to reflect Istio's change note: the proxy can exit early when active connections reach zero instead of waiting the full drain duration.
- The Envoy admin command used `GET /drain_listeners`. Envoy requires admin mutations to use POST, so the command now uses `curl -X POST` with `?graceful`.
- The PodDisruptionBudget section implied PDBs constrain all pod terminations, including rolling updates. Updated it to clarify that PDBs limit voluntary disruptions through the Eviction API, while Deployment rolling updates are controlled by the Deployment strategy.

## Review Notes
The Fortio command syntax and Kubernetes Deployment rolling update fields are valid. `kubectl` was not installed locally, so CLI verification relied on official Kubernetes and Fortio documentation rather than local `--help` output.
