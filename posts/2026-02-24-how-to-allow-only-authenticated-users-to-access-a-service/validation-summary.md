# Validation Summary: How to Allow Only Authenticated Users to Access a Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- JWT
- RequestAuthentication
- AuthorizationPolicy
- JWKS
- istioctl
- kubectl

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio JWT authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-jwt/
- Istio pilot-discovery command/environment reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The Step 2 explanation said both missing and invalid tokens get a 403 response. Istio RequestAuthentication rejects requests containing invalid authentication information before AuthorizationPolicy evaluation, and the official JWT task shows invalid JWTs returning 401 while missing JWTs denied by AuthorizationPolicy return 403. Updated the text to distinguish missing-token authorization failure from invalid-token authentication failure.
- The JWKS caching section described the 20-minute value as a sidecar cache TTL. Istio documents `PILOT_JWT_PUB_KEY_REFRESH_INTERVAL` as the interval for Istiod to fetch JWKS public keys, defaulting to 20 minutes. Updated the wording to describe it as the Istiod JWKS refresh interval.

## Review Notes
- The examples use `selector`, which applies to sidecar workloads. Istio waypoint proxies require `targetRefs` instead of selector-based policies, so future revisions could mention ambient/waypoint behavior if the post is expanded.
