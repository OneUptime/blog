# Validation Summary: How to Set Up GitHub Actions for Flux Manifest Validation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CLI
- Flux GitHub Action
- Kubernetes manifests
- Kustomize
- kubeconform
- GitHub Actions
- yamllint

## Sources Consulted
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Flux CLI `flux check` documentation: https://fluxcd.io/flux/cmd/flux_check/
- Flux CLI `flux build kustomization` documentation: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- kubeconform usage documentation: https://kubeconform.mandragor.org/docs/usage/
- kubeconform installation documentation: https://kubeconform.mandragor.org/docs/installation/
- Kubernetes `kubectl kustomize` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Datree CRDs catalog README: https://github.com/datreeio/CRDs-catalog
- yamllint configuration documentation: https://yamllint.readthedocs.io/en/stable/configuration.html
- yamllint rules documentation: https://yamllint.readthedocs.io/en/stable/rules.html

## Issues Found
- The initial workflow labeled `flux check --pre` as manifest validation. The Flux docs describe this as a pre-installation requirements check, so the step name and explanatory text were updated to distinguish Flux pre-checks from manifest validation.
- The kubeconform install command extracted directly into `/usr/local/bin`, which may fail on GitHub-hosted runners without elevated permissions. It now follows the documented pattern of extracting locally and moving the binary with `sudo`.
- The Kustomize validation step used `kustomize build` without installing the standalone `kustomize` binary. It was changed to `kubectl kustomize`, which is the Kubernetes-supported command for building a kustomization target.
- The Flux-specific validation example called `flux build kustomization` without the required Kustomization name and without `--kustomization-file`. The command now extracts the resource name and path, then passes both the name and local Flux Kustomization file for dry-run validation.
- The complete workflow omitted the Flux-specific validation step even though it was described as combining all validation steps. The missing step was added.
- The caching section claimed to cache both Flux and kubeconform binaries, but the Flux GitHub Action installs Flux under the runner tool cache by default rather than `/usr/local/bin/flux`. The cache example and text were narrowed to kubeconform.

## Review Notes
- The `yamllint` workflow uses `|| true`, so lint findings will not fail the workflow. This can be intentional when linting is advisory, but it should be removed if YAML linting is meant to be enforced.
- The Datree CRDs catalog schema location is valid for kubeconform and useful for common public CRDs, but `-ignore-missing-schemas` means resources without available schemas will be skipped rather than failing validation.
