# Validation Summary: How to Deploy Microservices with Per-Service Kustomization in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps
- Kustomize
- Flux GitRepository resources
- Flux Kustomization resources
- Flux CLI
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux CLI `flux get kustomizations`: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `flux suspend kustomization`: https://fluxcd.io/flux/cmd/flux_suspend_kustomization/
- Flux CLI `flux resume kustomization`: https://fluxcd.io/flux/cmd/flux_resume_kustomization/
- Flux CLI `flux events`: https://fluxcd.io/flux/cmd/flux_events/

## Issues Found
- The frontend and backend examples set both `wait: true` and `healthChecks`. Flux documentation states that when `wait` is enabled, `healthChecks` are ignored. Removed `wait: true` from those examples so the service-specific health checks are actually used.
- The examples used `targetNamespace` but did not mention that Flux requires the namespace to exist already or be defined in the Kustomization path. Added a short note in Step 3 to prevent failed reconciliations.
- Step 5 applied only the per-service Kustomization directory, but the shared `GitRepository` source must also exist. Added `kubectl apply -f clusters/production/sources/app-repo.yaml` before applying the app Kustomizations.
- The status-check commands used `flux get kustomization <name>`, but the documented Flux get command is `flux get kustomizations` for listing Kustomization statuses. Replaced the per-object checks with `kubectl get kustomization <name> -n flux-system` and kept `flux get kustomizations` for the summary list.
- The single-service watch command used `flux get kustomization backend-api --watch`, which is not the documented Flux get form. Replaced it with `kubectl get kustomization backend-api -n flux-system --watch`.
- The rollback example used `git revert HEAD~1`, which reverts the parent of `HEAD` rather than the latest bad commit. Changed it to `git revert HEAD`.

## Review Notes
The Flux API versions and fields used in the examples are current for the documented v1 `GitRepository` and `Kustomization` APIs. The `postBuild.substitute` and `substituteFrom` examples are valid, including quoted numeric substitution values. The `flux events --for Kustomization/frontend`, `flux reconcile kustomization --with-source`, `flux suspend kustomization`, and `flux resume kustomization` commands match the official Flux CLI documentation.
