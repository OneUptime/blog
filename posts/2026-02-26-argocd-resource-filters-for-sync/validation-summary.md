# Validation Summary: How to Use Resource Filters in ArgoCD for Sync

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- ApplicationSet
- Argo CD CLI
- YAML
- jq

## Sources Consulted
- Argo CD Resource Exclusion/Inclusion documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/declarative-setup/#resource-exclusioninclusion
- Argo CD Project specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD Directory application documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/directory/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Go Template migration documentation: https://argo-cd.readthedocs.io/en/release-2.9/operator-manual/applicationset/GoTemplate/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD Diff Customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/

## Issues Found
- The post claimed the ApplicationSet example demonstrated label-based filtering, but the YAML used the Git directory generator with `exclude: true`, which is path-based filtering. Changed the heading and explanation to path-based filtering.
- The introduction and description claimed coverage of labels, annotations, and every filtering mechanism. The post did not actually cover those comprehensively. Narrowed the wording to the mechanisms shown in the article.
- Several CLI examples formatted resources as `\(.group):\(.kind):\(.name)`. For core Kubernetes resources, Argo CD expects an empty group in the `GROUP:KIND:NAME` format, such as `:Service:my-service`. Updated the `jq` expressions to use `(.group // "")`.
- One CLI example said it was syncing resources but only listed them. Updated the comment and output text to match the command behavior.
- The Missing resource example filtered `.status == "Missing"`, but Missing is represented as a health status in Argo CD resource output. Updated it to filter `.health.status == "Missing"`.
- The `ignoreDifferences` section implied ignored differences are used during sync. Added the documented caveat that ignore difference rules are not used during sync unless `RespectIgnoreDifferences=true` is enabled.

## Review Notes
The remaining examples are version-neutral for current Argo CD documentation. The CLI snippets still use shell-generated `--resource` flags for readability; in production scripts, an array-based shell implementation would avoid `eval`.
