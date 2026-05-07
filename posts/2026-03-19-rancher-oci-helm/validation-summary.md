# Validation Summary: How to Create OCI-Based Helm Chart Repositories for Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- OCI registries
- GitHub Container Registry (GHCR)
- Docker Hub
- Amazon ECR
- Azure Container Registry (ACR)
- Harbor
- GitLab CI/CD
- GitHub Actions

## Sources Consulted
- Helm OCI registries documentation: https://helm.sh/docs/v3/topics/registries/
- Helm `helm push` command reference: https://helm.sh/docs/v3/helm/helm_push/
- Rancher OCI repository documentation: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/helm-charts-in-rancher/oci-repositories
- Rancher v2.9 OCI repository documentation: https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/helm-charts-in-rancher/oci-repositories
- Rancher `ClusterRepo` API type in the official repository: https://raw.githubusercontent.com/rancher/rancher/main/pkg/apis/catalog.cattle.io/v1/types.go
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- GitHub Container registry documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub Packages REST API documentation: https://docs.github.com/en/rest/packages/packages
- Docker Hub OCI artifacts documentation: https://docs.docker.com/docker-hub/repos/manage/hub-images/oci-artifacts/
- Docker Hub API deprecation documentation: https://docs.docker.com/reference/api/hub/deprecated/
- Amazon ECR Helm OCI documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/push-oci-artifact.html
- Azure Container Registry Helm OCI documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-helm-repos
- Harbor OCI Helm chart documentation: https://goharbor.io/docs/main/working-with-projects/working-with-oci/working-with-helm-oci-charts/
- GitLab container registry documentation: https://docs.gitlab.com/user/packages/container_registry/
- GitLab predefined CI/CD variables documentation: https://docs.gitlab.com/ci/variables/predefined_variables/

## Issues Found
- The post claimed Rancher OCI repository support was available in `v2.7+`. Rancher’s official OCI repository documentation states the feature was introduced in Rancher `v2.9.0`, so the prerequisite and Step 6 wording were corrected to `v2.9+`.
- The explanation that OCI registries handle chart “discovery” was too broad. Helm’s OCI docs and Azure’s ACR docs make clear OCI charts are not discovered through classic Helm repository mechanisms like `helm search` and `helm repo list`, so the wording was corrected to describe storage and version tags without `index.yaml`.
- The general GHCR login example used `$GITHUB_TOKEN`, which is misleading outside GitHub Actions. GitHub’s container registry docs require a personal access token (classic) for direct CLI authentication, so the example was changed to use `$CR_PAT`.
- The Rancher YAML example used a nonexistent `spec.credentials` field. Rancher’s official `ClusterRepo` type defines `spec.clientSecret` for secret references, so the YAML was corrected to use `clientSecret`.
- The Rancher OCI URL example used a broad org-level GHCR path. Rancher’s docs warn that an OCI endpoint must not include non-Helm OCI artifacts, so the example was narrowed to a chart-specific path and clarified to recommend a dedicated Helm-only namespace when appropriate.
- The statement that Rancher UI might not fully support OCI browsing was outdated. Current Rancher docs document browsing OCI-based repositories in the UI, so the section was rewritten to present Helm CLI installation as an additional option rather than a fallback for missing UI support.
- The GitLab CI example pushed charts to `oci://$CI_REGISTRY/$CI_PROJECT_NAMESPACE`, which omits the project path. GitLab’s docs define `$CI_REGISTRY_IMAGE` as the project-scoped base registry address, so the example was corrected to use `oci://$CI_REGISTRY_IMAGE`.
- The GHCR version-listing example used the registry API directly with a token pattern that is not the documented GitHub Packages workflow. It was replaced with the official GitHub Packages REST API endpoint for container package versions.
- The Docker Hub tag-listing example used an older undocumented-style endpoint. Docker’s API deprecation documentation points to the current `/v2/namespaces/{namespace}/repositories/{repository}/tags` endpoint, so the example was updated.
- The push section implied all registry examples would work without prior registry-side setup. AWS and Harbor documentation require the destination repository or project to exist first in common setups, so a clarifying sentence was added.

## Review Notes
- Rancher’s v2.9 documentation labels OCI repository support as experimental in that release; the latest Rancher docs retain the feature and still document it under `ClusterRepo`.
- Helm OCI usage is correct in the post after the fixes: `helm push` omits chart name and tag in the destination, while pull/install/show commands include the chart name and use `--version`.
- The GitHub Actions example remains technically valid, but it assumes the package is published from or connected to the workflow repository so that `GITHUB_TOKEN` has package write access.
