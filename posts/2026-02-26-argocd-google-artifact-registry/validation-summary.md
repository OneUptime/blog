# Validation Summary: How to Use ArgoCD with Google Artifact Registry

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Argo CD
- Argo CD Image Updater
- Kubernetes and GKE
- GKE Workload Identity Federation
- Google Artifact Registry
- Helm OCI charts
- Google Cloud CLI
- Artifact Analysis vulnerability scanning

## Sources Consulted
- Google Artifact Registry Helm authentication documentation: https://cloud.google.com/artifact-registry/docs/helm/authentication
- Google Artifact Registry Docker authentication documentation: https://cloud.google.com/artifact-registry/docs/docker/authentication
- Google Artifact Registry GKE integration documentation: https://cloud.google.com/artifact-registry/docs/integrate-gke
- GKE Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Argo CD private repository and Helm OCI documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD declarative repository credential documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Image Updater registry configuration documentation: https://argocd-image-updater.readthedocs.io/en/stable/configuration/registries/
- Argo Helm argocd-image-updater chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argocd-image-updater/values.yaml
- Google Cloud SDK `gcloud artifacts vulnerabilities list` reference: https://cloud.google.com/sdk/gcloud/reference/artifacts/vulnerabilities/list
- Google Artifact Registry cleanup policy documentation: https://cloud.google.com/artifact-registry/docs/repositories/cleanup-policy
- Google Artifact Analysis automatic scanning documentation: https://cloud.google.com/artifact-analysis/docs/enable-automatic-scanning

## Issues Found
- Fixed the GKE image-pull IAM example. The original command granted `roles/artifactregistry.reader` to a Kubernetes service account principal, but GKE image pulls use the node pool IAM service account.
- Clarified that Workload Identity gives the Argo CD repo-server pod a Google identity, but Helm still needs registry credentials or a configured credential helper for private OCI registry access.
- Replaced the invalid `argocd-cm` credential-template example with a current Argo CD `repo-creds` Secret.
- Added the missing Image Updater IAM service account binding and repository reader grant for the service account used by the Image Updater pod.
- Updated the Image Updater Helm chart version and moved the GAR auth script into the chart-supported `authScripts` values so the `ext:/scripts/gar-login.sh` credential source is actually mounted and executable.
- Corrected multi-project access guidance so image pulls grant access to the GKE node service account, with a separate grant for Image Updater or repo-server when those components read the repository.
- Corrected the vulnerability scanning hook to use `gcloud artifacts vulnerabilities list`; the previous `gcloud artifacts docker images list --show-occurrences` example did not expose `vulnerabilities.critical_count` as shown.
- Clarified that automatic vulnerability scanning depends on the Container Scanning API being enabled.
- Fixed cleanup policy JSON. A keep policy cannot combine `condition` and `mostRecentVersions`; the example now uses only `mostRecentVersions`.
- Adjusted the Helm registry login command to match Google Artifact Registry documentation by including the `https://` registry URL.

## Review Notes
The explicit Argo CD Helm credential template uses a short-lived access token as an example. In production, refresh this credential automatically or configure a repo-server credential helper so token expiry does not break chart pulls.
