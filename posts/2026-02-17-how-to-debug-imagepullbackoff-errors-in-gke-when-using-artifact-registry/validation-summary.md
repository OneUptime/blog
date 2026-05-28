# Validation Summary: How to Debug ImagePullBackOff Errors in GKE When Using Artifact Registry

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine
- Google Artifact Registry
- Kubernetes image pulls and ImagePullBackOff
- Google Cloud IAM
- Google Cloud CLI
- GKE private clusters
- VPC Service Controls

## Sources Consulted
- Google Cloud Artifact Registry: Deploying to Google Kubernetes Engine: https://docs.cloud.google.com/artifact-registry/docs/integrate-gke
- Google Cloud Artifact Registry: Access control with IAM: https://docs.cloud.google.com/artifact-registry/docs/access-control
- Google Cloud Artifact Registry: Repository and image names: https://docs.cloud.google.com/artifact-registry/docs/docker/names
- Google Cloud Artifact Registry: Manage images: https://cloud.google.com/artifact-registry/docs/docker/manage-images
- Google Cloud SDK reference: gcloud artifacts docker images describe: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/describe
- Google Cloud SDK reference: gcloud artifacts docker tags list: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/tags/list
- Google Cloud SDK reference: gcloud container node-pools create: https://cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- Google Kubernetes Engine: Troubleshoot image pulls: https://cloud.google.com/kubernetes-engine/docs/troubleshooting/image-pulls
- Google Cloud Artifact Registry: Configure restricted access for GKE private clusters: https://docs.cloud.google.com/artifact-registry/docs/gke-private-clusters
- Google Cloud VPC: Private Google Access: https://cloud.google.com/vpc/docs/private-google-access

## Issues Found
- The post incorrectly implied that Workload Identity changes which Google service account authorizes the image pull. GKE image pulls use the node pool service account, while Workload Identity is for credentials used by code running inside the workload. I updated the IAM section to direct readers to grant Artifact Registry Reader to the node pool service account, including custom node service accounts.
- The node-level pull test used `docker pull`. Current GKE Linux nodes commonly use containerd, and Google recommends `crictl` for containerd node troubleshooting. I changed the checklist to use `crictl pull` with a metadata server access token for private Artifact Registry images.
- The private cluster section omitted the VPC Service Controls restricted VIP requirement for private GKE clusters using Artifact Registry inside a service perimeter. I added a short note to configure DNS so `pkg.dev` resolves to `restricted.googleapis.com` in that case.

## Review Notes
The remaining commands and examples are technically valid as generic examples. The IAM examples grant project-level Artifact Registry Reader access, which works, though repository-level IAM bindings are often preferable for least privilege.
