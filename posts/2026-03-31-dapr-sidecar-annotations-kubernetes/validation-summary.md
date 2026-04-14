# Validation Summary: How to Configure Dapr Sidecar Annotations on Kubernetes

## Status
validated

## Post Type
Reference / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (Deployments, Pod annotations)
- daprd sidecar container
- Prometheus metrics
- gRPC / HTTP protocols

## Sources Consulted
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Kubernetes annotations guide: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-annotations/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/

## Issues Found

1. **Wrong comment on `dapr.io/enable-api-logging` in Protocol section**: The comment read "Enable gRPC proxying for service invocation" but this annotation enables API call logging, not gRPC proxying. There is no Dapr annotation for "enabling gRPC proxying" — the `dapr.io/app-protocol` annotation handles protocol selection. Removed the duplicate entry with the incorrect comment.

2. **Duplicate `dapr.io/enable-api-logging` annotation**: The annotation appeared in both the "Protocol and API Annotations" section (with the wrong comment) and the "Logging and Debugging Annotations" section (with the correct comment). Removed the duplicate from the Protocol section, keeping the correct instance in the Logging section.

3. **Missing `spec.selector` in Deployment example**: The full Deployment YAML was missing the required `spec.selector.matchLabels` field. Without this, `kubectl apply` would reject the manifest with a validation error. Added the selector matching the existing `app: order-service` label.

## Review Notes
- The `dapr.io/http-max-request-size` and `dapr.io/http-read-buffer-size` annotations are functional but deprecated in newer Dapr versions. The replacements are `dapr.io/max-body-size` and `dapr.io/read-buffer-size` respectively. This may warrant an update if the post targets Dapr 1.14+.
- The post references `daprio/daprd:1.13.0` — readers on newer Dapr versions should substitute their current version.
- All annotation key names verified as correct against official Dapr documentation.
- Default values cited (metrics port 9090, log level info, app-protocol http, http-max-request-size 4 MB) are accurate.
