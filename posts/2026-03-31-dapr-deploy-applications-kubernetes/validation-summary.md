# Validation Summary: How to Deploy Dapr Applications on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar injection, service invocation, state management)
- Kubernetes (Deployments, pods, annotations, port-forwarding)
- Redis (as a Dapr state store component)

## Sources Consulted
- Dapr Kubernetes deployment documentation — https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr annotations reference — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr service invocation API reference — https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Redis state store component reference — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/

## Issues Found
1. **Broken port-forward in "Testing the Deployment" section**: The original command `kubectl port-forward svc/order-service 8080:80` forwarded local port 8080 to the service's port 80, but the subsequent `curl` command targeted `localhost:3500` (the Dapr sidecar HTTP port), which was never forwarded. This would fail at runtime. Fixed by changing to `kubectl port-forward deploy/order-service 3500:3500` so that the Dapr sidecar port is actually accessible on localhost for the curl command to work.

## Review Notes
- The Deployment YAML manually sets `DAPR_HTTP_PORT` and `DAPR_GRPC_PORT` environment variables. These are automatically injected by the Dapr sidecar injector and do not need to be set manually. While not technically wrong (the values match the defaults), this could mislead readers into thinking manual configuration is required. A future update could remove these or add a comment clarifying they are shown for reference only.
- The sidecar annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`, `dapr.io/log-level`) are all correct and current.
- The Redis state store Component CRD is correctly formatted with proper use of `secretKeyRef` for the password.
- The service invocation URL format (`/v1.0/invoke/{appId}/method/{method}`) is correct.
- Log viewing commands correctly reference both the app container (`-c order-service`) and the Dapr sidecar container (`-c daprd`).
