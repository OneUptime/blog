# Validation Summary: How to Configure Project Destination Restrictions in ArgoCD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD
- Argo CD AppProjects
- Kubernetes namespaces and cluster-scoped resources
- Argo CD CLI
- GitOps multi-tenancy

## Sources Consulted
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD Projects user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD `argocd proj add-destination` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_add-destination/
- Argo CD `argocd proj remove-destination` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_remove-destination/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/

## Issues Found
- The post stated that an AppProject destination entry can use either `server` or `name`, but not both. Current Argo CD project documentation says destination clusters can be identified by `server`, `name`, or both, so the text was updated.
- The post stated that Argo CD has no native deny mechanism for destinations. Current Argo CD project documentation supports negated destination rules with `!`, so the section was corrected and the example was changed to use `namespace: "!kube-system"` plus a matching allow rule.
- The namespace creation section listed only AppProject destination and resource whitelist requirements. Added the Kubernetes RBAC requirement that the Argo CD application controller must be allowed to create namespaces on the target cluster.

## Review Notes
- The local `argocd` CLI was not installed in the review environment, so command syntax was verified against official Argo CD command reference documentation instead of local `--help` output.
- The remaining AppProject fields, wildcard destination examples, `CreateNamespace=true` sync option, and `argocd app create` flags match current official Argo CD documentation.
