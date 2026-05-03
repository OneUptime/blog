# Validation Summary: How to Create OCI Container Engine for Kubernetes with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform)
- Oracle Cloud Infrastructure (OCI)
- OCI Container Engine for Kubernetes (OKE)
- Kubernetes
- OCI Terraform provider (`oracle/oci`)
- kubectl

## Sources Consulted
- OCI Terraform provider docs — `oci_containerengine_cluster`: https://registry.terraform.io/providers/oracle/oci/latest/docs/resources/containerengine_cluster
- OCI Terraform provider docs — `oci_containerengine_node_pool`: https://registry.terraform.io/providers/oracle/oci/latest/docs/resources/containerengine_node_pool
- OCI Terraform provider docs — `oci_containerengine_addon`: https://registry.terraform.io/providers/oracle/oci/latest/docs/resources/containerengine_addon
- OCI Terraform provider docs — `oci_containerengine_cluster_kube_config` data source: https://registry.terraform.io/providers/oracle/oci/latest/docs/data-sources/containerengine_cluster_kube_config
- Oracle Cloud docs — Working with Cluster Autoscaler as a Cluster Add-on: https://docs.oracle.com/en-us/iaas/Content/ContEng/Tasks/contengusingclusterautoscaler_topic-Working_with_Cluster_Autoscaler_as_Cluster_Add-on.htm
- terraform-provider-oci source documentation in `website/docs/`

## Issues Found
- **Auto-scaling section was technically wrong.** The original "Using Managed Node Pools with Auto-Scaling" example claimed that setting `is_pv_encryption_in_transit_enabled = true` inside `node_config_details` enables the OCI Cluster Autoscaler. That is incorrect — `is_pv_encryption_in_transit_enabled` controls in-transit encryption for paravirtualized block/boot volume attachments and has nothing to do with autoscaling. The proper way to enable the Cluster Autoscaler on OKE via OpenTofu is the `oci_containerengine_addon` resource with `addon_name = "ClusterAutoscaler"` and a `configurations` block carrying the `nodes` key (`min:max:node_pool_ocid`). The section was rewritten to use the correct add-on resource.

## Review Notes
- The `kubernetes_version` value `v1.32.1` is syntactically valid (OKE uses the `vX.Y.Z` format) and plausible for the post's 2026 timeframe, but readers should always verify the currently supported versions via `oci ce cluster-options get --cluster-option-id all` before pinning, since OKE's supported-versions list rotates.
- The post references `data.oci_core_images.oracle_linux` for the worker node image but does not show its definition. This is a minor omission that's typical for focused tutorial snippets; the reader is expected to define the data source themselves.
- The kubeconfig data source defaults to `token_version` `1.0.0` historically; readers running newer kubectl/OCI CLI combinations may want to explicitly set `token_version = "2.0.0"`. The post's example works as-is for typical setups.
- Public-endpoint OKE clusters are convenient for tutorials but production deployments should generally use private endpoints with bastion or NSG-restricted access.
