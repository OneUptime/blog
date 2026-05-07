# Validation Summary: How to Add an Azure ACI Environment to Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Azure Container Instances (ACI)
- Portainer API
- `curl`
- Python 3
- Microsoft Entra app registrations / service principals

## Sources Consulted
- Portainer Documentation, Add an ACI environment: https://docs.portainer.io/admin/environments/add/aci
- Portainer Documentation, Add an environment via the Portainer API: https://docs.portainer.io/admin/environments/add/api
- Portainer Documentation, API documentation: https://docs.portainer.io/api/docs
- Portainer source, endpoint creation handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_create.go
- Portainer source, API types and Azure credentials model: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer source, authentication handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Microsoft Learn, Register a Microsoft Entra app and create a service principal: https://learn.microsoft.com/en-us/entra/identity-platform/howto-create-service-principal-portal

## Issues Found
- The post was using a generic “add any environment” UI flow. Portainer’s ACI documentation requires selecting **ACI**, starting the wizard, and supplying **Application ID**, **Tenant ID**, and **Authentication Key**. I corrected the UI steps to match the documented ACI flow.
- The API example created a local Docker environment by posting `EndpointCreationType=1` and `URL=unix:///var/run/docker.sock`. That is not an Azure ACI environment. I replaced it with the ACI-specific `EndpointCreationType=3` request and the required Azure fields: `AzureApplicationID`, `AzureTenantID`, and `AzureAuthenticationKey`.
- The API example posted JSON to `/api/endpoints`. Portainer’s endpoint-creation handler reads multipart form fields for this route, including the ACI fields. I changed the example to use `curl --form-string`, which matches the implementation.
- The prerequisites were too generic for ACI and omitted the required Azure identity pieces. I updated them to require a Microsoft Entra app registration / service principal, the client ID, tenant ID, client secret, and connectivity from Portainer to the Azure management API.
- The environment type reference table mixed unrelated values and implied a generic mapping that was inaccurate for this post. I reduced it to the correct ACI creation value only: `EndpointCreationType=3`.
- The verification example was generic. I made it ACI-specific so it checks the named environment and shows the returned type, URL, and online/offline status.

## Review Notes
- Portainer’s current ACI docs still use the older “Azure AD application” terminology, while Microsoft’s current documentation uses Microsoft Entra app registrations and service principals. The corrected post uses current Microsoft terminology while keeping Portainer’s field names intact.
- For Azure ACI environments, Portainer sets the endpoint URL internally to `https://management.azure.com`; users do not provide a Docker socket or TCP URL for this environment type.
- Portainer’s public API docs page documents generic environment creation examples, but not an ACI-specific example. The exact ACI request fields were verified against Portainer’s current source code.
