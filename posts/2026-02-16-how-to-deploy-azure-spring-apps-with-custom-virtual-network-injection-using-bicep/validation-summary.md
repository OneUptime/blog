# Validation Summary: How to Deploy Azure Spring Apps with Custom Virtual Network Injection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Spring Apps
- Azure Virtual Network
- Azure Private DNS
- Azure RBAC
- Azure Monitor diagnostic settings
- Bicep
- Azure CLI
- Spring Boot / Java deployments

## Sources Consulted
- Microsoft Learn: Deploy Azure Spring Apps in a virtual network - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/how-to-deploy-in-azure-virtual-network
- Microsoft Learn: Quickstart: Provision Azure Spring Apps using Bicep - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/quickstart-deploy-infrastructure-vnet-bicep
- Microsoft Learn: Access an app in Azure Spring Apps in a virtual network - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/access-app-virtual-network
- Microsoft Learn: Microsoft.AppPlatform/Spring 2023-12-01 Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.appplatform/2023-12-01/spring
- Microsoft Learn: Microsoft.AppPlatform/Spring/apps 2023-12-01 Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.appplatform/2023-12-01/spring/apps
- Microsoft Learn: Microsoft.AppPlatform/Spring/apps/deployments 2023-12-01 Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.appplatform/2023-12-01/spring/apps/deployments
- Microsoft Learn: Azure CLI az spring app reference - https://learn.microsoft.com/en-us/cli/azure/spring/app
- Microsoft Learn: Azure Spring Apps diagnostic settings - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/diagnostic-services
- Microsoft Learn: Azure built-in roles for Networking - https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/networking
- Microsoft Learn: Azure built-in roles - https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles

## Issues Found
- The post said both Azure Spring Apps subnets must be delegated to `Microsoft.AppPlatform/Spring`, and the Bicep text described subnet delegation as the key detail. The current Microsoft deployment docs require two dedicated subnets, but their portal and CLI setup creates normal dedicated subnets for Azure Spring Apps. I changed the wording to require dedicated subnets for one service instance rather than subnet delegation.
- The RBAC section granted only Network Contributor. Microsoft Learn states the Azure Spring Apps resource provider requires both User Access Administrator and Network Contributor on the VNet. I added a User Access Administrator role assignment using the built-in role ID `18d7d88d-d35e-4fb5-a5c3-7773c20a72d9`.
- The post described the resource provider object ID as needing only Network Contributor. I updated the description to include both required roles.
- The deployment snippet put `JAVA_OPTS` in `deploymentSettings.environmentVariables`. The 2023-12-01 deployment schema supports JVM options under the Jar source object as `jvmOptions`, so I moved the JVM options there and left real environment variables in `environmentVariables`.
- The app comment described `public: true` as a public endpoint. In a VNet-injected Azure Spring Apps instance, an assigned app endpoint is private unless an internet-accessible endpoint is separately enabled. I changed the comment to avoid implying public internet exposure.
- The post omitted Azure Spring Apps retirement context. Microsoft docs state the Basic, Standard, and Enterprise plans entered retirement on March 17, 2025 and retire on May 31, 2028. I added a short note near the introduction.
- The `serviceCidr` explanation did not mention that Azure Spring Apps expects three internal CIDR ranges of at least `/16` each. I clarified that requirement and the non-overlap constraint.

## Review Notes
Azure CLI is not installed in this workspace, so I could not run local `az --help` or deploy validation commands. CLI syntax was checked against the official Microsoft Learn Azure CLI reference instead. The `az spring` command group is marked deprecated because Azure Spring Apps is in retirement, but the documented command remains the correct command for existing Azure Spring Apps resources.
