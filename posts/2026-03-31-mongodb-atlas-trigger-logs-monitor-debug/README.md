# How to Monitor and Debug Atlas Trigger Logs in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Trigger, Monitoring, Debugging

Description: Learn how to view, search, and debug Atlas Trigger execution logs in MongoDB Atlas to troubleshoot failures and optimize trigger performance.

---

Atlas Triggers run serverless functions in response to database events, scheduled intervals, or authentication events. When triggers fail or behave unexpectedly, the Atlas Trigger Logs UI and the Atlas Administration API give you the visibility you need to diagnose problems quickly.

## Viewing Trigger Logs in the Atlas UI

1. Open your project in the Atlas UI.
2. Navigate to **App Services** and select your application.
3. Click **Logs** in the left sidebar.
4. Filter by **Trigger** in the log type dropdown.
5. Use the date/time picker and search bar to narrow results.

Each log entry shows:
- Trigger name and type
- Execution start and end time
- Status (Success / Failed)
- Error message and stack trace (on failure)

## Fetching Logs via the Atlas Administration API

You can pull logs programmatically for alerting or automated analysis.

```bash
GROUP_ID="<your-project-id>"
APP_ID="<your-app-services-app-id>"
ATLAS_PUBLIC_KEY="<pub>"
ATLAS_PRIVATE_KEY="<priv>"

curl --user "$ATLAS_PUBLIC_KEY:$ATLAS_PRIVATE_KEY" \
  --digest \
  --request GET \
  "https://services.cloud.mongodb.com/api/admin/v3.0/groups/$GROUP_ID/apps/$APP_ID/logs?type=DB_TRIGGER&errors_only=true"
```

The response is a JSON array. Each entry includes a `logs` array with stdout/stderr output from your trigger function.

## Reading Logs Inside Trigger Functions

Use `console.log` within your trigger function to emit structured messages:

```javascript
exports = async function(changeEvent) {
  const { operationType, fullDocument, ns } = changeEvent;
  console.log(JSON.stringify({
    level: "info",
    op: operationType,
    collection: ns.coll,
    docId: fullDocument?._id?.toString()
  }));

  try {
    // business logic here
  } catch (err) {
    console.error(JSON.stringify({ level: "error", message: err.message }));
    throw err; // re-throw so Atlas marks the execution as failed
  }
};
```

Structured logs make it much easier to filter and search in the Atlas UI.

## Common Failure Patterns

**Timeout errors** - Atlas Trigger functions time out after 120 seconds by default. Break large operations into smaller batches using a queue or scheduled trigger chain.

**Permission denied** - The linked App Services user must have read/write access to the collections your trigger touches. Check the Rules section under App Services.

**Unhandled promise rejections** - Always `await` async operations and wrap in try/catch. Un-awaited promises that reject will cause silent failures that are hard to trace.

## Setting Up Alerts for Trigger Failures

In the Atlas UI, go to **Project Alerts** and create a new alert:

1. Alert condition: **App Services - Functions - Errors** exceeds `0`
2. Set the notification channel (email, PagerDuty, Slack webhook)
3. Save the alert

This ensures you are notified immediately when any trigger encounters an unhandled error.

## Debugging Locally with the App Services CLI

```bash
npm install -g atlas-app-services-cli

appservices login --api-key "$ATLAS_PUBLIC_KEY" --private-api-key "$ATLAS_PRIVATE_KEY"
appservices pull --remote "$APP_ID"

# Inspect the trigger definition
cat triggers/my_trigger.json
```

Pull the app locally to inspect trigger configuration, linked function source code, and dependency manifests without leaving the terminal.

## Summary

Atlas Trigger Logs are accessible through the App Services UI, the Administration API, and programmatic `console.log` statements inside your functions. Combining structured logging, error re-throwing, and Atlas project-level alerts creates a reliable feedback loop that surfaces trigger failures before they impact your application.
