# Validation Summary: How to Create ArgoCD Merge Generator

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSet
- Argo CD Merge Generator
- Argo CD Git, List, Cluster, and Matrix generators
- Kubernetes custom resources
- Argo CD CLI
- Helm parameter overrides in Argo CD Applications

## Sources Consulted
- Argo CD Merge Generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Merge/
- Argo CD Git Generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Git/
- Argo CD Cluster Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD Matrix Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Matrix/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/applicationset-specification/
- Argo CD `argocd appset generate` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_appset_generate/
- Argo CD `argocd appset create` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_appset_create/
- Argo CD ApplicationSet template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/

## Issues Found
- The introductory explanation compared the Merge Generator to a SQL JOIN. That was misleading because the official behavior uses the first child generator as the base and merges matching parameter sets from later generators, while non-matching parameter sets from later generators are discarded. Updated the wording to describe keyed overrides on a base set.
- The Git Generator examples used `generators.git.values.service` as if it created a top-level `service` parameter. Official docs state that values added through `generators.git.values` are exposed with a `values.` prefix. Updated those examples to merge directly on the Git directory generator's `path.basename` parameter and changed the corresponding List elements and template references.
- The "Handling Missing Keys" section said entries are excluded when a merge key is absent from one of the generators. That was too broad and made the conditional deployment example incorrect, because base generator rows are retained when later generators do not match. Updated the explanation and changed the example so configured services are the base generator and Git-discovered services are merged into them.
- The dry-run example used `argocd appset generate ./applicationset.yaml --dry-run`. Official `argocd appset generate` docs do not list a `--dry-run` flag; the command itself generates rendered Applications for preview. Replaced it with `argocd appset generate ./applicationset.yaml`.

## Review Notes
- The examples use the default ApplicationSet templating style (`{{param}}`). Argo CD documentation still describes this default fasttemplate behavior, but notes it will be deprecated in favor of Go Template. A future update could migrate the post examples to `goTemplate: true` and `{{.param}}` syntax.
