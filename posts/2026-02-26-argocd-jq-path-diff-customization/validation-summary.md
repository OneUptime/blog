# Validation Summary: How to Use JQ Path Expressions for Diff Customization in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- jq path expressions
- JSON Pointer diff customization
- Argo CD CLI
- kubectl

## Sources Consulted
- Argo CD Diffing Customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_get/
- Argo CD ignore normalizer implementation: https://github.com/argoproj/argo-cd/blob/master/util/argo/normalizers/diff_normalizer.go
- jq manual: https://jqlang.org/manual/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The annotation and label prefix examples used `to_entries[] | select(.key | startswith(...))`. That is useful for querying entries with jq, but Argo CD compiles `jqPathExpressions` as delete paths, so transformed `{key, value}` entry objects are not valid paths to remove from the original resource. Changed those examples to select matching object values by dynamic key under `.metadata.annotations`, `.spec.template.metadata.annotations`, `.metadata.labels`, and `.spec.template.metadata.labels`.
- The debugging example for annotation pattern matching used the same `to_entries[]` pattern. Updated it to match the corrected Argo CD delete-path expression.
- The common mistakes section said bracket notation such as `.spec["template"]` may not work in Argo CD. Argo CD uses gojq, and bracket notation is valid jq syntax. Replaced that warning with the accurate caveat that keys containing dots or slashes require bracket notation.
- The unsupported-feature warning was too broad. Reworded it to the concrete Argo CD constraint: expressions must identify delete paths rather than transform the resource with filters such as `to_entries`, `map`, or `group_by`.

## Review Notes
The remaining examples align with Argo CD's documented `ignoreDifferences` and `resource.customizations.ignoreDifferences` formats. Some examples use non-optional array iteration such as `initContainers[]`; this is consistent with the official Argo CD examples, but readers may prefer optional iteration (`[]?`) in broader configurations where the field is often absent.
