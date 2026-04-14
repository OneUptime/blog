# Validation Summary: How to Implement Health Endpoints in Dapr Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar health API, state management API, Kubernetes annotations)
- Kubernetes (Deployments, liveness/readiness/startup probes)
- Node.js with Express
- Dapr JavaScript SDK (`@dapr/dapr`)
- Python with FastAPI
- httpx (Python async HTTP client)

## Sources Consulted
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr Kubernetes health configuration: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-health/
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/
- Dapr Python SDK documentation: https://docs.dapr.io/developing-applications/sdks/python/
- Kubernetes Deployment spec: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/
- Kubernetes probe configuration: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found
1. **Kubernetes Deployment YAML missing required `selector` and `labels` fields**: The `apps/v1` Deployment spec requires `spec.selector.matchLabels` and corresponding `spec.template.metadata.labels`. Without these, `kubectl apply` would reject the manifest with a validation error. Added `spec.selector.matchLabels.app: order-service` and `spec.template.metadata.labels.app: order-service`.

2. **Unused import in Python example**: The Python FastAPI example imported `DaprClient` from `dapr.clients` but never used it — the readiness check uses `httpx` directly to call the Dapr healthz endpoint. Removed the unused import to avoid confusion.

## Review Notes
- The Dapr healthz endpoints (`/v1.0/healthz` and `/v1.0/healthz/outbound`), the HTTP 204 response code, and all Dapr annotations were verified as correct against official documentation.
- The JavaScript SDK usage (`DaprClient`, `state.get()`) is correct for current versions of `@dapr/dapr`.
- The `waitForDapr` function uses the global `fetch` API, which requires Node.js 18+. This is reasonable for modern applications but could be noted for readers on older Node.js versions.
- The Kubernetes probe timing values (initialDelaySeconds, periodSeconds, failureThreshold) are reasonable and follow best practices for Dapr applications where the sidecar needs time to initialize.
