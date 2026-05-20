# Validation Summary: How to Use Project Source Namespaces in ArgoCD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD Applications
- Argo CD AppProjects
- Argo CD ApplicationSets
- Kubernetes RBAC
- Kubernetes manifests and kubectl commands
- Argo CD CLI

## Sources Consulted
- Argo CD official documentation: Applications in any namespace, https://argo-cd.readthedocs.io/en/latest/operator-manual/app-any-namespace/
- Argo CD official documentation: ApplicationSet in any namespace, https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/applicationset/Appset-Any-Namespace/
- Argo CD official CLI reference: argocd app list, https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD official CLI reference: argocd app get, https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD official CLI reference: argocd app sync, https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD official documentation: App Deletion, https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/

## Issues Found
- The restart command used `deployment/argocd-application-controller`, but the default Argo CD application controller workload is a StatefulSet in the official documentation. Changed it to `statefulset/argocd-application-controller`.
- The post omitted the official requirement to extend `argocd-server` Kubernetes RBAC when Applications in other namespaces are managed through the Argo CD API, CLI, or UI. Added a short note after the core restart commands.
- The ApplicationSet section implied ApplicationSets work in team namespaces with only `application.namespaces`. Official docs require separate ApplicationSet controller enablement with `applicationsetcontroller.namespaces` or `--applicationset-namespaces`. Added the required ConfigMap setting and controller restart command.
- The limitations section said source namespaces affect where both Applications and ApplicationSets can be created. Updated it to distinguish AppProject `sourceNamespaces` for Applications from the separate ApplicationSet controller namespace setting.
- The post incorrectly said Application names must be globally unique cluster-wide. Official docs refer to namespaced Applications as `<namespace>/<name>` in the CLI and UI. Updated the section to say names are unique within a namespace and should be referenced with the namespace-qualified name.

## Review Notes
The guide is technically sound after the corrections above. Future improvements could mention Argo CD's recommendation to use annotation-based resource tracking for applications in any namespace, because namespace/name tracking values can exceed Kubernetes label length limits.
