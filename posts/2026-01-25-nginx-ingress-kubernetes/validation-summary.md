# Validation Summary: How to Deploy Nginx Ingress Controller in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Ingress
- ingress-nginx controller
- Helm
- kubectl
- cert-manager
- Let's Encrypt ACME HTTP-01
- Kubernetes TLS Secrets
- NGINX ingress annotations and ConfigMap settings

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking-resources/ingress-v1/
- ingress-nginx installation guide: https://kubernetes.github.io/ingress-nginx/deploy/
- ingress-nginx basic usage documentation: https://kubernetes.github.io/ingress-nginx/user-guide/basic-usage/
- ingress-nginx rewrite documentation: https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- ingress-nginx regex path matching documentation: https://kubernetes.github.io/ingress-nginx/user-guide/ingress-path-matching/
- ingress-nginx annotations risk reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations-risk/
- ingress-nginx ConfigMap reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx TLS documentation: https://kubernetes.github.io/ingress-nginx/user-guide/tls/
- ingress-nginx basic authentication example: https://kubernetes.github.io/ingress-nginx/examples/auth/basic/
- ingress-nginx Helm chart values: https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml
- cert-manager installation documentation: https://cert-manager.io/docs/installation/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager API reference for ACME HTTP-01 solver fields: https://cert-manager.io/docs/reference/api-docs/

## Issues Found
- Updated the ingress-nginx static manifest URL from `controller-v1.9.4` to the current documented `controller-v1.15.1` cloud provider manifest.
- Removed `nginx.ingress.kubernetes.io/use-regex: "true"` from the path-based routing example because the paths shown are normal prefix paths, not regex paths. ingress-nginx documents regex paths with `pathType: ImplementationSpecific`.
- Updated the cert-manager static install manifest from `v1.13.0` to the current documented `v1.20.2` manifest.
- Changed the cert-manager HTTP-01 solver field from `class: nginx` to `ingressClassName: nginx`, which cert-manager documents as the recommended current field.
- Changed the standalone common annotation example's `rewrite-target` from `/$1` to `/` because the example path does not define a capture group.
- Corrected the ingress-nginx ConfigMap key from `worker-connections` to `max-worker-connections`.
- Added a note that `configuration-snippet` requires `controller.allowSnippetAnnotations=true`, because the current ingress-nginx Helm chart disables snippet annotations by default.
- Replaced the unsupported Helm value `controller.podAntiAffinity.type=hard` with chart-supported `controller.affinity.podAntiAffinity.requiredDuringSchedulingIgnoredDuringExecution[...]` settings.

## Review Notes
- The Ingress API examples use `networking.k8s.io/v1`, `ingressClassName`, `pathType`, and the current backend service shape, which are correct for current Kubernetes.
- The basic authentication Secret example uses an `auth` key, matching ingress-nginx's documented requirement.
- The production example is technically valid, but snippet annotations should be enabled only after considering the documented security risk.
