# Validation Summary: Portainer vs Kubernetes Dashboard: When to Use Which

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- Kubernetes
- Kubernetes Dashboard
- Portainer
- Helm
- kubectl
- Kubernetes RBAC
- ServiceAccounts
- RoleBindings

## Sources Consulted
- Kubernetes documentation: Deploy and Access the Kubernetes Dashboard — https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/
- Kubernetes documentation: Using RBAC Authorization — https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes documentation: kubectl create token — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes documentation: Service Accounts — https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes Dashboard GitHub repository README — https://github.com/kubernetes-retired/dashboard
- Portainer documentation: Add a new environment — https://docs.portainer.io/admin/environments/add
- Portainer documentation: Roles — https://docs.portainer.io/sts/admin/user/roles
- Portainer documentation: Manage access to a namespace — https://docs.portainer.io/2.33-lts/user/kubernetes/namespaces/access
- Portainer documentation: Create an application from a Manifest — https://docs.portainer.io/sts/user/kubernetes/applications/manifest/create
- Portainer documentation: Create an application from a Helm chart — https://docs.portainer.io/user/kubernetes/applications/manifest/helm
- Portainer documentation: Install Edge Agent Standard on Kubernetes — https://docs.portainer.io/admin/environments/add/kubernetes/edge

## Issues Found
- The post described Kubernetes Dashboard as an actively maintained official Kubernetes project. I updated the intro, comparison table, and summary to reflect current Kubernetes documentation and the archived `kubernetes-retired/dashboard` repository: Dashboard is deprecated and unmaintained, and Kubernetes docs now suggest considering Headlamp for new installations.
- The Dashboard install example used the old manifest-based `v2.7.0` deployment URL. I replaced it with the current Helm-based installation flow and the current `kubectl port-forward svc/kubernetes-dashboard-kong-proxy 8443:443` access command.
- The Dashboard access explanation implied a generic kubeconfig-driven permission model. I updated it to match current docs: Dashboard deploys with minimal RBAC and current login is bearer-token based.
- The production RBAC YAML example was incomplete because it referenced a `Role` and `ServiceAccount` that were not defined. I replaced it with a valid namespace-scoped `RoleBinding` that binds the built-in `view` `ClusterRole` to a defined `ServiceAccount`.
- The Portainer RBAC comparison overstated the feature as unconditional "Full RBAC". I updated the table and guidance to note that Portainer's richer RBAC and role-management features are a Business Edition feature.
- The post metadata description also called Dashboard "official". I updated that line to remove the outdated wording.

## Review Notes
- Kubernetes Dashboard remains usable for existing deployments, but both Kubernetes documentation and the upstream repository now treat it as archived. This makes the comparison time-sensitive even after correction.
- Portainer's Kubernetes deployment workflows are broader than Dashboard's, but some access-control features are edition-specific; future updates should keep CE/BE distinctions explicit.
- `kubectl` was not installed in the review workspace, so command validation was done against official Kubernetes documentation rather than local `--help` output.
