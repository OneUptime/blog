# Validation Summary: How to Fix 'app is not permitted' Error in ArgoCD

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Argo CD
- Argo CD AppProject configuration
- Argo CD CLI
- Kubernetes RBAC and resource scoping
- GitOps deployment configuration

## Sources Consulted
- Official Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Official Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Official Argo CD `argocd proj` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj/
- Official Argo CD `argocd proj add-destination` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_add-destination/
- Official Argo CD `argocd proj add-source` command reference: https://argo-cd.readthedocs.io/en/release-2.3/user-guide/commands/argocd_proj_add-source/

## Issues Found
- The post said projects deny cluster-scoped resources "by default." That is too broad because the Argo CD `default` project is created with permissive settings, including `clusterResourceWhitelist: [{group: '*', kind: '*'}]`. I changed the wording to say custom projects restrict cluster-scoped resources through an allow list, matching the official project documentation.

## Review Notes
- The local `argocd` CLI was not installed in the review environment, so CLI verification was performed against the official Argo CD command reference.
- The `argocd proj add-destination PROJECT SERVER NAMESPACE` examples match the current command reference. Some narrative project docs still show older comma-separated destination examples, so future updates should continue to prefer the generated command reference for CLI syntax.
