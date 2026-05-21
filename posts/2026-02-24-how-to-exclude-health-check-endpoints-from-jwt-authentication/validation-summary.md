# Validation Summary: How to Exclude Health Check Endpoints from JWT Authentication

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- Kubernetes liveness, readiness, and startup probes
- Kubernetes Deployment probe configuration
- JWT authentication

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio health checking of Istio services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Kubernetes liveness, readiness, and startup probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/

## Issues Found
- Corrected the opening explanation from 401 Unauthorized and blanket pod restarts to 403 Forbidden for missing JWT under AuthorizationPolicy, with readiness failures taking pods out of service and liveness/startup failures causing restarts.
- Clarified that RequestAuthentication configures JWT validation but does not require credentials by itself; the JWT requirement comes from AuthorizationPolicy.
- Renamed and reworded the "notPaths" section because the example used an OR-ed single AuthorizationPolicy rather than `notPaths`.
- Corrected the kubelet probe rewrite explanation. Istio rewrites HTTP/gRPC probes to the sidecar agent on port 15020 and maps them through `/app-health/...`; disabling the rewrite makes probes use their original application path and port, where sidecar authorization policy can interfere.
- Corrected the alternative disable-probe-rewrite section so it no longer claims kubelet probes bypass Envoy and authorization policies entirely.

## Review Notes
The AuthorizationPolicy examples use current `security.istio.io/v1` APIs and match Istio's documented pattern for requiring JWT on most paths while allowing health paths. The wildcard path examples are valid for Istio string matching, but production policies should keep health path globs as narrow as practical.
