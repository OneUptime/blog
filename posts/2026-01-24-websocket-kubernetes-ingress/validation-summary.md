# Validation Summary: How to Configure WebSocket with Kubernetes Ingress

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- WebSocket
- Kubernetes Ingress
- Kubernetes Service and Deployment
- ingress-nginx
- Traefik Ingress and IngressRoute
- TLS secrets
- kubectl
- websocat, wscat, and curl testing

## Sources Consulted
- RFC 6455, The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455
- ingress-nginx WebSockets documentation: https://kubernetes.github.io/ingress-nginx/user-guide/miscellaneous/#websockets
- ingress-nginx custom headers documentation: https://kubernetes.github.io/ingress-nginx/examples/customization/custom-headers/
- ingress-nginx ConfigMap timeout documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx sticky sessions documentation: https://github.com/kubernetes/ingress-nginx/blob/main/docs/examples/affinity/cookie/README.md
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes TLS secret command documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Kubernetes liveness/readiness probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Traefik Kubernetes Ingress documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/ingress/
- Traefik WebSocket overview: https://doc.traefik.io/traefik/expose/overview/
- Traefik Kubernetes CRD service stickiness documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/traefikservice/
- Traefik v2 migration note for CRD API group deprecation: https://doc.traefik.io/traefik/v3.4/migrate/v2/

## Issues Found
- The post incorrectly stated that ingress-nginx requires explicit WebSocket upgrade header configuration. ingress-nginx documents WebSocket support as out of the box, with longer proxy read/send timeouts being the main required tuning, so the `proxy-set-headers` annotation and header ConfigMap were removed.
- The examples used `nginx.ingress.kubernetes.io/proxy-http-version` and `nginx.ingress.kubernetes.io/upstream-hash-by` as general WebSocket requirements. These are not required for WebSocket support in ingress-nginx, and hashing by `$request_uri` is not a correct general-purpose WebSocket affinity setting, so those annotations were removed.
- The timeout example set `proxy-connect-timeout` to `3600`, but ingress-nginx documents that connect timeout usually cannot exceed 75 seconds and WebSocket idle disconnects are controlled by read/send timeouts. The connect timeout annotation was removed.
- The Traefik section configured a Middleware to force `Connection: upgrade` and `Upgrade: websocket`. Traefik preserves WebSocket headers automatically, so the unnecessary middleware and annotation were removed.
- The Traefik CRD examples used the deprecated `traefik.containo.us/v1alpha1` API group. They were updated to `traefik.io/v1alpha1`.
- The sequence diagram showed post-upgrade messages going directly between client and pod. It was corrected to show messages continuing through the ingress path.
- The troubleshooting and conclusion text still referred to manual upgrade header configuration as required. Those statements were corrected to focus on backend upgrade support, routing, timeouts, TLS, and affinity.

## Review Notes
The Kubernetes and Traefik YAML snippets were manually reviewed for current API shape. Local executable validation was limited because `kubectl`, `ruby`, and `yq` are not installed in this environment.
