# Validation Summary: How to Configure Azure Functions IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Functions
- Azure App Service
- Azure Virtual Network integration
- IPv6 and dual-stack networking
- Azure CLI
- Python
- curl

## Sources Consulted
- Azure App Service inbound and outbound IP addresses: https://learn.microsoft.com/en-us/azure/app-service/overview-inbound-outbound-ips
- Azure Functions networking options: https://learn.microsoft.com/en-us/azure/azure-functions/functions-networking-options
- Azure App Service virtual network integration overview: https://learn.microsoft.com/en-ca/azure/app-service/overview-vnet-integration
- Azure App Service virtual network integration routing: https://learn.microsoft.com/en-us/azure/app-service/configure-vnet-integration-routing
- Azure Functions HTTP trigger reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger
- Python developer reference for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python
- Configure function app settings in Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-how-to-use-azure-function-app-settings
- Azure CLI `az functionapp config appsettings`: https://learn.microsoft.com/en-us/cli/azure/functionapp/config/appsettings?view=azure-cli-lts
- App Service outbound IPv6 public preview announcement: https://techcommunity.microsoft.com/blog/appsonazureblog/announcing-app-service-outbound-ipv6-support-in-public-preview/4423368
- curl man page: https://curl.se/docs/manpage.html
- Python `ipaddress` library reference: https://docs.python.org/3/library/ipaddress.html

## Issues Found
- The post described Azure Functions IPv6 as if it were enabled by configuring the underlying subnet or VNet. I changed this to the Azure App Service model: inbound IPv6 is controlled by `ipMode` and DNS, while VNet integration is outbound-only and still uses an IPv4 delegated subnet.
- The original introduction and conclusion implied that VNet integration enables Azure Functions dual-stack behavior. I corrected this because Microsoft documents that public outbound IPv6 currently does not work when application traffic is routed through VNet integration.
- Step 1 used generic platform guidance instead of Azure-specific configuration. I replaced it with the documented `az resource update ... --set properties.ipMode=...` workflow and an AAAA-record verification step.
- Step 2 used an AWS Lambda-style `event`/`context` handler, which is not the Azure Functions Python HTTP programming model. I replaced it with an `azure.functions.HttpRequest` example that reads `X-Forwarded-For`, matching Azure Functions/App Service behavior.
- Step 3 implied generic outbound IPv6 support without Azure-specific caveats. I updated the examples to match Azure’s current preview behavior and kept literal IPv6 usage only as an explicitly marked placeholder example.
- Step 4 had an incorrect `curl --resolve` example for IPv6. I fixed it to the documented bracketed IPv6 format.
- Step 5 mixed Bash and Python in a single `bash` code block. I split it into separate Bash and Python examples and replaced the generic environment-variable section with Azure Functions app settings, including the Linux outbound IPv6 preview opt-in setting.
- The description line overstated VNet integration as the mechanism for Azure Functions IPv6. I updated it to reflect inbound IPv6 plus preview outbound IPv6 on supported plans.

## Review Notes
- Outbound IPv6 for App Service/Azure Functions is still documented as a public preview feature, so this area may change after the post date.
- The remaining `2001:db8::1` examples are explicitly marked as documentation placeholders and must be replaced with reachable IPv6 addresses in real deployments.
