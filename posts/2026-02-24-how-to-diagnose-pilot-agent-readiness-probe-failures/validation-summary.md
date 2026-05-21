# Validation Summary: How to Diagnose Pilot-Agent Readiness Probe Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio sidecar injection
- Istio pilot-agent
- Envoy sidecar proxy
- Kubernetes readiness and startup probes
- Istiod control plane
- Prometheus and kube-state-metrics

## Sources Consulted
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio 1.20 Upgrade Notes: https://istio.io/latest/news/releases/1.20.x/announcing-1.20/upgrade-notes/
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio Application Requirements and reserved ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio Sidecar Injection Problems and `holdApplicationUntilProxyStarts`: https://istio.io/latest/docs/ops/common-problems/injection/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Kubernetes Configure Liveness, Readiness and Startup Probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Istio pilot-agent status server source: https://github.com/istio/istio/blob/master/pilot/cmd/pilot-agent/status/server.go
- Istio pilot-agent readiness probe package docs: https://pkg.go.dev/istio.io/istio/pilot/cmd/pilot-agent/status/ready

## Issues Found
- The sidecar probe example used older Istio readiness defaults. Updated the example to current Istio behavior with a sidecar `startupProbe` and the current recommended readiness values documented in Istio 1.20+ upgrade notes.
- The readiness customization annotations were incorrect. Replaced `sidecar.istio.io/readinessInitialDelaySeconds`, `sidecar.istio.io/readinessFailureThreshold`, and `sidecar.istio.io/readinessPeriodSeconds` with the documented `readiness.status.sidecar.istio.io/*` annotations.
- The post suggested `localhost:15020/healthz/ready` as a pilot-agent readiness endpoint. Corrected this to explain that rewritten application probes use generated `/app-health/...` paths on port 15020, while sidecar readiness is checked on `/healthz/ready` through port 15021.
- The Istiod connectivity command tried to HTTP curl `https://istiod.istio-system.svc:15012/healthz/ready`, but port 15012 is the TLS/mTLS gRPC XDS and CA port, not an HTTP readiness endpoint. Replaced it with a TCP connectivity check to 15012 and a separate check of Istiod's local `/ready` endpoint.
- The description of `holdApplicationUntilProxyStarts` was backwards. It delays application container startup until the proxy is ready; it does not make the proxy wait for application readiness. Updated the explanation and remediation text.

## Review Notes
The commands assume debug tooling such as `curl`, `ss`, and `ps` is available in the target container or through an ephemeral debug container. Distroless proxy images may require `kubectl debug` or another approved troubleshooting image for some checks.
