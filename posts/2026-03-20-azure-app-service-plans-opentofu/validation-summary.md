# Validation Summary: How to Create Azure App Service Plans with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HCL
- Azure App Service
- Azure App Service Plans
- Azure App Service Environment v3
- AzureRM provider (`azurerm_service_plan`)

## Sources Consulted
- AzureRM provider `azurerm_service_plan` documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/v4.67.0/website/docs/r/service_plan.html.markdown
- Configure App Service Plans for Zone Redundancy: https://learn.microsoft.com/en-us/azure/app-service/configure-zone-redundancy
- Reliability in Azure App Service: https://learn.microsoft.com/en-us/azure/reliability/reliability-app-service
- Azure App Service Plans overview: https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans
- Integrate your app with an Azure virtual network: https://learn.microsoft.com/en-us/azure/app-service/overview-vnet-integration
- How to Enable Automatic Scaling: https://learn.microsoft.com/en-us/azure/app-service/manage-automatic-scaling
- Azure App Service pricing, current Premium plans: https://azure.microsoft.com/en-us/pricing/details/app-service/windows/
- Azure App Service pricing, previous Standard plans: https://azure.microsoft.com/en-us/pricing/details/app-service/windows-previous/

## Issues Found
- Step 1 was labeled as a "Basic App Service Plan" and the opening code comment called it "Standard", but the snippet actually used `sku_name = "P1v3"`. I corrected the heading and code comment to identify it as a Premium v3 plan.
- The zone-redundant example said `P2v3` had 2 vCores, but Microsoft pricing documentation lists `P2v3` as a 4-vCPU tier. I corrected the inline comment.
- The zone-redundant example said Azure spreads instances across 3 availability zones and required a minimum of 3 instances. Microsoft Learn documents zone redundancy as requiring a minimum of 2 instances, and availability-zone usage depends on the plan's supported zone count. I updated the wording and changed `worker_count` to `2`.
- The environment-mapping comments were inaccurate. `B1` was described as having no custom domains, but custom domains are available on paid tiers and are explicitly available from Shared upward. The production comment also implied Premium was the relevant tier for VNet integration, but Microsoft documents VNet integration as available from Basic upward. I replaced those comments with technically correct tier descriptions.
- The summary implied the environment-based SKU map itself resulted in production plans "with zone redundancy and VNet integration". Selecting `P2v3` alone does not enable zone redundancy, so I changed the wording to say Premium plans support larger scale and zone-redundant deployments.

## Review Notes
- The `azurerm_service_plan` syntax in the post is current and non-deprecated. The `app_service_environment_id` argument is still supported for creating Isolated plans inside an App Service Environment.
- Zone redundancy also depends on the App Service plan being deployed to a scale unit that supports more than one availability zone. The post now avoids overstating this as a simple fixed "3 zones" rule.
- The Step 5 example assumes a separate `azurerm_app_service_environment_v3` resource exists elsewhere in the configuration. That assumption is valid for a focused snippet and did not require changes.
- The review was documentation-based. No live Azure deployment was executed in this environment.
