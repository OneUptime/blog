# Validation Summary: How to Organize Infrastructure and Applications in a Flux CD Repository

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization and HelmRelease resources
- Kubernetes manifests, Namespaces, Deployments, Services, and Ingress
- Helm repositories and charts
- cert-manager ACME ClusterIssuer configuration
- Traefik ingress controller
- Kustomize overlays and patches

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux CLI `flux events` documentation: https://fluxcd.io/flux/cmd/flux_events/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Namespace documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes Ingress NGINX retirement announcement: https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/
- Traefik Helm chart documentation: https://github.com/traefik/traefik-helm-chart
- Traefik chart repository documentation: https://helm.traefik.io/traefik

## Issues Found
- The post used the community `ingress-nginx` Helm chart as the current ingress-controller example. Kubernetes announced that Ingress NGINX maintenance halted in March 2026, so the example was updated to use the maintained Traefik Helm chart and repository instead.
- The Traefik-related production patch was updated to use valid Traefik Helm chart values (`deployment.replicas` and top-level `resources`) instead of ingress-nginx-specific values.
- The cert-manager ACME HTTP-01 solver used `class: nginx`. cert-manager recommends `ingressClassName` for modern ingress controllers, so this was changed to `ingressClassName: traefik`.
- The application Ingress referenced a `frontend` Service that was not defined. A matching Kubernetes Service manifest was added.
- The application manifests used the `apps` namespace without defining it in the examples. A Namespace manifest was added.
- The Ingress used `${FRONTEND_HOST}` without showing Flux `postBuild` substitution. Because Flux only substitutes variables when substitution is configured, the example was changed to the concrete host `frontend.example.com`.
- The infrastructure config Kustomizations lacked `wait: true` even though the article describes infrastructure configs as part of the readiness chain. `wait: true` was added to the config-layer examples.

## Review Notes
The Flux API versions (`kustomize.toolkit.fluxcd.io/v1`, `source.toolkit.fluxcd.io/v1`, and `helm.toolkit.fluxcd.io/v2`) are current. The Kubernetes `networking.k8s.io/v1` Ingress API remains stable, but Kubernetes notes that Ingress is frozen and Gateway API is the preferred direction for new functionality.
