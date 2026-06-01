# Validation Summary: How to Connect Azure Logic Apps to On-Premises Systems Using the Data Gateway

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Logic Apps
- On-premises data gateway
- Azure Relay and Service Bus messaging
- Azure API connections
- Azure Resource Manager templates
- SQL Server connector
- File System connector
- Azure Monitor

## Sources Consulted
- Microsoft Learn: Connect to on-premises data sources from Azure Logic Apps - https://learn.microsoft.com/en-us/azure/logic-apps/connect-on-premises-data-sources
- Microsoft Learn: Install an on-premises data gateway - https://learn.microsoft.com/en-us/data-integration/gateway/service-gateway-install
- Microsoft Learn: Install on-premises data gateway for Azure Logic Apps workflows - https://learn.microsoft.com/en-us/azure/logic-apps/install-on-premises-data-gateway-workflows
- Microsoft Learn: On-premises data gateway FAQ - https://learn.microsoft.com/en-us/data-integration/gateway/service-gateway-onprem-faq
- Microsoft Learn: Adjust communication settings for the on-premises data gateway - https://learn.microsoft.com/en-us/data-integration/gateway/service-gateway-communication
- Microsoft Learn: Adjust gateway performance based on server CPU - https://learn.microsoft.com/en-us/data-integration/gateway/service-gateway-performance-cpu
- Microsoft Learn: Monitor and optimize on-premises data gateway performance - https://learn.microsoft.com/en-us/data-integration/gateway/service-gateway-performance
- Microsoft Learn: Connect to on-premises file systems from Azure Logic Apps - https://learn.microsoft.com/en-us/azure/connectors/file-system
- Microsoft Learn: Microsoft.Web/connectionGateways ARM reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.web/connectiongateways
- Microsoft Learn: Microsoft.Web/connections ARM reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.web/connections
- Microsoft Learn: Supported metrics with Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/metrics-index

## Issues Found
- The gateway architecture text said the gateway uses only outbound HTTPS to Azure Service Bus Relay. Microsoft documentation describes outbound traffic through Azure Relay and Service Bus messaging, with HTTPS mode available and newer installations defaulting to HTTPS. Updated the wording and diagram labels.
- The prerequisites listed Windows Server 2016 or later and recommended 2 CPU cores. Current Microsoft documentation lists 64-bit Windows Server 2019 as the minimum server OS and recommends an 8-core CPU with 8 GB RAM. Updated the prerequisites.
- The supported connector list was incomplete and used the older generic SharePoint label. Added the missing Microsoft-documented data sources and changed SharePoint to SharePoint Server.
- The high availability section said a gateway cluster supports up to 7 machines. Microsoft documentation currently states a maximum of 10 gateway members. Updated the limit.
- The performance tuning section suggested increasing SQL Server connection pool size in the gateway configuration. Microsoft documents gateway container scaling settings, including the Logic Apps/Power Apps/Power Automate caching pool setting, rather than a SQL Server connection pool size setting. Replaced the section with accurate gateway container scaling guidance.
- The Azure Monitor metric alert example used a `status` metric for `Microsoft.Web/connectionGateways`. I could not verify any supported Azure Monitor metric with that name for this resource type, and the resource status is exposed as resource state rather than a metric. Replaced the command with accurate monitoring guidance.
- Azure CLI was not installed in the local environment, so I could not validate `az` examples locally. The ARM and resource snippets were checked against Microsoft resource reference documentation instead.

## Review Notes
- For Standard logic app workflows, built-in service provider connectors can often access on-premises resources through virtual networks without the on-premises data gateway. The post remains valid for Consumption workflows and for Standard workflows using managed connectors that require the gateway.
