# Validation Summary: How to Use Cluster Generator in ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- ApplicationSet
- ApplicationSet Cluster generator
- ApplicationSet Matrix generator
- Kubernetes Secrets and label selectors
- Argo CD CLI
- kubectl

## Sources Consulted
- Argo CD Cluster Generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet Templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/commands/argocd_cluster_add/
- Argo CD Cluster Management documentation: https://argo-cd.readthedocs.io/en/release-2.11/operator-manual/cluster-management/
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The post said the built-in cluster is always available. Argo CD enables the local `in-cluster` entry by default, but it can be disabled with `cluster.inClusterEnabled`, so the wording was changed to "available by default unless it has been disabled."
- The command for labeling an existing cluster secret used a label selector that would label every Argo CD cluster secret, not a specific existing cluster. The snippet now first lists cluster secrets and then labels a named `<cluster-secret-name>`.

## Review Notes
- The examples use ApplicationSet's default template syntax rather than enabling `goTemplate: true`. This remains supported, but Argo CD documentation notes that fasttemplate is expected to be deprecated in favor of Go Template.
- The Cluster generator also provides `nameNormalized` and, in current Argo CD versions, `project` parameters. The post's parameter list is not exhaustive, but the listed parameters are valid.
