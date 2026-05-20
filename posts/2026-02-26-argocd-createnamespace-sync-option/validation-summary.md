# Validation Summary: How to Use the 'CreateNamespace' Sync Option in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD Application and ApplicationSet resources
- Argo CD sync options
- Kubernetes namespaces
- Kubernetes namespace-scoped resources

## Sources Consulted
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD CLI command reference for `argocd app set`: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_set/
- Argo CD CLI command reference for `argocd app create`: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD App Deletion documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Argo CD ApplicationSet specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Kubernetes Namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes Admission Controllers documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/

## Issues Found
- The deletion behavior section incorrectly implied that a namespace created only by `CreateNamespace=true` is managed as an Argo CD Application resource. Current Argo CD documentation says generated namespaces are normally not tracked by Argo CD, though users can deliberately add tracking metadata. Updated the section to state that cascade deletion normally deletes tracked Application resources but not the auto-created namespace unless the namespace is intentionally tracked or owned by Argo CD.
- The deletion behavior section said deleting a namespace includes resources not managed by Argo CD "if they are in that namespace." Updated this to "namespaced resources" for precision, because Kubernetes namespaces contain namespace-scoped resources, not cluster-scoped resources.
- The best practices section said to define a full Namespace resource for ResourceQuotas, LimitRanges, or NetworkPolicies. Those are separate namespace-scoped resources, not fields of a Namespace resource. Updated the guidance to say those resources should be defined in Git, with a Namespace resource included only when Git should own the namespace object itself.

## Review Notes
The YAML snippets and Argo CD CLI flags were consistent with official Argo CD documentation. The local `argocd` CLI was not installed in the review environment, so CLI validation was performed against the official command reference instead of local `--help` output.
