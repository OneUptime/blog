# Validation Summary: How to Set Up SMART on FHIR Authentication for Clinical Applications

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- SMART on FHIR / SMART App Launch
- Azure Health Data Services FHIR service
- Microsoft Entra ID
- Azure CLI
- OAuth 2.0 authorization code flow
- OpenID Connect
- Python
- Flask
- Requests

## Sources Consulted
- Microsoft Learn: SMART on FHIR - Azure Health Data Services: https://learn.microsoft.com/en-us/azure/healthcare-apis/fhir/smart-on-fhir
- Microsoft Learn: Azure Health Data Services FHIR service REST API create/update: https://learn.microsoft.com/en-us/rest/api/healthcareapis/fhir-services/create-or-update
- Microsoft Learn: Configure multiple service identity providers for the FHIR service: https://learn.microsoft.com/en-us/azure/healthcare-apis/fhir/configure-identity-providers
- Microsoft Learn: Configure Azure RBAC role for the FHIR service: https://learn.microsoft.com/en-us/azure/healthcare-apis/configure-azure-rbac
- Microsoft Learn: Register a client application using CLI and REST API: https://learn.microsoft.com/en-us/azure/healthcare-apis/register-application-cli-rest
- Microsoft Learn: Azure CLI `az healthcareapis workspace fhir-service`: https://learn.microsoft.com/en-us/cli/azure/healthcareapis/workspace/fhir-service
- HL7 SMART App Launch v2.2 overview: https://www.hl7.org/fhir/smart-app-launch/
- HL7 SMART App Launch v2.2 launch and authorization: https://hl7.org/fhir/smart-app-launch/STU2.2/app-launch.html
- HL7 SMART App Launch v2.2 scopes and launch context: https://hl7.org/fhir/smart-app-launch/STU2.2/scopes-and-launch-context.html
- HL7 SMART App Launch v2.2 conformance and well-known discovery: https://hl7.org/fhir/smart-app-launch/STU2.2/conformance.html
- Python `urllib.parse` documentation: https://docs.python.org/3/library/urllib.parse.html
- Flask quickstart and routing documentation: https://flask.palletsprojects.com/
- Requests documentation: https://requests.readthedocs.io/

## Issues Found
- The post described Azure Health Data Services as if the legacy SMART on FHIR proxy supported standalone launch and SMART scope enforcement. Updated the explanation to distinguish SMART on FHIR (Enhanced) from the legacy proxy, and noted the documented September 2026 proxy retirement.
- The Azure CLI command `az healthcareapis fhir-service update --smart-proxy-enabled true` used an incorrect command group and unsupported flag. Replaced it with the current `az healthcareapis workspace fhir-service show` command to get the resource ID and a generic `az resource update` example for the legacy proxy authentication settings.
- The API permission example used hard-coded application and permission IDs and treated API permissions as the main access model. Replaced it with assignment of the `FHIR SMART User` Azure RBAC role to the users or groups launching the SMART app.
- The examples mixed SMART clinical scopes with a Microsoft Entra `/.default` scope. Removed `/.default` from SMART authorization and token examples so the requested scopes remain SMART scopes.
- The Python examples manually concatenated query parameters into the OAuth authorization URL without URL encoding. Replaced the string join with `urllib.parse.urlencode`.
- The Python token exchange did not check for HTTP errors and could fail later with unclear exceptions. Added `timeout=10` and `raise_for_status()`.
- The standalone flow could request `Patient/None` if no patient context was returned. Added a guard that redirects to launch when `patient_id` is missing.
- Updated remaining terminology from Azure AD to Microsoft Entra ID where it referred to the identity platform.

## Review Notes
- The Azure CLI is not installed in the local workspace, so CLI verification was performed against current Microsoft Learn command reference pages rather than local `az --help` output.
- The article now uses SMART v1 scope examples such as `patient/*.read`, which match the existing examples in the post and are supported by the Azure SMART on FHIR v1 sample. Azure also documents SMART v2 granular scopes such as `Patient/*.rs`; a future article could explicitly choose and explain one SMART version.
