# How to Migrate Azure Logic Apps Workflows to Google Cloud Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Workflows, Azure Migration, Serverless, Workflow Orchestration

Description: Learn how to migrate your Azure Logic Apps workflows to Google Cloud Workflows with practical examples and step-by-step guidance.

---

Azure Logic Apps and Google Cloud Workflows both let you build serverless workflow orchestrations, but they take very different approaches. Logic Apps gives you a visual designer with hundreds of built-in connectors. Cloud Workflows gives you a YAML or JSON-based DSL that you define as code. If you are moving from Azure to GCP, this guide covers how to translate your Logic Apps patterns into Cloud Workflows.

## How the Services Compare

Logic Apps is a low-code platform. You drag and drop connectors, define triggers, and build branching logic visually. Under the hood, it generates a JSON workflow definition.

Cloud Workflows is code-first. You write workflow definitions in YAML (or JSON), define steps that call HTTP endpoints, Cloud Functions, or other GCP services, and deploy them with `gcloud` or Terraform. There is no visual designer - it is all declarative configuration.

Here is a quick feature comparison:

| Feature | Azure Logic Apps | Google Cloud Workflows |
|---------|-----------------|----------------------|
| Definition format | JSON (visual designer) | YAML or JSON |
| Triggers | Built-in (HTTP, timer, event) | HTTP, Pub/Sub, Eventarc, Cloud Scheduler |
| Connectors | 400+ built-in connectors | HTTP calls to any API |
| State management | Automatic | Workflow variables |
| Error handling | Try/catch scopes | Try/except blocks |
| Pricing | Per action execution | Per step execution |

## Step 1: Inventory Your Logic Apps

Start by cataloging what your Logic Apps actually do. Export the workflow definitions from Azure:

```bash
# List all Logic Apps in a resource group
az logic workflow list --resource-group my-rg --output table

# Export a specific workflow definition
az logic workflow show --resource-group my-rg \
    --name my-logic-app \
    --query "definition" > logic-app-definition.json
```

For each Logic App, document the trigger type, the actions it performs, any connectors it uses, and what external systems it communicates with.

## Step 2: Map Triggers to Cloud Workflows Invocations

Logic Apps triggers do not have a direct equivalent in Cloud Workflows. Instead, you use other GCP services to trigger your workflows:

- **HTTP trigger** in Logic Apps becomes a direct HTTP invocation or an Eventarc trigger
- **Recurrence/timer trigger** becomes Cloud Scheduler calling the workflow
- **Event-based triggers** (Service Bus, Event Grid) become Pub/Sub with Eventarc

Here is how to set up a Cloud Scheduler trigger that replaces a Logic Apps recurrence trigger:

```bash
# Create a Cloud Scheduler job that triggers a workflow every hour
gcloud scheduler jobs create http trigger-my-workflow \
    --schedule="0 * * * *" \
    --uri="https://workflowexecutions.googleapis.com/v1/projects/my-project/locations/us-central1/workflows/my-workflow/executions" \
    --http-method=POST \
    --oauth-service-account-email=my-sa@my-project.iam.gserviceaccount.com \
    --message-body='{"argument": "{\"source\": \"scheduler\"}"}'
```

## Step 3: Translate Workflow Actions to Steps

The core of migration is converting Logic Apps actions into Cloud Workflows steps. Let me walk through the most common patterns.

### HTTP Actions

Logic Apps HTTP actions translate directly to Cloud Workflows HTTP calls.

This Cloud Workflows step makes an HTTP GET request, similar to an HTTP action in Logic Apps:

```yaml
# Simple HTTP call - equivalent to Logic Apps HTTP action
main:
  steps:
    - callApi:
        call: http.get
        args:
          url: https://api.example.com/data
          headers:
            Authorization: ${"Bearer " + apiKey}
          timeout: 30
        result: apiResponse
    - processResponse:
        call: sys.log
        args:
          text: ${"Status code - " + string(apiResponse.code)}
```

### Conditional Logic

Logic Apps condition actions become switch or conditional steps:

```yaml
# Conditional branching - replaces Logic Apps condition blocks
main:
  params: [input]
  steps:
    - checkStatus:
        switch:
          - condition: ${input.status == "approved"}
            steps:
              - handleApproved:
                  call: http.post
                  args:
                    url: https://api.example.com/approve
                    body:
                      id: ${input.id}
                  result: approvalResult
          - condition: ${input.status == "rejected"}
            steps:
              - handleRejected:
                  call: http.post
                  args:
                    url: https://api.example.com/reject
                    body:
                      id: ${input.id}
                  result: rejectionResult
```

### For-Each Loops

Logic Apps For-Each maps to Cloud Workflows for-in loops:

```yaml
# Iterate over a list - replaces Logic Apps For Each action
main:
  steps:
    - getItems:
        call: http.get
        args:
          url: https://api.example.com/items
        result: itemsResponse
    - processItems:
        for:
          value: item
          in: ${itemsResponse.body.items}
          steps:
            - processItem:
                call: http.post
                args:
                  url: https://api.example.com/process
                  body:
                    itemId: ${item.id}
                    name: ${item.name}
```

### Error Handling

Logic Apps uses scopes with configure-run-after for error handling. Cloud Workflows uses try/except:

```yaml
# Error handling - replaces Logic Apps scope and run-after patterns
main:
  steps:
    - tryBlock:
        try:
          steps:
            - riskyCall:
                call: http.post
                args:
                  url: https://api.example.com/submit
                  body:
                    data: "test"
                result: submitResult
        except:
          as: e
          steps:
            - logError:
                call: sys.log
                args:
                  text: ${"Error occurred - " + e.message}
                  severity: "ERROR"
            - sendAlert:
                call: http.post
                args:
                  url: https://hooks.slack.com/services/xxx
                  body:
                    text: ${"Workflow failed - " + e.message}
```

## Step 4: Replace Connectors with API Calls

This is the biggest change. Logic Apps connectors abstract away API details. In Cloud Workflows, you call APIs directly. Here are common connector replacements:

**SQL Server connector** - Use Cloud SQL Admin API or call a Cloud Function that queries your database.

**Office 365 / Outlook connector** - Call the Microsoft Graph API directly via HTTP.

**Slack connector** - Call the Slack webhook URL via HTTP POST.

**Blob Storage connector** - Use the Cloud Storage JSON API or a Cloud Function.

Here is an example of replacing a Logic Apps Blob Storage connector with a Cloud Storage API call:

```yaml
# Replace Azure Blob Storage connector with Cloud Storage API call
main:
  steps:
    - readFromStorage:
        call: http.get
        args:
          url: ${"https://storage.googleapis.com/storage/v1/b/my-bucket/o/" + objectName + "?alt=media"}
          auth:
            type: OAuth2
        result: fileContent
```

## Step 5: Deploy and Test

Save your workflow definition to a YAML file and deploy it:

```bash
# Deploy the workflow to Cloud Workflows
gcloud workflows deploy my-workflow \
    --location=us-central1 \
    --source=workflow.yaml \
    --service-account=my-sa@my-project.iam.gserviceaccount.com

# Test with a manual execution
gcloud workflows run my-workflow \
    --location=us-central1 \
    --data='{"key": "value"}'
```

## Step 6: Handle Stateful Workflows

Logic Apps Standard supports stateful workflows that persist data between runs. Cloud Workflows is stateless by design - each execution is independent. If you need state between runs, store it in Firestore or Cloud Storage:

```yaml
# Persist state between workflow runs using Firestore
main:
  steps:
    - loadState:
        call: googleapis.firestore.v1.projects.databases.documents.get
        args:
          name: projects/my-project/databases/(default)/documents/workflow-state/my-workflow
        result: stateDoc
    - doWork:
        call: http.get
        args:
          url: https://api.example.com/data
        result: workResult
    - saveState:
        call: googleapis.firestore.v1.projects.databases.documents.patch
        args:
          name: projects/my-project/databases/(default)/documents/workflow-state/my-workflow
          body:
            fields:
              lastRun:
                stringValue: ${sys.now()}
              lastResult:
                stringValue: ${json.encode_to_string(workResult.body)}
```

## Migration Tips

A few things I have found helpful when doing this migration:

1. **Start with simpler workflows first.** Get comfortable with the YAML syntax before tackling complex multi-step Logic Apps.

2. **Use Cloud Functions as adapters.** If a Logic Apps connector does something complex, write a Cloud Function that handles that logic and call it from your workflow.

3. **Test incrementally.** Cloud Workflows lets you run workflows manually with test data. Use this heavily during migration.

4. **Monitor with Cloud Logging.** Use `sys.log` steps liberally to trace execution during testing.

5. **Watch for timeout differences.** Cloud Workflows has a maximum execution timeout of one year per execution. Individual HTTP call timeouts default to 300 seconds.

## Conclusion

Moving from Logic Apps to Cloud Workflows means shifting from a visual, connector-driven model to a code-first, API-driven model. You lose the visual designer and built-in connectors, but you gain version-controlled workflow definitions, straightforward YAML syntax, and tight integration with GCP services. The migration takes some effort, but the resulting workflows are easier to review, test, and manage as code.
