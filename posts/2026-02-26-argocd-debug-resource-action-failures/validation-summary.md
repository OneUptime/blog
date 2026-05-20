# Validation Summary: How to Debug Custom Resource Action Failures in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD resource actions
- Argo CD RBAC
- Kubernetes ConfigMaps
- Kubernetes API validation
- Lua
- kubectl

## Sources Consulted
- Argo CD Resource Actions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/resource_actions/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd app actions list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_actions_list/
- Argo CD `argocd app actions run` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_actions_run/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_can/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The ConfigMap key examples incorrectly said core API resources should use `resource.customizations.actions.v1_Service`. Current Argo CD documentation uses the API group and kind for grouped resources, but core resources omit the group, for example `resource.customizations.actions.Service`. Updated the pattern and examples.
- The post directed readers to `argocd-application-controller` logs for action and Lua execution errors. Resource action CLI/API calls are handled through the Argo CD API server, so the examples now check `deployment/argocd-server`.
- The ConfigMap validation command piped `kubectl get ... -o jsonpath='{.data}'` into `python3 -m json.tool`, but that JSONPath output is not guaranteed to be valid JSON. Updated it to inspect `.data` from full JSON output with `jq`.
- The kube-apiserver audit log command implied audit logs are always available from the API server pod logs. Updated the wording to make that conditional on audit logging being written to pod logs and corrected the pod reference form.

## Review Notes
The remaining Argo CD resource action structure, `discovery.lua` and `action.lua` behavior, `argocd app actions list` and `argocd app actions run` flags, RBAC `action/<group>/<kind>/<action-name>` syntax, and Lua examples align with current official documentation. The local environment did not have the `argocd` CLI installed, so CLI verification was performed against official Argo CD command references rather than local `--help` output.
