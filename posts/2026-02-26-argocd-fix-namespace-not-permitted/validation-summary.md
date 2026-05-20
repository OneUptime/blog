# Validation Summary: How to Fix 'namespace not permitted' Error in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Argo CD AppProjects
- Argo CD Applications
- Argo CD CLI
- Kubernetes namespaces and RBAC
- Helm
- Kustomize

## Sources Consulted
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Applications in any namespace documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/app-any-namespace/
- Argo CD Installation documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
- Argo CD `argocd proj add-destination` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_add-destination/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_set/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/

## Issues Found
- The AppProject example under `CreateNamespace=true` omitted `metadata.namespace: argocd`. I added it so the example consistently creates the AppProject in the Argo CD control plane namespace.
- The namespace-scoped installation section incorrectly used `ARGOCD_APPLICATION_NAMESPACES` as if it controlled workload destination namespaces. That setting is for sourcing `Application` resources outside the Argo CD control plane namespace. I corrected the section to describe namespace-scoped installation RBAC and the documented `argocd cluster add <CONTEXT> --in-cluster --namespace production` approach for allowing managed namespaces.

## Review Notes
The remaining AppProject destination examples, wildcard usage, `CreateNamespace=true` behavior, default project destination defaults, and Argo CD CLI flags matched the official Argo CD documentation reviewed. The post does not pin a specific Argo CD version, so it was checked against the current stable/latest documentation available on 2026-05-20.
