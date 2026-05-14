# Validation Summary: How to Force Reconcile a Kustomization in Flux

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Flux CD
- Flux CLI
- Flux Kustomization custom resources
- Kubernetes
- kubectl
- Kustomize controller reconciliation

## Sources Consulted
- Flux CLI documentation: `flux reconcile kustomization` - https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux Kustomization documentation: triggering reconciliation, suspend/resume behavior, events, and status conditions - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI documentation: `flux resume kustomization` - https://fluxcd.io/flux/cmd/flux_resume_kustomization/
- Flux CLI documentation: `flux get` options, including `--no-header` - https://fluxcd.io/flux/cmd/flux_get/
- Flux CLI documentation: `flux reconcile source` - https://fluxcd.io/flux/cmd/flux_reconcile_source/

## Issues Found
- The reconciliation flow diagram said a default `flux reconcile ks` operation fetches the latest source revision. Flux's documentation states that `--with-source` is the option that reconciles the Kustomization source; a plain Kustomization reconcile applies from the current source artifact. Changed the diagram step from "Fetch latest source revision" to "Read current source artifact" to match Flux behavior.

## Review Notes
- The post correctly distinguishes plain Kustomization reconciliation from `--with-source`, and the command examples align with current Flux documentation.
- The kubectl annotation example is valid. Flux's official documentation also shows `--field-manager=flux-client-side-apply`, which can be useful for field ownership consistency, but the omission does not make the example technically incorrect.
