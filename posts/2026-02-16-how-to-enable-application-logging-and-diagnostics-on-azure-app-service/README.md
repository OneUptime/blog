# How to Enable Application Logging and Diagnostics on Azure App Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, Logging, Diagnostics, Monitoring, Cloud Computing, Troubleshooting

Description: Step-by-step instructions for enabling and configuring application logging and diagnostic tools on Azure App Service to debug issues faster.

---

When your application running on Azure App Service starts misbehaving, the first thing you need is logs. Good logging is the difference between spending five minutes finding a bug and spending five hours guessing. Azure App Service provides several logging and diagnostic features out of the box, but most of them are turned off by default.

This post walks through how to enable each type of logging, where the logs end up, and how to use them to diagnose real problems.

## Types of Logging in Azure App Service

Azure App Service offers several distinct logging features:

- **Application Logging** - Captures output from your application code (console.log, ILogger, etc.)
- **Web Server Logging** - Raw HTTP request logs from the web server (IIS on Windows, Nginx on Linux)
- **Detailed Error Messages** - Full HTML error pages for HTTP errors (4xx and 5xx)
- **Failed Request Tracing** - Detailed tracing of failed HTTP requests through the IIS pipeline (Windows only)
- **Deployment Logging** - Logs from the deployment process itself

Let us go through each one.

## Enabling Application Logging

Application logging captures output that your code writes to the standard logging framework. On Windows App Service, this includes anything written to System.Diagnostics.Trace. On Linux, it captures stdout and stderr.

### Through the Azure Portal

1. Navigate to your App Service
2. Go to "App Service logs" in the Monitoring section
3. For Application Logging, you have two options:
   - **File System** - Logs are written to the App Service file system. This option automatically turns off after 12 hours to prevent filling up your disk.
   - **Blob Storage** - Logs are written to an Azure Storage blob container. This stays on indefinitely and is better for long-term retention.
4. Set the logging level (Error, Warning, Information, or Verbose)
5. Click Save

### Through Azure CLI

Here is how to enable application logging using the CLI:

```bash
# Enable application logging to the file system with Information level
az webapp log config \
    --resource-group my-resource-group \
    --name my-app-service \
    --application-logging filesystem \
    --level information

# Enable application logging to blob storage
az webapp log config \
    --resource-group my-resource-group \
    --name my-app-service \
    --application-logging azureblobstorage \
    --level information
```

For blob storage, you also need to configure the storage account connection string and container name in the Diagnostic settings.

## Enabling Web Server Logging

Web server logs give you raw HTTP request data - the client IP, URL, response code, and timing. These are useful for understanding traffic patterns and finding slow or failing endpoints.

```bash
# Enable web server logging to the file system
# Retention is set in days, quota in MB
az webapp log config \
    --resource-group my-resource-group \
    --name my-app-service \
    --web-server-logging filesystem

# You can also configure retention period
az webapp log config \
    --resource-group my-resource-group \
    --name my-app-service \
    --web-server-logging filesystem \
    --docker-container-logging filesystem
```

On Windows, web server logs are in W3C Extended Log Format. On Linux, you get Nginx access logs.

## Streaming Logs in Real Time

One of the most useful features for debugging is log streaming. This shows you live application output as it happens, similar to running `tail -f` on a log file.

### From the Azure Portal

Go to your App Service, then navigate to "Log stream" in the Monitoring section. You will see live output from your application.

### From the CLI

```bash
# Stream all logs from your App Service in real time
az webapp log tail \
    --resource-group my-resource-group \
    --name my-app-service

# Filter to just application logs
az webapp log tail \
    --resource-group my-resource-group \
    --name my-app-service \
    --filter Application
```

### From a Browser

You can also stream logs by hitting the Kudu log streaming endpoint directly:

```
https://my-app-service.scm.azurewebsites.net/api/logstream
```

This opens a streaming connection that shows logs as they arrive. You will need to authenticate with your deployment credentials.

## Downloading Logs

If you need to analyze logs offline, you can download them as a ZIP file:

```bash
# Download all available logs as a ZIP
az webapp log download \
    --resource-group my-resource-group \
    --name my-app-service \
    --log-file logs.zip
```

The ZIP contains separate folders for each log type: Application, http (web server logs), DetailedErrors, and W3SVC (failed request traces).

## Configuring Application Insights

For production applications, Application Insights is the better choice over basic App Service logging. It provides much richer diagnostics including performance counters, dependency tracking, exception details, and request tracing.

To enable Application Insights:

1. Go to your App Service in the Azure Portal
2. Click on "Application Insights" in the left menu
3. Click "Turn on Application Insights"
4. Choose to create a new resource or connect to an existing one
5. Click Apply

Once enabled, your application automatically sends telemetry to Application Insights without code changes (for .NET and Java apps). For Node.js and Python, you may need to install the SDK.

Here is how to add Application Insights to a Node.js application:

```javascript
// app.js - Add this at the very top of your entry point, before other imports
const appInsights = require('applicationinsights');

// Initialize with your connection string from environment variable
appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
    .setAutoCollectRequests(true)        // Track incoming HTTP requests
    .setAutoCollectPerformance(true)     // Collect performance counters
    .setAutoCollectExceptions(true)      // Catch unhandled exceptions
    .setAutoCollectDependencies(true)    // Track outgoing HTTP calls, DB queries
    .setAutoCollectConsole(true)         // Capture console.log output
    .start();

// Now import the rest of your application
const express = require('express');
const app = express();
```

## Using Diagnostic Tools

Azure App Service comes with built-in diagnostic tools that can help identify issues without you having to set up anything in advance.

### Diagnose and Solve Problems

This is a self-service diagnostic tool in the Azure Portal. Go to your App Service and click "Diagnose and solve problems" in the left menu. It offers several categories:

- **Availability and Performance** - Checks for downtime, high response times, and CPU/memory issues
- **Configuration and Management** - Validates your app settings and certificates
- **SSL and Domains** - Checks for SSL certificate issues

The tool runs automated checks and gives you actionable recommendations.

### Kudu Console

Kudu is the engine behind deployments and diagnostic features. You can access it at `https://my-app-service.scm.azurewebsites.net`. From there you can:

- Browse the file system
- Open a debug console (CMD or PowerShell)
- View environment variables
- Analyze process dumps
- View deployment logs

### Health Check

You can also configure a health check endpoint that Azure monitors automatically. Navigate to Health Check under Monitoring, set a path (like `/health`), and Azure will ping it every minute. If it fails repeatedly, Azure can automatically restart your instance.

## Setting Up Diagnostic Logging with ARM Templates

For infrastructure as code, here is how to configure diagnostic settings with an ARM template:

```json
{
    "type": "Microsoft.Web/sites/config",
    "apiVersion": "2022-03-01",
    "name": "[concat(parameters('siteName'), '/logs')]",
    "properties": {
        "applicationLogs": {
            "fileSystem": {
                "level": "Information"
            },
            "azureBlobStorage": {
                "level": "Warning",
                "sasUrl": "[parameters('logBlobSasUrl')]",
                "retentionInDays": 30
            }
        },
        "httpLogs": {
            "fileSystem": {
                "retentionInMb": 100,
                "retentionInDays": 7,
                "enabled": true
            }
        },
        "detailedErrorMessages": {
            "enabled": true
        },
        "failedRequestsTracing": {
            "enabled": true
        }
    }
}
```

## Log Retention and Storage

A few things to keep in mind about log retention:

- File system logs have limited storage (the default quota depends on your plan). Old logs are automatically rotated.
- File system application logging turns off automatically after 12 hours. This is by design - it prevents you from accidentally filling up disk space.
- Blob storage logging stays on indefinitely and is the recommended approach for anything beyond quick debugging sessions.
- Application Insights retains data for 90 days by default, configurable up to 730 days.

## Practical Debugging Workflow

When something goes wrong, here is the workflow I usually follow:

1. Start by checking the "Diagnose and solve problems" blade for obvious issues
2. Turn on log streaming and reproduce the problem
3. Look at Application Insights for request failures, exceptions, and dependency issues
4. If needed, download the full logs and search through them offline
5. For Windows apps, enable Failed Request Tracing to get detailed pipeline traces

Good logging is not just about turning everything on. It is about having the right level of detail available when you need it, without drowning in noise the rest of the time. Start with Application Insights for production monitoring, and use the App Service file system logging for quick debugging sessions.
