# Validation Summary: How to Migrate ASP.NET Web Apps to Azure App Service Using Azure Migrate

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure Migrate
- Azure App Service
- ASP.NET and ASP.NET Core
- IIS
- .NET Framework and .NET
- GitHub Actions
- Azure App Service configuration, scaling, TLS, and monitoring

## Sources Consulted
- Microsoft Learn: Create an Azure App Service assessment - https://learn.microsoft.com/en-us/azure/migrate/how-to-create-azure-app-service-assessment
- Microsoft Learn: Modernize ASP.NET web apps to Azure App Service code - https://learn.microsoft.com/en-us/azure/migrate/tutorial-modernize-asp-net-appservice-code
- Microsoft Learn: Support matrix for physical discovery and assessment in Azure Migrate and Modernize - https://learn.microsoft.com/en-us/azure/migrate/migrate-support-matrix-physical
- Microsoft Learn: Operating system functionality in Azure App Service - https://learn.microsoft.com/en-ca/azure/app-service/operating-system-functionality
- Microsoft Learn: Configure ASP.NET apps in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/configure-language-dotnet-framework
- Microsoft Learn: Configure an App Service app - https://learn.microsoft.com/en-us/azure/app-service/configure-common
- Microsoft Learn: Environment variables and app settings in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/reference-app-settings
- Microsoft Learn: TLS/SSL certificates in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/overview-tls
- Microsoft Learn: Authentication and authorization in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/overview-authentication-authorization

## Issues Found
- Corrected the opening statement that all certificate management goes away in App Service. App Service reduces this work, especially with managed certificates, but custom domain TLS still has configuration and prerequisite requirements.
- Corrected Azure Migrate appliance wording to say the appliance must be deployed or upgraded for web app discovery, and clarified that it is the discovery and assessment appliance rather than only the server migration appliance.
- Corrected web app discovery mechanics from WMI to WinRM and PowerShell remoting, matching Azure Migrate support documentation.
- Corrected the credential requirement. Local administrator access is supported, but Microsoft documents a least-privileged option using Remote Management Users, IIS_IUSRS, and read access to IIS configuration files.
- Corrected Azure App Service assessment properties. The current assessment settings include target location, isolation requirement, and savings options; it is not a direct pricing-tier selection flow.
- Corrected the cost estimate explanation. Azure App Service assessments are configuration-based and do not collect web app performance data.
- Corrected App Service file-system guidance. `%HOME%` is persistent shared storage, while `%SystemDrive%\local` is temporary and non-persistent.
- Corrected registry guidance. App Service allows read-only access to much of the registry but blocks registry writes and should not be used for persistent configuration.
- Corrected COM guidance. Some pre-registered in-process COM components can be called, but arbitrary custom COM registration on App Service workers is not supported.
- Replaced the standalone Azure App Service Migration Assistant flow with the current integrated Azure Migrate migration flow for assessed ASP.NET web apps.
- Updated .NET runtime guidance to avoid a stale fixed list of .NET versions and point readers to the App Service-supported runtime stack or custom containers for unsupported runtimes.

## Review Notes
The GitHub Actions workflow is syntactically valid for SDK-style .NET projects. Older ASP.NET Framework projects may need MSBuild or Visual Studio build tooling rather than `dotnet publish`, but the post presents the workflow as an alternative example rather than the Azure Migrate path.
