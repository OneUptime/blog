# Validation Summary: How to Configure Dapr Sidecar Liveness Probes on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (pod annotations, liveness probes, kubectl)
- Dapr Sidecar Injector
- Dapr Health API

## Sources Consulted
- Dapr arguments and annotations overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr sidecar health checks: https://docs.dapr.io/operations/resiliency/health-checks/sidecar-health/
- Kubernetes liveness and readiness probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found
No technical issues found.

## Review Notes
- The default liveness probe values listed (initialDelaySeconds=3, periodSeconds=6, failureThreshold=3, timeoutSeconds=3) match the Dapr annotation reference documentation. However, the Dapr sidecar health page shows different values for the auto-injected probe (5, 10, 5, 3). This is an inconsistency within the Dapr documentation itself, not an error in this blog post. The blog correctly cites the annotation defaults.
- All four annotation names (`dapr.io/sidecar-liveness-probe-delay-seconds`, `-period-seconds`, `-threshold`, `-timeout-seconds`) are verified correct per official Dapr docs.
- The `/v1.0/healthz` endpoint returning HTTP 204 when healthy is confirmed correct per the Dapr Health API reference.
- The `/v1.0/healthz/outbound` endpoint exists and is correctly described as checking component connectivity.
- The default Dapr sidecar HTTP port of 3500 is confirmed correct.
- All kubectl commands are syntactically correct and use appropriate flags.
- The YAML Deployment snippet omits `replicas` and `selector` fields for brevity, which is standard practice in blog tutorials.
