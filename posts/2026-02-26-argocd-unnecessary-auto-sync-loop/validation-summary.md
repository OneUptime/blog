# Validation Summary: How to Handle ArgoCD Apps That Keep Auto-Syncing Unnecessarily

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD automated sync and self-heal
- Argo CD diff customization and sync options
- Kubernetes admission webhooks
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes metadata, status, and controller-managed fields

## Sources Consulted
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Diffing Customization: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/diffing/
- Argo CD Diff Strategies / Server-Side Diff: https://argo-cd.readthedocs.io/en/release-2.12/user-guide/diff-strategies/
- Argo CD Sync Options / RespectIgnoreDifferences: https://argo-cd.readthedocs.io/en/release-2.5/user-guide/sync-options/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/application-specification/
- Argo CD Reconcile Optimization: https://argo-cd.readthedocs.io/en/latest/operator-manual/reconcile/
- Argo CD argocd-cm example: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD CLI command reference for `argocd app sync`: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Kubernetes Dynamic Admission Control: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes Horizontal Pod Autoscaling: https://v1-35.docs.kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- The post described repeated auto-sync loops as if ordinary auto-sync alone will keep syncing the same revision. Argo CD only re-syncs the same commit/parameters repeatedly when automated self-heal is enabled, so I clarified the intro, loop explanation, diagram, and conclusion.
- The mutating webhook explanation said webhooks modify resources after Argo CD creates or updates them. Kubernetes mutating admission webhooks mutate admission requests before persistence, so I corrected that wording.
- The OPA Gatekeeper bullet implied all Gatekeeper use mutates resources. I narrowed it to Gatekeeper mutation policies.
- The server-side defaults section overstated that auto-sync always creates a loop and that server-side diff eliminates all false positives. I changed it to self-heal-specific wording and "reduce false positives," and added the required application-controller restart after changing `argocd-cmd-params-cm`.
- The status field section implied status updates generally trigger Argo CD diffs. Argo CD normally ignores status through compare options, so I clarified the cases where status can still cause noise.
- The resource generation section implied `metadata.generation` and `metadata.resourceVersion` are likely Argo CD diff causes. Current Argo CD ignores those metadata fields for resource update reconciliation by default, so I corrected the explanation.
- The diagnostic sync command used `argocd app sync my-app --force`. The flag exists, but it is unnecessary and too aggressive for this diagnostic workflow, so I changed it to a normal sync.
- The `RespectIgnoreDifferences=true` explanation omitted that it applies by pre-patching desired state and is effective for resources that already exist. I added that caveat.
- The prevention section said to always enable server-side diff. Because server-side diff is a configurable diff strategy with version and operational caveats, I changed the recommendation to "consider enabling."

## Review Notes
The remaining commands and configuration snippets are syntactically plausible and align with documented Argo CD and Kubernetes behavior. The post does not pin an Argo CD version; guidance was checked against current/stable documentation and recent Argo CD 2.x/3.x docs where relevant.
