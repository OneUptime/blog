# Validation Summary: How to Use ArgoCD with Rancher RKE2

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD
- Rancher RKE2
- Rancher Fleet
- Kubernetes
- Pod Security Admission
- Kubernetes Ingress
- Kubernetes NetworkPolicy
- FIPS and CIS hardening

## Sources Consulted
- RKE2 Networking Services: https://docs.rke2.io/networking/networking_services
- RKE2 FIPS 140-2 Enablement: https://docs.rke2.io/security/fips_support
- RKE2 CIS Hardening Guide: https://docs.rke2.io/security/hardening_guide
- Rancher Continuous Delivery / Fleet feature flag: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/enable-experimental-features/continuous-delivery
- Rancher Feature Flags: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/feature-flags
- Argo CD Getting Started: https://argo-cd.readthedocs.io/en/stable/getting_started/
- Argo CD Ingress Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Argo CD command parameters ConfigMap example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD ApplicationSet Cluster Generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The post claimed RKE2 is CIS hardened by default. RKE2 is security-focused and can be configured with a CIS profile, but the CIS profile is the stricter hardening mode. Updated the wording to describe the CIS profile accurately.
- The post claimed RKE2 does not include an ingress controller by default and instructed readers to install upstream ingress-nginx v1.9.4. RKE2 includes a bundled ingress controller; ingress-nginx is also going end-of-life, and new RKE2 v1.36 clusters use Traefik by default. Updated the section to verify and configure the bundled controller instead.
- The Argo CD ingress example used SSL passthrough without noting that ingress-nginx must enable SSL passthrough. Added the RKE2 HelmChartConfig example for `enable-ssl-passthrough`.
- The Fleet disable command patched `appendTolerations`, which does not disable Fleet. Replaced it with the documented Rancher `continuous-delivery` feature-flag guidance.
- The AppProject comments said the example excluded Fleet-managed namespaces, but `clusterResourceBlacklist` excludes cluster-scoped resources. Updated the comments to match the actual behavior.
- The FIPS Dockerfile used a nonstandard `golang:1.21-fips` image and implied a simplified Dockerfile could make Argo CD FIPS-compliant. Replaced it with guidance to use vendor-supported FIPS images or an internally validated build process.
- The NetworkPolicy ingress selector targeted an `ingress-nginx` namespace label that does not match RKE2's bundled ingress-nginx deployment. Updated it to select RKE2 ingress-nginx pods in `kube-system`.
- The audit logging ConfigMap used nonexistent Argo CD keys `server.audit.enabled` and `server.audit.logformat`. Replaced them with documented `argocd-cmd-params-cm` server logging keys and clarified RKE2 API server audit logging behavior.

## Review Notes
- The post now reflects RKE2 documentation current as of 2026-05-20, including the ingress-nginx end-of-life note and the RKE2 v1.36 Traefik default for new clusters.
- The examples remain illustrative; production deployments should pin Argo CD and ingress controller versions instead of relying on floating `stable` manifests.
