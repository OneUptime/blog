# Validation Summary: How to Add Nexus as Helm Repository in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Helm
- Sonatype Nexus Repository
- Nginx reverse proxy configuration
- TLS certificates

## Sources Consulted
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD private repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Sonatype Nexus Repository Helm repositories documentation: https://help.sonatype.com/en/helm-repositories.html
- Sonatype Nexus Repository create a Helm repository documentation: https://help.sonatype.com/en/create-a-helm-repository.html
- Sonatype Nexus Repository Helm CLI usage documentation: https://help.sonatype.com/en/helm-cli-usage.html
- Sonatype Nexus Repository feature matrix: https://help.sonatype.com/en/nexus-repository-feature-matrix.html

## Issues Found
- The post said Helm group repositories were "Nexus Pro only." Sonatype's current Helm repository documentation states Helm group repositories are available from Nexus Repository 3.92. Changed the wording to "Nexus Repository 3.92+."
- The post used older "OSS edition" terminology and described Nexus Repository Manager as open-source. Sonatype's current documentation uses Community Edition and Professional Edition terminology. Updated the affected wording while preserving the original meaning that free Nexus Repository editions support Helm repositories.
- The summary repeated the incorrect implication that group repositories were tied to Nexus Pro. Updated it to reference Nexus Repository 3.92+ instead.

## Review Notes
The Argo CD CLI examples, repository Secret format, repo credential template, TLS ConfigMap approach, Helm Application manifest structure, `argocd app get --refresh`, and Nexus chart upload command all match current official documentation. The local `argocd` and `helm` binaries were not installed, so CLI validation was performed against official command references rather than local `--help` output.
