# Validation Summary: How to Add Sidecar Containers with Post-Renderer in HelmRelease

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux HelmRelease
- Helm post-renderers
- Kustomize strategic merge patches
- Kubernetes Deployments, Pods, sidecar containers, volumes, and resources
- kubectl
- Prometheus scrape annotations
- Fluent Bit
- StatsD exporter
- OAuth2 Proxy

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease API reference: https://v2-0.docs.fluxcd.io/flux/components/helm/api/
- Flux Kustomization patches documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes sidecar containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- OAuth2 Proxy 7.5.x configuration reference: https://oauth2-proxy.github.io/oauth2-proxy/7.5.x/configuration/overview/

## Issues Found
- The basic Fluent Bit example claimed the sidecar shared a log volume with the main application container, but the patch only mounts the new volume in the sidecar. Updated the text to state that the main container must already mount the volume or be patched separately.
- The monitoring example described StatsD exporter as a general solution for applications without Prometheus metrics. Updated the text to clarify that this pattern applies to applications that emit StatsD metrics.
- The Prometheus annotations were described as required for automatic discovery. Updated the wording to clarify that they are used by annotation-based Prometheus discovery, which depends on the Prometheus configuration.
- The OAuth2 Proxy OIDC example omitted the OIDC issuer URL. Added `--oidc-issuer-url=https://issuer.example.com`, which is a documented OAuth2 Proxy option for OIDC.
- The OAuth2 Proxy explanation implied authentication would happen automatically before application traffic. Updated the text to clarify that Service or Ingress routing must send traffic to the proxy port.

## Review Notes
The Flux `spec.postRenderers.kustomize.patches` structure and `helm.toolkit.fluxcd.io/v2` HelmRelease API are valid. Kustomize patches can target one or multiple resources, and strategic merge patches are appropriate for built-in Kubernetes Deployment container and volume lists. Helm post-renderers are not applied to chart hooks, which may be worth mentioning in a future expanded version of the guide.
