# Validation Summary: How to Implement Repository Templating for ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD ApplicationSet
- GitOps repository layout
- Kubernetes manifests
- Kustomize
- GitHub template repositories and GitHub CLI
- GitHub Actions
- kubeconform
- CODEOWNERS

## Sources Consulted
- Argo CD ApplicationSet SCM Provider Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-SCM-Provider/
- Argo CD ApplicationSet introduction and template parameter documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/applicationset/
- Argo CD ApplicationSet Matrix Generator documentation: https://argo-cd.readthedocs.io/en/release-2.11/operator-manual/applicationset/Generators-Matrix/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes SIGs Kustomize README: https://github.com/kubernetes-sigs/kustomize
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- GitHub CLI `gh repo create` manual: https://cli.github.com/manual/gh_repo_create
- GitHub CODEOWNERS documentation: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- kubeconform README: https://github.com/yannh/kubeconform

## Issues Found
- The template tree listed `base/hpa.yaml` and `overlays/production/patches/replicas.yaml`, but the shown Kustomize files did not include those files. Removed those entries from the tree so the documented structure matches the working examples.
- The base Kustomize example used `commonLabels`. Updated it to the current `labels` transformer with `includeSelectors: true`, matching current Kustomize examples while preserving the same selector-label behavior.
- The production `PodDisruptionBudget` was listed under `patches`, but it creates a new Kubernetes resource rather than patching an existing resource. Moved it into the production overlay `resources` list and left only the Deployment resource patch under `patches`.
- The repo creation script only replaced placeholders in YAML files and `README.md`, leaving `TEAM_NAME` unresolved in `CODEOWNERS`. Updated the `find` command to include `CODEOWNERS` and fixed the file-name predicate grouping.

## Review Notes
The ApplicationSet example uses the default ApplicationSet template syntax (`{{repository}}`, `{{url}}`, and list-generated values), which is still documented. Current Argo CD examples often enable `goTemplate: true` and use dotted variables such as `{{.repository}}`, but the post's syntax remains valid without `goTemplate: true`.
