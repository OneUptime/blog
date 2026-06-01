# Validation Summary: How to Configure Zone-Redundant Services in Azure for 99.99% Availability

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Availability Zones
- Azure App Service
- Azure SQL Database
- Azure Kubernetes Service (AKS)
- Azure Cache for Redis
- Azure Storage
- Azure Load Balancer and Public IP
- Azure VPN Gateway and ExpressRoute Gateway SKUs
- Azure Service Bus
- Azure CLI
- Kubernetes deployment topology spread constraints

## Sources Consulted
- Azure reliability overview: https://learn.microsoft.com/en-us/azure/reliability/overview
- Configure App Service plans for zone redundancy: https://learn.microsoft.com/en-us/azure/app-service/configure-zone-redundancy
- Reliability in Azure App Service: https://learn.microsoft.com/en-us/azure/reliability/reliability-app-service
- Azure CLI `az appservice plan`: https://learn.microsoft.com/en-us/cli/azure/appservice/plan
- Reliability in Azure SQL Database: https://learn.microsoft.com/en-us/azure/reliability/reliability-sql-database
- Azure CLI `az sql db`: https://learn.microsoft.com/en-us/cli/azure/sql/db
- Configure availability zones in AKS: https://learn.microsoft.com/en-us/azure/aks/availability-zones
- High availability for Azure Cache for Redis: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-high-availability
- Azure CLI `az redis`: https://learn.microsoft.com/en-us/cli/azure/redis
- Azure Storage redundancy: https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy
- Azure Load Balancer best practices: https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-best-practices
- Create a public IP address using Azure CLI: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/create-public-ip-cli
- Azure CLI `az network vnet-gateway`: https://learn.microsoft.com/en-us/cli/azure/network/vnet-gateway
- Create a route-based VPN gateway using Azure CLI: https://learn.microsoft.com/en-us/azure/vpn-gateway/create-routebased-vpn-gateway-cli
- Reliability in Azure Service Bus: https://learn.microsoft.com/en-us/azure/reliability/reliability-service-bus
- Azure CLI `az servicebus namespace`: https://learn.microsoft.com/en-us/cli/azure/servicebus/namespace

## Issues Found
- The post described zone redundancy as generally giving a 99.99% SLA instead of 99.95%. This is service-specific, so the wording was changed to say zone redundancy can provide a higher SLA, often 99.99% depending on service and configuration.
- The post stated an under-2ms round-trip latency for availability zones. Microsoft documentation describes low-latency connections but does not guarantee that value, so the specific number was removed.
- The post stated zone-redundant services distribute across all zones. This was narrowed to distribution across multiple zones.
- The App Service section stated Premium v3 and Isolated v2 support and required at least 3 instances. Current App Service documentation lists Premium v2 through Premium v4 for App Service plans and a minimum of 2 instances, so the section and checklist were updated. The CLI example was also changed to the documented `--zone-redundant` flag form.
- The Azure SQL section omitted General Purpose vCore databases and described existing database updates too broadly for Hyperscale. The tier list and existing database note were corrected.
- The Azure SQL failover wording said the database continues operating within seconds. Microsoft documents typical downtime as less than 30 seconds during availability zone failover, so the wording was corrected.
- The Redis section omitted Standard and Enterprise Flash tier zone redundancy. The supported tier list was updated.
- The Storage section said ZRS replicates across three zones. Microsoft documents three or more availability zones, so that wording was corrected.
- The Service Bus section said only Premium supports zone redundancy. Current Service Bus reliability documentation says all tiers support availability zones in supported regions, so the section and checklist were updated.
- The cost section said App Service requires a minimum of 3 instances. This was corrected to 2 instances.

## Review Notes
The local Azure CLI executable was not installed in this workspace, so command validation was performed against Microsoft Learn Azure CLI reference pages instead of local `az --help` output.
