# Validation Summary: How to Deploy a FHIR Server Using Azure Health Data Services

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Azure Health Data Services
- Azure Health Data Services FHIR service
- HL7 FHIR R4 REST API
- Azure CLI healthcareapis extension
- Microsoft Entra ID OAuth2 client credentials flow
- Azure RBAC for FHIR data plane roles
- Azure Private Link
- Azure Monitor diagnostic settings
- cURL and jq

## Sources Consulted
- Microsoft Learn: Azure CLI `az healthcareapis workspace` reference, https://learn.microsoft.com/en-us/cli/azure/healthcareapis/workspace?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az healthcareapis workspace fhir-service` reference, https://learn.microsoft.com/en-us/cli/azure/healthcareapis/workspace/fhir-service?view=azure-cli-latest
- Microsoft Learn: Get started with the FHIR service in Azure Health Data Services, https://learn.microsoft.com/en-us/azure/healthcare-apis/fhir/get-started-with-fhir
- Microsoft Learn: What is the FHIR service in Azure Health Data Services, https://learn.microsoft.com/en-us/azure/healthcare-apis/fhir/overview
- Microsoft Learn: Configure Azure RBAC roles for Azure Health Data Services, https://learn.microsoft.com/en-us/azure/healthcare-apis/configure-azure-rbac
- Microsoft Learn: Configure Azure Private Link for Azure Health Data Services, https://learn.microsoft.com/en-us/azure/healthcare-apis/configure-private-link
- Microsoft Learn: View and enable diagnostic settings in the FHIR service, https://learn.microsoft.com/en-us/azure/healthcare-apis/fhir/fhir-service-diagnostic-logs
- Microsoft Learn: Logging for Azure Health Data Services, https://learn.microsoft.com/en-us/azure/healthcare-apis/logging
- Microsoft Learn: FHIR Services REST API, https://learn.microsoft.com/en-us/rest/api/healthcareapis/fhir-services?view=rest-healthcareapis-2022-06-01

## Issues Found
- The FHIR service CLI commands used `az healthcareapis fhir-service ...`, which is not the current Azure Health Data Services workspace command path. Changed these examples to `az healthcareapis workspace fhir-service ...`.
- The FHIR service creation example used unsupported standalone `--authority` and `--audience` flags. Replaced them with the documented `--authentication-configuration` structured argument.
- The authentication wording used the old Azure AD name. Updated the relevant authentication references to Microsoft Entra ID.
- The service principal was created without capturing its object ID, then the role assignment used the application ID as the assignee. Updated the example to capture `SP_OBJECT_ID` and use `--assignee-object-id` with `--assignee-principal-type ServicePrincipal`.
- The role comment understated `FHIR Data Contributor` permissions and described import/export roles as admin roles. Updated the comments to match the documented FHIR data plane roles.
- The CORS example used unsupported `az healthcareapis fhir-service update` flags such as `--cors-origins`, `--cors-headers`, and `--cors-methods`. Replaced the snippet with the documented workspace FHIR service create-or-update command and `--cors-configuration`.
- The Private Link example targeted the FHIR service resource ID with `--group-id fhirservices`. Azure Health Data Services Private Link is configured at the workspace level with target sub-resource `healthcareworkspace`, so the example now uses the workspace resource ID and the correct group ID.

## Review Notes
- The local environment does not have Azure CLI installed, so CLI behavior was validated against current Microsoft Learn command references rather than local `az --help` output.
- The sample FHIR JSON resources and FHIR REST interactions are structurally plausible for FHIR R4 and align with the Azure Health Data Services REST access model, but they were not executed against a live Azure tenant.
