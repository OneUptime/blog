# Validation Summary: How to Configure ArgoCD to Watch Multiple Namespaces

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Kubernetes RBAC
- Argo CD Application and AppProject custom resources

## Sources Consulted
- Argo CD official documentation: Applications in any namespace - https://argo-cd.readthedocs.io/en/stable/operator-manual/app-any-namespace/
- Argo CD official CLI documentation: `argocd app list` - https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD upstream RBAC examples: `examples/k8s-rbac/argocd-server-applications` - https://github.com/argoproj/argo-cd/tree/master/examples/k8s-rbac/argocd-server-applications
- Argo CD upstream RBAC manifest: `argocd-server-rbac-clusterrole.yaml` - https://raw.githubusercontent.com/argoproj/argo-cd/stable/examples/k8s-rbac/argocd-server-applications/argocd-server-rbac-clusterrole.yaml
- Argo CD upstream RBAC manifest: `argocd-server-rbac-clusterrolebinding.yaml` - https://raw.githubusercontent.com/argoproj/argo-cd/stable/examples/k8s-rbac/argocd-server-applications/argocd-server-rbac-clusterrolebinding.yaml

## Issues Found
- The restart instructions included `argocd-repo-server`, but Argo CD's official documentation only requires restarting `argocd-server` and `argocd-application-controller` after changing `application.namespaces`. Removed the unnecessary repo-server restart.
- The RBAC example implied both `argocd-application-controller` and `argocd-server` need the same broad cluster-level permissions for Applications and ApplicationSets. The official Applications-in-any-namespace RBAC example is specifically for the `argocd-server` ServiceAccount and grants permissions for Application API operations, not ApplicationSet permissions. Updated the section and YAML to match the upstream RBAC example.

## Review Notes
The post is technically relevant and the main Argo CD concepts are correct: `application.namespaces` can be set in `argocd-cmd-params-cm`, shell-style wildcards are supported, `*` enables all namespaces, and AppProjects must allow non-control-plane Application namespaces through `spec.sourceNamespaces`. Argo CD also strongly recommends using annotation-based or annotation-and-label resource tracking for this feature because application names become namespace/name composites and can exceed Kubernetes label value length limits; that is a useful future enhancement but not required for the specific snippets to be valid.
