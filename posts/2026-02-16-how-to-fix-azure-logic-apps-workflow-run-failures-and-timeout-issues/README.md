# How to Fix Azure Logic Apps Workflow Run Failures and Timeout Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Logic Apps, Workflow, Troubleshooting, Automation, Timeout, Integration

Description: Diagnose and fix Azure Logic Apps workflow run failures and timeout issues with practical solutions for action errors, connector problems, and retry policies.

---

Azure Logic Apps is great for building integrations without writing much code. Until a workflow starts failing. Then you are staring at a run history full of red X marks, cryptic error messages, and actions that time out for no apparent reason. Debugging Logic Apps requires a different approach than debugging traditional code because the execution model is declarative and distributed.

This post covers the most common failure scenarios and how to fix them.

## Understanding Logic Apps Run History

Every Logic Apps execution creates a run record that shows the status of each action. Navigate to your Logic App in the Azure portal and click "Runs history" to see recent executions.

Click on a failed run to see the workflow visualization with each action marked as Succeeded (green check), Failed (red X), or Skipped (gray dash). Click on a failed action to see the input, output, and error details.

The run history is your primary debugging tool. It shows exactly which action failed and what the inputs and outputs were at the time of failure.

## Common Failure: Action Timeout

Logic Apps actions have a default timeout. If an action does not complete within the timeout period, the run fails.

### HTTP Actions

HTTP actions default to a 2-minute timeout. If you are calling an API that takes longer, the action fails with a timeout error.

```json
{
  "type": "Http",
  "inputs": {
    "method": "POST",
    "uri": "https://api.example.com/long-running-process",
    "body": {
      "data": "processing request"
    }
  },
  "runAfter": {},
  "runtimeConfiguration": {
    "staticResult": {
      "staticResultOptions": "Disabled"
    }
  },
  "limit": {
    "timeout": "PT10M"
  }
}
```

In the designer, click on the action, go to Settings, and set the Timeout to a longer duration. Use ISO 8601 duration format: `PT10M` for 10 minutes, `PT1H` for 1 hour.

### Long-Running Workflows

The entire workflow run also has a timeout. For Consumption plan Logic Apps, the maximum is 90 days. For Standard plan, it depends on the hosting configuration.

If your workflow calls an API that takes more than a few minutes, use the asynchronous polling pattern instead of waiting synchronously.

```json
{
  "type": "Http",
  "inputs": {
    "method": "POST",
    "uri": "https://api.example.com/start-job",
    "body": {
      "jobType": "large-export"
    }
  },
  "operationOptions": "DisableAsyncPattern"
}
```

Wait, actually you want to enable the async pattern, not disable it. By default, Logic Apps supports the 202 async pattern. If your API returns HTTP 202 with a Location header, Logic Apps will automatically poll the Location URL until the operation completes. Make sure your API implements this pattern correctly.

## Common Failure: Connector Authentication Errors

Many Logic Apps actions use connectors (Office 365, SQL, Salesforce, etc.) that require authentication. When the token expires or the credentials change, actions fail with 401 Unauthorized errors.

### Fix Expired Connections

Navigate to your Logic App, go to "API connections" in the left menu. Look for connections with a warning icon. Click on the connection and re-authorize it.

```bash
# List API connections in a resource group
az resource list \
  --resource-group my-rg \
  --resource-type "Microsoft.Web/connections" \
  --query "[].{Name:name, Status:properties.statuses[0].status}" \
  --output table
```

For production workflows, use managed identities instead of user credentials wherever possible. Managed identities do not expire.

```json
{
  "type": "Http",
  "inputs": {
    "method": "GET",
    "uri": "https://management.azure.com/subscriptions?api-version=2020-01-01",
    "authentication": {
      "type": "ManagedServiceIdentity",
      "audience": "https://management.azure.com"
    }
  }
}
```

## Common Failure: Data Handling Errors

### Null Values

Actions fail when they expect data that is not there. For example, a "Get item" action on a SharePoint list returns nothing because the item was deleted, and the next action tries to use a property from the result.

**Fix**: Add condition checks before using dynamic content.

In the designer, add a "Condition" action that checks if the output is null or empty before processing it.

You can also use the `coalesce()` function to provide default values:

```
@coalesce(body('Get_item')?['Title'], 'Default Title')
```

### Large Payloads

Logic Apps has payload size limits. For Consumption plan, the maximum is 100 MB for HTTP actions and 50 MB for other actions. If your workflow processes large files, you might hit these limits.

**Fix**: For large files, use chunking or stream the content through blob storage.

```json
{
  "type": "Http",
  "inputs": {
    "method": "GET",
    "uri": "https://api.example.com/large-file"
  },
  "runtimeConfiguration": {
    "contentTransfer": {
      "transferMode": "Chunked"
    }
  }
}
```

## Common Failure: Retry Exhaustion

Logic Apps automatically retries failed actions. The default retry policy varies by action type, but it typically retries 4 times with exponential backoff. If all retries fail, the action is marked as failed.

### Configure Retry Policy

Adjust the retry policy based on the failure type. For transient errors (network issues, throttling), more retries help. For permanent errors (bad request, not found), retries waste time.

```json
{
  "type": "Http",
  "inputs": {
    "method": "GET",
    "uri": "https://api.example.com/data"
  },
  "retryPolicy": {
    "type": "exponential",
    "count": 10,
    "interval": "PT10S",
    "minimumInterval": "PT10S",
    "maximumInterval": "PT1H"
  }
}
```

For actions where retries are not appropriate (like sending an email that might duplicate), set the retry policy to "none."

## Common Failure: For-Each Loop Errors

For-Each loops process items in parallel by default (up to 20 concurrently). This can cause issues with rate-limited APIs or when processing order matters.

**Fix**: Reduce concurrency or enable sequential processing.

In the designer, click on the For-Each action, go to Settings, and set "Degree of Parallelism" to 1 for sequential processing, or a lower number to reduce concurrency.

```json
{
  "type": "Foreach",
  "foreach": "@triggerBody()",
  "actions": {
    "Call_API": {
      "type": "Http",
      "inputs": {
        "method": "POST",
        "uri": "https://api.example.com/process",
        "body": "@items('For_each')"
      }
    }
  },
  "runtimeConfiguration": {
    "concurrency": {
      "repetitions": 5
    }
  }
}
```

## Common Failure: Trigger Issues

If your Logic App is not running at all, the trigger might be the problem.

### Recurrence Trigger

Check the recurrence settings. A common mistake is setting the wrong time zone or frequency.

### HTTP Trigger

If using an HTTP request trigger, verify the trigger URL is correct and accessible. Check if the request body matches the expected schema.

```bash
# Get the trigger URL for an HTTP-triggered Logic App
az rest --method POST \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/my-rg/providers/Microsoft.Logic/workflows/my-logic-app/listCallbackUrl?api-version=2016-06-01"
```

### Service Bus / Event Grid Trigger

For event-based triggers, verify that the connection is healthy and the source is generating events.

## Debugging with Tracked Properties

Add tracked properties to actions to include custom data in the run history. This makes debugging easier because you can see business-relevant values in the run details.

```json
{
  "type": "Http",
  "inputs": {
    "method": "POST",
    "uri": "https://api.example.com/orders",
    "body": "@triggerBody()"
  },
  "trackedProperties": {
    "orderId": "@triggerBody()?['orderId']",
    "customerName": "@triggerBody()?['customerName']",
    "amount": "@triggerBody()?['amount']"
  }
}
```

## Monitoring and Alerting

Set up alerts for workflow failures so you do not have to manually check the run history.

```bash
# Create an alert for Logic App run failures
az monitor metrics alert create \
  --resource-group my-rg \
  --name logic-app-failure-alert \
  --scopes "/subscriptions/<sub-id>/resourceGroups/my-rg/providers/Microsoft.Logic/workflows/my-logic-app" \
  --condition "total RunsFailed > 0" \
  --window-size PT5M \
  --evaluation-frequency PT1M \
  --action "/subscriptions/<sub-id>/resourceGroups/my-rg/providers/Microsoft.Insights/actionGroups/ops-team"
```

Send diagnostic logs to a Log Analytics workspace for deeper analysis:

```bash
# Enable diagnostic logging for the Logic App
az monitor diagnostic-settings create \
  --resource "/subscriptions/<sub-id>/resourceGroups/my-rg/providers/Microsoft.Logic/workflows/my-logic-app" \
  --name logic-app-diagnostics \
  --workspace "/subscriptions/<sub-id>/resourceGroups/my-rg/providers/Microsoft.OperationalInsights/workspaces/my-workspace" \
  --logs '[{"category": "WorkflowRuntime", "enabled": true}]'
```

## Standard vs Consumption Plan Differences

Logic Apps Standard (based on Azure Functions runtime) handles failures differently:

- You get local debugging support in VS Code
- Stateless workflows have no run history
- Retry policies are configured in the workflow definition
- Performance is generally better because it runs on dedicated infrastructure

If you are hitting performance or reliability issues on the Consumption plan, consider migrating critical workflows to Standard.

Logic Apps workflow failures are almost always debuggable through the run history. The visualization shows you exactly where things went wrong, the inputs and outputs are captured, and the error messages point you to the fix. Build your workflows with error handling in mind - add conditions for null checks, configure appropriate retry policies, and set up monitoring so you catch failures before users do.
