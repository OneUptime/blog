# Validation Summary: How to Deploy GKE Autopilot with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- Google Cloud Platform (GCP)
- Google Kubernetes Engine (GKE) Autopilot
- Google Cloud CLI (`gcloud`)
- Kubernetes
- Workload Identity Federation for GKE
- Google Cloud IAM
- Virtual Private Cloud (VPC)
- Cloud NAT
- Terraform Google provider

## Sources Consulted
- Google Kubernetes Engine: GKE Autopilot overview  
  https://cloud.google.com/kubernetes-engine/docs/concepts/autopilot-overview
- Google Kubernetes Engine: Create an Autopilot cluster  
  https://cloud.google.com/kubernetes-engine/docs/how-to/creating-an-autopilot-cluster
- Google Kubernetes Engine: Resource requests in Autopilot  
  https://cloud.google.com/kubernetes-engine/docs/concepts/autopilot-resource-requests
- Google Kubernetes Engine: Authenticate to Google Cloud APIs from GKE workloads  
  https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Kubernetes Engine: About network isolation in GKE  
  https://cloud.google.com/kubernetes-engine/docs/concepts/network-isolation
- Google Kubernetes Engine: Creating a private cluster  
  https://docs.cloud.google.com/kubernetes-engine/docs/how-to/legacy/network-isolation
- Google Cloud SDK: `gcloud container clusters get-credentials`  
  https://cloud.google.com/sdk/gcloud/reference/container/clusters/get-credentials
- Google Cloud: Cloud NAT overview  
  https://cloud.google.com/nat/docs/overview
- Terraform Registry: `google_container_cluster`  
  https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- Terraform Registry: `google_service_account_iam`  
  https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_service_account_iam

## Issues Found
- The post description and intro overstated what the article covered and how Autopilot billing works. I updated the wording to match current GKE documentation: Autopilot manages nodes and infrastructure, and in most situations billing is based on workload resource requests rather than a generic "what pods use" claim.
- The provider snippet pinned `hashicorp/google` to `~> 5.0`, which is stale for a 2026 article. I updated it to `~> 7.0` and added `deletion_protection = false` to reflect current provider behavior around cluster deletion.
- The private-cluster example allowed control plane access from `0.0.0.0/0`, which defeats the point of authorized networks and is not a safe production example. I changed this to a documentation CIDR placeholder and marked it as something readers must replace with their admin IP range.
- The Workload Identity section was incomplete. Autopilot already enables Workload Identity Federation for GKE, but the post never created or annotated the Kubernetes ServiceAccount referenced by the IAM binding, and the sample Deployment didn't use that service account. I added the Kubernetes ServiceAccount manifest, the required annotation, a note to apply it first, and updated the sample workload to use `serviceAccountName: app-sa` in the `production` namespace.
- The cluster access command used `--region`, while current Google Cloud CLI documentation prefers `--location`. I updated the command accordingly and clarified that empty Autopilot clusters can have zero usable nodes until a workload is scheduled.
- The best-practices section said that Autopilot requires explicit resource requests for scheduling. Current GKE documentation says Autopilot applies default requests when they are omitted. I corrected the explanation so it recommends explicit requests for predictable scheduling and cost instead of claiming they are always required.
- The output example used the older `master_auth.0.cluster_ca_certificate` attribute indexing style. I updated it to `master_auth[0].cluster_ca_certificate`, which is the current HCL syntax.
- The prerequisites were missing required platform setup that affects whether the instructions actually work. I added the required APIs and local CLI prerequisites used by the rest of the post.

## Review Notes
- `google_service_account_iam_binding` is still valid here, but it is authoritative for the specified role. If this example later needs to coexist with separately managed principals for the same role, `google_service_account_iam_member` would be a safer pattern.
- The `logging_service` and `monitoring_service` values used in the post are still valid in the current Google provider.
- The sample authorized network uses the reserved documentation range `203.0.113.0/29`; readers must replace it with their real admin CIDR before using `kubectl` from outside the cluster network.
