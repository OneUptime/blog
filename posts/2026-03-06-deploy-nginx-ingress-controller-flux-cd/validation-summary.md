# Validation Summary: How to Deploy NGINX Ingress Controller with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Flux CD
- Flux HelmRelease
- Flux Kustomization
- ingress-nginx
- Helm
- cert-manager
- Prometheus Operator ServiceMonitor
- AWS Network Load Balancer service annotations

## Sources Consulted
- Kubernetes ingress-nginx repository and supported versions table: https://github.com/kubernetes/ingress-nginx
- Kubernetes ingress-nginx retirement statement: https://kubernetes.io/blog/2026/01/29/ingress-nginx-statement/
- ingress-nginx Helm chart documentation: https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/README.md
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager annotated Ingress documentation: https://cert-manager.io/docs/usage/ingress/

## Issues Found
- The post presented community `kubernetes/ingress-nginx` as a general new production deployment path. The project was retired in March 2026, so I updated the introduction and conclusion to frame the guide for existing ingress-nginx environments and to direct new production deployments toward Gateway API implementations or another actively maintained ingress controller.
- The prerequisites said Kubernetes v1.25 or later while the chart example used `4.11.x`, which is not listed as tested for Kubernetes v1.25 in the ingress-nginx supported versions table. I updated the example to chart `4.15.1` and clarified the tested Kubernetes range for that pinned chart.
- The repository structure and Flux section used `kustomization.yaml` for a Flux `Kustomization` custom resource. Flux paths either contain plain manifests or a Kustomize `kustomization.yaml`; a Flux `Kustomization` resource should be a separate manifest. I changed the in-directory file to a Kustomize overlay and moved the Flux custom resource example to `ingress-nginx-kustomization.yaml`.
- The Flux `Kustomization` set `wait: true` while also specifying `healthChecks`. Flux documentation says `healthChecks` are ignored when `wait: true` is set, so I changed the example to `wait: false` to make the explicit Deployment health check effective.
- The cert-manager HTTP-01 solver used `ingress.class`. cert-manager now recommends `ingressClassName` for most ingress controllers, including ingress-nginx, so I updated the solver field.
- The advanced Ingress example used `nginx.ingress.kubernetes.io/configuration-snippet` to set WebSocket headers. ingress-nginx disables snippet annotations by default for security reasons, and the example did not enable them. I removed the snippet and kept the standard `proxy-http-version` annotation with a corrected comment.

## Review Notes
The remaining Kubernetes, Flux, ingress-nginx, cert-manager, and kubectl examples are syntactically plausible for the APIs shown. The AWS LoadBalancer annotations are provider-specific and may need adjustment for clusters using AWS Load Balancer Controller rather than the legacy in-tree AWS cloud provider. The monitoring examples assume the Prometheus Operator CRDs are installed.
