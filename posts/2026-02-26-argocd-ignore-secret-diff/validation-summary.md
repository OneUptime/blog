# Validation Summary: How to Ignore Secret Changes in ArgoCD Diff

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes Secrets
- External secret management controllers
- GitOps diff customization
- YAML configuration

## Sources Consulted
- Argo CD Diff Customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD Diff Strategies documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/diff-strategies/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/application-specification/
- Argo CD Declarative Setup / Resource Exclusion documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD app get command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD app diff command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The introduction and first example implied that Argo CD directly diffs an `ExternalSecret` manifest in Git against the generated Kubernetes `Secret`. Argo CD does not diff different resource kinds that way. Updated the text and example to describe a tracked `Secret` that is also modified by an external controller, and noted that generated Secrets not present in Git are not diffed against their generator resources.
- The `ignoreDifferences` example used `name: "eso-*"` as if resource names supported glob patterns. Argo CD documentation states that `name` and `namespace` must match exactly. Replaced the glob example with an exact-name example and added a note.
- The server-side diff section said Argo CD 2.5+ server-side diff uses managed fields to automatically ignore externally owned Secret fields. Current Argo CD docs describe server-side diff as a server-side apply dry-run strategy, available from Argo CD 2.10 and stable from 3.1. Updated the version, behavior, and clarified that managed-field ignoring still requires `managedFieldsManagers` in `ignoreDifferences`.
- The global server-side diff example used `argocd-cm`, but Argo CD documents `controller.diff.server.side` in `argocd-cmd-params-cm`. Updated the ConfigMap name and added the required application-controller restart note.
- The `resource.exclusions` example included a `namespaces` selector. Argo CD resource exclusions are documented as matching API groups, kinds, and cluster URLs. Removed the unsupported namespace selector and added a clarification.

## Review Notes
The remaining examples use supported Argo CD diff customization mechanisms: JSON pointers, JQ path expressions, system-level resource customizations, `managedFieldsManagers`, `RespectIgnoreDifferences=true`, and CLI refresh/diff commands. Controller `managedFieldsManagers` names can vary by installation, so operators should verify the exact manager name in `metadata.managedFields` before applying those examples globally.
