# Validation Summary: How to Debug Kustomization Apply Errors in Flux

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Flux CD
- Flux Kustomization custom resources
- kustomize-controller
- Kubernetes
- Kustomize
- kubectl
- Server-side apply

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux `flux events` CLI documentation: https://fluxcd.io/flux/cmd/flux_events/
- Flux `flux build kustomization` CLI documentation: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux `flux get kustomizations` CLI documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux `flux reconcile kustomization` CLI documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The command for inspecting `.status.conditions` used `kubectl get ... -o jsonpath='{.status.conditions[*]}' | jq .`. Kubernetes JSONPath output is not the best fit for piping structured objects to `jq`, so this was changed to `kubectl get ... -o json | jq '.status.conditions'`, which emits valid JSON before filtering.
- The SSA merge Deployment example used `containers: []`. A Deployment pod template must include a valid container list, so the example was changed to include a minimal container entry with a name and image.

## Review Notes
- The Flux CLI commands, Kustomization API fields, `dependsOn`, `spec.force`, SSA merge annotation, controller log inspection, and server-side dry-run command align with current Flux and Kubernetes documentation.
- The local environment did not have `flux`, `kubectl`, or `kustomize` installed, so CLI verification was performed against official documentation rather than local `--help` output.
