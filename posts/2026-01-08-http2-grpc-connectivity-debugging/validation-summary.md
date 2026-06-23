# Validation Summary: How to Debug HTTP/2 and gRPC Connectivity Issues in Kubernetes

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Kubernetes (Services, Ingress, NetworkPolicy, gRPC liveness/readiness probes)
- gRPC and HTTP/2 protocols
- grpcurl (CLI for gRPC)
- grpc-health-probe
- NGINX Ingress Controller
- Traefik (IngressRoute CRD)
- Istio (DestinationRule, istioctl)
- Linkerd (linkerd stat/tap/routes)
- openssl, curl, nghttp, tcpdump (TLS / HTTP/2 diagnostics)
- Go gRPC client (client-side load balancing)

## Sources Consulted
- ingress-nginx annotations & gRPC docs — https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/ and https://kubernetes.github.io/ingress-nginx/examples/grpc/
- ingress-nginx issue #11250 / #2475 (grpc_read_timeout / grpc_send_timeout annotation requests) — https://github.com/kubernetes/ingress-nginx/issues/11250
- Traefik v2→v3 migration docs (API group removal) — https://doc.traefik.io/traefik/migrate/v2-to-v3-details/
- grpc-health-probe releases — https://github.com/grpc-ecosystem/grpc-health-probe/releases
- grpcurl releases — https://github.com/fullstorydev/grpcurl/releases
- Kubernetes gRPC probe docs — https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Istio DestinationRule reference — https://istio.io/latest/docs/reference/config/networking/destination-rule/

## Issues Found
1. **Non-existent NGINX Ingress annotations (Issue 5 example).** The post used
   `nginx.ingress.kubernetes.io/grpc-read-timeout` and
   `nginx.ingress.kubernetes.io/grpc-send-timeout`. These annotations do not
   exist in ingress-nginx — they have been requested (issues #2475, #11250) but
   never implemented. For GRPC/GRPCS backends the controller derives
   `grpc_read_timeout`/`grpc_send_timeout` from the existing
   `proxy-read-timeout`/`proxy-send-timeout` annotations. Removed the two invalid
   annotations and added a clarifying comment that the proxy timeouts are
   inherited for gRPC backends.
2. **Deprecated/removed Traefik API group.** The Traefik `IngressRoute` example
   used `apiVersion: traefik.containo.us/v1alpha1`, which was deprecated in
   Traefik v2.10 and removed in Traefik v3. Updated to the current
   `apiVersion: traefik.io/v1alpha1`.

## Review Notes
- The pinned tool versions (`grpcurl` v1.8.9, `grpc-health-probe` v0.4.25) are
  real, working releases but are not the latest (current grpcurl is v1.9.x and
  grpc-health-probe is v0.4.4x). Pinned older versions still work, so they were
  left as-is.
- `GRPC_TRACE=all` / `GRPC_VERBOSITY=DEBUG` (Issue 6) are gRPC C-core env vars;
  grpcurl is Go-based and honors `GRPC_GO_LOG_*` instead. The C-core vars are
  harmless and remain useful when debugging C-core based clients, so they were
  left as informative context.
- The Traefik service `scheme: h2c` field, Kubernetes `grpc` probe (GA since
  1.27), Istio `h2UpgradePolicy: UPGRADE`, the headless-service load-balancing
  guidance, and all grpcurl/openssl/curl flags were verified as correct.
- All Mermaid diagrams, tables, and the Go client snippet are syntactically and
  technically accurate.
