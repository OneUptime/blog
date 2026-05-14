# Validation Summary: How to Use flux debug kustomization for Kustomize Debugging

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux CLI
- Flux Kustomization API
- Kustomize
- Kubernetes
- kubectl
- jq
- yq

## Sources Consulted
- Flux CLI `flux debug kustomization` documentation: https://fluxcd.io/flux/cmd/flux_debug_kustomization/
- Flux CLI `flux build kustomization` documentation: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `flux diff kustomization` documentation: https://fluxcd.io/flux/cmd/flux_diff_kustomization/
- Flux CLI `flux logs` documentation: https://fluxcd.io/flux/cmd/flux_logs/
- Kubernetes `kubectl auth can-i` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The post incorrectly stated that `flux debug kustomization` outputs the built manifests Flux would apply. Official Flux documentation shows `flux debug kustomization` is for status, history, and final substitution variables; manifest rendering is done with `flux build kustomization --path`. Updated the title, description, introduction, basic usage, manifest inspection examples, comparison examples, validation script, and conclusion to use `flux build kustomization` for rendered manifests.
- Variable substitution debugging incorrectly relied on grepping debug output for unresolved `${...}` values. Flux substitutes undefined variables with an empty string by default unless strict substitution is enabled. Updated the guidance to use `flux build kustomization --strict-substitute` and `flux debug kustomization --show-vars`.
- Prune conflict guidance incorrectly implied Flux ownership labels should be checked on managed resources. Flux tracks managed objects in `.status.inventory`, and pruning can be disabled per resource with the `kustomize.toolkit.fluxcd.io/prune: disabled` label or annotation. Updated the scenario accordingly.
- The validation script used `flux debug kustomization` as if it emitted manifests suitable for `kubectl apply --dry-run=server`. Updated it to collect Kustomization paths and use `flux build kustomization --path` before server-side dry-run validation.
- Controller log diagnostics used a raw `kubectl logs ... | grep` pipeline. Replaced it with the official `flux logs --kind=Kustomization --name=... --namespace=...` command.

## Review Notes
The Flux CLI was not installed in the local workspace, so CLI behavior was verified against current official Flux documentation rather than local `--help` output. The `flux build kustomization` examples assume the commands are run from a local checkout whose paths match each Kustomization `.spec.path`.
