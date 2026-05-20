# Validation Summary: How to Use Post Selectors to Filter Generated Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSet
- ApplicationSet generators: List, Cluster, Git, and Matrix
- Kubernetes label selectors
- Argo CD CLI
- kubectl
- YAML

## Sources Consulted
- Argo CD ApplicationSet Post Selector documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Post-Selector/
- Argo CD ApplicationSet Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Cluster Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD Git Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD Matrix Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Matrix/
- Argo CD `argocd appset get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_appset_get/
- Kubernetes label selector documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- Several examples placed `selector` inside the generator-specific configuration (`list`, `git`, and `matrix`). Argo CD's post selector is a sibling field on the generator item, not a nested field inside those generator blocks. Updated the examples so `selector` is aligned with `list`, `git`, and `matrix`.
- The cluster generator example used `clusters.selector`, which is the cluster generator's label selector over Argo CD cluster Secrets, not a post selector over generated values. Updated the example to use a sibling post selector and match the generated cluster label parameters as `metadata.labels.environment` and `metadata.labels.cloud-provider`.

## Review Notes
- The examples use the default ApplicationSet template syntax (`{{cluster}}`, `{{url}}`, etc.). Argo CD documentation now generally recommends Go templates with `goTemplate: true`, while noting that fasttemplate remains the default but is expected to be deprecated in favor of Go Template. This was not changed because the post focuses on selector behavior and the existing template syntax remains valid.
- YAML snippets were parsed after edits to verify syntax.
