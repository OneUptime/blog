# Validation Summary: How to Set Up Flux Dependency Ordering Between Kustomizations for Safe Rollouts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization API
- Flux CLI
- Kubernetes
- Kustomize
- GitOps deployment ordering

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux get kustomizations` reference: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `flux reconcile kustomization` reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The health check example used `wait: true` together with `healthChecks` while saying Flux waits specifically for the listed StatefulSet. Flux documentation states that `healthChecks` is ignored when `wait: true` is set. I removed `wait: true` from that example and clarified the distinction between `wait` and explicit `healthChecks`.
- Several Kustomization snippets omitted required Flux fields such as `prune`, `interval`, or `sourceRef` even though they were presented as manifest examples. I added the missing fields where needed.
- The practical multi-tier example used the same `./clusters/production/infrastructure` path for both the namespace Kustomization and infrastructure Kustomization. I split the example repository layout into a `namespace/` directory and updated the namespace Kustomization path accordingly.
- The production infrastructure example set both `wait: true` and `healthChecks`, which would ignore the listed checks. I removed `wait: true` so the explicit StatefulSet and Deployment health checks are used.
- The circular dependency section claimed a specific detection error that is not stated in the current Flux documentation. I replaced it with the documented behavior: circular dependencies must be avoided because interdependent Kustomizations will not be applied.

## Review Notes
- The Flux CLI was not installed in the local workspace, so command verification was performed against official Flux CLI documentation.
- The Kubernetes CLI was not installed in the local workspace, so kubectl command verification was performed against official Kubernetes documentation.
- YAML syntax for all YAML code fences was checked successfully with PyYAML.
