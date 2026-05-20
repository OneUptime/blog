# Validation Summary: How to Bootstrap cert-manager with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications, sync waves, sync options, health checks, and diff customization
- cert-manager Helm installation, CRDs, Issuers, ClusterIssuers, ACME HTTP01, and ACME DNS01
- Kubernetes CustomResourceDefinitions and admission webhooks
- Let's Encrypt ACME
- AWS Route53 DNS01 and EKS IRSA
- Prometheus ServiceMonitor integration

## Sources Consulted
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager v1.14 Helm installation documentation: https://cert-manager.io/v1.14-docs/installation/helm/
- cert-manager HTTP01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Route53 DNS01 solver documentation: https://cert-manager.io/docs/configuration/acme/dns01/route53/
- cert-manager releases and support policy: https://cert-manager.io/docs/releases/
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/

## Issues Found
- The cert-manager Helm example used `targetRevision: v1.14.4` and `installCRDs: true`. Updated the examples to `v1.20.2` and `crds.enabled: true`, matching the current cert-manager chart documentation where `installCRDs` is deprecated in favor of `crds.enabled`.
- The separately managed CRD example also used `v1.14.4`; updated it to `v1.20.2` for consistency with the main chart example.
- The CRD Application combined `ServerSideApply=true` with `Replace=true`. Argo CD documents that `Replace=true` takes precedence over server-side apply and can be destructive, so `Replace=true` was removed.
- The HTTP01 ClusterIssuer examples used `class: nginx`. cert-manager now recommends `ingressClassName` for most ingress controllers, including nginx; updated both examples.
- The post said sync wave `1` guarantees cert-manager is fully running before ClusterIssuers are applied. In app-of-apps setups, Argo CD needs Application health restored for sync waves to wait on child Application health, so the wording was corrected.
- The custom health check comment did not show the exact Argo CD ConfigMap key format. Updated it to `resource.customizations.health.cert-manager.io_ClusterIssuer`.
- The status diff section implied status fields always cause OutOfSync. Argo CD behavior depends on version and configuration, so the wording now scopes the advice to installations that do not already ignore status fields.
- The introduction and conclusion implied cert-manager automatically encrypts all internal service traffic and automatically gives every resource certificates. Updated the wording to clarify that resources must be configured to request certificates.

## Review Notes
The post is technically valid after the corrections. The examples still use the legacy Jetstack HTTP Helm repository, which cert-manager documentation says remains available, though current docs recommend OCI charts for recent cert-manager versions.
