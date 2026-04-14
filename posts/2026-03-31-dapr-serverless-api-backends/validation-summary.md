# Validation Summary: How to Use Dapr for Serverless API Backends

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (Deployments, annotations, sidecar injection)
- KEDA (Kubernetes Event-Driven Autoscaling)
- Node.js / Express.js
- RabbitMQ (as KEDA trigger source)
- Dapr State Management API
- Dapr Pub/Sub API
- Dapr Service Invocation API

## Sources Consulted
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Bindings API reference: https://docs.dapr.io/reference/api/bindings_api/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- KEDA ScaledObject specification: https://keda.sh/docs/latest/concepts/scaling-deployments/
- KEDA RabbitMQ trigger documentation: https://keda.sh/docs/latest/scalers/rabbitmq-queue/

## Issues Found

1. **Section title incorrectly said "Output Bindings" instead of "Pub/Sub"** (line 71): The section was titled "Using Output Bindings for Event-Driven Responses" but the code used the Dapr pub/sub publish API (`/v1.0/publish/pubsub/orders`), not the output bindings API (`/v1.0/bindings/{name}`). Pub/sub and output bindings are distinct Dapr building blocks. Changed the heading to "Using Pub/Sub for Event-Driven Responses" to match the code.

2. **Incorrect claim about Dapr sidecar waking containers on scale-from-zero** (line 108): The post stated "The Dapr sidecar wakes the container as traffic arrives." When scaled to zero replicas, there are no pods running and therefore no Dapr sidecar. It is KEDA that monitors the external trigger source (e.g., RabbitMQ queue length) and scales the deployment back up via the Kubernetes API. Corrected to state that KEDA monitors the trigger source and scales the deployment back up.

## Review Notes
- The JavaScript code uses the global `fetch` API without importing it, which is correct for Node.js 18+ but may not work on older Node.js versions. The post does not specify a Node.js version requirement.
- The KEDA ScaledObject uses `apiVersion: keda.sh/v1alpha1`, which is current for KEDA v2.x. The older KEDA v1 used `keda.k8s.io/v1alpha1`.
- All Dapr HTTP API endpoints, request formats, and Kubernetes annotations were verified as correct.
