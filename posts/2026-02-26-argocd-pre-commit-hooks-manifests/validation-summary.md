# Validation Summary: How to Set Up Pre-Commit Hooks for ArgoCD Manifests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ArgoCD manifests
- Git pre-commit hooks
- pre-commit framework
- Kubernetes YAML manifests
- kubeconform
- Kustomize
- Helm
- Conftest / Open Policy Agent policies
- GitHub Actions
- yamllint

## Sources Consulted
- pre-commit official documentation: https://pre-commit.com/
- pre-commit-hooks official repository documentation: https://github.com/pre-commit/pre-commit-hooks
- kubeconform official repository documentation: https://github.com/yannh/kubeconform
- Helm `helm lint` official documentation: https://helm.sh/docs/helm/helm_lint/
- Conftest official documentation: https://www.conftest.dev/
- Conftest options documentation: https://www.conftest.dev/options/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- GNU Bash manual for `bash -c` argument handling: https://www.gnu.org/software/bash/manual/bash.html#Invoking-Bash
- yamllint configuration documentation: https://yamllint.readthedocs.io/en/stable/configuration.html
- pre-commit/action official repository documentation: https://github.com/pre-commit/action

## Issues Found
- Local `bash -c` pre-commit hooks used `"$@"` without passing a dummy `$0` argument after the command string. In Bash, the first argument after `-c` is assigned to `$0`, so the first changed filename would be omitted from `"$@"`. Updated each local hook entry to append `--` after the command string.
- The standalone Helm lint hook ran `helm lint "$chart_dir" --strict` inside a loop without exiting on failure. Because Bash was not running with `set -e`, a later successful command could mask a failed chart lint. Updated the command to `helm lint "$chart_dir" --strict || exit 1`.

## Review Notes
- The referenced ArgoCD CRD schema URLs in the Datree CRDs catalog returned HTTP 200 during review.
- The pinned hook versions are older than the latest available releases, but the referenced hooks and options remain valid. Teams should periodically run `pre-commit autoupdate` and align `-kubernetes-version` with their actual cluster version.
- The local kubeconform, kustomize, helm, conftest, and pre-commit CLIs were not installed in the review environment, so validation was performed against official documentation and reachable upstream schema URLs.
