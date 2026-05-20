# Validation Summary: How to Configure Custom Resource Actions in ArgoCD

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD resource actions
- Argo CD ConfigMap customizations
- Argo CD CLI
- Argo CD RBAC
- argo-helm chart values
- Kubernetes Deployments and custom resources
- Lua

## Sources Consulted
- Argo CD Resource Actions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/resource_actions/
- Argo CD `argocd app actions list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_actions_list/
- Argo CD `argocd app actions run` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_actions_run/
- Argo CD RBAC documentation for resource actions: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/#the-action-action
- Argo CD built-in Deployment restart action source: https://github.com/argoproj/argo-cd/blob/master/resource_customizations/apps/Deployment/actions/restart/action.lua
- argo-helm chart values reference: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/README.md
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The post described `resource.customizations.actions.<group>_<kind>` values as only a list of actions. Updated the description to match Argo CD's documented structure: a `discovery.lua` script plus `definitions`.
- Deployment custom action examples did not preserve Argo CD's built-in Deployment actions. Added `mergeBuiltinActions: true` and a note that custom actions otherwise override built-in actions for that resource kind in Argo CD 2.13 and later.
- Restart examples used `tostring(os.time())` for the `kubectl.kubernetes.io/restartedAt` annotation. Updated them to use the ISO-like UTC timestamp format used by Argo CD's built-in Deployment restart action.
- Deployment scale examples assumed `obj.spec.replicas` was always set. Kubernetes documents `.spec.replicas` as optional with a default of 1, so the Lua examples now default nil replicas to 1 before comparing or incrementing/decrementing.
- The Helm values example used `server.config`, which does not match the current argo-helm chart values layout. Updated it to `configs.cm`.
- The security section said anyone with ArgoCD UI/CLI access can trigger actions. Updated it to clarify that users also need action permissions.

## Review Notes
The local environment did not have the `argocd` CLI installed, so CLI verification was performed against the official Argo CD command reference instead of local `--help` output.
