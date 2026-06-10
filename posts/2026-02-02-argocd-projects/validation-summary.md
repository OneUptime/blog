# Validation Summary: How to Use ArgoCD Projects

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ArgoCD (AppProject CRD, ApplicationSet, CLI)
- Kubernetes (RBAC, namespaces, resource types)
- GitOps workflows
- Casbin RBAC policy syntax
- GPG signature verification for Git commits

## Sources Consulted
- ArgoCD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- ArgoCD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- ArgoCD AppProject CRD reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#projects
- ArgoCD ApplicationSet git directory generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- ArgoCD project-scoped repositories: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/#project-scoped-repositories-and-clusters
- ArgoCD CLI reference (`argocd proj create`, `argocd proj role create-token`)
- Kubernetes API group references for resource kinds (apps, batch, networking.k8s.io, policy, autoscaling)

## Issues Found

1. **ApplicationSet path indices incorrect** — In the "Managing Projects with ApplicationSets" section, the git directory generator pattern `teams/*/services/*` produces a 4-element path (e.g., `teams/backend/services/api`, indices 0-3). The template referenced `{{path[2]}}` (which would be the literal `services`) and `{{path[4]}}` (out of range). Changed to `{{path[1]}}` (team name) and `{{path[3]}}` (service name) so the rendered application name, project, and namespace make sense.

2. **Project-scoped repository secret-type label incorrect** — In the "Project Scoped Repositories" section, the example Secret used `argocd.argoproj.io/secret-type: repo-creds`. The `repo-creds` type is for URL-prefix-based credential templates, not for a specific repository URL. Changed to `repository`, which is the correct type for an individual project-scoped repository entry, and added the standard `type: git` field that ArgoCD expects for repository secrets.

## Review Notes

- The default project `argocd proj get` output is illustrative; the exact formatting can vary slightly between ArgoCD versions but the field names shown are correct.
- The RBAC resources/actions table is accurate for the listed entries but is not exhaustive — ArgoCD also supports `projects`, `accounts`, `gpgkeys`, `certificates`, and `applicationsets` resources. Not a correction, just an observation.
- The `--src` and `--dest` flags for `argocd proj create` and the `--expires-in` flag for `argocd proj role create-token` are correct.
- GPG keyID `4AEE18F83AFDEB23` shown is GitHub's well-known web-flow signing key; the 16-character long key ID format used in `signatureKeys` is correct.
- `PodSecurityPolicy` (policy/v1beta1) is referenced in the blacklist example. PSPs were removed in Kubernetes 1.25; the example is still valid syntactically for blocking the kind name, but readers on modern clusters should be aware PSP no longer exists and PodSecurity admission or external policy engines (Kyverno, OPA Gatekeeper) are the modern replacements. Left as-is since the post does not claim PSP is current.
- `PodDisruptionBudget` is in the `policy` group, which is correct for policy/v1 (current as of Kubernetes 1.21+).
