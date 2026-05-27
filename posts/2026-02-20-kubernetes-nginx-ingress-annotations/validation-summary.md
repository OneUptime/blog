# Validation Summary: Essential Nginx Ingress Controller Annotations for Kubernetes

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- Kubernetes Ingress
- ingress-nginx controller
- NGINX annotations and ConfigMap settings
- TLS, HSTS, CORS, rewrites, rate limiting, proxy timeouts, WebSocket proxying, and basic authentication
- kubectl and htpasswd

## Sources Consulted
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes Ingress concept documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx TLS/HTTPS documentation: https://kubernetes.github.io/ingress-nginx/user-guide/tls/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx basic authentication example: https://kubernetes.github.io/ingress-nginx/examples/auth/basic/
- kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- The HTTPS redirect example said `force-ssl-redirect` changes the redirect from 301 to 308. ingress-nginx already uses 308 for HTTPS redirects by default; `force-ssl-redirect` is for enforcing HTTPS when TLS is terminated outside the cluster or no TLS block is available. Updated the comment.
- The HSTS example used non-existent `nginx.ingress.kubernetes.io/hsts*` annotations for ingress-nginx. Replaced it with the supported ingress-nginx ConfigMap keys: `hsts`, `hsts-max-age`, `hsts-include-subdomains`, and `hsts-preload`.
- The rate limiting example claimed `limit-rate-after: "0"` returns HTTP 429. That annotation controls response bandwidth throttling threshold and does not set the rejection status. Removed the incorrect annotation and comment.
- The WebSocket example claimed `upstream-hash-by` is required for WebSocket upgrades. It configures consistent upstream hashing and is not required for WebSocket upgrade handling. Removed the annotation and comment.
- The custom headers example said headers were added via a ConfigMap but used `configuration-snippet`. Replaced it with the supported `nginx.ingress.kubernetes.io/custom-headers` annotation and a matching ConfigMap.

## Review Notes
The `custom-headers` annotation requires the controller-level `global-allowed-response-headers` setting to include the headers being set. The `configuration-snippet` annotation remains valid for some deployments, but it is often disabled in multi-tenant clusters because of security risk.
