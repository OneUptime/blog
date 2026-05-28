# Validation Summary: How to Migrate Azure Container Registry to Google Artifact Registry

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure Container Registry
- Google Artifact Registry
- Artifact Analysis vulnerability scanning
- Docker
- Helm OCI charts
- Kubernetes manifests
- Cloud Build
- crane
- skopeo
- Google Cloud CLI
- Azure CLI

## Sources Consulted
- Azure Container Registry content formats: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-image-formats
- Azure Container Registry Helm chart support and Helm 2 retirement: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-helm-repos
- Azure Container Registry authentication and `az acr login --expose-token`: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication
- Azure Container Registry Docker Content Trust deprecation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-content-trust-deprecation
- Azure CLI `az acr repository` reference: https://learn.microsoft.com/en-us/cli/azure/acr/repository
- Artifact Registry supported formats: https://cloud.google.com/artifact-registry/docs/supported-formats
- Artifact Registry Docker authentication: https://cloud.google.com/artifact-registry/docs/docker/authentication
- Artifact Registry Helm chart support: https://cloud.google.com/artifact-registry/docs/helm
- Google Cloud CLI `gcloud artifacts repositories create`: https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Google Cloud CLI `gcloud artifacts docker images describe`: https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/describe
- Google Cloud CLI `gcloud artifacts vulnerabilities list`: https://cloud.google.com/sdk/gcloud/reference/artifacts/vulnerabilities/list
- Artifact Analysis automatic scanning: https://cloud.google.com/artifact-analysis/docs/enable-automatic-scanning
- Artifact Registry cleanup policies: https://cloud.google.com/artifact-registry/docs/repositories/cleanup-policy
- Binary Authorization attestations: https://cloud.google.com/binary-authorization/docs/attestations
- crane command reference: https://github.com/google/go-containerregistry/tree/main/cmd/crane/doc
- skopeo project documentation: https://github.com/containers/skopeo

## Issues Found
- The service comparison used the old "Container Analysis" product name. Updated it to "Artifact Analysis", which is the current Google Cloud product name for vulnerability scanning metadata and scanning features.
- The service comparison presented ACR Content Trust and Binary Authorization as direct image-signing equivalents. Updated the row to note that Docker Content Trust is retiring on March 31, 2028, Notary Project is the replacement path for ACR signing, and Binary Authorization uses attestations for deployment policy.
- The crane authentication example used `az acr credential show`, which depends on registry admin credentials. Replaced it with `az acr login --expose-token` and the documented token username so it works with Microsoft Entra authentication.
- The crane single-copy example said it copied "all tags" even though the command copies one tag. Corrected the comment.
- The vulnerability scanning section said scanning is automatically enabled for Artifact Registry. Updated it to enable the Container Scanning API before checking scan results.
- The cleanup policy example used uppercase `tagState` values and combined `condition` with `mostRecentVersions` in one keep policy. Updated `tagState` to documented lowercase values, removed the invalid condition from the most-recent keep policy, and renamed the policy so it no longer implies it only keeps tagged images.

## Review Notes
The migration commands are example-oriented and still assume the reader has the needed IAM/RBAC permissions, enabled Google Cloud APIs, and configured project/location defaults. The macOS-specific `sed -i ''` example is technically valid on macOS/BSD sed but would need adjustment on GNU sed.
