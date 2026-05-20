# Validation Summary: How to Deploy Service Mesh Authorization Policies with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD Applications, automated sync, self-heal, sync waves, hooks, and CLI application revision updates
- Istio AuthorizationPolicy resources
- Kubernetes Deployments, Jobs, namespaces, ServiceAccounts, and kubectl logs
- GitOps branch-based rollout workflow

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy dry-run task: https://istio.io/latest/docs/tasks/security/authorization/authz-dry-run/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_set/

## Issues Found
- The Istio examples used `security.istio.io/v1beta1`, while current Istio documentation uses `security.istio.io/v1` for AuthorizationPolicy. Updated all AuthorizationPolicy examples to `security.istio.io/v1`.
- The rollout section used `action: AUDIT` as if it dry-ran deny behavior and suggested checking for `rbac_access_denied`. Istio AUDIT policies do not affect allow/deny decisions and require supporting audit behavior; Istio documents the `istio.io/dry-run` annotation for evaluating ALLOW or DENY policies without enforcement. Replaced the AUDIT rollout example with a dry-run DENY policy and changed the log check to look for `shadow denied`.
- The health-check allow rule matched source namespace `kube-system`, which is not a reliable match for kubelet probe traffic because AuthorizationPolicy source namespace is derived from peer identity. Changed the rule to allow the health-check paths without a source namespace match.
- The emergency override section said to modify an AuthorizationPolicy to `PERMISSIVE`, but `PERMISSIVE` is not an AuthorizationPolicy action. Changed it to add a temporary ALLOW rule.
- The self-heal section said Argo CD immediately reverts manual edits and that Git is the only way to change policies. Adjusted the wording to say Argo CD reverts on reconciliation and noted that Kubernetes RBAC should limit direct writes for that workflow to hold.

## Review Notes
The deny-all `spec: {}` pattern, explicit ALLOW policy structure, source principal format, sync wave annotations, PreSync hook annotations, hook delete policy, automated `selfHeal` and `prune` fields, and `argocd app set --revision` usage are consistent with the official documentation. The post assumes workloads have Istio sidecars or otherwise participate in Istio policy enforcement, and that required RBAC for the validation Job's service account is configured separately.
