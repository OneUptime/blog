# Validation Summary: How to Create and Publish APIs in Azure API Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure API Management
- Azure Portal
- REST APIs
- API Management products and subscriptions
- API Management policies
- Named values
- Developer portal
- Application Insights

## Sources Consulted
- Microsoft Learn: Manually add an API in Azure API Management - https://learn.microsoft.com/en-gb/azure/api-management/add-api-manually
- Microsoft Learn: Import SOAP API to API Management - https://learn.microsoft.com/en-us/azure/api-management/import-soap-api
- Microsoft Learn: API import restrictions and known issues - https://learn.microsoft.com/en-us/azure/api-management/api-management-api-import-restrictions
- Microsoft Learn: Use named values in Azure API Management policies - https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-properties
- Microsoft Learn: Azure API Management policy reference - set-header - https://learn.microsoft.com/en-us/azure/api-management/set-header-policy
- Microsoft Learn: Tutorial: Create and publish a product - https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-add-products
- Microsoft Learn: Subscriptions in Azure API Management - https://learn.microsoft.com/en-us/azure/api-management/api-management-subscriptions
- Microsoft Learn: Feature-based comparison of Azure API Management tiers - https://learn.microsoft.com/en-us/azure/api-management/api-management-features
- Microsoft Learn: Tutorial: Access and customize the developer portal - https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-developer-portal-customize
- Microsoft Learn: Authorize developer accounts by using Microsoft Entra ID - https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-aad
- Microsoft Learn: Configure users of the developer portal to authenticate using usernames and passwords - https://learn.microsoft.com/en-us/azure/api-management/developer-portal-basic-authentication

## Issues Found
- The post described WADL as an older SOAP-style definition. WADL is a supported API description format, while SOAP import uses WSDL. I changed the list to describe WADL separately and added WSDL for SOAP APIs.
- The manual API creation instructions said to select "Blank API" while also configuring a backend Web service URL. Current Microsoft guidance for manually adding an API with a backend URL uses the "HTTP" tile. I changed the instruction to select "HTTP."
- The developer portal authentication provider examples used the older "Azure AD" name and listed B2C as a default new-deployment option. I updated the text to Microsoft Entra ID, Microsoft Entra External ID, or username/password.

## Review Notes
The `set-header` policy syntax, named value reference syntax, product publishing flow, subscription key header/query parameter names, Consumption tier developer portal limitation, and developer portal publish step were verified against current Microsoft Learn documentation. Microsoft documentation notes that unpublished products are not discoverable in the developer portal, but APIs in a product may still be accessible through the gateway depending on subscription and API settings.
