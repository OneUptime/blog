# Validation Summary: How to Expose Flux Receiver Behind Gateway API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux notification-controller Receiver
- Kubernetes Gateway API
- Gateway
- HTTPRoute
- GitHub webhooks
- Kubernetes Services and CRDs
- kubectl

## Sources Consulted
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Kubernetes Gateway API specification: https://gateway-api.sigs.k8s.io/reference/1.5/spec/
- Kubernetes Gateway API HTTP method matching guide: https://gateway-api.sigs.k8s.io/guides/http-method-matching/
- Kubernetes Gateway API HTTP header modifier guide: https://gateway-api.sigs.k8s.io/guides/http-header-modifier/
- GitHub webhook signature validation documentation: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries

## Issues Found
- The HTTPRoute backend pointed to the `notification-controller` Service. Flux documents the external webhook endpoint as the `webhook-receiver` Service on port `80`, which forwards to the notification-controller webhook server on port `9292`. Updated the backend reference and added a short note explaining the Service.
- The HTTPRoute included a fallback rule that claimed to return 404 for all other requests, but it actually forwarded traffic to the same backend and only modified a response header. Removed the fallback rule and clarified that non-POST requests do not match the route rule.
- The cross-namespace Gateway section incorrectly used ReferenceGrant for HTTPRoute-to-Gateway attachment. Gateway API states that cross-namespace Gateway-route attachment is the exception to ReferenceGrant requirements and is controlled by the Gateway listener's `allowedRoutes`. Replaced the ReferenceGrant section with namespace label and `allowedRoutes` guidance.
- The webhook payload URL and curl command added an extra slash before `.status.webhookPath`, which already starts with `/hook/`. Updated the examples to concatenate the hostname and path directly.
- The manual GitHub curl test omitted the `X-GitHub-Event` header even though the Receiver filters events. Added `X-GitHub-Event: ping`.

## Review Notes
The Gateway API `method` match is an Extended support feature, so users should confirm their chosen Gateway implementation supports HTTPRoute method matching. The post already tells readers to install a Gateway API implementation and verify route conditions.
