# Validation Summary: How to Debug OCI Pull Errors in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Helm OCI registries
- Kubernetes
- OCI/Docker Registry HTTP API
- AWS ECR
- Azure Container Registry
- GitHub Container Registry
- Harbor

## Sources Consulted
- Argo CD OCI user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/oci/
- Argo CD private repositories guide: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/helm/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/release-3.1/user-guide/commands/argocd_repo_add/
- Argo CD `argocd-cmd-params-cm` example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Helm OCI registry documentation: https://helm.sh/docs/v3/topics/registries/
- Helm `show chart` command reference: https://helm.sh/docs/helm/helm_show_chart/
- Docker Registry authentication documentation: https://docs.docker.com/reference/api/registry/auth/
- Amazon ECR private registry authentication documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html

## Issues Found
- Corrected the Helm OCI repository examples to use `myregistry.example.com/charts` as the Argo CD Helm repository URL and `my-chart` as the chart name. Official Argo CD Helm examples put the registry namespace/path in `repoURL` and the chart basename in `chart`.
- Clarified that Helm OCI repository URLs must omit the `oci://` prefix but may include the registry namespace/path used by the Application.
- Updated the manual curl authentication example to first inspect the registry `WWW-Authenticate` challenge. Docker Registry token realm, service, and scope values are registry-specific.
- Changed the `helm show chart` description from listing available tags to verifying a specific chart version.
- Replaced `helm search repo my-chart --versions` for OCI troubleshooting because `helm search repo` searches indexed chart repositories, not OCI registry tags.
- Clarified Helm OCI version wording so `targetRevision` resolves to the Helm chart's SemVer-based OCI tag and does not imply that `v1.0.0` is interchangeable with `1.0.0`.
- Replaced the ACR managed identity note about `--attach-acr` with Argo CD's Azure Workload Identity requirements for repo-server and ACR token access.

## Review Notes
Local `argocd` and `helm` binaries were not installed in the review environment, so CLI behavior was verified against official command references instead of local `--help` output.
