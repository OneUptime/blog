# How to Create Your First Serverless Workflow in Google Cloud Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Workflows, Serverless, Orchestration, Automation

Description: Learn how to create your first serverless workflow in Google Cloud Workflows to orchestrate multiple services, handle conditions, and automate multi-step processes.

---

When you need to coordinate multiple services - call an API, process the result, store it somewhere, then send a notification - you either glue everything together with custom code or use an orchestration tool. Google Cloud Workflows is that orchestration tool. It lets you define multi-step processes as YAML or JSON, runs them serverlessly (no infrastructure to manage), and handles retries, conditions, and error handling natively.

This guide walks you through creating, deploying, and running your first Cloud Workflow.

## What Cloud Workflows Is (and Is Not)

Cloud Workflows is a serverless orchestration service. It is great for:

- Coordinating calls between Cloud Functions, Cloud Run, and other APIs
- Multi-step processes with conditional logic
- Long-running processes that need to wait between steps
- Reliable execution with built-in retry logic

It is not a replacement for data pipelines (use Dataflow), complex event processing (use Eventarc), or batch job scheduling (use Cloud Scheduler + Cloud Functions).

## Setting Up

Enable the Workflows API and install the CLI tools.

```bash
# Enable the Workflows API
gcloud services enable workflows.googleapis.com

# Verify it is enabled
gcloud services list --enabled --filter="name:workflows"
```

## Your First Workflow

Let's start with a simple workflow that makes an HTTP request and logs the result.

```yaml
# hello-workflow.yaml
# A simple workflow that fetches a random joke from a public API

main:
  steps:
    - get_joke:
        call: http.get
        args:
          url: https://official-joke-api.appspot.com/random_joke
        result: joke_response

    - format_joke:
        assign:
          - setup: ${joke_response.body.setup}
          - punchline: ${joke_response.body.punchline}

    - return_result:
        return:
          joke_setup: ${setup}
          joke_punchline: ${punchline}
          status: ${joke_response.code}
```

## Deploying the Workflow

Deploy your workflow definition to Google Cloud.

```bash
# Deploy the workflow
gcloud workflows deploy hello-workflow \
  --location=us-central1 \
  --source=hello-workflow.yaml \
  --description="My first workflow - fetches a random joke"

# Verify the deployment
gcloud workflows describe hello-workflow --location=us-central1
```

## Running the Workflow

Execute the workflow and see the results.

```bash
# Execute the workflow
gcloud workflows run hello-workflow --location=us-central1

# Execute with inline data (for workflows that accept arguments)
gcloud workflows run hello-workflow \
  --location=us-central1 \
  --data='{"name": "World"}'
```

You can also trigger workflows programmatically.

```python
from google.cloud import workflows_v1
from google.cloud.workflows import executions_v1
import json

def execute_workflow(project_id, location, workflow_id, arguments=None):
    """Execute a Cloud Workflow and wait for the result."""
    # Create the execution client
    execution_client = executions_v1.ExecutionsClient()

    parent = (
        f"projects/{project_id}/locations/{location}"
        f"/workflows/{workflow_id}"
    )

    # Build the execution request
    execution = executions_v1.Execution()
    if arguments:
        execution.argument = json.dumps(arguments)

    # Start the execution
    response = execution_client.create_execution(
        parent=parent,
        execution=execution
    )

    print(f"Execution started: {response.name}")
    print(f"State: {response.state}")

    # Poll for completion
    while response.state not in (
        executions_v1.Execution.State.SUCCEEDED,
        executions_v1.Execution.State.FAILED,
        executions_v1.Execution.State.CANCELLED
    ):
        import time
        time.sleep(1)
        response = execution_client.get_execution(name=response.name)

    print(f"Final state: {response.state}")
    print(f"Result: {response.result}")

    return response

# Run the workflow
result = execute_workflow(
    "my-gcp-project", "us-central1", "hello-workflow"
)
```

## Adding Variables and Assignments

Workflows support variables that you can set and reference across steps.

```yaml
# variables-workflow.yaml
# Demonstrates variable assignment and usage

main:
  params: [args]
  steps:
    - init_variables:
        assign:
          - name: ${args.name}
          - greeting: ${"Hello, " + name + "!"}
          - counter: 0
          - items: []

    - add_items:
        assign:
          - items: ${list.concat(items, "first")}
          - items: ${list.concat(items, "second")}
          - items: ${list.concat(items, "third")}
          - counter: ${len(items)}

    - return_result:
        return:
          greeting: ${greeting}
          item_count: ${counter}
          items: ${items}
```

## Conditional Logic

Use switch blocks to branch based on conditions.

```yaml
# conditional-workflow.yaml
# Process an order differently based on the order total

main:
  params: [args]
  steps:
    - get_order_total:
        assign:
          - order_total: ${args.order_total}
          - customer_type: ${args.customer_type}

    - check_order_value:
        switch:
          - condition: ${order_total > 1000}
            steps:
              - high_value_process:
                  assign:
                    - approval_required: true
                    - discount_rate: 0.10
              - notify_manager:
                  call: http.post
                  args:
                    url: https://my-api.example.com/notify
                    body:
                      message: "High value order requires approval"
                      total: ${order_total}
                  result: notify_result

          - condition: ${order_total > 100}
            steps:
              - medium_value_process:
                  assign:
                    - approval_required: false
                    - discount_rate: 0.05

          - condition: true
            steps:
              - low_value_process:
                  assign:
                    - approval_required: false
                    - discount_rate: 0

    - check_customer_type:
        switch:
          - condition: ${customer_type == "premium"}
            assign:
              - discount_rate: ${discount_rate + 0.05}

    - return_result:
        return:
          order_total: ${order_total}
          approval_required: ${approval_required}
          discount_rate: ${discount_rate}
          final_total: ${order_total * (1 - discount_rate)}
```

## Loops and Iteration

Use for loops to iterate over lists.

```yaml
# loop-workflow.yaml
# Process a list of URLs and collect results

main:
  steps:
    - setup:
        assign:
          - urls:
              - "https://httpbin.org/get?id=1"
              - "https://httpbin.org/get?id=2"
              - "https://httpbin.org/get?id=3"
          - results: []

    - process_urls:
        for:
          value: url
          in: ${urls}
          steps:
            - fetch_url:
                call: http.get
                args:
                  url: ${url}
                result: response

            - collect_result:
                assign:
                  - results: ${list.concat(results, response.body)}

    - return_results:
        return:
          processed_count: ${len(results)}
          results: ${results}
```

## A Practical Example: Document Processing Workflow

Here is a more realistic workflow that processes an uploaded document through multiple steps.

```yaml
# document-processing-workflow.yaml
# Orchestrates document upload, OCR, and storage

main:
  params: [args]
  steps:
    - validate_input:
        switch:
          - condition: ${not("bucket" in args) or not("filename" in args)}
            raise: "Missing required parameters: bucket and filename"

    - extract_text:
        call: http.post
        args:
          url: https://us-documentai.googleapis.com/v1/projects/my-project/locations/us/processors/my-processor:process
          auth:
            type: OAuth2
          body:
            rawDocument:
              mimeType: "application/pdf"
            gcsDocument:
              gcsUri: ${"gs://" + args.bucket + "/" + args.filename}
              mimeType: "application/pdf"
        result: docai_response

    - store_result:
        call: http.post
        args:
          url: https://firestore.googleapis.com/v1/projects/my-project/databases/(default)/documents/processed_docs
          auth:
            type: OAuth2
          body:
            fields:
              source_file:
                stringValue: ${args.filename}
              text_length:
                integerValue: ${len(docai_response.body.document.text)}
              processed_at:
                stringValue: ${time.format(sys.now())}
        result: store_response

    - return_success:
        return:
          status: "success"
          document_id: ${store_response.body.name}
          text_length: ${len(docai_response.body.document.text)}
```

## Scheduling Workflows

Run workflows on a schedule using Cloud Scheduler.

```bash
# Create a service account for the scheduler
gcloud iam service-accounts create workflow-scheduler \
  --display-name="Workflow Scheduler SA"

# Grant it permission to invoke workflows
gcloud projects add-iam-policy-binding my-gcp-project \
  --member="serviceAccount:workflow-scheduler@my-gcp-project.iam.gserviceaccount.com" \
  --role="roles/workflows.invoker"

# Create a scheduled job that runs the workflow every hour
gcloud scheduler jobs create http run-workflow-hourly \
  --schedule="0 * * * *" \
  --uri="https://workflowexecutions.googleapis.com/v1/projects/my-gcp-project/locations/us-central1/workflows/hello-workflow/executions" \
  --http-method=POST \
  --oauth-service-account-email="workflow-scheduler@my-gcp-project.iam.gserviceaccount.com" \
  --location=us-central1
```

## Monitoring and Debugging

Check workflow execution history and debug failures.

```bash
# List recent executions
gcloud workflows executions list hello-workflow \
  --location=us-central1 \
  --limit=10

# Get details of a specific execution
gcloud workflows executions describe EXECUTION_ID \
  --workflow=hello-workflow \
  --location=us-central1

# View execution logs
gcloud logging read "resource.type=workflows.googleapis.com/Workflow" \
  --limit=20
```

## Wrapping Up

Cloud Workflows gives you a clean way to orchestrate multi-step processes without managing any infrastructure. Start with simple sequential workflows, then add conditions, loops, and error handling as your needs grow. The YAML syntax is straightforward once you learn the basic patterns: steps for sequential operations, switch for branching, for for iteration, and assign for variables. Deploy with a single command, trigger manually or on a schedule, and use the execution history to debug any issues.
