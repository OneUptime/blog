# Validation Summary: How to Use Google Artifact Registry with ArgoCD OCI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Google Artifact Registry
- Helm OCI registries
- Google Kubernetes Engine Workload Identity Federation
- Kubernetes ServiceAccounts, RBAC, Secrets, and CronJobs
- Google Cloud CLI
- Cloud Build

## Sources Consulted
- Argo CD OCI user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/oci/
- Argo CD private repository documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD declarative repository Secret documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Google Artifact Registry Helm overview: https://cloud.google.com/artifact-registry/docs/helm
- Google Artifact Registry Helm authentication: https://cloud.google.com/artifact-registry/docs/helm/authentication
- Google Artifact Registry Helm chart management: https://cloud.google.com/artifact-registry/docs/helm/manage-charts
- Google Artifact Registry Docker repository and image names: https://cloud.google.com/artifact-registry/docs/docker/names
- Google Artifact Registry image listing documentation: https://cloud.google.com/artifact-registry/docs/docker/manage-images
- GKE Workload Identity Federation for workloads: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud CLI Docker image documentation: https://cloud.google.com/sdk/docs/downloads-docker
- Cloud Build configuration schema: https://cloud.google.com/build/docs/build-config-file-schema
- Helm OCI registry documentation: https://helm.sh/docs/v3/topics/registries
- Helm installation documentation: https://helm.sh/docs/v3/intro/install

## Issues Found
- The Workload Identity setup enabled Workload Identity Federation only at the cluster level. For existing Standard GKE node pools, Google documents that the GKE metadata server must also be enabled on the node pool. Added the `gcloud container node-pools update ... --workload-metadata=GKE_METADATA` command.
- The token refresher CronJob used `kubectl apply` to write an Argo CD repository Secret, but no Kubernetes RBAC was granted for that write. Added a Role and RoleBinding for the `argocd-repo-server` ServiceAccount to manage Secrets in the `argocd` namespace.
- The token refresher used `google/cloud-sdk:slim`, which is not documented as including `kubectl`. Switched it to `gcr.io/google.com/cloudsdktool/google-cloud-cli:latest`, whose documented component list includes `kubectl`.
- The Cloud Build example invoked `helm` from a `gcr.io/cloud-builders/gcloud` step and then used an `alpine/helm` step with Bash assumptions. Replaced it with a single Cloud Build script step using the Google Cloud CLI image, installing Helm via the official Helm installer script before authenticating and pushing the chart.

## Review Notes
The remaining examples match the current documented Argo CD Helm OCI repository shape, Artifact Registry Docker-format repository naming, Helm `push` and `pull` syntax, and Artifact Registry access-token and JSON-key authentication patterns. Service account keys remain technically valid but are the least secure option; the post already frames Workload Identity as the recommended GKE approach.
