# Validation Summary: How to Configure External-DNS with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ExternalDNS
- Flux CD
- Kubernetes
- Helm
- AWS Route 53
- Cloudflare DNS
- Gateway API
- SOPS

## Sources Consulted
- ExternalDNS Helm chart documentation: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/
- ExternalDNS flags reference: https://kubernetes-sigs.github.io/external-dns/latest/docs/flags/
- ExternalDNS annotations documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- ExternalDNS AWS tutorial: https://github.com/kubernetes-sigs/external-dns/blob/master/docs/tutorials/aws.md
- ExternalDNS Cloudflare tutorial: https://github.com/kubernetes-sigs/external-dns/blob/master/docs/tutorials/cloudflare.md
- ExternalDNS Gateway sources documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/sources/gateway/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The HelmRelease examples pinned the ExternalDNS chart to `1.14.x`, which maps to an older ExternalDNS app version and is outdated for the current provider documentation. Updated both examples to `1.20.x`.
- The chart examples set `--policy`, `--domain-filter`, `--txt-owner-id`, and `--interval` through `extraArgs`. These are supported flags, but the current official chart exposes them as first-class values. Updated the examples to use `policy`, `domainFilters`, `txtOwnerId`, and `interval`, leaving provider-specific flags in `extraArgs`.
- The AWS example showed static credential volume settings together with the IRSA service account annotation without explaining that IRSA should replace the static credential path. Added a note to omit the static credential env, volume, and volumeMount blocks when using IRSA.
- The Cloudflare proxied Ingress example used TTL `300`. Cloudflare's ExternalDNS guidance requires automatic TTL for proxied records. Changed the TTL to `1` and updated the comment.
- The Service example used TTL `60`, which is invalid for Cloudflare records where explicit TTLs must be at least `120`. Changed it to `120`.
- The Ingress comment said ExternalDNS would create an A record, but the resulting type can depend on provider and target. Changed the comment to "DNS record".
- The Gateway API section did not state that Gateway API CRDs must be installed. Added that prerequisite for users enabling Gateway API sources.
- The Flux Kustomization health check referenced the Helm-managed Deployment. Flux documentation recommends checking the `HelmRelease` when the Kustomization contains HelmRelease objects. Updated the health check accordingly.
- The conclusion said DNS records are cleaned up whenever resources are removed, but the AWS example uses `upsert-only`, which does not delete records. Clarified that cleanup requires `sync` and that `upsert-only` creates and updates only.

## Review Notes
The examples are now aligned with current ExternalDNS chart values and Flux APIs. Gateway API DNS creation still depends on accepted Route status and Gateway addresses or target annotations, so production setups should verify their Gateway controller populates those fields.
