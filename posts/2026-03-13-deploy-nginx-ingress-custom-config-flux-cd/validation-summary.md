# Validation Summary: How to Deploy NGINX Ingress with Custom Configuration via Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD HelmRepository, HelmRelease, and Kustomization APIs
- Kubernetes Ingress and IngressClass
- ingress-nginx Helm chart
- ingress-nginx ConfigMap and annotation configuration
- cert-manager Ingress annotations
- Prometheus ServiceMonitor and Grafana dashboard provisioning
- kubectl, flux CLI, and curl verification commands

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- ingress-nginx Helm chart values: https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx annotation documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx monitoring documentation: https://kubernetes.github.io/ingress-nginx/user-guide/monitoring/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes deprecated ingress class annotation reference: https://kubernetes.io/docs/reference/labels-annotations-taints/#kubernetes-io-ingress-class
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/

## Issues Found
- The HelmRelease was placed in the `ingress-nginx` namespace without creating that namespace first. Updated the HelmRelease to live in `flux-system`, set `spec.targetNamespace: ingress-nginx`, enabled `spec.install.createNamespace: true`, and set `spec.releaseName: ingress-nginx` so the rendered resource names remain consistent with the verification commands.
- The Flux Kustomization health check targeted the Helm-created Deployment directly. Flux documentation recommends health-checking the HelmRelease when a Kustomization applies HelmRelease objects, so the health check now targets the `ingress-nginx` HelmRelease in `flux-system`.
- The Ingress example included the deprecated `kubernetes.io/ingress.class` annotation while also using `spec.ingressClassName`. Removed the deprecated annotation from the example.
- The Flux verification command used the old HelmRelease namespace. Updated it to `flux get helmrelease ingress-nginx -n flux-system`.
- The best-practice text described `ingressClassName` as an annotation. Corrected it to refer to the `spec.ingressClassName: nginx` field.

## Review Notes
- The remaining ingress-nginx ConfigMap keys and Helm chart values checked are valid for the current upstream ingress-nginx chart line.
- The YAML snippets were parsed successfully after the edits.
- Local `helm`, `kubectl`, and `flux` binaries were not installed in the review workspace, so CLI behavior was verified against official documentation rather than local `--help` output.
