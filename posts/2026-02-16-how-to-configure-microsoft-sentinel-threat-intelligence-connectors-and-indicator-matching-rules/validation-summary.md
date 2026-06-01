# Validation Summary: How to Configure Microsoft Sentinel Threat Intelligence Connectors

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Microsoft Sentinel
- Microsoft Defender Threat Intelligence data connector
- Threat Intelligence - TAXII data connector
- Threat intelligence STIX objects upload API
- STIX 2.1
- TAXII 2.0 / 2.1
- Azure REST API / Azure CLI `az rest`
- Kusto Query Language (KQL)

## Sources Consulted
- Microsoft Sentinel threat intelligence overview: https://learn.microsoft.com/en-us/azure/sentinel/understand-threat-intelligence
- Microsoft Sentinel STIX objects upload API: https://learn.microsoft.com/en-us/azure/sentinel/stix-objects-api
- Microsoft Sentinel STIX/TAXII connector documentation: https://learn.microsoft.com/en-us/azure/sentinel/connect-threat-intelligence-taxii
- Microsoft Defender Threat Intelligence connector documentation: https://learn.microsoft.com/en-us/azure/sentinel/connect-mdti-data-connector
- Microsoft.SecurityInsights dataConnectors ARM schema: https://learn.microsoft.com/en-us/azure/templates/microsoft.securityinsights/2025-04-01-preview/dataconnectors
- Azure Monitor `ThreatIntelIndicators` table reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/threatintelindicators
- Microsoft Sentinel STIX objects and `ThreatIntelIndicators` migration guidance: https://learn.microsoft.com/en-us/azure/sentinel/work-with-stix-objects-indicators
- Azure CLI Sentinel data connector reference: https://learn.microsoft.com/en-us/cli/azure/sentinel/data-connector

## Issues Found
- The post used the legacy `ThreatIntelligenceIndicator` table throughout. Microsoft documentation says Sentinel stopped ingesting to that legacy table after July 31, 2025, so I updated the article and KQL examples to use `ThreatIntelIndicators`.
- The Azure CLI examples used `az sentinel data-connector create --kind --properties`, but the current Azure CLI command exposes connector-specific payload arguments rather than those generic flags. I replaced the examples with `az rest` PUT calls against the documented `Microsoft.SecurityInsights/dataConnectors` ARM resource shape.
- The Microsoft Defender Threat Intelligence connector example omitted the required `tenantId` property. I added it to the connector body.
- The upload API example used the legacy `sentinelus.azure-api.net/.../threatintelligenceindicators:upload` endpoint and the legacy `indicators` array. I updated it to the current STIX objects upload API endpoint, `api-version=2024-02-01-preview`, and the `stixobjects` array.
- The sample STIX indicator used an invalid STIX ID (`indicator--custom-001`) and a non-STIX `threat_types` field. I replaced the ID with a UUID-form STIX identifier and changed the type metadata to `indicator_types`.
- The Python snippet used `datetime.utcnow()` and imported `json` unnecessarily. I changed it to timezone-aware UTC timestamps and removed the unused import.
- The KQL examples referenced legacy columns such as `Active`, `ExpirationDateTime`, `ConfidenceScore`, `NetworkIP`, `DomainName`, and `FileHashValue`. I updated them to use `IsActive`, `ValidUntil`, `Confidence`, `ObservableKey`, `ObservableValue`, and STIX `Data` extraction from `ThreatIntelIndicators`.
- The cleanup example patched a legacy threat intelligence indicator resource with `active: false`. I replaced it with an example that uploads an updated STIX object with the same ID, `revoked: true`, and an expired `valid_until`.

## Review Notes
- The `ThreatIntelIndicators` schema and STIX objects upload API are still documented as preview, but they are the documented replacement path for custom threat intelligence ingestion and querying as of this review.
- The Anomali Limo API root is plausible as an example, but collection IDs can change and should be obtained from the TAXII provider's current documentation.
