# Validation Summary: Fix GKE Private Cluster Nodes Unable to Pull Images from Container Registry

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine private clusters
- Kubernetes image pulls
- Private Google Access
- Cloud DNS
- Cloud NAT
- Google Artifact Registry
- Container Registry / `gcr.io`
- Google Cloud IAM
- Google Cloud CLI

## Sources Consulted
- Google Cloud VPC documentation: Configure Private Google Access - https://cloud.google.com/vpc/docs/configure-private-google-access
- Google Cloud VPC documentation: Private Google Access - https://cloud.google.com/vpc/docs/private-google-access
- Google Cloud Artifact Registry documentation: Configure restricted access for GKE private clusters - https://docs.cloud.google.com/artifact-registry/docs/gke-private-clusters
- Google Cloud Artifact Registry documentation: Deploying to Google Kubernetes Engine - https://docs.cloud.google.com/artifact-registry/docs/integrate-gke
- Google Cloud Artifact Registry documentation: Access control with IAM - https://docs.cloud.google.com/artifact-registry/docs/access-control
- Google Cloud Artifact Registry documentation: Prepare for Container Registry shutdown - https://docs.cloud.google.com/artifact-registry/docs/transition/prepare-gcr-shutdown
- Google Cloud NAT documentation: Cloud NAT overview - https://docs.cloud.google.com/nat/docs/overview
- Google Cloud SDK reference: gcloud compute firewall-rules create - https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- Google Cloud Storage documentation: IAM roles for Cloud Storage - https://cloud.google.com/storage/docs/access-control/iam-roles

## Issues Found
- The DNS example for `googleapis.com` mixed the `restricted.googleapis.com` and `private.googleapis.com` configurations. Google Cloud documents `199.36.153.8/30` for `private.googleapis.com` and `199.36.153.4/30` for `restricted.googleapis.com`. I updated the text to identify the example as the private VIP configuration and added the restricted VIP caveat.
- The `googleapis.com` DNS records pointed the zone apex at the private VIP and pointed `*.googleapis.com` back to `googleapis.com`. Google Cloud documents creating an A record for `private.googleapis.com` or `restricted.googleapis.com`, then creating a wildcard CNAME to that chosen domain. I updated the commands accordingly.
- The firewall section only mentioned the private VIP range while the DNS section discussed both private and restricted VIPs. I clarified which range applies to each option.
- The Container Registry migration section described migration as optional. Container Registry is deprecated and its shutdown began in 2025, while Artifact Registry-hosted `gcr.io` URLs continue to work. I updated the wording to recommend migration or Artifact Registry `gcr.io` repositories.

## Review Notes
The remaining commands and examples are consistent with current Google Cloud documentation. For private clusters that pull only from Google-hosted registries, Private Google Access plus correct DNS, routes, firewall rules, and IAM is appropriate. Cloud NAT remains appropriate when nodes must pull from third-party public registries.
