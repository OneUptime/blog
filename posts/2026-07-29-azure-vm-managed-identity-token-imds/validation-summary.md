# Validation Summary: Get a Managed Identity Token from Azure VM IMDS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Microsoft Azure
- Azure Virtual Machines
- Managed identities for Azure resources
- Azure Instance Metadata Service (IMDS)
- Microsoft Entra ID OAuth access tokens
- Azure CLI
- cURL
- Azure Identity SDK
- Azure Resource Manager
- Azure Key Vault
- Azure Storage

## Sources Consulted
- [Use managed identities on a virtual machine to acquire an access token](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/how-to-use-vm-token)
- [Azure Instance Metadata Service](https://learn.microsoft.com/en-us/azure/virtual-machines/instance-metadata-service)
- [Azure CLI: `az vm identity`](https://learn.microsoft.com/en-us/cli/azure/vm/identity?view=azure-cli-latest)
- [How managed identities work with Azure virtual machines](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/how-managed-identities-work-vm)
- [Configure managed identities on Azure virtual machines](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/how-to-configure-managed-identities)
- [Managed identities frequently asked questions](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/managed-identities-faq)
- [Azure REST API specification for IMDS API version 2018-02-01](https://github.com/Azure/azure-rest-api-specs/blob/main/specification/imds/data-plane/InstanceMetadataService/stable/2018-02-01/imds.json)
- [Azure Key Vault authentication, requests, and responses](https://learn.microsoft.com/en-us/azure/key-vault/general/authentication-requests-and-responses)
- [Authorize Azure Storage with Microsoft Entra ID](https://learn.microsoft.com/en-us/rest/api/storageservices/authorize-with-azure-active-directory)
- [Managed identity developer guidelines](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview-for-developers)
- [Azure Identity authentication best practices](https://learn.microsoft.com/en-us/dotnet/azure/sdk/authentication/best-practices)
- [Azure IP address 168.63.129.16 overview](https://learn.microsoft.com/en-us/azure/virtual-network/what-is-ip-address-168-63-129-16)

## Issues Found
- The Azure resource ID selector was named `mi_res_id`. Changed it to the documented IMDS parameter name, `msi_res_id`.
- The identity-selection guidance implied that IMDS could choose the first user-assigned identity and silently switch identities. Clarified the documented defaults: IMDS uses the system-assigned identity when enabled, otherwise it can use a sole user-assigned identity, and it rejects the request as ambiguous when multiple user-assigned identities exist without a system-assigned identity or explicit selector.
- The error guidance grouped HTTP 404 with connection failures and treated it only as a placement or proxy problem. Split the cases because Microsoft documents an identity-endpoint 404 as transient while IMDS is updating and recommends exponential backoff.
- The HTTP 429 guidance assumed a `Retry-After` header. Replaced it with the documented bounded exponential-backoff guidance, and added the documented one-second minimum wait before retrying 5xx responses.

## Review Notes
API version `2018-02-01` remains supported for the IMDS managed identity endpoint. Token lifetimes can vary, so application code should continue to use `expires_on` rather than assuming the illustrative `expires_in` value. The direct HTTP examples are suitable for diagnostics, while the recommendation to prefer Azure Identity SDK credentials for production use is current.
