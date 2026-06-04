# Validation Summary: How to Upgrade GKE Clusters with Surge Upgrade and Maintenance Windows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes
- Google Cloud CLI (`gcloud`)
- Terraform Google provider
- Bash
- `kubectl`
- `jq`

## Sources Consulted
- Google Cloud: Configure node upgrade strategies: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/node-pool-upgrade-strategies
- Google Cloud: Node upgrade strategies: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/node-pool-upgrade-strategies
- Google Cloud: Configure maintenance windows and exclusions: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/maintenance-windows-and-exclusions
- Google Cloud: Manually upgrade a cluster's control plane or node pools: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/upgrading-a-cluster
- Google Cloud SDK reference: `gcloud container clusters update`: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Google Cloud SDK reference: `gcloud container clusters upgrade`: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/upgrade
- Google Cloud SDK reference: `gcloud container node-pools update`: https://docs.cloud.google.com/sdk/gcloud/reference/container/node-pools/update
- Google Cloud SDK reference: `gcloud container node-pools create`: https://docs.cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- Google Cloud SDK reference: `gcloud container operations cancel`: https://docs.cloud.google.com/sdk/gcloud/reference/container/operations/cancel
- Terraform Registry: `google_container_cluster`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- Terraform Registry: `google_container_node_pool`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_node_pool

## Issues Found
- The article claimed surge upgrades eliminate capacity dips. Updated the wording to account for Compute Engine quota and resource availability, which Google documents as possible upgrade blockers.
- The Terraform node pool example was marked as YAML even though it is HCL. Changed the code fence to `hcl`.
- The recurring maintenance window command used `--maintenance-window-duration`, but current `gcloud container clusters update` uses `--maintenance-window-start`, `--maintenance-window-end`, and `--maintenance-window-recurrence` for recurring windows. Replaced the duration flag with an explicit end timestamp.
- The maintenance exclusion command omitted the required exclusion scope. Added `--add-maintenance-exclusion-scope="no_upgrades"`.
- The Terraform cluster example used two `maintenance_policy` blocks in one `google_container_cluster` resource, which is invalid. Kept a single recurring maintenance policy block.
- The Terraform maintenance exclusion lacked an explicit scope. Added `exclusion_options { scope = "NO_UPGRADES" }`.
- The sample GKE version `1.29.1-gke.1234` is outdated for a 2026 post and likely unavailable. Updated examples to a current documented version example, `1.34.1-gke.1293000`.
- The blue-green migration verification inferred node pool membership by checking whether the node name contained the pool name. Replaced it with a check against actual nodes selected by the GKE `cloud.google.com/gke-nodepool` label.
- The troubleshooting script filtered operations with non-current field names and omitted location. Updated it to use `TYPE=UPGRADE_NODES`, `TARGET`, and `--zone`.
- The troubleshooting script checked for a non-documented node label, `cloud.google.com/gke-node-pool-upgrading`. Replaced it with a node version and readiness check for the target node pool.
- The cancellation example used a nonexistent `gcloud container clusters upgrade --cancel` flag. Replaced it with `gcloud container operations cancel OPERATION_ID`.
- The autoscaler validation created a deployment without resource requests, which might not trigger cluster autoscaler. Added a stress command and CPU/memory requests.

## Review Notes
- Exact GKE patch versions vary by region, release channel, and date. The examples now use a current documented version, but production scripts should still select a valid version from `gcloud container get-server-config` for the target cluster location.
- Maintenance windows and recurrence day calculations are UTC-based in the Google Cloud CLI examples; the post's UTC examples are appropriate.
