# Validation Summary: How to Use Progressive Syncs in ArgoCD ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- ApplicationSet Progressive Syncs / RollingSync
- Kubernetes
- GitOps
- Argo CD CLI
- Go templates

## Sources Consulted
- Argo CD Progressive Syncs documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Progressive-Syncs/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Cluster generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD `argocd cluster set` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_set/
- Kubernetes object names documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/

## Issues Found
- The post omitted that progressive syncs are still experimental and must be explicitly enabled on the ApplicationSet controller. Added the supported enablement options from the official Argo CD documentation.
- Several RollingSync examples used `syncPolicy.automated`. Official Argo CD documentation states RollingSync forces generated Applications to have autosync disabled and logs warnings when automated sync is configured. Removed automated sync from examples and added a note explaining this behavior.
- The `maxUpdate` example generated Application names from the cluster URL, producing invalid Kubernetes object names because values like `https://prod-1.example.com` contain disallowed characters. Added a separate `clusterName` field and used that in `metadata.name`.
- The monitoring section implied that ApplicationSet status directly shows the active rollout step and per-step health. Adjusted the text to direct readers to generated Application sync and health status for rollout progress, while using ApplicationSet status/events for reconciliation errors.
- The rollback comment said all applications would sync back to the previous state. Updated it to clarify that rollback proceeds through the same RollingSync steps.

## Review Notes
The `maxUpdate` examples are consistent with the Argo CD spec: integer and percentage values are supported, percentage values round down, and non-zero percentages are floored at one Application. The cluster labeling commands use the current `argocd cluster set --label key=value` option. Go template syntax in the final example is valid for the list generator.
