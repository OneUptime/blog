# Validation Summary: How to Deploy a WordPress Site with OpenTofu on Azure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Resource Manager (`azurerm`) provider
- Azure App Service for Linux
- Azure Database for MySQL Flexible Server
- Azure Files
- Azure Front Door Standard
- WordPress

## Sources Consulted
- AzureRM `azurerm_linux_web_app` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/linux_web_app.html.markdown
- AzureRM `azurerm_mysql_flexible_server` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/mysql_flexible_server.html.markdown
- AzureRM `azurerm_mysql_flexible_server_firewall_rule` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/mysql_flexible_server_firewall_rule.html.markdown
- AzureRM `azurerm_storage_share` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_share.html.markdown
- AzureRM `azurerm_cdn_profile` and `azurerm_cdn_endpoint` docs, used to verify CDN classic deprecation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_profile.html.markdown and https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_endpoint.html.markdown
- AzureRM Front Door docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_frontdoor_profile.html.markdown, https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_frontdoor_endpoint.html.markdown, https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_frontdoor_origin_group.html.markdown, https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_frontdoor_origin.html.markdown, and https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cdn_frontdoor_route.html.markdown
- Azure App Service custom container docs: https://learn.microsoft.com/en-us/azure/app-service/configure-custom-container
- Azure App Service storage mount docs: https://learn.microsoft.com/en-us/azure/app-service/configure-connect-to-azure-storage
- Azure Database for MySQL Flexible Server public networking docs: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-networking-public
- Azure App Service Key Vault references docs: https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references
- WordPress requirements: https://wordpress.org/about/requirements/
- Docker Hub official WordPress image docs: https://hub.docker.com/_/wordpress

## Issues Found
- The MySQL Flexible Server example pinned `version = "8.0.21"` and hard-coded `zone = "1"`. AzureRM now supports `8.4`, and hard-coding a zone made the example region-dependent. I updated the version to `8.4`, removed the zone pin, and made public access explicit.
- The MySQL server example had no firewall rule, so the App Service app would not be able to connect over public access. Microsoft’s MySQL Flexible Server networking docs state that no IPs are allowed by default. I added `azurerm_mysql_flexible_server_firewall_rule` with `0.0.0.0` to allow Azure services.
- The Linux Web App custom container snippet used `docker_image_name` without the required `docker_registry_url`. I added `docker_registry_url = "https://index.docker.io"` and updated the WordPress image tag to a current official supported tag.
- The post created a delegated App Service subnet but never attached the web app to it. I added `virtual_network_subnet_id = azurerm_subnet.app.id` so the networking section matches the deployed web app.
- The Azure Files section created a file share but never mounted it into the container, so it did not provide shared WordPress storage. I added a `storage_account` mount to the web app and updated `azurerm_storage_share` to use the current `storage_account_id` argument instead of the deprecated `storage_account_name`.
- The App Service settings referenced `azurerm_key_vault_secret.db_password`, but no Key Vault resources or permissions were defined, so the snippet would not deploy as written. I replaced the broken reference with `var.db_password` and corrected the summary to describe Key Vault as the production follow-up pattern, including managed identity access.
- The Azure CDN section used `azurerm_cdn_profile` and `azurerm_cdn_endpoint` with `Standard_Microsoft`. AzureRM documents that new CDN classic `Standard_Microsoft` resources were deprecated on October 1, 2025 and are no longer available. I replaced that section with Azure Front Door Standard resources and updated the output accordingly.
- The description claimed the sample was “production-ready,” but the post still leaves several hardening decisions to the reader, such as tighter database network controls and full secret management. I removed that wording so the post no longer overstates the deployment’s security posture.

## Review Notes
- The `0.0.0.0` MySQL firewall rule is functional for App Service, but it is broader than a private-network design. A stricter production setup would use private networking for MySQL or narrower firewall rules.
- The storage account name still assumes `var.environment` resolves to a lowercase alphanumeric value that keeps the final name within Azure Storage naming limits.
- This review validated the post against official documentation and updated the snippets accordingly, but no live Azure deployment was performed in this environment.
