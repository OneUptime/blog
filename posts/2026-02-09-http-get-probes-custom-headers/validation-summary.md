# Validation Summary: How to Configure HTTP GET Probes with Custom Headers and Paths

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes HTTP GET probes
- Kubernetes liveness, readiness, and startup probes
- Kubernetes Pod and Deployment YAML
- kubectl
- Go net/http
- Python Flask
- Node.js Express
- Prometheus / PromQL

## Sources Consulted
- Kubernetes: Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes API Reference: Pod v1 / HTTPGetAction: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Go net/http package documentation: https://pkg.go.dev/net/http
- Flask API documentation: https://flask.palletsprojects.com/en/stable/api/
- Express 4.x API documentation: https://expressjs.com/en/4x/api.html
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- Corrected the claim that HTTP GET probes must specify both path and port. Kubernetes requires `port`; `path` defaults to `/` if omitted.
- Corrected the basic `httpGet.host` example. The Kubernetes `host` field changes the host the kubelet connects to; it is not the usual way to set a virtual-host `Host` header.
- Fixed the authentication examples so the readiness probe sends the `X-Health-Check` header expected by the Go middleware.
- Reworded the Go example comment about probe source authentication from "Kubernetes probe IP ranges" to trusted kubelet or node addresses, because Kubernetes does not define a generic probe IP range.
- Added minimal helper functions to the Go and Flask examples so the snippets are technically complete rather than relying on undefined symbols.
- Corrected the virtual-host routing example to set `Host` in `httpHeaders`, which Kubernetes recommends for virtual hosts, and corrected the explanation that the probe connects to the Pod IP.
- Fixed a typo in the Express example from `isBasicallReady()` to `isBasicallyReady()` and added minimal helper functions.
- Replaced non-standard probe metric names with Kubernetes kubelet probe metrics: `prober_probe_duration_seconds` and `prober_probe_total`.
- Added a minimal `main` and `performHealthCheck` function to the Go rate-limiting example so the snippet is complete.

## Review Notes
The article is technically relevant and current for Kubernetes HTTP probes. The authentication pattern is usable for illustration, but in production the strongest recommendation remains to keep probe endpoints simple and avoid embedding sensitive tokens directly in Pod specs.
