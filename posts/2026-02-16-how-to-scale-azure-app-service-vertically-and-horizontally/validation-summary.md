# Validation Summary: How to Scale Azure App Service Vertically and Horizontally

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure App Service
- Azure App Service plans and pricing tiers
- Azure Monitor autoscale
- Azure CLI
- Azure App Service health checks
- Azure App Service deployment slots and warm-up
- Application Request Routing (ARR) affinity
- Node.js, Express sessions, and Redis session storage

## Sources Consulted
- Azure App Service plan overview: https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans
- Scale up an app in Azure App Service: https://learn.microsoft.com/en-us/azure/app-service/manage-scale-up
- Configure Premium V3 tier for Azure App Service: https://learn.microsoft.com/en-us/azure/app-service/app-service-configure-premium-v3-tier
- App Service limits: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits
- Azure CLI `az appservice plan`: https://learn.microsoft.com/en-us/cli/azure/appservice/plan
- Azure CLI `az monitor autoscale rule`: https://learn.microsoft.com/en-us/cli/azure/monitor/autoscale/rule
- Azure CLI `az monitor autoscale profile`: https://learn.microsoft.com/en-us/cli/azure/monitor/autoscale/profile
- Azure CLI `az webapp update`: https://learn.microsoft.com/en-us/cli/azure/webapp
- Azure App Service health check: https://learn.microsoft.com/en-us/azure/app-service/monitor-instances-health-check
- Azure App Service deployment slots and warm-up: https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots
- Azure App Service app settings reference: https://learn.microsoft.com/en-us/azure/app-service/reference-app-settings
- Azure App Service VNet Integration: https://learn.microsoft.com/en-ca/azure/app-service/overview-vnet-integration
- Azure Monitor metrics for Microsoft.Web/serverfarms: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-web-serverfarms-metrics
- IIS Application Initialization: https://learn.microsoft.com/en-us/iis/configuration/system.webserver/applicationinitialization/

## Issues Found
- The tier overview referred to the old Isolated `I1-I3` tier names. Updated this to Isolated v2 `I1v2-I6v2`, which matches current App Service plan documentation and CLI SKU names.
- The post stated that VNet Integration requires Standard. Updated this to say it requires a dedicated compute tier such as Basic or higher, matching current App Service VNet Integration documentation.
- The scale-up section implied that deployment slots can be put on the new tier before production. Clarified that slots run in the same App Service plan as production, so a plan tier change affects all slots.
- The `az appservice list-locations --sku P1v3` comment said it lists available SKUs for a plan. Corrected the comment to say it checks Premium v3 regional availability.
- The Redis session example created a Redis client but did not connect it. Added `redisClient.connect().catch(console.error);` for current `redis` client behavior.
- The health check explanation said the load balancer uses the endpoint directly. Reworded it to match App Service Health check behavior, where App Service pings the path and removes unhealthy instances from routing.
- The warm-up example was shown as JSON, but `applicationInitialization` is a `Web.config`/IIS XML element. Replaced it with a valid XML fragment.
- The monitoring example used `az webapp show --query "siteConfig.numberOfWorkers"` for current instance count. Replaced it with `az appservice plan show --query "sku.capacity"`, which reflects the App Service plan capacity used elsewhere in the post.
- The alert example claimed to alert when approaching maximum instance count but only checked CPU. Renamed it to a high-CPU alert and adjusted the description.

## Review Notes
Azure CLI was not installed in the local environment, so CLI validation was performed against official Microsoft Learn Azure CLI reference pages rather than local `az --help` output. Pricing values remain approximate and region-dependent, which is acceptable because the post labels them as approximate.
