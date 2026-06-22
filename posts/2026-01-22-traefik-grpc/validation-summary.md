# Validation Summary: How to Configure Traefik for gRPC

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Traefik Proxy
- Traefik Kubernetes CRDs
- gRPC
- HTTP/2 and h2c
- TLS termination and passthrough
- Kubernetes health probes
- grpcurl

## Sources Consulted
- Traefik Proxy gRPC examples: https://doc.traefik.io/traefik/v3.0/user-guides/grpc/
- Traefik exposing gRPC services: https://doc.traefik.io/traefik/expose/overview/
- Traefik EntryPoints HTTP/2 reference: https://doc.traefik.io/traefik/routing/entrypoints/
- Traefik Kubernetes CRD Service reference: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/service/
- Traefik Kubernetes CRD ServersTransport reference: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/serverstransport/
- Traefik GrpcWeb middleware reference: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/grpcweb/
- gRPC health checking guide: https://grpc.io/docs/guides/health-checking/
- grpcurl project documentation: https://github.com/fullstorydev/grpcurl

## Issues Found
- The static Traefik configuration used an ACME HTTP-01 challenge on the `web` entrypoint but did not define that entrypoint. Added a `web` entrypoint on port 80 so the resolver configuration refers to an existing entrypoint.
- The `ServersTransport` example used `rootCAsSecrets`, which is deprecated in current Traefik CRDs. Replaced it with `rootCAs` using a Secret reference.
- The gRPC health-check section implied Traefik active health checks could be configured generally for Kubernetes services. Current Traefik CRD documentation says these `healthCheck` fields are evaluated for Kubernetes `ExternalName` services. Updated the text and snippet to specify `ExternalName` services and changed the example to use `mode: grpc` instead of an HTTP path.

## Review Notes
The remaining examples align with Traefik's documented gRPC behavior: backend communication should use `h2c` for cleartext HTTP/2 or HTTPS for HTTP/2 over TLS, and the GrpcWeb middleware requires Traefik to communicate with backends using gRPC. The post does not pin a Traefik version, so future reviews should re-check CRD field compatibility against the Traefik version used by readers.
