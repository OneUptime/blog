# Validation Summary: How to Set Up HelmRepository for Jetstack (cert-manager) Charts in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm
- Flux HelmRepository
- Flux HelmRelease
- Flux Kustomization dependencies
- cert-manager
- Let's Encrypt ACME issuers
- HTTP-01 and DNS-01 challenges
- Cloudflare DNS-01 solver
- Kubernetes Ingress and Certificate resources

## Sources Consulted
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation, including CRD lifecycle policies: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization dependency documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager continuous deployment / Flux documentation: https://cert-manager.io/docs/installation/continuous-deployment-and-gitops/
- cert-manager ACME HTTP-01 documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager ACME DNS-01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/
- cert-manager Cloudflare DNS-01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/cloudflare/
- cert-manager Ingress annotation documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager v1.20.2 Helm chart values: https://github.com/cert-manager/cert-manager/blob/v1.20.2/deploy/charts/cert-manager/values.yaml
- Jetstack Helm chart repository index: https://charts.jetstack.io/index.yaml

## Issues Found
- The HelmRelease example enabled `prometheus.servicemonitor.enabled: true` without noting that this creates a `monitoring.coreos.com/v1` `ServiceMonitor` and requires the Prometheus Operator CRD to be installed. Changed the example to keep cert-manager Prometheus metrics enabled while leaving `servicemonitor.enabled: false`, with an inline note explaining when to enable it.

## Review Notes
- The Jetstack HTTP Helm repository at `https://charts.jetstack.io` is still available and contains current cert-manager chart releases, but current cert-manager documentation recommends the OCI chart at `oci://quay.io/jetstack/charts/cert-manager` for recent versions because it is the source of truth and is published first.
- Local `helm`, `flux`, and `kubectl` binaries were not installed in the review environment, so CLI checks were verified against official documentation rather than local `--help` output.
