# Validation Summary: How to Use ApplicationSets for Disaster Recovery in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Kubernetes
- GitOps
- Helm-based Argo CD Applications
- Argo CD CLI

## Sources Consulted
- Argo CD ApplicationSet Cluster Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD ApplicationSet Template and templatePatch documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD ApplicationSet Progressive Syncs documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Progressive-Syncs/
- Argo CD ApplicationSet and Argo CD integration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Argo-CD-Integration/
- Argo CD ApplicationSet resource modification documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Controlling-Resource-Modification/
- Argo CD cluster add command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD cluster set command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_set/
- Argo CD app list command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/

## Issues Found
- The active-passive ApplicationSet tried to use a Go template `if` block across YAML fields to conditionally emit `spec.syncPolicy.automated`. Argo CD applies Go templates per string field, so this object-level conditional is not valid. Changed the example to use `templatePatch`, which Argo CD documents for conditionally setting automated sync policy.
- The failover procedure labeled the old primary cluster as `failed`, but the cluster generator selector did not include `failed`, which would remove that generated Application rather than just disable automated sync. Added `failed` to the selected roles so the Application remains managed with manual sync.
- The activation and DR test commands selected labels that were not defined on the generated Applications. Added explicit labels to the generated Applications and updated the `argocd app list` selectors to match them.
- The RPO wording implied RPO should be zero with GitOps. Updated it to clarify that Git-tracked configuration can be current, while application data RPO depends on backup or replication.
- The conclusion said the entire platform is defined in Git. Narrowed this to application manifests and platform configuration to avoid overclaiming about runtime state, credentials, and data.

## Review Notes
The examples assume cluster labels such as `role`, `environment`, `region`, and `cloud` are present on Argo CD cluster Secrets. The `RollingSync` example is syntactically aligned with Argo CD documentation, but Progressive Syncs must be enabled on the ApplicationSet controller for RollingSync behavior to take effect.
