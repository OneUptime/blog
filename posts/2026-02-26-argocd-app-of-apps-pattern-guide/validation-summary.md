# Validation Summary: How to Use the App-of-Apps Pattern in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD App-of-Apps pattern
- Argo CD automated sync, pruning, self-healing, sync options, sync waves, and deletion finalizers
- Argo CD ApplicationSets
- Kubernetes manifests and `kubectl apply`
- Helm chart templates

## Sources Consulted
- Argo CD Cluster Bootstrapping / App Of Apps Pattern: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Resource Health: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/health/
- Argo CD App Deletion: https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Argo CD ApplicationSet Generators: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators/
- Helm Template Function List: https://docs.helm.sh/docs/chart_template_guide/function_list/

## Issues Found
- The Helm template example escaped every Go template expression as Markdown/templating literals, making the snippet invalid if copied into `templates/application.yaml`. Updated it to normal Helm template syntax.
- The Helm template used `default` for boolean `prune` and `selfHeal` values. In Helm templates, `default` treats `false` as empty, so per-application `false` overrides would be ignored. Replaced those lookups with `dig` so explicit `false` values are preserved.
- The `values.yaml` example included an `autoSync` default that was not used by the template. Removed the unused value to avoid implying it controlled generated output.
- The sync-wave section implied sync waves alone can order child application readiness. Argo CD removed built-in health assessment for `argoproj.io/Application` in v1.8, so waiting for child Application health requires a custom/restored health check. Added that caveat.
- The best-practices section said to always include child Application finalizers. Argo CD documents this finalizer as enabling cascading deletion, so the recommendation was narrowed to cases where cascading cleanup is desired.
- The best-practices section recommended keeping the parent app in the default project. Official Argo CD docs describe App-of-Apps as an admin-level capability because it can create Applications in arbitrary projects, so this was changed to recommend an administrator-owned project.
- The final ApplicationSets cross-link pointed to an App-of-Apps cluster bootstrapping post. Updated it to the local ApplicationSets post.

## Review Notes
The main Argo CD Application examples use current `argoproj.io/v1alpha1` Application manifests and valid fields for `project`, `source`, `destination`, `syncPolicy.automated`, `syncOptions`, finalizers, and sync-wave annotations. `helm` and `kubectl` were not installed in the local workspace, so command-line rendering and CLI help checks could not be run locally.
