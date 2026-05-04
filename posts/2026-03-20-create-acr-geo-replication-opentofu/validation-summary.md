# Validation Summary: How to Create ACR Geo-Replication with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- Azure Container Registry (ACR)
- HashiCorp azurerm provider (~> 3.0)
- Azure Kubernetes Service (AKS) - role assignment integration
- ACR webhooks

## Sources Consulted
- [hashicorp/azurerm - azurerm_container_registry resource docs](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_registry)
- [hashicorp/azurerm - azurerm_container_registry_webhook resource docs](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_registry_webhook)
- [terraform-provider-azurerm GitHub - container_registry.html.markdown](https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/container_registry.html.markdown)
- [Azure Container Registry geo-replication documentation](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-geo-replication)

## Issues Found
- **Non-existent resource `azurerm_container_registry_replication`**: The post used a standalone resource named `azurerm_container_registry_replication`, which does not exist in the hashicorp/azurerm provider. Geo-replication is configured exclusively through the nested `georeplications` block on the `azurerm_container_registry` resource. I rewrote the "ACR with Geo-Replication" section to embed three `georeplications` blocks (West Europe, Southeast Asia, Australia East) directly inside the registry resource, preserving the original tagging and zone-redundancy choices.
- **`for_each` on a non-existent resource**: The "Multiple Replicas with for_each" section used `for_each` on the same fictitious resource. I replaced it with a `dynamic "georeplications"` block iterating the same `local.replica_regions` map - the idiomatic way to generate multiple replica blocks within a single registry resource. Heading retitled to "Multiple Replicas with dynamic Blocks" and referenced in the conclusion.
- **Conclusion wording**: Adjusted the conclusion's reference to `for_each` to refer to the `dynamic georeplications` block, matching the corrected examples.

## Review Notes
- The `azurerm_container_registry_webhook` example is correct: `registry_name`, `location`, `service_uri`, `status` ("enabled"), `scope`, `actions = ["push"]`, and `custom_headers` are all valid attributes per the provider docs.
- The AKS role assignment example uses `azurerm_kubernetes_cluster.<name>.kubelet_identity[0].object_id` and the built-in role `AcrPull`, both correct.
- The `georeplications` block also supports `regional_endpoint_enabled` (optional, defaults to false) - not required to mention but worth noting for readers needing per-region endpoint hostnames.
- Provider version pin `~> 3.0` is fine for the resources used; the `georeplications` block has been stable since 3.x. azurerm 4.x is now available and the block remains compatible.
- The Premium SKU is correctly required for geo-replication.
