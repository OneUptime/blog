# Validation Summary: How to Pull Helm Charts from OCI Container Registries in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Helm
- OCI container registries
- Kubernetes Applications and Secrets
- GitHub Container Registry, Docker Hub, AWS ECR, Google Artifact Registry, Azure Container Registry

## Sources Consulted
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/helm/
- Argo CD Helm user guide for release 2.8: https://argo-cd.readthedocs.io/en/release-2.8/user-guide/helm/
- Argo CD private repositories guide: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD OCI user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/oci/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_create/
- Helm OCI registry documentation: https://helm.sh/docs/v3/topics/registries/

## Issues Found
- The prerequisites said ArgoCD v2.4 or later was enough for all examples, but the post uses `source.helm.valuesObject`, which is documented in the Argo CD 2.8 Helm guide and not in the 2.4 Helm guide. Updated the prerequisite and version check to require ArgoCD v2.8 or later for the examples, while preserving the note that OCI Helm registry support was added in v2.4.
- The version check used `argocd version --client`, which checks only the CLI version. Updated it to `argocd version` and clarified that the server version is what must support the examples.
- The Helm options example said "Skip CRD installation" but used `skipCrds: false`. Changed it to `skipCrds: true`, matching Argo CD's documented `source.helm.skipCrds` behavior.
- The post implied Helm `--atomic` is available via Argo CD sync options. Argo CD uses Helm only to render manifests with `helm template`, so Helm install/upgrade flags like `--atomic` do not apply. Replaced the note with that clarification.

## Review Notes
The remaining OCI registry syntax, `argocd repo add --type helm --enable-oci` examples, repository Secret fields, Helm `push`/`show` usage, Application `repoURL` without `oci://` for Helm OCI sources, and CLI app creation flags match the consulted official documentation. The local environment did not have the `argocd` or `helm` CLI installed, so command behavior was verified against official command references rather than local `--help` output.
