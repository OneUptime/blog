# Validation Summary: How to Implement NGINX Ingress Controller Custom Error Pages and Redirects

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Ingress
- Ingress-NGINX Controller
- NGINX custom error pages
- Ingress annotations
- kubectl
- curl

## Sources Consulted
- Ingress-NGINX custom errors documentation: https://kubernetes.github.io/ingress-nginx/user-guide/custom-errors/
- Ingress-NGINX custom errors example: https://kubernetes.github.io/ingress-nginx/examples/customization/custom-errors/
- Ingress-NGINX annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Ingress-NGINX ConfigMap documentation for `custom-http-errors`: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/#custom-http-errors
- Ingress-NGINX custom error pages image example manifest: https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/docs/examples/customization/custom-errors/custom-default-backend.yaml
- Kubernetes Ingress API reference: https://kubernetes.io/docs/concepts/services-networking/ingress/
- kubectl scale reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/

## Issues Found
- The basic error page service used `nginx:alpine` as a static file server. Ingress-NGINX sends custom error metadata to the default backend through headers such as `X-Code`, and the custom backend is expected to return the original HTTP status code. A plain static NGINX server would normally return `200` for a custom error body, so the example was changed to use the official `registry.k8s.io/ingress-nginx/custom-error-pages:v1.2.9` backend pattern, mount pages at `/www`, and expose port `8080`.
- The dynamic error page example used `{{ERROR_CODE}}` placeholders in static HTML. Those placeholders are not substituted by Ingress-NGINX or a static web server. The example was changed to serve status-code-specific files that match the error code passed by Ingress-NGINX.
- The complete service ConfigMap included an `nginx.conf` with `try_files /$1.html /error.html`; `$1` would not be populated in that location because there was no regex capture. The invalid config was removed in favor of status-code-specific error page files.

## Review Notes
- The redirect annotations `nginx.ingress.kubernetes.io/permanent-redirect` and `nginx.ingress.kubernetes.io/temporal-redirect` are current Ingress-NGINX annotations. Server snippets are also documented, but cluster administrators may disable snippet annotations for security reasons.
- The YAML snippets were parsed successfully after the corrections.
