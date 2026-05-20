# Validation Summary: How to Organize Monorepo vs Multi-Repo for ArgoCD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Argo CD Application
- Argo CD ApplicationSet
- GitOps
- Kubernetes manifests
- Git repository access and credential templates
- GitHub/GitLab repository organization patterns

## Sources Consulted
- Argo CD ApplicationSet Git Generator documentation: https://argo-cd.readthedocs.io/en/release-3.2/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet SCM Provider Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-SCM-Provider/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD ApplicationSet Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD declarative repository and repo-creds documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/

## Issues Found
- The ApplicationSet examples used the older default fasttemplate-style variables. The current Argo CD documentation recommends Go template usage for ApplicationSet templates, while the template documentation notes that fasttemplate will be deprecated in favor of Go Template. Updated both ApplicationSet examples to set `goTemplate: true`, add `goTemplateOptions: ["missingkey=error"]`, and use the documented Go template parameter syntax.
- The multi-repo example layout placed application manifests under a top-level `frontend/` or `backend-api/` directory, but the later SCM provider ApplicationSet used `path: overlays/dev`. That path would not exist with the shown repository layout. Updated the multi-repo layout and single Application example so each manifest repository has `base/` and `overlays/` at the repository root, matching the SCM provider example.
- The SCM provider filter matched every repository ending in `-manifests`, including the shown `infrastructure-manifests` repo, which does not contain the `overlays/dev` path used by the generated Applications. Added the documented `pathsExist: [overlays/dev]` filter condition so only repositories with that deployment path are included.

## Review Notes
The Argo CD CLI was not installed locally, so the `argocd repo add` syntax was verified against the official Argo CD command reference instead of local `--help` output. The updated YAML snippets were parsed successfully with PyYAML.
