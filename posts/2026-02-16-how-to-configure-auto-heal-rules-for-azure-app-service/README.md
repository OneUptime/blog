# How to Configure Auto-Heal Rules for Azure App Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, Auto-Heal, Reliability, Monitoring, Self-Healing, Cloud Computing

Description: Learn how to configure Auto-Heal rules on Azure App Service to automatically recover from common application failures and performance issues.

---

Applications crash. They leak memory, hit deadlocks, and sometimes just stop responding for no obvious reason. While you should absolutely fix the root cause, having automatic recovery in place means your users do not suffer while you investigate. Azure App Service has a feature called Auto-Heal that can detect unhealthy conditions and take corrective action without any manual intervention.

This post covers how to set up Auto-Heal rules, what triggers are available, and what actions you can configure.

## What is Auto-Heal?

Auto-Heal is a set of rules that monitor your application and take predefined actions when certain conditions are met. Think of it as a watchdog that restarts your app when things go sideways.

The basic structure is:

1. **Triggers** - Conditions that indicate something is wrong (slow requests, high error rates, memory usage)
2. **Actions** - What to do when a trigger fires (recycle the process, log diagnostics, run a custom script)

Auto-Heal works at the instance level. If you have multiple instances, each one evaluates the rules independently.

## Enabling Auto-Heal in the Azure Portal

The easiest way to configure Auto-Heal is through the portal:

1. Go to your App Service
2. Navigate to "Diagnose and solve problems"
3. Search for "Auto-Heal" or click on "Diagnostic Tools"
4. Click "Auto-Heal"

You will see options for configuring triggers and actions through a visual interface.

Alternatively, you can configure it through the portal under Configuration > General settings, but the Diagnose and Solve interface is more user-friendly.

## Available Triggers

### Request Count Trigger

Fires when the total number of requests within a time window exceeds a threshold. This can catch situations where a sudden traffic spike is overwhelming your application.

### Slow Request Trigger

Fires when a certain number of requests take longer than a specified duration. This is great for detecting when your app starts hanging or responding slowly.

### Status Code Triggers

Fires when you get a certain number of specific HTTP status codes within a time window. For example, you might trigger on 500 errors or 503 Service Unavailable responses.

### Memory Limit Trigger

Fires when the process memory exceeds a threshold. This catches memory leaks before they crash your application.

## Available Actions

- **Recycle** - Restarts the application process. This is the most common action and fixes most transient issues.
- **Log Event** - Writes an event to the Windows Event Log (useful for tracking how often Auto-Heal fires).
- **Custom Action** - Runs a diagnostic tool, collects a memory dump, or executes a custom script before recycling.

## Configuring Auto-Heal via Azure CLI

For programmatic configuration, use the Azure CLI with a JSON configuration:

```bash
# Create a JSON file with Auto-Heal rules
# This configuration recycles the process when:
# - More than 50 requests take longer than 30 seconds in a 2-minute window
# - More than 100 HTTP 500 errors occur in a 5-minute window
# - Private memory exceeds 800MB

az webapp config set \
    --resource-group my-resource-group \
    --name my-app-service \
    --auto-heal-enabled true
```

For more detailed configuration, you need to use the REST API or ARM templates since the CLI has limited Auto-Heal support.

## Configuring Auto-Heal with ARM Templates

ARM templates give you the most control over Auto-Heal configuration. Here is a comprehensive example:

```json
{
    "type": "Microsoft.Web/sites",
    "apiVersion": "2022-03-01",
    "name": "[parameters('siteName')]",
    "location": "[resourceGroup().location]",
    "properties": {
        "siteConfig": {
            "autoHealEnabled": true,
            "autoHealRules": {
                "triggers": {
                    "requests": {
                        "count": 1000,
                        "timeInterval": "00:05:00"
                    },
                    "slowRequests": {
                        "count": 50,
                        "timeInterval": "00:02:00",
                        "timeTaken": "00:00:30"
                    },
                    "statusCodes": [
                        {
                            "status": 500,
                            "subStatus": 0,
                            "win32Status": 0,
                            "count": 100,
                            "timeInterval": "00:05:00"
                        },
                        {
                            "status": 503,
                            "subStatus": 0,
                            "win32Status": 0,
                            "count": 50,
                            "timeInterval": "00:02:00"
                        }
                    ],
                    "privateBytesInKB": 819200
                },
                "actions": {
                    "actionType": "Recycle",
                    "minProcessExecutionTime": "00:05:00"
                }
            }
        }
    }
}
```

Let me break down the important parts:

- `slowRequests` - If 50 requests take more than 30 seconds within a 2-minute window, the rule triggers.
- `statusCodes` - If 100 HTTP 500 errors happen in 5 minutes, or 50 HTTP 503 errors in 2 minutes, the rule triggers.
- `privateBytesInKB` - If the process uses more than 800MB of private memory, the rule triggers.
- `minProcessExecutionTime` - The process must have been running for at least 5 minutes before Auto-Heal takes action. This prevents a restart loop where a newly started process immediately triggers the rules again.

## Slow Request Triggers with Path Rules

You can also set up slow request rules that only apply to specific URL paths. This is useful when some endpoints are expected to be slow (like report generation) but others should always be fast:

```json
{
    "triggers": {
        "slowRequestsWithPath": [
            {
                "count": 20,
                "timeInterval": "00:02:00",
                "timeTaken": "00:00:10",
                "path": "/api/health"
            },
            {
                "count": 10,
                "timeInterval": "00:05:00",
                "timeTaken": "00:01:00",
                "path": "/api/data"
            }
        ]
    }
}
```

## Custom Actions for Diagnostics

Instead of just recycling, you can configure Auto-Heal to collect diagnostic data first. This is extremely valuable because it captures the state of the application when it is misbehaving, which helps you find the root cause.

```json
{
    "actions": {
        "actionType": "CustomAction",
        "customAction": {
            "exe": "D:\\home\\data\\DaaS\\bin\\DaasConsole.exe",
            "parameters": "-CollectKillAnalyze -outputDir D:\\home\\data\\DaaS\\Reports"
        },
        "minProcessExecutionTime": "00:10:00"
    }
}
```

The DaaS (Diagnostics as a Service) tool collects memory dumps, profiling traces, and other diagnostic data that you can analyze later.

## Auto-Heal on Linux App Service

On Linux App Service, Auto-Heal works a bit differently. It is configured through app settings rather than the siteConfig:

```bash
# Enable Auto-Heal on Linux
az webapp config appsettings set \
    --resource-group my-resource-group \
    --name my-app-service \
    --settings \
        WEBSITE_PROACTIVE_AUTOHEAL_ENABLED=True
```

Linux Auto-Heal monitors for container crashes and automatically restarts the container. The proactive auto-heal feature also monitors memory usage and restarts the container before it runs out of memory.

## Monitoring Auto-Heal Events

You should know when Auto-Heal fires. If it is firing frequently, you have an underlying problem that needs fixing.

### Check the Event Log

Auto-Heal events are logged to the Windows Event Log. You can view them in the Kudu console or through the Diagnose and Solve Problems tool.

### Use Application Insights

If you have Application Insights enabled, Auto-Heal recycles show up as availability events. You can set up alerts for these.

### Activity Log

Auto-Heal actions also appear in the Azure Activity Log for your App Service.

## Best Practices

### Do Not Use Auto-Heal as a Substitute for Fixing Bugs

Auto-Heal is a safety net, not a solution. If your app needs to be recycled every hour because of a memory leak, fix the memory leak. Use the diagnostic data that Auto-Heal collects to find the root cause.

### Set Reasonable Thresholds

Avoid thresholds that are too sensitive. If you trigger on 5 slow requests, you will be recycling constantly during normal traffic spikes. Start with higher thresholds and tune them down based on your application's baseline behavior.

### Use minProcessExecutionTime

Always set `minProcessExecutionTime` to prevent restart loops. If your application has a slow startup, set this to a value longer than your startup time.

### Test Your Rules

You can test Auto-Heal rules by simulating the trigger condition. For example, send slow requests to trigger the slow request rule and verify that the recycle happens.

## Real-World Configuration Example

Here is a configuration I have used in production that works well as a starting point:

```json
{
    "triggers": {
        "slowRequests": {
            "count": 100,
            "timeInterval": "00:05:00",
            "timeTaken": "00:00:30"
        },
        "statusCodes": [
            {
                "status": 500,
                "count": 200,
                "timeInterval": "00:05:00"
            }
        ],
        "privateBytesInKB": 1048576
    },
    "actions": {
        "actionType": "Recycle",
        "minProcessExecutionTime": "00:10:00"
    }
}
```

This recycles when there are 100 slow requests (> 30 seconds) in 5 minutes, 200 server errors in 5 minutes, or memory exceeds 1GB. The process must be at least 10 minutes old before recycling.

## Summary

Auto-Heal is a practical tool for keeping your Azure App Service running smoothly in the face of common application problems. Configure it with reasonable thresholds, use diagnostic actions to capture state before recycling, and always treat frequent Auto-Heal events as a signal to investigate the underlying issue. It is the difference between your app being down for an hour while someone notices and restarts it, and your app recovering in seconds while alerting you to investigate at your convenience.
