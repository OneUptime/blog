# Validation Summary: How to Deploy Polyglot Dapr Services on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar injection, Configuration CRD, component definitions)
- Kubernetes (Deployments, namespaces, pod annotations, selectors)
- Python, Go, Java, Node.js (polyglot service images)
- gRPC (Go service protocol annotation)
- Zipkin (distributed tracing)

## Sources Consulted
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Configuration spec: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Kubernetes deployment guide: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Kubernetes Deployment spec: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- dapr CLI reference (init -k): https://docs.dapr.io/reference/cli/dapr-init/

## Issues Found

1. **Missing pod template labels in Java Notification Service Deployment** (Critical)
   - **What was wrong:** The `template.metadata` section had `annotations` but was missing `labels`. The `spec.selector.matchLabels` specified `app: notification-service`, but the pod template had no matching labels. Kubernetes requires `selector.matchLabels` to match `template.metadata.labels` — this Deployment would be rejected by the API server with a validation error.
   - **What was changed:** Added `labels: { app: notification-service }` to `template.metadata` in the Java notification service Deployment manifest.
   - **Why:** Without matching labels, the Deployment controller cannot associate pods with the Deployment, and the Kubernetes API server rejects the manifest at creation time.

2. **Tags and description incorrectly reference Helm** (Minor)
   - **What was wrong:** The post's tags included "Helm" and the description mentioned "Helm charts," but the post exclusively uses plain `kubectl apply` with raw YAML manifests. Helm is never used.
   - **What was changed:** Removed "Helm" from the tags and removed "Helm charts and" from the description.
   - **Why:** Mentioning Helm sets incorrect expectations for readers looking for Helm-based deployment guidance.

## Review Notes
- The gateway-service-node is listed in the project structure but no Deployment manifest is shown for it. This is acceptable as the post demonstrates the pattern with three languages and readers can extrapolate, but a future revision could add the Node.js example for completeness.
- All Dapr annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`, `dapr.io/app-protocol`, `dapr.io/config`, `dapr.io/log-level`) are correct and current.
- The Dapr Configuration CRD (`dapr.io/v1alpha1`, kind: Configuration) with tracing and mTLS settings is correct.
- The `dapr init -k` command and deployment ordering (Dapr runtime -> namespace -> components -> config -> services) is correct and follows best practices.
- The verification curl command targets the order-service directly; the comment "Test Python -> Go service invocation" assumes the order service internally invokes the inventory service via Dapr, which is a reasonable end-to-end test pattern.
