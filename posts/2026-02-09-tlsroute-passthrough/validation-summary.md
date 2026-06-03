# Validation Summary: How to configure TLSRoute for TLS passthrough routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Gateway API
- TLSRoute
- Gateway TLS passthrough
- ReferenceGrant
- kubectl
- OpenSSL
- PostgreSQL libpq TLS negotiation
- Multicluster Services API ServiceImport

## Sources Consulted
- Gateway API TLSRoute reference: https://gateway-api.sigs.k8s.io/reference/api-types/tlsroute/
- Gateway API TLS routing guide: https://gateway-api.sigs.k8s.io/guides/user-guides/tls-routing/
- Gateway API main API specification: https://gateway-api.sigs.k8s.io/reference/api-spec/main/spec/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- PostgreSQL libpq connection documentation: https://www.postgresql.org/docs/current/libpq-connect.html
- SIG Multicluster Services API overview: https://multicluster.sigs.k8s.io/concepts/multicluster-services-api/

## Issues Found
- TLSRoute examples used `gateway.networking.k8s.io/v1alpha2`. Updated them to `gateway.networking.k8s.io/v1`, because TLSRoute is now in the Gateway API Standard channel and the current API reference documents `v1`.
- ReferenceGrant used `gateway.networking.k8s.io/v1beta1`. Updated it to `gateway.networking.k8s.io/v1` to match the current Gateway API.
- The multi-hostname example used unsupported per-rule `matches.snis` fields. Reworked it into separate TLSRoute resources that use `spec.hostnames`, which is the supported SNI matching field in the current TLSRoute API.
- The fallback backend example claimed that a backend with `weight: 0` would automatically receive failover traffic. Corrected the wording because Gateway API weight `0` means no traffic is forwarded to that backend.
- The PostgreSQL TLS passthrough section did not mention libpq's default PostgreSQL SSL negotiation. Added a note that libpq clients need `sslnegotiation=direct` for a protocol-agnostic TLSRoute gateway to see a TLS ClientHello and SNI.
- The best-practices section implied wildcard hostnames are slower and that TLSRoute has portable timeout fields. Adjusted the wording to avoid unsupported performance and API-field claims.

## Review Notes
The examples are syntactically valid YAML after the edits. Weighted backendRefs for TLSRoute and ServiceImport backendRefs are documented, but support levels vary by Gateway API implementation, so users should confirm their chosen GatewayClass supports those extended features.
