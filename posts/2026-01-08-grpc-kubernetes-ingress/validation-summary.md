# Validation Summary: How to Expose gRPC Services with Kubernetes Ingress

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- gRPC over HTTP/2
- Kubernetes Ingress
- NGINX Ingress Controller (kubernetes/ingress-nginx)
- Traefik Ingress Controller (IngressRoute / IngressRouteTCP CRDs)
- TLS termination, TLS passthrough, and mTLS
- cert-manager (Certificate / ClusterIssuer)
- gRPC-Web / CORS
- grpcurl and kubectl for testing

## Sources Consulted
- Traefik v2-to-v3 migration docs (CRD API group change) — https://doc.traefik.io/traefik/migrate/v2-to-v3-details/
- ingress-nginx ConfigMap reference — https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx annotations reference (backend-protocol GRPC/GRPCS, ssl-passthrough, auth-tls, cors) — https://github.com/kubernetes/ingress-nginx/blob/main/docs/user-guide/nginx-configuration/annotations.md
- nginx ngx_http_v2_module docs and trac ticket #2432 (HTTP/2 server push removal in 1.25.1) — https://nginx.org/en/docs/http/ngx_http_v2_module.html
- nginx ngx_http_grpc_module (grpc_read_timeout, grpc_send_timeout, grpc_buffer_size, grpc_set_header)

## Issues Found
1. **Deprecated Traefik CRD API group (`traefik.containo.us/v1alpha1`)** — The `traefik.containo.us` API group was deprecated in Traefik v2.10 and **removed entirely in Traefik v3**, which is the version the `traefik/traefik` Helm chart now installs. All IngressRoute, Middleware, ServersTransport, TLSOption, and IngressRouteTCP manifests using `traefik.containo.us/v1alpha1` would fail to apply. Replaced every occurrence with `traefik.io/v1alpha1`.

2. **Obsolete `http2_push_preload on;` directive** — HTTP/2 server push (including `http2_push`, `http2_push_preload`, and `http2_max_concurrent_pushes`) was removed in nginx 1.25.1, which current ingress-nginx releases ship. The directive is also irrelevant to gRPC. Removed the directive and its accompanying comment from the `server-snippet` example.

3. **Incorrect comment on `use-forwarded-headers`** — The ConfigMap comment read "Enable backend HTTP/2", but `use-forwarded-headers` only controls whether NGINX trusts incoming `X-Forwarded-*` headers from an upstream L7 proxy; it has nothing to do with backend HTTP/2 (which is enabled via the `backend-protocol: GRPC` annotation). Corrected the comment to describe the option's actual behavior.

## Review Notes
- `grpc-buffer-size-kb` was verified as a genuine ingress-nginx ConfigMap key, and `use-http2` / `http2-max-concurrent-streams` are both valid and correctly used.
- `backend-protocol: "GRPC"` (h2c backend) and `"GRPCS"` (TLS backend) annotations, plus the `auth-tls-*` mTLS annotations and CORS annotations, are all accurate.
- The nginx gRPC directives in the snippets (`grpc_read_timeout`, `grpc_send_timeout`, `grpc_buffer_size`, `grpc_set_header`) are valid `ngx_http_grpc_module` directives.
- grpcurl flags (`-insecure`, `-cacert`, `-cert`, `-key`, `-plaintext`, `-d`) and the Traefik `scheme: h2c` backend setting are correct.
- Minor caveat not changed (operationally valid but worth noting to readers): the NGINX `ssl-passthrough` annotation requires the controller to be started with the `--enable-ssl-passthrough` flag, and with passthrough the `backend-protocol` annotation is effectively ignored since routing happens at the TCP/SNI layer.
- The `kubernetes.io/ingress.class` annotation is legacy but harmless here since each manifest also sets the modern `spec.ingressClassName`; left as-is.
