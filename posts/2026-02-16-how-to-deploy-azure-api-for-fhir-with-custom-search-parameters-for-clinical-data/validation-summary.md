# Validation Summary: How to Deploy Azure API for FHIR with Custom Search Parameters for Clinical Data

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Azure Health Data Services FHIR service
- Azure API for FHIR lifecycle and migration context
- HL7 FHIR R4
- FHIR SearchParameter resources and FHIRPath expressions
- Azure CLI healthcareapis extension
- Microsoft Entra authentication and Azure RBAC
- Azure Monitor diagnostic settings
- Python requests and azure-identity

## Sources Consulted
- Microsoft Learn: FAQ about migration from Azure API for FHIR - https://learn.microsoft.com/en-us/azure/healthcare-apis/fhir/migration-faq
- Microsoft Learn: Deploy the FHIR service via Azure portal - https://learn.microsoft.com/en-us/azure/healthcare-apis/fhir/deploy-azure-portal
- Microsoft Learn: az healthcareapis workspace - https://learn.microsoft.com/en-us/cli/azure/healthcareapis/workspace
- Microsoft Learn: az healthcareapis workspace fhir-service - https://learn.microsoft.com/en-us/cli/azure/healthcareapis/workspace/fhir-service
- Microsoft Learn: Defining custom search parameters - https://learn.microsoft.com/en-us/azure/healthcare-apis/fhir/how-to-do-custom-search
- Microsoft Learn: Running a reindex job - https://learn.microsoft.com/en-us/azure/healthcare-apis/fhir/how-to-run-a-reindex
- Microsoft Learn: Authentication and authorization in Azure Health Data Services - https://learn.microsoft.com/en-us/azure/healthcare-apis/authentication-authorization
- Microsoft Learn: View and enable diagnostic settings in the FHIR service - https://learn.microsoft.com/en-us/azure/healthcare-apis/fhir/fhir-service-diagnostic-logs
- Microsoft Learn: FHIR service best practices for better performance - https://learn.microsoft.com/en-us/azure/healthcare-apis/fhir/fhir-best-practices
- HL7 FHIR R4 Search - https://hl7.org/fhir/R4/search.html
- HL7 FHIR SearchParameter resource - https://hl7.org/fhir/searchparameter.html

## Issues Found
- The post targeted new Azure API for FHIR deployment even though Microsoft disallows new deployments after April 1, 2025 and retires the service on September 30, 2026. Updated the tutorial to use the FHIR service in Azure Health Data Services.
- The Azure CLI example used the legacy `az healthcareapis service create` path and Cosmos DB throughput configuration. Replaced it with `az healthcareapis workspace create` and `az healthcareapis workspace fhir-service create`.
- The endpoint examples used the old Azure API for FHIR host format. Updated them to the Azure Health Data Services FHIR service host format, `https://{workspace-name}-{fhir-service-name}.fhir.azurehealthcareapis.com`.
- The access configuration mixed delegated API permission language with application RBAC. Updated it to Microsoft Entra application registration plus the `FHIR Data Contributor` Azure RBAC role.
- The custom SearchParameter create command used PUT while the current Microsoft guidance says to POST new SearchParameter resources to `/SearchParameter`. Updated the command.
- The reindex example used unsupported parameter names. Replaced the request body with the documented `Parameters` resource containing an empty `parameter` array for a full reindex.
- The FHIRPath expression for the MRN extension was changed to the standard extension helper form used by HL7 examples.
- The SearchParameter `name` values were changed to computer-friendly names that align with HL7 examples.
- The performance section incorrectly framed Azure Health Data Services FHIR service tuning in terms of direct Cosmos DB RU management. Replaced it with Azure Monitor and query/index tuning guidance.
- The diagnostic settings resource ID used the old standalone service resource path. Updated it to the workspace child FHIR service resource path.
- Minor terminology and consistency fixes were made for Microsoft Entra ID and a query comment that mentioned `active` without using an `active` search parameter.

## Review Notes
The custom search parameter workflow is still valid, but Azure API for FHIR should be treated as a migration-only topic in 2026 content. Future updates could add a short note about verifying the new search parameters in `/metadata` after reindexing.
