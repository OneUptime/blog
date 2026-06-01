# Validation Summary: How to Deploy an ASP.NET Core Blazor WebAssembly App to Azure Static Web Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ASP.NET Core Blazor WebAssembly
- Azure Static Web Apps
- Azure Functions isolated worker
- Azure CLI
- Azure Static Web Apps CLI
- GitHub Actions
- C#
- WebAssembly

## Sources Consulted
- Microsoft Learn: Deploy a Blazor app on Azure Static Web Apps: https://learn.microsoft.com/en-us/azure/static-web-apps/deploy-blazor
- Microsoft Learn: Host and deploy ASP.NET Core standalone Blazor WebAssembly with Azure Static Web Apps: https://learn.microsoft.com/en-us/aspnet/core/blazor/host-and-deploy/webassembly/azure-static-web-apps
- Microsoft Learn: Tooling for ASP.NET Core Blazor: https://learn.microsoft.com/en-us/aspnet/core/blazor/tooling
- Microsoft Learn: Azure Static Web Apps configuration: https://learn.microsoft.com/en-us/azure/static-web-apps/configuration
- Microsoft Learn: Supported languages and runtimes in Azure Static Web Apps: https://learn.microsoft.com/en-us/azure/static-web-apps/languages-runtimes
- Microsoft Learn: API support in Azure Static Web Apps with Azure Functions: https://learn.microsoft.com/en-us/azure/static-web-apps/apis-functions
- Microsoft Learn: Azure Static Web Apps CLI reference: https://learn.microsoft.com/en-us/azure/static-web-apps/static-web-apps-cli
- Microsoft Learn: Azure CLI az staticwebapp reference: https://learn.microsoft.com/en-us/cli/azure/staticwebapp
- Microsoft Learn: Azure CLI az staticwebapp hostname reference: https://learn.microsoft.com/en-us/cli/azure/staticwebapp/hostname
- Microsoft Learn: Add authentication to your static site in Azure Static Web Apps: https://learn.microsoft.com/en-us/azure/static-web-apps/add-authentication
- Microsoft Learn: Azure Static Web Apps custom domains with external providers: https://learn.microsoft.com/en-us/azure/static-web-apps/custom-domain-external
- Microsoft Learn: Azure Static Web Apps FAQ: https://learn.microsoft.com/en-us/azure/static-web-apps/faq

## Issues Found
- The project creation text said the tutorial used the hosted Blazor WebAssembly template, but the command created a standalone app. Updated the text to describe the standalone template, which is the current template used for this scenario.
- The Blazor project command did not pin the framework version, while the API and workflow were based on .NET 8. Added `-f net8.0` so the generated client matches the .NET 8 Functions API and workflow.
- The `FetchData.razor` snippet referenced `WeatherForecast` from `BlazorStaticDemo.Models` without importing that namespace. Added `@using BlazorStaticDemo.Models`.
- The model comment called the type shared between the Blazor client and API, but the API snippet returns an anonymous object and does not reference the model. Changed the comment to say it is used by the Blazor client.
- The project structure showed an extra nested Blazor client folder that did not match the `dotnet new blazorwasm -n BlazorStaticDemo` command followed by `cd BlazorStaticDemo`. Updated the structure to show the project files and `Api/` folder side by side.
- The Static Web Apps configuration instructions conflicted about file location and did not specify the managed Functions runtime. Clarified that the file is saved under `wwwroot` so it is copied to the published output, and added `platform.apiRuntime` with `dotnet-isolated:8.0`.
- The local SWA CLI command assumed a Blazor dev server was already running on port 5000. Added `--run "dotnet watch run"` so the command starts the Blazor dev server while proxying the API.
- The Azure CLI and GitHub Actions path settings did not match the generated project layout. Updated `app_location` to `/` and `api_location` to `Api`.
- The GitHub Actions workflow included a manual `dotnet publish` step whose output was not used by the deploy action. Removed that step so the deploy action builds from the configured app and API locations.
- The authentication API example used `GetValues` directly, which can fail when the `x-ms-client-principal` header is missing. Changed it to `TryGetValues` and added a null/empty check before decoding.

## Review Notes
The examples are valid for .NET 8 and Azure Static Web Apps managed Functions using `dotnet-isolated:8.0`. The review environment did not have `dotnet`, `az`, or Azure Functions Core Tools installed, so command behavior was verified against official documentation rather than local CLI execution.
