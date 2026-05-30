# Validation Summary: How to Stream Logs to Azure Blob Storage from Azure App Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure App Service
- Azure Blob Storage
- Azure CLI
- Azure Monitor diagnostic settings
- App Service application logs and web server logs
- Node.js logging with Winston
- ASP.NET Core logging

## Sources Consulted
- Microsoft Learn: Enable diagnostic logging for apps in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/troubleshoot-diagnostic-logs
- Microsoft Learn: Azure CLI `az webapp log config` reference - https://learn.microsoft.com/en-us/cli/azure/webapp/log
- Microsoft Learn: Azure App Service app settings reference - https://learn.microsoft.com/en-us/azure/app-service/reference-app-settings
- Microsoft Learn: Azure App Service monitoring data reference - https://learn.microsoft.com/en-us/azure/app-service/monitor-app-service-reference
- Microsoft Learn: Tutorial to troubleshoot Azure App Service with Azure Monitor - https://learn.microsoft.com/en-us/azure/app-service/tutorial-troubleshoot-monitor
- Microsoft Learn: Create diagnostic settings in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/create-diagnostic-settings
- Microsoft Learn: Manage blob containers using Azure CLI - https://learn.microsoft.com/en-us/azure/storage/blobs/blob-containers-cli
- Microsoft Learn: Authorize access to blob data with Azure CLI - https://learn.microsoft.com/en-us/azure/storage/blobs/authorize-data-operations-cli
- Microsoft Learn: ASP.NET Core apps in Azure App Service - https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/azure-apps
- Microsoft Learn: `AddAzureWebAppDiagnostics` API reference - https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.logging.azureappservicesloggerfactoryextensions.addazurewebappdiagnostics

## Issues Found
- The post claimed App Service local logs are wiped when the instance restarts. Updated this to the documented behavior that logs on the App Service file system are subject to quota and retention limits.
- The post implied built-in Application Logging (Blob) works for all runtimes. Updated it to note the documented runtime/platform limits and to recommend Azure Monitor diagnostic settings or application-side external logging for Node.js, Python, Java, Linux, and container scenarios.
- The SAS generation example did not show how the SAS was signed and omitted HTTPS-only. Updated it to retrieve a storage account key, create service SAS tokens, and include `--https-only`.
- The web server logging command used `--web-server-logging azureblobstorage`, which is not a valid Azure CLI value. Updated it to use `--web-server-logging filesystem` and set `WEBSITE_HTTPLOGGING_CONTAINER_URL` / `WEBSITE_HTTPLOGGING_RETENTION_DAYS` for the blob destination.
- The web server logging step used `az resource update` settings that did not configure a blob destination. Replaced it with the documented App Service app settings for web server log storage.
- The Node.js example said App Service captures stdout/stderr and sends it to blob storage through built-in Application Logging (Blob). Updated the text to point Node.js stdout/stderr collection to Azure Monitor diagnostic settings via `AppServiceConsoleLogs`.
- The .NET example only added console logging. Updated it to include `AddAzureWebAppDiagnostics()` and note the required Azure App Service logging package.
- The blob naming convention was presented too specifically and did not account for Azure Monitor diagnostic settings storage layout. Replaced it with a more accurate distinction between built-in App Service blob logging and diagnostic settings storage paths.
- The Log Analytics diagnostic setting used a workspace name instead of a workspace resource ID. Updated it to use the resource ID form shown in Azure Monitor CLI examples.
- The diagnostic settings storage example used a bare storage account name and deprecated per-setting retention policies. Updated it to use a storage account resource ID and removed deprecated retention policy fields.

## Review Notes
The tutorial is technically relevant and remains useful after correction. Built-in App Service logging and Azure Monitor diagnostic settings overlap but produce different storage layouts and support different runtime categories, so future revisions could make the Windows/.NET built-in path and the cross-platform Azure Monitor path more explicitly separate.
