# Validation Summary: How to Configure kubectl Access in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Kubernetes
- `kubectl`
- `kubeconfig`
- Kubernetes RBAC

## Sources Consulted
- Portainer documentation: Kubeconfig, https://docs.portainer.io/sts/user/kubernetes/kubeconfig
- Portainer documentation: General settings, https://docs.portainer.io/sts/admin/settings/general
- Portainer documentation: Manage access to a namespace, https://docs.portainer.io/2.33-lts/user/kubernetes/namespaces/access
- Portainer documentation: Kubernetes roles and bindings, https://docs.portainer.io/sts/advanced/kubernetes-roles-and-bindings
- Portainer documentation: kubectl shell, https://docs.portainer.io/user/kubernetes/kubectl
- Kubernetes documentation: Organizing Cluster Access Using kubeconfig Files, https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/
- Kubernetes documentation: `kubectl config view`, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_view/
- Kubernetes documentation: Authorization, https://kubernetes.io/docs/reference/access-authn-authz/authorization/
- Kubernetes documentation: `kubectl version`, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/

## Issues Found
- The post said kubeconfig access and expiry were configured from per-environment settings. I corrected this to Portainer's global **Settings** page under **Kubernetes settings > Kubeconfig**, which is where Portainer documents kubeconfig expiry and non-admin download control.
- The namespace access workflow said to click into a namespace directly. I corrected this to the documented **Namespaces > Manage access** flow and clarified that namespace scoping applies to non-cluster-wide roles.
- The kubeconfig download steps pointed users to **My account**. I corrected this to the documented **Home** page **kubeconfig** button flow and added the required HTTPS caveat, because Portainer only shows the button over HTTPS.
- The sample context-switch command used an arbitrary context name. I replaced it with a Portainer-style example context name consistent with the documented kubeconfig structure.
- The troubleshooting section used `curl` against the Portainer Kubernetes proxy without any authentication headers. I replaced this with `kubectl version`, which tests connectivity through the active kubeconfig without omitting required auth.
- The expiry section implied expiry changes were the only reason to regenerate credentials. I clarified that expiry changes only affect newly generated kubeconfigs and that Portainer restarts also invalidate existing kubeconfig tokens.
- The kubectl shell section referred to `KubeShell` in the sidebar. I corrected this to the documented **kubectl shell** menu entry and noted that the shell includes both `kubectl` and `helm`.

## Review Notes
- The `KUBECONFIG` example uses the Unix-style `:` path separator. On Windows, `KUBECONFIG` entries are separated with `;`.
