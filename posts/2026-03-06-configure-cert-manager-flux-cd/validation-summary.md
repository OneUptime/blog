# Validation Summary: How to Configure cert-manager with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- cert-manager
- Kubernetes
- Helm
- ACME / Let's Encrypt
- DNS01 and HTTP01 challenges
- AWS Route 53
- Cloudflare
- SOPS

## Sources Consulted
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager continuous deployment and GitOps documentation: https://cert-manager.io/docs/installation/continuous-deployment-and-gitops/
- cert-manager supported releases documentation: https://cert-manager.io/docs/releases/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager annotations reference: https://cert-manager.io/docs/reference/annotations/
- cert-manager HTTP01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Route 53 DNS01 solver documentation: https://cert-manager.io/docs/configuration/acme/dns01/route53/
- cert-manager Cloudflare DNS01 solver documentation: https://cert-manager.io/docs/configuration/acme/dns01/cloudflare/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/

## Issues Found
- The post used cert-manager `1.16.x`, which is end-of-life as of the current review date. Updated the HelmRelease to use the supported `1.20.x` release line.
- The Kubernetes prerequisite said `v1.24 or later`, which is too broad for the updated supported cert-manager release. Updated it to state that cert-manager v1.20 supports Kubernetes v1.32 to v1.35.
- The HelmRepository used the legacy HTTP chart repository. Updated it to the current OCI chart source recommended by the cert-manager documentation.
- The Cloudflare DNS01 API token example included the Cloudflare `email` field. Official cert-manager docs use `email` with API-key authentication, not API-token authentication, so the field was removed from that example.

## Review Notes
- The ServiceMonitor value requires Prometheus Operator ServiceMonitor CRDs to be installed; otherwise it should be disabled or applied only in clusters that provide those CRDs.
- The Route 53 DNS01 example assumes AWS credentials are available to cert-manager, for example through IRSA, EKS Pod Identity, or static credential Secret configuration.
- `helm` and `kubectl` were not installed in the local environment, so local chart rendering and live CLI verification were not performed.
