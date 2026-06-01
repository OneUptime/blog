# Validation Summary: How to Implement Rate Limiting on AKS Ingress Using NGINX Annotations

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes Ingress
- community ingress-nginx controller
- NGINX rate limiting
- Helm
- Prometheus metrics

## Sources Consulted
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx custom errors documentation: https://kubernetes.github.io/ingress-nginx/user-guide/custom-errors/
- ingress-nginx monitoring documentation: https://kubernetes.github.io/ingress-nginx/user-guide/monitoring/
- ingress-nginx deployment documentation: https://kubernetes.github.io/ingress-nginx/deploy/
- Kubernetes Ingress v1 API documentation: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- ingress-nginx GitHub repository retirement notice: https://github.com/kubernetes/ingress-nginx
- NGINX rate limiting explanation: https://blog.nginx.org/blog/rate-limiting-nginx

## Issues Found
- The post used `nginx.ingress.kubernetes.io/custom-http-errors: "429"` as if it changed rate-limit rejections to HTTP 429. That annotation/configuration is for intercepting selected error codes and sending them to a default backend, not for choosing the rate-limit rejection status. I removed it from the Ingress example and changed the 429 guidance to use the controller ConfigMap key `limit-req-status-code`.
- The custom error example defined a `ConfigMap` with a `429` JSON body, but ingress-nginx does not use that ConfigMap by itself for rate-limit responses. I replaced it with an ingress-nginx controller ConfigMap example that sets `limit-req-status-code: "429"`.
- The global ConfigMap example implied `limit-rps` defaults could be configured globally and included `limit-req-zone-size`, which is not a documented ingress-nginx ConfigMap key. I changed the section to explain that request-rate limits are configured per Ingress and kept only documented global status-code settings: `limit-req-status-code` and `limit-conn-status-code`.
- The post described `limit-rps` values as per client IP but omitted the ingress-nginx replica behavior. I updated the text and YAML comments to clarify that rate limits are applied per controller replica.
- The post presented ingress-nginx installation as a current default recommendation. Since ingress-nginx was retired and archived in March 2026, I added a caveat for new production deployments while preserving the existing tutorial for current ingress-nginx users.
- The monitoring command assumed metrics are available. I added a note that metrics must be enabled on the Helm release first.

## Review Notes
The Kubernetes `networking.k8s.io/v1` Ingress manifests, `ingressClassName`, `pathType: Prefix`, Helm repository commands, rate-limit annotations, `proxy-body-size`, `limit-whitelist`, and Prometheus metric name are consistent with the consulted documentation. The post remains technically useful for existing ingress-nginx installations, but future updates should consider a Gateway API based replacement because ingress-nginx is no longer actively developed.
