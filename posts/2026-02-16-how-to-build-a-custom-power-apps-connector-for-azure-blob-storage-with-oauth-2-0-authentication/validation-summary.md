# Validation Summary: How to Build a Custom Power Apps Connector for Azure Blob Storage with OAuth

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Power Apps
- Power Platform custom connectors
- Azure Blob Storage REST API
- OAuth 2.0
- Microsoft Entra ID / Azure Active Directory
- Azure RBAC
- Azure Storage service versioning

## Sources Consulted
- Microsoft Learn: Specify connection parameters for custom connectors - https://learn.microsoft.com/en-us/connectors/custom-connectors/connection-parameters
- Microsoft Learn: Authenticate your API and connector with Microsoft Entra ID - https://learn.microsoft.com/en-us/connectors/custom-connectors/azure-active-directory-authentication
- Microsoft Learn: Custom connectors overview - https://learn.microsoft.com/en-us/connectors/custom-connectors/
- Microsoft Learn: Policy templates overview - https://learn.microsoft.com/en-us/connectors/custom-connectors/policy-templates
- Microsoft Learn: Set HTTP Header policy template - https://learn.microsoft.com/en-us/connectors/custom-connectors/policy-templates/setheader/setheader
- Microsoft Learn: Authorize with Microsoft Entra ID for Azure Storage REST API - https://learn.microsoft.com/en-us/rest/api/storageservices/authorize-with-azure-active-directory
- Microsoft Learn: Versioning for Azure Storage - https://learn.microsoft.com/en-us/rest/api/storageservices/versioning-for-the-azure-storage-services
- Microsoft Learn: List Blobs REST API - https://learn.microsoft.com/en-us/rest/api/storageservices/list-blobs
- Microsoft Learn: Put Blob REST API - https://learn.microsoft.com/en-us/rest/api/storageservices/put-blob

## Issues Found
- The post used the old global custom connector redirect URI (`https://global.consent.azure-apim.net/redirect`) as the URI to enter during app registration. Updated the guidance to use the connector-specific Redirect URL shown after saving the custom connector, matching current Power Platform custom connector behavior.
- The post omitted Azure RBAC requirements for Microsoft Entra-authorized Azure Storage data operations. Added guidance that users still need storage data-plane roles such as Storage Blob Data Reader or Storage Blob Data Contributor.
- The OAuth security fields mixed Microsoft Entra ID provider settings with Generic OAuth fields. Updated the Power Apps custom connector configuration to use Tenant ID and Resource URL for the Azure Active Directory identity provider.
- The post described adding raw API Management policy XML under `x-ms-connector-metadata`. Replaced this with the supported Set HTTP header policy template configuration and noted that exported connector policy template instances are stored in connector properties.
- The post stated that Power Apps automatically parses the XML returned by List Blobs. Adjusted the wording to say the response is XML and should be exposed through a predictable connector schema or transformed to JSON when needed.
- The token refresh troubleshooting assumed a visible Refresh URL for all OAuth configurations. Clarified that this applies when using Generic OAuth rather than the Azure Active Directory identity provider.

## Review Notes
The Blob REST request paths, use of `x-ms-blob-type: BlockBlob`, and the `x-ms-version: 2023-11-03` examples are valid. Microsoft documentation currently recommends newer Azure Storage service versions where possible, but `2023-11-03` remains a supported service version and is acceptable for a tutorial that intentionally pins a specific REST API version.
