# Validation Summary: How to Configure Ambassador Mappings with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Ambassador Edge Stack / Emissary-ingress
- Mapping custom resources
- RateLimitService
- gRPC routing

## Sources Consulted
- Emissary-ingress Mapping resource documentation: https://emissary-ingress.dev/docs/3.8/howtos/route/
- Emissary-ingress advanced Mapping configuration: https://emissary-ingress.dev/docs/3.8/topics/using/mappings/
- Emissary-ingress header-based routing: https://emissary-ingress.dev/docs/3.8/topics/using/headers/headers/
- Emissary-ingress canary releases: https://emissary-ingress.dev/docs/3.8/topics/using/canary/
- Emissary-ingress basic rate limiting: https://emissary-ingress.dev/docs/3.8/topics/using/basic-rate-limiting/
- Emissary-ingress add response headers: https://emissary-ingress.dev/docs/3.8/topics/using/headers/add-response-headers/
- Emissary-ingress gRPC guide: https://emissary-ingress.dev/docs/3.8/howtos/grpc/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The basic Mapping example described `allow_upgrade: [websocket]` as connection draining. Updated the comment to state that it allows WebSocket upgrade requests, matching the documented `allow_upgrade` behavior.
- The rate-limiting Mapping used non-current label specifier names (`string_request_label` and `remote_address_request_label`). Replaced them with the documented v3 label group syntax using `generic_key` and `remote_address`.
- The gRPC Mapping omitted the `rewrite` field and used `allow_upgrade: [h2c]`. Added `rewrite` matching the gRPC service prefix and removed `allow_upgrade`; the documented gRPC Mapping pattern uses `grpc: true` to configure HTTP/2 upstream behavior.
- The Flux Kustomization used `path: ./apps` with an empty `patches: []` field and a comment claiming only Mapping CRDs would be processed. Changed the path to `./apps/backend/ambassador-mappings` and removed the misleading empty patches field.

## Review Notes
- The examples assume the Ambassador/Emissary `Mapping` CRD is installed and that matching `Host` and `Listener` resources already exist, which is consistent with the prerequisites.
- The canary examples use explicit `weight` values on both mappings. This is valid; the Emissary docs also note that leaving the default mapping unweighted can simplify later canary percentage changes.
