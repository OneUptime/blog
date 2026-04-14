# Validation Summary: How to Use Dapr Service Invocation with Load Balancing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation, load balancing, actor placement service)
- Kubernetes (Deployments, annotations, HorizontalPodAutoscaler)
- Node.js / Express (demonstration endpoint)
- curl / jq (CLI testing)

## Sources Consulted
- Dapr Service Invocation Overview: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-overview/
- Dapr How-To: Invoke services using HTTP: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/
- Dapr Kubernetes Overview (annotations): https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/
- Dapr Name Resolution Component Specs: https://docs.dapr.io/reference/components-reference/supported-name-resolution/
- Dapr Placement Service Overview: https://docs.dapr.io/concepts/dapr-services/placement/
- Kubernetes HorizontalPodAutoscaler Walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/

## Issues Found
- **HTTP method mismatch between curl and Express route handler**: The JavaScript code used `app.post('/orders', ...)` (POST handler), but the curl commands (`curl http://localhost:3500/v1.0/invoke/order-service/method/orders`) send GET requests by default (no `-X POST` or `-d` flag). Dapr forwards the HTTP method as-is, so the GET request would not match the POST route. Fixed by changing `app.post` to `app.get`, since the curl examples are the primary interface shown to the reader and GET is appropriate for this simple demonstration of load distribution.

## Review Notes
- All Dapr Kubernetes annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`) are correct and current.
- The service invocation URL format (`/v1.0/invoke/{app-id}/method/{method-name}`) is correct.
- The claim that Dapr uses round-robin load balancing for service invocation is accurate per official documentation.
- The `autoscaling/v2` API version for HPA is the current stable version (GA since Kubernetes 1.23).
- The explanation of actors using the placement service (consistent hashing) rather than round-robin load balancing is accurate.
- The statement that Dapr does not support sticky sessions natively is accurate.
