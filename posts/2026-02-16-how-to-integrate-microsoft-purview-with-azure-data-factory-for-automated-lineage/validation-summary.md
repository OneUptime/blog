# Validation Summary: How to Integrate Microsoft Purview with Azure Data Factory for Automated Lineage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Purview
- Azure Data Factory
- Azure Data Factory pipelines and activities
- Azure CLI
- Azure Resource Manager templates
- Microsoft Purview Data Map REST APIs
- Python requests

## Sources Consulted
- Microsoft Learn: Connect Azure Data Factory to Microsoft Purview - https://learn.microsoft.com/en-us/azure/purview/how-to-link-azure-data-factory
- Microsoft Learn: Connect a Data Factory to Microsoft Purview - https://learn.microsoft.com/en-us/azure/data-factory/connect-data-factory-to-azure-purview
- Microsoft Learn: Push Data Factory lineage data to Microsoft Purview - https://learn.microsoft.com/en-us/azure/data-factory/tutorial-push-lineage-to-purview
- Microsoft Learn: Azure CLI az datafactory pipeline reference - https://learn.microsoft.com/en-us/cli/azure/datafactory/pipeline
- Microsoft Learn: Microsoft Purview metadata policy and collections APIs - https://learn.microsoft.com/en-us/purview/legacy/tutorial-metadata-policy-collections-apis
- Microsoft Learn: Purview Data Map Discovery Query REST API - https://learn.microsoft.com/en-us/rest/api/purview/datamapdataplane/discovery/query

## Issues Found
- The post stated that every ADF pipeline run automatically pushes lineage to Purview. Microsoft documentation limits this to supported activities and supported source/sink data stores, so the wording was narrowed throughout the post.
- The prerequisite about same-region deployment was not a documented requirement. Replaced it with the documented firewall/private endpoint caveat for secured Purview accounts.
- The Purview role-assignment REST example used an invalid one-step POST payload. Replaced it with the documented metadata policy workflow: GET the collection policy, modify the Data Curator role rule, then PUT the policy by policy ID.
- The verification step referred to a "Lineage push" toggle. Updated it to the documented "Data Lineage - Pipeline" connection status.
- The lineage coverage section incorrectly listed Stored Procedure, Lookup, and Execute Pipeline activities as captured by the ADF-Purview integration. Updated the list to the documented supported activities: Copy Data, Data Flow, and Execute SSIS Package.
- The Data Flow section overstated transformation-step lineage. Microsoft documentation says Purview shows source and sink lineage for Data Flow and does not show detailed transformation steps, so the section was corrected.
- The troubleshooting section implied dynamic SQL might only be unreliable. Microsoft documentation states query and stored procedure sources are not supported for lineage/scanning and lineage is limited to table and view sources, so this was corrected.
- The monitoring API example used an outdated or incorrect search endpoint and filter shape. Updated it to the current Data Map discovery query endpoint and Unix epoch millisecond `updateTime` filter format.
- The best practice claiming ADF dataset names become Purview asset names was inaccurate. Updated it to focus on pipeline and activity names appearing as process nodes in lineage.

## Review Notes
The Azure CLI was not installed in the local workspace, so CLI command verification was done against Microsoft Learn rather than local `az --help`. The sample pipeline is illustrative and still assumes the referenced datasets, linked services, data flow, and pipeline parameter exist in the reader's ADF environment.
