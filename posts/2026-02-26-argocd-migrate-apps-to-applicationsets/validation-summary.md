# Validation Summary: How to Migrate from Individual Apps to ApplicationSets in ArgoCD

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Kubernetes custom resources
- kubectl
- Argo CD CLI
- jq
- YAML
- GitOps

## Sources Consulted
- Argo CD ApplicationSet Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD ApplicationSet Controlling Resource Modification documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Controlling-Resource-Modification/
- Argo CD ApplicationSet Application Pruning & Resource Deletion documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/
- Argo CD App Deletion documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Argo CD appset get command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_appset_get/
- Argo CD app list command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/

## Issues Found
- The list-generator ApplicationSet example claimed to support applications with different settings, but the template hardcoded automated sync with `prune: true` and `selfHeal: true` for every generated Application. I added per-application `autoSync`, `prune`, and `selfHeal` values and used `templatePatch` so the worker example remains manual-sync as described.
- The "Applications with Different Sync Policies" example used Go template conditionals directly around YAML object fields under `template`. Argo CD documents that Go templates are evaluated per string field and cannot wrap object fields this way. I replaced the snippet with a `templatePatch` example, which is the documented approach for conditionally setting automated sync policy and boolean fields.
- The testing guidance implied `create-only` could verify same-named generated Applications without touching existing ones. `create-only` prevents modification/deletion by the ApplicationSet controller, but Kubernetes still cannot create duplicate Application resources with the same names in the same namespace. I clarified that staging or temporary names should be used for that test.
- The Git file generator helper wrote into `configs/` without creating the directory. I added `mkdir -p configs`.
- The migration challenges said health status must be preserved. Health is controller-computed status, not a spec setting to preserve. I changed this to say that health status must be re-verified after migration.

## Review Notes
The local `argocd` and `kubectl` binaries were not available in this environment, so CLI verification was performed against the official Argo CD command references and Kubernetes/Argo CD behavior documented upstream.
