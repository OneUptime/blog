# Validation Summary: How to Troubleshoot Kubernetes Ingress Not Working

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Kubernetes Ingress
- Kubernetes Services, EndpointSlices, and Endpoints
- ingress-nginx controller
- Traefik ingress controller
- TLS secrets and certificates
- cert-manager Certificate resources
- DNS and HTTP troubleshooting with curl, dig, nslookup, and host
- kubectl CLI

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- ingress-nginx rewrite documentation: https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- ingress-nginx path matching documentation: https://kubernetes.github.io/ingress-nginx/user-guide/ingress-path-matching/
- ingress-nginx repository and supported versions table: https://github.com/kubernetes/ingress-nginx
- Kubernetes CVE-2026-4342 ingress-nginx affected versions notice: https://github.com/kubernetes/kubernetes/issues/137893

## Issues Found
- The ingress-nginx installation command used `controller-v1.9.4`, which is outdated and affected by later security advisories. Updated it to `controller-v1.15.1`, a final patched release listed by the project, and noted that ingress-nginx is retired after March 2026.
- The rewrite example used `nginx.ingress.kubernetes.io/rewrite-target: /$1` with the path `/api(/|$)(.*)`. For this regex, the path remainder is in capture group `$2`, not `$1`. Updated the rewrite target to `/$2`.
- The regex rewrite example did not explicitly enable regex path handling. Added `nginx.ingress.kubernetes.io/use-regex: "true"` to match ingress-nginx documentation.
- The ingress class annotation was shown as active guidance. Updated it to show `kubernetes.io/ingress.class` as a deprecated legacy annotation and kept `spec.ingressClassName` as the recommended field.
- The post described `ingressClassName` as always required in newer Kubernetes versions. Corrected this to say it is recommended and required when there is no default IngressClass.
- The backend verification flow relied primarily on the legacy Endpoints API. Updated checks to use EndpointSlices first and kept `kubectl get endpoints` as an older-cluster fallback.
- The quick diagnosis script only checked Endpoints for backend services. Added an EndpointSlice check before the legacy Endpoints check.

## Review Notes
The post remains technically relevant as a troubleshooting guide, especially for existing Ingress and ingress-nginx deployments. For future revisions, it should more strongly guide new deployments toward Gateway API or a currently maintained ingress controller because the community ingress-nginx project is retired after March 2026.
