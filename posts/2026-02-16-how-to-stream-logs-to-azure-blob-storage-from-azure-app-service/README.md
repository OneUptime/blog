# How to Stream Logs to Azure Blob Storage from Azure App Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, Blob Storage, Logging, Diagnostic, Monitoring, Web Apps

Description: Learn how to configure Azure App Service to stream application and web server logs directly to Azure Blob Storage for long-term retention and analysis.

---

Azure App Service generates several types of logs - application logs, web server logs, detailed error pages, and request tracing. By default, many of these logs are stored on the App Service file system, where they are subject to quota and retention limits. Streaming logs to Azure Blob Storage solves this by providing durable, cost-effective, long-term log storage that persists regardless of what happens to your App Service instances.

This guide covers configuring all the log types, setting up blob storage as the destination, and querying the stored logs.

## Types of App Service Logs

Azure App Service produces several log categories:

- **Application Logging**: Output from your application code (console.log, logger.info, etc.)
- **Web Server Logging**: HTTP request logs in W3C extended format
- **Detailed Error Messages**: HTML pages for HTTP 400+ error responses
- **Failed Request Tracing**: Detailed XML traces for failed requests
- **Deployment Logging**: Logs from deployment operations

Application logging and web server logging can be directed to blob storage for Windows apps. The built-in Application Logging (Blob) option is primarily for .NET application logs; for Node.js, Python, Java, Linux, and container apps, use Azure Monitor diagnostic settings or write directly to external logging from your application. The other built-in App Service log types are stored on the file system only.

## Step 1: Create a Storage Account for Logs

Create a dedicated storage account for log storage. Using a separate account from your application data keeps logs isolated and makes it easier to manage retention and access:

```bash
# Create a resource group for logging resources

az group create \
  --name rg-logging \
  --location eastus2

# Create a storage account optimized for log storage
az storage account create \
  --name stappservicelogs2026 \
  --resource-group rg-logging \
  --location eastus2 \
  --sku Standard_LRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false

# Create a container for application logs
az storage container create \
  --account-name stappservicelogs2026 \
  --name app-logs \
  --auth-mode login

# Create a container for web server logs
az storage container create \
  --account-name stappservicelogs2026 \
  --name web-server-logs \
  --auth-mode login
```

## Step 2: Generate a SAS URL for Log Storage

App Service needs a SAS URL to write logs to blob storage. Generate one with write and list permissions. This example uses a service SAS signed with the storage account key so the token can have a long expiry:

```bash
# Generate a SAS token valid for 1 year
# Set a long expiry since App Service will use this continuously
EXPIRY=$(date -u -d "+365 days" '+%Y-%m-%dT%H:%MZ')

# Get a storage account key for signing the service SAS
ACCOUNT_KEY=$(az storage account keys list \
  --account-name stappservicelogs2026 \
  --resource-group rg-logging \
  --query "[0].value" \
  --output tsv)

# SAS URL for application logs container
APP_LOG_SAS=$(az storage container generate-sas \
  --account-name stappservicelogs2026 \
  --name app-logs \
  --permissions rwdl \
  --https-only \
  --expiry "$EXPIRY" \
  --account-key "$ACCOUNT_KEY" \
  --output tsv)

APP_LOG_URL="https://stappservicelogs2026.blob.core.windows.net/app-logs?${APP_LOG_SAS}"

# SAS URL for web server logs container
WEB_LOG_SAS=$(az storage container generate-sas \
  --account-name stappservicelogs2026 \
  --name web-server-logs \
  --permissions rwdl \
  --https-only \
  --expiry "$EXPIRY" \
  --account-key "$ACCOUNT_KEY" \
  --output tsv)

WEB_LOG_URL="https://stappservicelogs2026.blob.core.windows.net/web-server-logs?${WEB_LOG_SAS}"
```

Set a reminder to regenerate the SAS token before it expires. When it expires, logging stops silently.

## Step 3: Enable Application Logging to Blob Storage

Configure App Service to send application logs to blob storage:

```bash
# Enable application logging to blob storage
az webapp log config \
  --resource-group rg-app \
  --name mywebapp-2026 \
  --application-logging azureblobstorage \
  --level information \
  --detailed-error-messages true \
  --failed-request-tracing true
```

Now set the blob storage URL for application logging. This is done through the App Service resource configuration:

```bash
# Set the application log blob storage SAS URL
az webapp config appsettings set \
  --resource-group rg-app \
  --name mywebapp-2026 \
  --settings \
    DIAGNOSTICS_AZUREBLOBCONTAINERSASURL="$APP_LOG_URL" \
    DIAGNOSTICS_AZUREBLOBRETENTIONINDAYS=90
```

Alternatively, configure through the Azure portal under **App Service > Monitoring > App Service logs**. Set Application Logging (Blob) to the desired level and provide the SAS URL.

## Step 4: Enable Web Server Logging to Blob Storage

Web server logging captures HTTP request details in W3C format:

```bash
# Enable web server logging
az webapp log config \
  --resource-group rg-app \
  --name mywebapp-2026 \
  --web-server-logging filesystem
```

Set the blob storage URL for web server logs:

```bash
# Configure web server log blob storage destination
az webapp config appsettings set \
  --resource-group rg-app \
  --name mywebapp-2026 \
  --settings \
    WEBSITE_HTTPLOGGING_CONTAINER_URL="$WEB_LOG_URL" \
    WEBSITE_HTTPLOGGING_RETENTION_DAYS=90
```

The Azure CLI currently uses `filesystem` or `off` for `--web-server-logging`; when `WEBSITE_HTTPLOGGING_CONTAINER_URL` is set for a Windows app, App Service writes the web server logs to the configured blob container instead of the default file system location.

## Step 5: Configure Log Levels

Choose the right log level for your environment. Higher verbosity generates more data and costs more to store:

| Level | What it captures | Recommended for |
|-------|-----------------|----------------|
| Error | Errors only | Production (minimal) |
| Warning | Errors + warnings | Production (standard) |
| Information | Errors + warnings + info | Staging |
| Verbose | Everything | Development/debugging |

```bash
# Set log level to Warning for production
az webapp log config \
  --resource-group rg-app \
  --name mywebapp-2026 \
  --application-logging azureblobstorage \
  --level warning

# Temporarily increase to Verbose for debugging
az webapp log config \
  --resource-group rg-app \
  --name mywebapp-2026 \
  --application-logging azureblobstorage \
  --level verbose
```

Remember to reduce the log level after debugging. Verbose logging can generate gigabytes of data per day for busy applications.

## Step 6: Configure Log Retention

Set up lifecycle management on the storage account to automatically delete old logs:

```bash
# Create a lifecycle policy to delete logs older than 90 days
az storage account management-policy create \
  --account-name stappservicelogs2026 \
  --resource-group rg-logging \
  --policy '{
    "rules": [
      {
        "name": "delete-old-app-logs",
        "enabled": true,
        "type": "Lifecycle",
        "definition": {
          "filters": {
            "blobTypes": ["blockBlob"],
            "prefixMatch": ["app-logs/"]
          },
          "actions": {
            "baseBlob": {
              "delete": {
                "daysAfterModificationGreaterThan": 90
              }
            }
          }
        }
      },
      {
        "name": "delete-old-web-logs",
        "enabled": true,
        "type": "Lifecycle",
        "definition": {
          "filters": {
            "blobTypes": ["blockBlob"],
            "prefixMatch": ["web-server-logs/"]
          },
          "actions": {
            "baseBlob": {
              "delete": {
                "daysAfterModificationGreaterThan": 90
              }
            }
          }
        }
      }
    ]
  }'
```

## Step 7: Application-Level Logging in Code

Make sure your application code is producing structured logs that are useful for analysis.

For a Node.js application, this console output can be collected by Azure Monitor diagnostic settings through `AppServiceConsoleLogs`. The built-in Application Logging (Blob) setting does not send Node.js console logs to blob storage without additional application-side logging:

```javascript
// logger.js
// Configure structured logging that App Service captures from stdout/stderr
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Console transport - App Service captures stdout/stderr
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level.toUpperCase()}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      )
    })
  ]
});

// Usage in your application
logger.info('Request processed', {
  method: 'GET',
  path: '/api/users',
  duration: 45,
  statusCode: 200
});

logger.error('Database connection failed', {
  host: 'dbserver',
  port: 5432,
  error: 'Connection timeout'
});

module.exports = logger;
```

For a .NET application with the `Microsoft.Extensions.Logging.AzureAppServices` package referenced, the built-in Azure App Service logging provider can send application logs to the App Service diagnostics pipeline:

```csharp
// Program.cs
// Configure logging for the App Service diagnostics pipeline
var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddAzureWebAppDiagnostics();

// Set minimum log level from configuration
builder.Logging.SetMinimumLevel(
    builder.Configuration.GetValue<LogLevel>("Logging:LogLevel:Default", LogLevel.Information)
);
```

## Step 8: Browse and Analyze Stored Logs

Once logs are flowing to blob storage, you can browse and analyze them:

```bash
# List log blobs for a specific date
az storage blob list \
  --account-name stappservicelogs2026 \
  --container-name app-logs \
  --prefix "mywebapp-2026/2026/02/16" \
  --output table

# Download logs for analysis
az storage blob download-batch \
  --account-name stappservicelogs2026 \
  --source app-logs \
  --pattern "mywebapp-2026/2026/02/16/*" \
  --destination ./downloaded-logs/
```

Built-in App Service blob logging stores logs under folders for the app and timestamp. Azure Monitor diagnostic settings use a different storage layout, with folders such as `insights-logs-appservicehttplogs` and resource ID partitions.

For more advanced analysis, connect the blob storage to Azure Data Explorer or Log Analytics:

```bash
# Create a diagnostic setting to also send logs to Log Analytics
az monitor diagnostic-settings create \
  --resource "/subscriptions/<sub-id>/resourceGroups/rg-app/providers/Microsoft.Web/sites/mywebapp-2026" \
  --name diag-to-loganalytics \
  --workspace "/subscriptions/<sub-id>/resourceGroups/rg-app/providers/Microsoft.OperationalInsights/workspaces/law-app-monitoring" \
  --logs '[{"category":"AppServiceHTTPLogs","enabled":true},{"category":"AppServiceConsoleLogs","enabled":true},{"category":"AppServiceAppLogs","enabled":true}]'
```

## Using Diagnostic Settings as an Alternative

Azure Diagnostic Settings offer a more modern approach than the built-in App Service logging configuration. With diagnostic settings, logs are sent directly to Log Analytics, Event Hub, or a storage account without needing SAS tokens:

```bash
# Configure diagnostic settings to send logs to blob storage
az monitor diagnostic-settings create \
  --resource "/subscriptions/<sub-id>/resourceGroups/rg-app/providers/Microsoft.Web/sites/mywebapp-2026" \
  --name diag-to-blob \
  --storage-account "/subscriptions/<sub-id>/resourceGroups/rg-logging/providers/Microsoft.Storage/storageAccounts/stappservicelogs2026" \
  --logs '[{"category":"AppServiceHTTPLogs","enabled":true},{"category":"AppServiceConsoleLogs","enabled":true},{"category":"AppServiceAppLogs","enabled":true}]'
```

This approach is preferred for new deployments because it integrates with Azure Monitor and does not require manual SAS token management.

## Wrapping Up

Streaming App Service logs to Azure Blob Storage gives you durable, searchable, cost-effective log retention. Whether you use the built-in App Service logging configuration with SAS URLs or the newer Diagnostic Settings approach, the result is the same: your logs persist beyond the lifecycle of individual App Service instances. Set appropriate log levels for each environment, configure lifecycle policies to manage storage costs, and consider forwarding logs to Log Analytics for real-time querying and alerting.
