# Validation Summary: How to Implement Maintenance Mode for Applications with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2
- Kubernetes Ingress
- Kubernetes Deployment, Service, and ConfigMap resources
- Kustomize overlays and JSON 6902 patches
- ingress-nginx
- kubectl and Flux CLI
- nginx container image

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx custom errors documentation: https://kubernetes.github.io/ingress-nginx/user-guide/custom-errors/
- Docker Hub nginx official image tags: https://hub.docker.com/_/nginx

## Issues Found
- The maintenance Service was placed in `platform-system`, while the Ingress was in `team-alpha` and the patch attempted to set `backend.service.namespace`. Kubernetes Ingress backends reference Services by name and port, and the backend Service must be in the Ingress namespace. Changed the Deployment, Service, and ConfigMap examples to use `team-alpha`, and removed the invalid backend namespace field.
- The ingress-nginx `default-backend` annotation used `platform-system/maintenance-page`, but ingress-nginx documents this annotation as a Service name in the same namespace as the annotated Ingress. Removed the default-backend and custom-http-errors annotations because direct backend switching already routes matching traffic to the maintenance Service.
- The prerequisites said nginx or Traefik, while the example uses nginx-specific configuration. Clarified that the examples use ingress-nginx and that Traefik users should adjust `ingressClassName` and annotations.
- The example used `nginx:1.25-alpine`, which is stale relative to current official nginx image tags. Updated it to `nginx:1.30-alpine`.
- The conclusion implied Git history is preserved even when using a direct `kubectl patch`. Tightened the statement so Git history preservation is tied to the GitOps-native commit workflow.

## Review Notes
The local environment did not have `kubectl`, `flux`, or `kustomize` installed, so CLI syntax and Kustomize behavior were verified against official documentation rather than local command output. The post intentionally verifies the maintenance page with HTTP 200; returning 503 can be preferable for SEO and client semantics during planned downtime, but that would require a different implementation choice and was not changed.
