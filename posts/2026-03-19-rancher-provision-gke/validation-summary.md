# Validation Summary: How to Provision a GKE Cluster from Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher Manager
- Google Kubernetes Engine (GKE)
- Google Cloud IAM service accounts and roles
- Google Cloud CLI (`gcloud`)
- Kubernetes (`kubectl`)

## Sources Consulted
- Rancher: Creating a GKE Cluster — https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/set-up-clusters-from-hosted-kubernetes-providers/gke
- Rancher: Setting up Clusters from Hosted Kubernetes Providers — https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/set-up-clusters-from-hosted-kubernetes-providers
- Rancher: GKE Cluster Configuration Reference — https://ranchermanager.docs.rancher.com/v2.14/reference-guides/cluster-configuration/rancher-server-configuration/gke-cluster-configuration
- Rancher: Private Clusters (GKE) — https://ranchermanager.docs.rancher.com/v2.10/reference-guides/cluster-configuration/rancher-server-configuration/gke-cluster-configuration/gke-private-clusters
- Google Cloud SDK: `gcloud iam service-accounts create` — https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/create
- Google Cloud SDK: `gcloud iam service-accounts keys create` — https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/create
- Google Cloud SDK: `gcloud projects add-iam-policy-binding` — https://cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Google Cloud: Use release channels in GKE — https://cloud.google.com/kubernetes-engine/docs/how-to/release-channels
- Google Cloud: Create a VPC-native cluster / Alias IPs — https://cloud.google.com/kubernetes-engine/docs/how-to/alias-ips
- Google Cloud: Authenticate to Google Cloud APIs from GKE workloads — https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity

## Issues Found
1. **The service account IAM roles were incorrect.** The post granted `roles/compute.admin` and `roles/iam.serviceAccountAdmin`, but Rancher’s GKE setup docs require `roles/compute.viewer`, `roles/viewer`, `roles/container.admin`, and `roles/iam.serviceAccountUser`. Updated the role bindings to match Rancher’s documented requirements.

2. **The post omitted Rancher’s Standard-mode-only limitation for GKE.** Current Rancher documentation states that Rancher can provision GKE Standard clusters, not Autopilot clusters, because Rancher needs to create resources in `kube-system`. Added that requirement near the cluster creation step.

3. **The GKE project field was described inaccurately.** Rancher’s docs specify entering the Google project ID, not selecting a project from a list. Updated the basic settings text to use **Project ID**.

4. **The release channel list was outdated.** The post listed only Rapid, Regular, and Stable. Current GKE docs also include the Extended channel for Standard clusters. Updated the release channel description accordingly.

5. **The private-cluster guidance was incomplete in a way that could cause failed provisioning.** Rancher documents that private GKE nodes need additional networking, such as Cloud NAT, or equivalent image/network access. Added a short note in the private cluster section and updated troubleshooting guidance.

6. **The Workload Identity example was incomplete.** It attempted to bind a Kubernetes service account to an IAM service account that had never been created, and the `kubectl annotate` example did not explicitly target the namespace. Added IAM service account creation and made the namespace explicit in the annotation command.

7. **The verification commands assumed `kubectl` was already configured.** Clarified that the reader must configure `kubectl` for the cluster before running the validation commands.

8. **The node-pool security section implied a Rancher GKE UI toggle for Workload Identity.** Rancher’s current GKE configuration reference documents Shielded Nodes and access-scope-related settings, but not a Workload Identity toggle in that section. Removed the misleading bullet and kept the correct post-provisioning setup section.

9. **The monitoring installation path was too specific and outdated.** Current Rancher documentation describes enabling monitoring from **Cluster Tools**. Updated the monitoring step to use the current documented UI path.

## Review Notes
- The post still references Rancher `v2.7 or later`. Rancher `v2.7` documentation is archived, so UI labels and exact options can differ slightly on older releases even though the overall workflow remains valid.
- Google’s current best practice for Workload Identity Federation for GKE is direct IAM principal bindings where supported. The linked Kubernetes-service-account-to-IAM-service-account flow kept in the post is still officially documented and valid for supported use cases.
