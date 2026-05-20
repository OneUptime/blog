# Validation Summary: How to Control Resource Modification in ArgoCD ApplicationSets

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Kubernetes custom resources
- GitOps
- kubectl
- Argo CD CLI
- yq

## Sources Consulted
- Argo CD ApplicationSet Controlling Resource Modification: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Controlling-Resource-Modification/
- Argo CD ApplicationSet Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Application Pruning & Resource Deletion: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/
- Argo CD CLI `argocd appset get` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_appset_get/

## Issues Found
- The post referred to a generic `policy` field in the ApplicationSet spec. Updated this to the correct per-ApplicationSet field, `syncPolicy.applicationsSync`.
- The first YAML example discussed policy behavior but did not include an ApplicationSet sync policy. Added `syncPolicy.applicationsSync: create-update`.
- The `create-only` wording implied Applications could never be deleted after creation. Clarified that the policy applies to normal generator reconciliation and added the official caveat that owner-reference deletion can still happen when the ApplicationSet itself is deleted.
- The `preservedFields` example used wildcard-style annotation entries and described pattern matching. Updated the example and explanation to use specific annotation and label keys, matching the official documented behavior.
- The `argocd appset get` command comment implied it shows generated Applications and their status. Updated the comment to describe it as viewing ApplicationSet details, which matches the official CLI command reference.

## Review Notes
The policy values `sync`, `create-only`, `create-update`, and `create-delete` are valid. The `ignoreApplicationDifferences` examples use documented `jsonPointers` syntax, and the Kubernetes and Argo CD CLI commands are plausible for a standard Argo CD installation.
