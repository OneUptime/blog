# Validation Summary: How to Test Flux CD Kustomizations Locally Before Pushing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kustomize
- kubeconform
- Kubernetes manifests and CRDs
- kubectl server-side dry-run and diff
- kind
- yq
- GitHub Actions

## Sources Consulted
- Flux CLI documentation: https://fluxcd.io/flux/cmd/
- Flux `build kustomization` command documentation: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux `install` command documentation: https://fluxcd.io/flux/cmd/flux_install/
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- kubeconform README and schema-location documentation: https://github.com/yannh/kubeconform
- Datree CRDs-catalog Flux Kustomization schema: https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/kustomize.toolkit.fluxcd.io/kustomization_v1.json
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- yq documentation: https://mikefarah.gitbook.io/yq

## Issues Found
- The `flux check --pre` description said it validates Flux custom resource fields. Updated it to state that it checks local Flux prerequisites, matching the Flux CLI documentation.
- The initial `flux build kustomization` example claimed to validate a specific Flux Kustomization file but did not pass `--kustomization-file`. Added the flag so the command uses the local Flux Kustomization manifest.
- The Flux build section said dry-run validates features such as decryption. Updated the wording to focus on build-time Flux features and inline postBuild substitution, and noted that dry-run skips `substituteFrom` values from in-cluster ConfigMaps and Secrets.
- The kubeconform Flux schema URL pointed to the Flux repository as if Flux CRDs were published there as kubeconform JSON schemas. Replaced it with the documented CRDs-catalog schema-location pattern.
- The offline Flux schema example extracted YAML CRDs but never converted them to JSON schemas for kubeconform. Replaced it with a local JSON schema download and a matching local `schema-location` path.
- The local substitution example used GNU `envsubst`, which does not implement Flux's supported default-value syntax such as `${VAR:=default}`. Replaced it with `flux envsubst --strict`.
- The kind example used `--components-extra=""` unnecessarily while filtering exported Flux install manifests down to CRDs. Simplified it to `flux install --export`.
- The GitHub Actions Flux validation step ended with `|| true`, causing failures to be ignored. Removed it so CI fails on validation errors.
- The kubeconform examples used Kubernetes `1.29.0`, which is stale for a 2026 Flux guide. Updated examples to `1.34.1` while preserving the guidance to match the target cluster version.

## Review Notes
- The local environment did not have `flux`, `kubeconform`, or `yq` installed, so CLI behavior was verified against official documentation rather than local `--help` output.
- The offline schema example now demonstrates the Flux Kustomization schema specifically. Repositories using other Flux custom resources should mirror the corresponding CRDs-catalog JSON schemas for those groups as well.
