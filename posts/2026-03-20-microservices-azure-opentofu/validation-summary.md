# Validation Summary: How to Build a Microservices Architecture with OpenTofu on Azure

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- Azure Kubernetes Service (AKS)
- Microsoft Entra Workload ID and AKS OIDC issuer
- Azure API Management
- Azure Service Bus
- User-assigned managed identities and Azure RBAC

## Sources Consulted
- AzureRM provider docs: `azurerm_kubernetes_cluster` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/kubernetes_cluster.html.markdown
- AzureRM provider docs: `azurerm_kubernetes_cluster_node_pool` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/kubernetes_cluster_node_pool.html.markdown
- AzureRM provider docs: `azurerm_api_management` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/api_management.html.markdown
- AzureRM provider docs: `azurerm_api_management_api` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/api_management_api.html.markdown
- AzureRM provider docs: `azurerm_servicebus_namespace` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/servicebus_namespace.html.markdown
- AzureRM provider docs: `azurerm_servicebus_topic` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/servicebus_topic.html.markdown
- AzureRM provider docs: `azurerm_servicebus_subscription` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/servicebus_subscription.html.markdown
- AzureRM provider docs: `azurerm_federated_identity_credential` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/federated_identity_credential.html.markdown
- AzureRM provider docs: `azurerm_role_assignment` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/role_assignment.html.markdown
- Microsoft Learn: Use Microsoft Entra Workload ID with Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Learn: Create an OpenID Connect provider on Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/use-oidc-issuer
- Microsoft Learn: Use API Management in a virtual network with Azure Application Gateway - https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-integrate-internal-vnet-appgateway
- Microsoft Learn: Partitioned queues and topics - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-partitioning
- Microsoft Learn: Integrate Azure Service Bus with Azure Private Link Service - https://learn.microsoft.com/en-us/azure/service-bus-messaging/private-link-service
- Microsoft Learn: Use Kubernetes RBAC with Microsoft Entra ID in AKS - https://learn.microsoft.com/en-us/azure/aks/kubernetes-rbac-entra-id
- Microsoft Learn: Create trust between user-assigned managed identity and external identity provider - https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation-create-trust-user-assigned-managed-identity

## Issues Found
- The AKS snippets used `enable_auto_scaling`, which is not the current AzureRM argument name for default or additional node pools. I updated both blocks to `auto_scaling_enabled`.
- The AKS `azure_active_directory_role_based_access_control` block used the removed `managed = true` argument. I replaced it with the current block syntax and corrected the comment so it refers to Microsoft Entra-based cluster authentication instead of workload identity.
- The Service Bus topic used `enable_partitioning`, which is not the current AzureRM argument name, and entity-level partitioning is not how Premium namespace partitioning is configured. I removed the topic-level partitioning line.
- The subscription comment said "with filters" even though no subscription rule or filter resource was present. I updated the comment to match the actual configuration.
- The federated identity credential resource used outdated `resource_group_name` and `parent_id` arguments. I replaced them with `user_assigned_identity_id`, which matches the current AzureRM resource schema.
- The summary claimed that private endpoints already ensure Service Bus traffic never traverses the public internet, but the snippet does not create a private endpoint or disable public access. I changed the wording to say Premium supports private endpoints.

## Review Notes
- APIM internal mode and Service Bus private endpoint deployments require extra networking and DNS resources not shown in this excerpt; the snippet is now accurate, but it is still not a full end-to-end production network configuration.
- AKS OIDC issuer is enabled by default only for newly created Kubernetes 1.34+ clusters. Explicitly setting `oidc_issuer_enabled = true` is still valid and keeps the example portable across cluster versions.
- The overview mentions Azure Container Registry, but the post does not provision it. This is a completeness gap rather than a technical error.
