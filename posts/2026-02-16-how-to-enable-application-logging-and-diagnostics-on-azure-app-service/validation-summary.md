# Validation Summary: How to Enable Application Logging and Diagnostics on Azure App Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure App Service
- Azure App Service logs and Log stream
- Azure CLI
- Kudu
- Application Insights
- Node.js Application Insights SDK
- ARM templates for Microsoft.Web/sites/config logs
- Azure App Service Health Check

## Sources Consulted
- Microsoft Learn: Enable diagnostic logs for apps in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/troubleshoot-diagnostic-logs
- Microsoft Learn: Azure CLI `az webapp log` reference - https://learn.microsoft.com/en-us/cli/azure/webapp/log
- Microsoft Learn: Monitor Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/monitor-app-service
- Microsoft Learn: Monitor App Service instances by using Health check - https://learn.microsoft.com/en-us/azure/app-service/monitor-instances-health-check
- Microsoft Learn: Microsoft.Web/sites/config 'logs' ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.web/2022-09-01/sites/config-logs
- Microsoft Learn: Application Insights Node.js classic SDK documentation - https://learn.microsoft.com/en-us/azure/azure-monitor/app/nodejs
- Microsoft Learn: Application Insights FAQ / retention information - https://learn.microsoft.com/en-us/azure/azure-monitor/app/application-insights-faq
- Project Kudu wiki: Diagnostic Log Stream - https://github.com/projectkudu/kudu/wiki/Diagnostic-Log-Stream

## Issues Found
- The post described web server logs as IIS on Windows and Nginx on Linux. Microsoft documentation lists App Service web server logs as a Windows feature, so the wording was corrected to Windows/IIS and Linux/container guidance now points to application or container logging.
- The application logging portal section implied blob storage was generally available for all stacks. Microsoft documentation says only .NET application logs can be written to blob storage without code changes, while Java, PHP, Node.js, and Python use the App Service file system unless the app writes logs externally. The text was updated.
- The blob storage note referred to configuring a storage account connection string and container name in Diagnostic settings. App Service log configuration uses a storage container in the portal or a container SAS URL in ARM configuration, so the wording was corrected.
- The web server logging CLI example claimed retention/quota could be configured through the shown CLI command and combined web server logging with Docker container logging. The Azure CLI reference does not expose retention/quota flags on `az webapp log config`, so the example was revised to show Windows web server logging separately from Linux/custom container stdout/stderr logging.
- The log streaming CLI example used `--filter Application`, which is not a valid `az webapp log tail` option. It was changed to `--provider application`.
- The download logs section described only the Windows ZIP layout. It was updated with the documented Windows folder names and a Linux/custom container caveat.
- The Application Insights section stated no-code telemetry only for .NET and Java and implied SDK installation for Node.js/Python. Current App Service monitoring documentation supports App Service-managed instrumentation for supported stacks, with SDKs recommended for custom telemetry, unsupported hosting, or more control. The wording was updated.
- The Node.js Application Insights example used `.setAutoCollectConsole(true)` while the SDK documentation says console methods such as `console.log` require `.setAutoCollectConsole(true, true)`. The example was corrected.

## Review Notes
- Azure CLI was not installed in the local workspace, so CLI verification was performed against the official Microsoft Learn Azure CLI reference instead of local `az --help` output.
- The Node.js Application Insights SDK page identifies the documented package as the classic API and recommends Azure Monitor OpenTelemetry Distro for new applications. The sample remains valid, but a future update could modernize the post around OpenTelemetry.
