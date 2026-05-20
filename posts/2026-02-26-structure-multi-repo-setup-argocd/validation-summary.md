# Validation Summary: How to Structure Multi-Repo Setup for ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications
- Argo CD ApplicationSets
- Argo CD AppProjects
- Kubernetes Secrets
- GitHub repository credentials
- Kustomize repository layouts
- Helm values files
- yq

## Sources Consulted
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD declarative setup and repository credentials: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD private repositories documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/
- Argo CD ApplicationSet SCM Provider generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-SCM-Provider/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD sync phases and waves: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD AppProject documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- yq documentation: https://mikefarah.gitbook.io/yq

## Issues Found
- The root Application example said it bootstrapped everything, but its `path` only points at `apps/production`. Changed the wording to say it bootstraps the production applications.
- The production Application example used `release/v2.3.1`, while the later version pinning guidance says production should pin to tag `v2.3.1`. Updated the example to `v2.3.1`.
- The HTTPS repository credential example described the password field as accepting a GitHub PAT or deploy key. GitHub deploy keys are SSH keys, not HTTPS passwords. Updated the comment to say GitHub PAT.
- The ApplicationSet example used legacy fasttemplate syntax and hard-coded `targetRevision: main`. Updated it to the current documented Go template style with `goTemplate: true`, `goTemplateOptions: ["missingkey=error"]`, `{{.repository}}`, `{{.url}}`, and `{{.branch}}`.

## Review Notes
The sync-wave example is technically valid for ordering resources during an Argo CD sync, including child `Application` resources in an app-of-apps pattern. For cross-service runtime dependencies, sync waves should still be paired with health checks and CI-level compatibility checks, as the post already notes.
