# Validation Summary: How to Use flux build kustomization for Dry Run in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Flux Kustomization resources
- Kubernetes
- Kustomize
- kubectl dry run
- kubeconform
- GitHub Actions

## Sources Consulted
- Flux CLI documentation for `flux build kustomization`: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply
- Kubernetes API dry-run documentation: https://kubernetes.io/docs/reference/using-api/api-concepts
- Kubernetes admission controller documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- kubeconform usage documentation: https://kubeconform.mandragor.org/docs/usage/

## Issues Found
- The "Building Without Cluster Access" example used `--kustomization-file` without `--dry-run`, while the surrounding text described a CI/CD pipeline without cluster access. I added `--dry-run` to the command and adjusted the explanation because Flux only guarantees no cluster connection in dry-run mode, and `substituteFrom` values are skipped in that mode.
- The CI/CD example also omitted `--dry-run`, which could require cluster access when resolving `substituteFrom` references. I added `--dry-run` and noted that values normally loaded from ConfigMaps or Secrets should be supplied through `spec.postBuild.substitute` in the local Kustomization file.
- The server-side dry-run explanation overstated what it validates by saying it catches invalid resource references. I corrected it to describe API server validation, defaulting, authorization, and admission checks, while noting that referenced object existence is only proven when an admission policy enforces it.

## Review Notes
The Flux CLI command names and flags used in the post are current according to the official Flux documentation. The `kubectl apply --dry-run=client|server` and kubeconform commands are also valid. The post does not pin a Flux or Kubernetes version, so the review used current official documentation available on 2026-05-15.
