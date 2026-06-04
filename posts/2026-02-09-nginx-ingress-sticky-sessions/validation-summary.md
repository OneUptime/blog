# Validation Summary: How to Implement NGINX Ingress Controller Sticky Sessions with Cookie Affinity

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Ingress (`networking.k8s.io/v1`)
- ingress-nginx controller
- Helm
- NGINX sticky sessions / cookie affinity
- TLS configuration
- ingress-nginx annotations and ConfigMap settings
- `kubectl` and `curl`

## Sources Consulted
- ingress-nginx Sticky Sessions example: https://kubernetes.github.io/ingress-nginx/examples/affinity/cookie/
- ingress-nginx Annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx ConfigMap reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx Installation Guide: https://kubernetes.github.io/ingress-nginx/deploy/
- ingress-nginx FAQ: https://kubernetes.github.io/ingress-nginx/faq/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes Ingress concepts: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The post claimed ingress-nginx supports both cookie-based and IP-based session affinity. Official ingress-nginx documentation states that the only NGINX affinity type is `cookie`, so the IP-based affinity claim was removed.
- The advanced cookie example used `nginx.ingress.kubernetes.io/session-cookie-httponly`, which is not a supported ingress-nginx session-cookie annotation. The unsupported annotation was removed.
- The cookie path comment said the default was `/`, but ingress-nginx documents the default as the currently matched path. The comment was corrected.
- The TLS example used `nginx.ingress.kubernetes.io/ssl-protocols`, which is not an Ingress annotation for frontend TLS protocols. The unsupported annotation was removed while keeping the valid `ssl-ciphers` annotation.
- The custom header example used `configuration-snippet` without noting that snippet annotations are disabled by default in current ingress-nginx defaults. A short prerequisite note was added.
- The graceful failure example used unsupported `upstream-fail-timeout` and `upstream-max-fails` annotations. They were replaced with supported `proxy-next-upstream` and `proxy-next-upstream-tries` annotations.
- The log parsing command used `awk '{print $7}'`, which does not reliably extract backend upstream addresses from ingress-nginx access logs. It was replaced with a command that extracts `IP:port` upstream entries.
- The logging ConfigMap example could imply that a separate arbitrary ConfigMap is automatically used by a Helm-installed controller. A note was added that Helm users should set the value under `controller.config`.

## Review Notes
- YAML code fences were parsed locally with PyYAML and passed.
- The ingress-nginx project is still technically valid to document, but the official repository notes support-version constraints and current operational/security caveats. Future revisions could mention version support and the broader migration trend toward Gateway API, but that was outside the scope of minimal correctness fixes.
