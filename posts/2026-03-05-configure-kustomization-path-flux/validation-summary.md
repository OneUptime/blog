# Validation Summary: How to Configure Kustomization Path in Flux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flux CD
- Flux Kustomize Controller
- Flux Kustomization custom resources
- Kustomize
- Kubernetes manifests
- GitOps repository structure
- Flux CLI
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux `flux build kustomization` command reference: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux `flux get kustomizations` command reference: https://v2-6.docs.fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux `flux create kustomization` command reference: https://fluxcd.io/flux/cmd/flux_create_kustomization/
- Kubernetes `kubectl describe` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Flux Kustomize Controller source API comments: https://github.com/fluxcd/kustomize-controller/blob/main/api/v1/kustomization_types.go

## Issues Found
- The Mermaid flow diagram previously showed the no-`kustomization.yaml` path as directly applying YAML files. Flux documentation states that when plain manifests are found without a `kustomization.yaml`, Flux generates one for manifests under `.spec.path` and then builds/applies the result. Updated the diagram to show `Generate kustomization.yaml` feeding into the Kustomize build step.

## Review Notes
- The YAML examples use the current `kustomize.toolkit.fluxcd.io/v1` API and valid Kustomization fields.
- The `flux build kustomization my-app --path ./deploy` command is valid, but in normal use it fetches the in-cluster Flux Kustomization unless `--kustomization-file` and/or `--dry-run` are also used.
- Local Flux CLI verification could not be run because `flux` is not installed in this workspace; command validation was performed against the official Flux CLI documentation.
