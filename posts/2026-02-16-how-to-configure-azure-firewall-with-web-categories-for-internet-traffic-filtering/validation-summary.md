# Validation Summary: How to Configure Azure Firewall with Web Categories

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Firewall
- Azure Firewall Policy
- Azure Firewall web categories
- Azure CLI
- Azure Monitor diagnostic settings
- Log Analytics / KQL

## Sources Consulted
- Azure Firewall Premium features implementation guide: https://learn.microsoft.com/en-us/azure/firewall/premium-features
- Azure Firewall web categories: https://learn.microsoft.com/en-us/azure/firewall/web-categories
- Azure Firewall monitoring and structured logs: https://learn.microsoft.com/en-us/azure/firewall/monitor-firewall
- Azure CLI reference for firewall policy rule collection groups: https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy/rule-collection-group
- Azure CLI reference for firewall policy rule collections: https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy/rule-collection-group/collection
- Azure CLI reference for firewall policy collection rules: https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy/rule-collection-group/collection/rule
- Azure CLI reference for diagnostic settings: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Azure Firewall Web Categories REST API: https://learn.microsoft.com/en-us/rest/api/firewall/web-categories/list-by-subscription

## Issues Found
- The post listed Malware, Phishing, and Cryptocurrency Mining as Azure Firewall web categories. These are not listed in the Azure Firewall web categories documentation, so the examples and table were changed to documented web categories such as Illegal Software, Hacking, Proxy Avoidance and Anonymizers, and Tasteless.
- The `az network firewall policy rule-collection-group collection rule add` examples used `--name` for the collection name and `--rule-name` for the rule name. Current Azure CLI syntax requires `--collection-name` for the collection and `--name` for the rule, so the examples were corrected.
- The allow-list example used category names that did not match Azure Firewall category resource names, including `Health` and `SearchEngines`. These were corrected to `HealthAndMedicine` and `SearchEnginesAndPortals`.
- The KQL example searched for `WebCategory`, but Azure Firewall application logs emit the field text as `Web Category:`. The query was updated to match the documented log message format and to filter denied traffic explicitly.
- The best-practice note described a "log-only mode" for rules. Azure Firewall rule collection actions are Allow or Deny, so this was changed to recommend enabling diagnostic logging and reviewing existing allowed traffic before broadly blocking categories.

## Review Notes
- The Azure CLI commands are part of the `azure-firewall` extension and several commands are marked Preview in the official CLI reference.
- Azure Firewall Premium provides URL-level categorization with TLS inspection for HTTPS; Standard categorization is FQDN-based. Microsoft documentation contains some wording variance around web categories and Premium, but the Premium features guide explicitly describes web categories as available in both Standard and Premium with more granular matching in Premium.
