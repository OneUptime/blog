# Validation Summary: How to Handle Certificate Renewals in Flux Managed Clusters

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Flux CD v2
- Kubernetes
- Helm and Flux HelmRelease
- cert-manager
- ACME / Let's Encrypt
- Route53 DNS01 challenges
- Kubernetes Ingress
- Prometheus and PrometheusRule
- kubectl, Flux CLI, and cmctl

## Sources Consulted
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager v1.14 Helm documentation for historical `installCRDs` behavior: https://cert-manager.io/v1.14-docs/installation/helm/
- cert-manager Route53 DNS01 solver documentation: https://cert-manager.io/docs/configuration/acme/dns01/route53/
- cert-manager API reference for Certificate, Issuer, and ClusterIssuer resources: https://cert-manager.io/docs/reference/api-docs/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/v1.15-docs/devops-tips/prometheus-metrics/
- cert-manager cmctl CLI reference: https://cert-manager.io/docs/cli/cmctl/
- cert-manager release information: https://cert-manager.io/docs/releases/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The HelmRelease example used `spec.healthChecks`, which is not a valid HelmRelease field in Flux's Helm API. Removed the invalid block.
- The cert-manager Helm values used `installCRDs: true` while the post claimed cert-manager `v1.14+`. Current cert-manager Helm charts use `crds.enabled: true`, introduced in the v1.15 line. Updated the prerequisite to `v1.15+` and changed the Helm values to `crds.enabled: true`.
- The cert-manager chart version examples used older wildcard versions. Updated the install example to `v1.20.1` and the upgrade example to `v1.20.2`, matching current cert-manager release documentation.
- The HelmRelease was shown in the `cert-manager` namespace without creating that namespace. Added a Namespace manifest to the same snippet so the example can be applied by Flux.
- The Flux Kustomization `dependsOn` comment implied direct dependency on the cert-manager controller. Clarified that `dependsOn` references a Flux Kustomization that applies the HelmRelease, matching Flux dependency semantics.
- The Certificate comment said cert-manager renews at `2/3` of the duration even though the example explicitly sets `renewBefore: 720h`. Changed the comment to say it renews 30 days before expiry.
- The Ingress example declared a Certificate manually but also included an ingress-shim issuer annotation for auto-provisioned certificates. Removed the annotation so the Ingress references the explicitly managed Certificate secret without asking ingress-shim to manage a Certificate.
- The `kubectl get certificates` command read `.status.conditions[0]`, which depends on condition ordering. Changed it to select the `Ready` condition explicitly.

## Review Notes
- The PrometheusRule expressions are syntactically plausible and use cert-manager metrics documented by cert-manager, but production alerting may want extra filters to reduce duplicate warning/critical notifications.
- The Route53 long-lived key example is valid, but cert-manager documentation recommends IAM roles with temporary credentials where available.
