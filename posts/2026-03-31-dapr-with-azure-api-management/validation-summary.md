# Validation Summary: How to Use Dapr with Azure API Management

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Azure API Management (APIM)
- Azure CLI (`az apim`)
- Kubernetes (Dapr sidecar injection annotations)
- Azure AD / Microsoft Entra ID (JWT validation via OpenID Connect)

## Sources Consulted
- Azure CLI `az apim create --help`, `az apim api import --help`, `az apim api update --help` (verified against CLI v2.71.0)
- Azure APIM policy reference: `set-backend-service`, `rate-limit-by-key`, `validate-jwt`, `set-method`, `set-header`, `return-response`, `set-status`, `set-body` — https://learn.microsoft.com/en-us/azure/api-management/api-management-policies
- Dapr HTTP API reference for service invocation (`/v1.0/invoke/{appId}/method`) — https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr HTTP API reference for pub/sub publish (`/v1.0/publish/{pubsubName}/{topic}`) — https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Kubernetes annotations reference (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`) — https://docs.dapr.io/reference/arguments-annotations-overview/
- Microsoft Entra ID OpenID Connect configuration endpoint format — https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc

## Issues Found
No technical issues found.

## Review Notes
- The Kubernetes Deployment YAML is intentionally abbreviated (no `replicas`, `selector`, or container spec) to focus on Dapr annotations. This is acceptable for a blog snippet but readers should know a full Deployment spec is required.
- The `dapr-sidecar` hostname used in the backend URLs (e.g., `http://dapr-sidecar:3500`) is a placeholder. In practice, the actual hostname depends on the deployment topology — on AKS with Dapr injected, the sidecar is typically accessible via `localhost:3500` from within the same pod, or via a ClusterIP service if APIM is external to the pod.
- All APIM policy XML syntax is correct and uses current attribute names and values.
