# Validation Summary: How to Configure Azure Firewall with Explicit Proxy for Web Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Firewall Standard and Premium
- Azure Firewall explicit proxy
- Azure Firewall Policy and application rules
- Azure CLI
- PAC files
- Azure Blob Storage SAS URLs
- Windows proxy configuration
- Linux and Docker proxy configuration
- Azure Firewall TLS inspection
- Azure Monitor / Log Analytics

## Sources Consulted
- Microsoft Learn: Azure Firewall explicit proxy (preview): https://learn.microsoft.com/en-us/azure/firewall/explicit-proxy
- Microsoft Learn: Azure Firewall Policy REST API explicitProxy schema: https://learn.microsoft.com/en-us/rest/api/virtualnetwork/firewall-policies/get
- Microsoft Learn: Azure CLI `az network firewall policy`: https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy
- Microsoft Learn: Azure CLI `az network firewall policy rule-collection-group collection`: https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy/rule-collection-group/collection
- Microsoft Learn: Azure CLI `az network firewall policy rule-collection-group collection rule`: https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy/rule-collection-group/collection/rule
- Microsoft Learn: Configure Azure Firewall rules and rule processing: https://learn.microsoft.com/en-us/azure/firewall/infrastructure-fqdns
- Microsoft Learn: Azure Firewall Premium features implementation guide: https://learn.microsoft.com/en-us/azure/firewall/premium-features
- Microsoft Learn: Monitor Azure Firewall: https://learn.microsoft.com/en-us/azure/firewall/monitor-firewall
- Microsoft Learn: Missing Internet Explorer Maintenance settings for IE11: https://learn.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-it-pro/internet-explorer-11/ie11-deploy-guide/missing-internet-explorer-maintenance-settings-for-ie11

## Issues Found
- The post described explicit proxy as generally available. Microsoft currently documents Azure Firewall explicit proxy as a preview feature, so the availability statement was updated.
- The prerequisites included a firewall firmware version requirement. Azure Firewall does not expose a customer-managed firmware version prerequisite for this feature in the official documentation, so that line was removed and the Azure CLI extension requirement was clarified.
- The Azure CLI `--explicit-proxy` shorthand used dashed property names such as `http-port` and `enable-pac-file`. The current CLI and REST schema use properties such as `httpPort`, `enablePacFile`, and `enableExplicitProxy`, so the command and parameter descriptions were corrected.
- The PAC file URL was shown as a plain blob URL. Microsoft documents the `pacFile` value as a SAS URL with read permission so the firewall can download the file, so the text and example were updated to generate a read-only SAS URL.
- The deny rule collection used priority `50`, but Azure Firewall Policy priorities must be between `100` and `65000`. The example was changed to priority `200`.
- The web category example used categories that are not clearly documented Azure Firewall web categories. It was changed to the documented `Gambling` category.
- The Windows Group Policy path used deprecated Internet Explorer Maintenance settings. It was replaced with Group Policy Preferences registry configuration for `AutoConfigURL`.
- The TLS inspection rule-add example omitted `--collection-name` and used the collection name where the rule name belongs. The command was corrected to add the `InspectHTTPS` rule to the `AllowWebBrowsing` collection.
- The PAC troubleshooting note implied clients access the storage URL directly. Azure Firewall downloads the PAC file from the SAS URL and serves it on the configured port, so the troubleshooting text was corrected.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against the current Microsoft Learn Azure CLI reference instead of local `az --help` output. The diagnostic logging example uses legacy AzureDiagnostics categories, which remain documented, though Microsoft recommends resource-specific structured tables for easier querying and lower cost in many deployments.
