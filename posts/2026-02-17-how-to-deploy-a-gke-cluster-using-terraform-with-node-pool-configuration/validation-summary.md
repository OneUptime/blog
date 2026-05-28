# Validation Summary: How to Deploy a GKE Cluster Using Terraform with Node Pool Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Google Cloud
- Terraform Google provider
- Kubernetes node pools and autoscaling
- GKE Workload Identity Federation
- GKE private clusters
- Binary Authorization
- gcloud CLI
- kubectl

## Sources Consulted
- Google Cloud SDK documentation for `gcloud container clusters get-credentials`: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/get-credentials
- Google Cloud documentation for configuring GKE node service accounts: https://docs.cloud.google.com/kubernetes-engine/security/configure-node-service-accounts
- Google Cloud documentation for creating private GKE clusters: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/legacy/network-isolation
- Google Cloud documentation for GKE Dataplane V2 and NetworkPolicy behavior: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/dataplane-v2
- Google Cloud Binary Authorization documentation for GKE: https://docs.cloud.google.com/binary-authorization/docs/configure-policy-gke
- HashiCorp Terraform Google provider documentation for `google_container_cluster`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- HashiCorp Terraform Google provider documentation for `google_container_node_pool`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_node_pool
- HashiCorp Terraform Google provider documentation for `google_compute_subnetwork`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork

## Issues Found
- The API enablement command omitted `binaryauthorization.googleapis.com`, but the cluster configuration enables Binary Authorization enforcement. I added the Binary Authorization API to the `gcloud services enable` command so the prerequisite matches the Terraform configuration.
- The private-node subnet did not explicitly enable Private Google Access. GKE can enable it automatically for some private cluster creation paths, but making it explicit in Terraform is more reliable and matches the intent that private nodes reach Google APIs without public IPs. I added `private_ip_google_access = true` to the subnetwork resource.
- The node service account IAM example omitted Google's current minimum node service account role, `roles/container.defaultNodeServiceAccount`, and the autoscaling metrics writer role shown in current GKE node service account guidance. I added both roles to the Terraform IAM role set.

## Review Notes
- The Terraform resource names, block names, and key settings used in the cluster and node pool snippets are current for the HashiCorp Google provider.
- The `gcloud container clusters get-credentials` command uses valid `--region` and `--project` flags for the regional cluster shown in the post.
- The post intentionally uses Calico NetworkPolicy on a Standard cluster. That is valid when not using GKE Dataplane V2; Dataplane V2 has built-in NetworkPolicy enforcement and should not also set explicit NetworkPolicy enforcement.
