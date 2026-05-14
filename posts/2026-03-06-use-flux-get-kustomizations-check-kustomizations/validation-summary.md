# Validation Summary: How to Use flux get kustomizations to Check Kustomizations

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Flux CD
- Flux CLI
- Flux Kustomization custom resources
- Kubernetes
- kubectl
- Bash, awk, jq, and jsonpath

## Sources Consulted
- Flux CLI reference for `flux get`: https://fluxcd.io/flux/cmd/flux_get/
- Flux CLI reference for `flux get kustomizations`: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux get-started guide examples for `flux get kustomizations --watch`: https://fluxcd.io/flux/get-started/
- Flux CLI source for `get kustomizations` aliases, columns, and `--show-source`: https://github.com/fluxcd/flux2/blob/main/cmd/flux/get_kustomization.go

## Issues Found
- The introduction said Kustomizations apply manifests from Git repositories only. Updated it to say Flux sources because current Kustomizations can reference GitRepository, OCIRepository, Bucket, and ExternalArtifact sources.
- The basic usage comment said `flux get kustomizations` lists the default namespace. Updated it to current namespace, matching Flux CLI namespace behavior.
- The source and Kustomization revision comparison examples printed only namespace and name for `-A` output. Updated the `awk` columns to include the revision column.
- The dependency visualization loop used the namespace column as the Kustomization name and always queried `flux-system`. Updated it to read namespace and name from `flux get ks -A` and query each object in its actual namespace.
- The inventory count example piped jsonpath output into `jq length`, which is not reliable JSON. Updated it to request JSON and count `.status.inventory.entries`.
- The detailed output examples used `flux get ks -o yaml/json`, but the Flux `get kustomizations` command does not support `-o`. Replaced those examples with `kubectl get kustomization ... -o yaml` and `kubectl get kustomizations.kustomize.toolkit.fluxcd.io -A -o json`.
- The health-check script assumed the Kustomization source is always in the same namespace. Updated it to respect `.spec.sourceRef.namespace` and fall back to the Kustomization namespace when omitted.
- The quick reference listed `flux get ks -A -o json`, which is not a supported Flux command. Replaced it with the equivalent `kubectl get ... -o json` command.

## Review Notes
The post remains scoped to GitRepository sources for some sync-check examples, which is acceptable for a GitOps-focused guide. A future enhancement could show equivalent handling for OCIRepository and Bucket sources, but that is outside the requested correction scope.
