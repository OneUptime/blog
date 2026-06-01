# Validation Summary: How to Configure CORS Policies on Azure App Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure App Service
- Azure CLI
- ARM templates
- Terraform AzureRM provider
- ASP.NET Core CORS middleware
- HTTP CORS and browser same-origin policy

## Sources Consulted
- Microsoft Learn: Tutorial: Host a RESTful API with CORS - Azure App Service - https://learn.microsoft.com/en-gb/azure/app-service/app-service-web-tutorial-rest-api
- Microsoft Learn: Azure CLI `az webapp cors` reference - https://learn.microsoft.com/en-us/cli/azure/webapp/cors
- Microsoft Learn: ARM template reference for `Microsoft.Web/sites/config` 2022-03-01 CORS settings - https://learn.microsoft.com/en-us/azure/templates/microsoft.web/2022-03-01/sites/config
- HashiCorp Terraform Registry: `azurerm_linux_web_app` CORS block - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app
- Microsoft Learn: Enable Cross-Origin Requests (CORS) in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/security/cors
- MDN Web Docs: Cross-Origin Resource Sharing (CORS) - https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- MDN Web Docs: `Access-Control-Allow-Origin` header - https://developer.mozilla.org/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Origin
- RFC 6454: The Web Origin Concept - https://www.rfc-editor.org/rfc/rfc6454.html

## Issues Found
- The post said the Azure portal approach "only configures `Access-Control-Allow-Origin`." Microsoft documents App Service CORS as configuring allowed origins while automatically allowing all methods and headers for those origins, with `supportCredentials` available separately. Updated the wording to match the built-in feature's actual behavior.
- The post stated that Azure automatically responds to OPTIONS preflight requests with a 200 status. The important behavior is that App Service handles preflight requests for configured origins and emits the relevant CORS headers; relying on status code alone is misleading because failed preflights may still return a successful HTTP status without CORS headers. Updated the debugging guidance.
- The same-origin policy explanation said browsers prevent malicious sites from making API requests. That is too broad because the browser primarily prevents cross-origin response access, while some cross-site requests can still be sent. Updated the wording to focus on reading responses.
- The description of "simple" requests omitted HEAD and the content-type restrictions for POST. Updated the preflight explanation to use the CORS safelisted-method/content-type distinction.

## Review Notes
The CLI, ARM template, Terraform, and ASP.NET Core examples are syntactically consistent with current official documentation. The Azure CLI was not installed locally in this workspace, so CLI syntax was validated against the current Microsoft Learn command reference instead of local `az --help` output.
