# Validation Summary: How to Organize Namespace Creation in a Flux CD Repository

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization resources
- Flux CD HelmRelease resources
- Kubernetes namespaces
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- Kubernetes NetworkPolicy
- Kubernetes Pod Security Admission labels
- kubectl and Flux CLI verification commands

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/

## Issues Found
- The post incorrectly stated that Flux automatically creates namespaces when using `spec.targetNamespace` on a Flux Kustomization. Updated the section to explain that kustomize-controller requires the namespace to already exist or be included in the same Kustomization.
- The Kustomization example comment referred to an annotation for namespace creation, but no such annotation was present or supported for Flux Kustomizations. Replaced it with a note that the target namespace must already exist or be included in the referenced path.
- The colocated namespace example said the namespace is created first because it is listed first in `resources`. Updated the comment to avoid implying that resource list order is the mechanism.
- The DNS NetworkPolicy used `to: []` in an egress rule. Removed the empty `to` list so the rule allows TCP and UDP port 53 egress to DNS destinations, matching Kubernetes NetworkPolicy rule semantics.
- The conclusion referred broadly to automatic namespace creation. Clarified that automatic namespace creation applies to Helm via `spec.install.createNamespace`, not Flux Kustomizations.

## Review Notes
The examples use current stable API versions for Flux Kustomizations (`kustomize.toolkit.fluxcd.io/v1`), HelmReleases (`helm.toolkit.fluxcd.io/v2`), and Kubernetes core/networking resources. The HelmRelease `install.createNamespace` field is valid and creates the Helm target namespace when needed, but it does not add custom namespace labels or annotations.
