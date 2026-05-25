# Validation Summary: How to Create Azure Spring Apps in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AzureRM Terraform Provider
- Azure Spring Apps
- Azure Application Insights
- Azure Monitor diagnostic settings
- Azure DNS
- Azure Virtual Network
- Spring Boot / Java

## Sources Consulted
- Microsoft Learn: Azure Spring Apps retirement announcement - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/retirement-announcement
- Microsoft Learn: Compare available plans in Azure Spring Apps - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/plan-comparison
- Microsoft Learn: Quickstart: Provision Azure Spring Apps using Terraform - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/quickstart-deploy-infrastructure-vnet-terraform
- Microsoft Learn: Analyze logs and metrics with diagnostics settings - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/diagnostic-services
- Microsoft Learn: Blue-green deployment strategies in Azure Spring Apps - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/concepts-blue-green-deployment-strategies
- Terraform AzureRM provider documentation: azurerm_spring_cloud_service - https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/spring_cloud_service
- Terraform AzureRM provider documentation: azurerm_spring_cloud_app - https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/spring_cloud_app
- Terraform AzureRM provider documentation: azurerm_spring_cloud_java_deployment - https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/spring_cloud_java_deployment
- Terraform AzureRM provider documentation: azurerm_spring_cloud_active_deployment - https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/spring_cloud_active_deployment
- Terraform AzureRM provider documentation: azurerm_spring_cloud_configuration_service - https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/spring_cloud_configuration_service
- Terraform AzureRM provider documentation: azurerm_spring_cloud_custom_domain - https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/spring_cloud_custom_domain
- Terraform AzureRM provider documentation: azurerm_spring_cloud_certificate - https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/spring_cloud_certificate

## Issues Found
- The post omitted the current Azure Spring Apps retirement status. Added a note that Basic, Standard, and Enterprise entered retirement on March 17, 2025, stop accepting new customers, and retire on March 31, 2028.
- The deployment snippet said Terraform deployed a JAR, but `azurerm_spring_cloud_java_deployment` creates/configures a Java deployment and does not include an artifact path. Updated the comment to avoid implying Terraform uploads the JAR.
- The Standard-tier Config Server example used `azurerm_spring_cloud_configuration_service`, which is only for Enterprise tier. Replaced it with the Standard/Basic `config_server_git_setting` block on `azurerm_spring_cloud_service`.
- The Config Server repository example used Enterprise-style fields for a Standard-tier configuration. Updated it to use `pattern` and nested `http_basic_auth` guidance from the Standard-tier service schema.
- The custom domain example bound a certificate by `certificate_name` without the required `thumbprint`. Added `thumbprint = azurerm_spring_cloud_certificate.api.thumbprint`.
- The custom domain example lacked the required DNS CNAME mapping. Added an Azure DNS zone data source and `azurerm_dns_cname_record` pointing to the Spring app FQDN.
- The VNet injection example used internal CIDR ranges that were too small and overlapped the VNet address space. Changed them to three `/16` ranges outside the VNet CIDR and corrected the explanatory text.
- The blue-green example claimed to switch to staging but still referenced the production deployment resource. Updated `deployment_name` to use the staging deployment.
- The service output was labeled as a browsable URL even though it is the default domain target. Renamed the output and removed the `https://` prefix.
- The closing paragraph recommended Azure Spring Apps too broadly despite retirement. Scoped it to existing Azure Spring Apps customers.

## Review Notes
The examples are still intentionally partial snippets and assume supporting resources such as Key Vault certificates and Log Analytics workspaces exist where referenced. The post remains useful for existing Azure Spring Apps customers, but new Azure customers should evaluate Azure Container Apps or AKS because Azure Spring Apps is in retirement.
