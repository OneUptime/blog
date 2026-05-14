# Validation Summary: How to Set Up Pre-Commit Hooks for Flux CD Manifests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- pre-commit
- Git hooks
- Kubernetes manifests
- Kustomize
- yamllint
- Bash scripting
- SOPS-encrypted Kubernetes Secrets

## Sources Consulted
- pre-commit official documentation: https://pre-commit.com/
- pre-commit PyPI project metadata: https://pypi.org/project/pre-commit/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- yamllint rules documentation: https://yamllint.readthedocs.io/en/stable/rules.html
- Kubernetes kubectl kustomize reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/

## Issues Found
- The prerequisites listed Python 3.8 or later for installing pre-commit with pip. Current pre-commit package metadata requires Python 3.10 or later, so the prerequisite was updated.
- The prerequisites listed the Flux CLI as required, but the post's validation scripts use the Kustomize CLI and do not call `flux`. This was changed to require the Kustomize CLI.
- Local pre-commit hooks used `language: script`, which current pre-commit documents as the old alias for `unsupported_script`. The examples were updated to `language: unsupported_script`.
- The Flux Kustomization validation script treated `.spec.path` as required. Current Flux documentation says `.spec.path` is optional, while `.spec.prune` is required, so the check was changed from `path` to `prune`.
- The HelmRelease validation script required `chart`, but current Flux HelmRelease resources can use either `chart` or `chartRef`. The check was updated to accept either field.
- The source-resource validation script treated `interval` as required for `HelmRepository`. Current Flux documentation says HelmRepository `.spec.interval` is optional, while `.spec.url` is required. The HelmRepository case was split out to require only `url`.

## Review Notes
The Bash validation examples remain intentionally lightweight and grep-based, so they are useful as pre-commit guardrails but are not complete schema validators. A future improvement would be to use structured YAML parsing or Kubernetes schema validation for multi-document manifests and stricter field-path checks.
