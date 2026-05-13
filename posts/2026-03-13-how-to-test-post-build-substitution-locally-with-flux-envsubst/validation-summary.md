# Validation Summary: How to Test Post-Build Substitution Locally with flux envsubst

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CLI
- Flux Kustomization post-build substitution
- Kustomize
- Kubernetes manifests
- Bash scripting
- GitHub Actions

## Sources Consulted
- Flux CLI `envsubst` command reference: https://fluxcd.io/flux/cmd/flux_envsubst/
- Flux Kustomization post-build variable substitution documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/#post-build-variable-substitution
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The post said `flux envsubst` leaves undefined variables unchanged by default. Flux documentation states undefined `${var}` placeholders are substituted with an empty string unless a default value is provided. Updated the strict-flag section to describe the default behavior and `--strict` behavior accurately.
- The post said piping `kustomize build` through `flux envsubst` gives the exact output Flux would produce on the cluster. Updated this to note that the local output matches the post-build substituted manifest when the same input variables and compatible kustomize behavior are used.
- The multi-environment test script loaded each env file into the current shell, so variables from a previous environment could leak into later tests and hide missing variables under `--strict`. Updated the example to source each env file inside a subshell for each app test.
- The GitHub Actions loop had the same environment-variable leakage issue across env files. Updated the workflow example to source each env file inside a subshell for each app test.
- The environment comparison example sourced production and staging env files in the same shell. Updated it to render each environment in a separate subshell so stale values from the first render do not affect the second.

## Review Notes
- The Flux CLI was not installed locally in the review environment, so command behavior was verified against official Flux documentation rather than local `flux --help` output.
- The `export $(cat cluster-vars.env | xargs)` pattern works for the simple key/value example shown, but it is fragile for values containing spaces, shell metacharacters, or comments.
