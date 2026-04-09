# Validation Summary: How to Set Up Rook-Ceph for GitOps Workflows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (Kubernetes storage orchestrator)
- ArgoCD (GitOps continuous delivery)
- Flux v2 (GitOps toolkit)
- Kubernetes CRDs
- SOPS (Secrets OPerationS for encrypted secrets)
- Sealed Secrets
- AWS KMS

## Sources Consulted
- ArgoCD Application specification: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Flux Kustomization API v1: https://fluxcd.io/flux/components/kustomize/kustomizations/
- SOPS documentation: https://github.com/getsops/sops
- Kubernetes PodSecurityPolicy deprecation (KEP-2579): https://kubernetes.io/blog/2021/04/06/podsecuritypolicy-deprecation-past-present-and-future/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Rook-Ceph documentation: https://rook.io/docs/rook/latest/Getting-Started/intro/

## Issues Found
1. **PodSecurityPolicies reference (repository structure)**: The file tree listed `podsecuritypolicies.yaml` under the `policies/` directory. PodSecurityPolicies were deprecated in Kubernetes 1.21 and removed in Kubernetes 1.25 (August 2022). All currently supported Kubernetes versions have removed PSPs. Changed to `podsecuritystandards.yaml` to reflect the modern replacement: Pod Security Admission using Pod Security Standards.

## Review Notes
- The post correctly advises setting `prune: false` on the CephCluster ArgoCD Application and Flux Kustomization to prevent accidental data loss. This is a widely recommended best practice for stateful workloads.
- The claim that "rollbacks are as simple as reverting a commit" is a slight simplification for stateful systems like Ceph (reverting a CRD change doesn't necessarily reverse underlying data operations), but is reasonable in the context of configuration management and is a standard GitOps talking point.
- The Flux Kustomization correctly uses the GA API version `kustomize.toolkit.fluxcd.io/v1` rather than older beta versions.
- The SOPS command shown uses AWS KMS; readers using other cloud providers would need to adjust the encryption provider flag (e.g., `--gcp-kms`, `--azure-kv`).
