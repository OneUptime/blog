# Validation Summary: How to Handle One-Off Debug Operations with GitOps

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- kubectl
- Kubernetes Jobs, Pods, ephemeral debug containers, RBAC, and port forwarding

## Sources Consulted
- Kubernetes `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward
- Kubernetes TTL-after-finished controller documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Argo CD resource exclusions documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD compare options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/compare-options/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD resource actions documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/resource_actions/
- Argo CD `argocd app actions run` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_actions_run/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_set/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD sync windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/

## Issues Found
- The `kubectl run` standalone debug pod example did not set `--restart=Never` or `--command`, which can make an interactive shell command behave incorrectly. Added both flags.
- The post implied ephemeral debug containers and standalone debug pods simply do not interact with GitOps state. Clarified that ephemeral containers use Kubernetes debugging flow and that orphaned resource monitoring, RBAC, and audit policies still matter.
- The resource exclusions example included a label-focused comment, but Argo CD `resource.exclusions` excludes resources by API group, kind, and cluster, not by label. Removed the incorrect comment and clarified the broad scope.
- The `IgnoreExtraneous` annotation was described as enough to avoid sync issues for temporary resources. Clarified that it affects sync status and added `argocd.argoproj.io/sync-options: Prune=false` to prevent pruning during sync.
- The debug namespace section used a namespace label removal command that does not make Argo CD stop watching the namespace. Removed the command and clarified that excluding the namespace from project destinations only prevents applications in that project from targeting it.
- The Argo CD resource action restart section claimed the operation does not create drift because Argo CD performs it. Corrected this to explain that it goes through Argo CD RBAC/audit paths, but the live object can still differ from Git until reconciliation.
- The sync window example omitted an application, namespace, or cluster selector. Added an `applications` selector so the example matches Argo CD sync window requirements.

## Review Notes
The post is technically relevant and current. The examples assume a recent Kubernetes and Argo CD installation with the relevant commands and built-in actions available. `kubectl` and `argocd` were not installed locally, so CLI validation was performed against official command references instead of local `--help` output.
