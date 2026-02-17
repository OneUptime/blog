# How to Migrate AWS Step Functions Workflows to Google Cloud Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Workflows, AWS Step Functions, Serverless, Cloud Migration

Description: Learn how to convert AWS Step Functions state machines to Google Cloud Workflows, including state type mapping, error handling, and integration patterns.

---

AWS Step Functions and Google Cloud Workflows both orchestrate multi-step processes, but they take different approaches. Step Functions uses Amazon States Language (ASL) - a JSON-based DSL for defining state machines. Cloud Workflows uses a YAML or JSON syntax that feels more like writing a script than defining a state machine.

If you are moving from AWS to GCP and have Step Functions workflows to bring along, this guide covers the practical steps for translating your workflows.

## Core Concept Differences

Before diving into the migration, it helps to understand how these services differ conceptually.

Step Functions thinks in states. Each state has a type (Task, Choice, Wait, Parallel, Map, Pass, Succeed, Fail) and transitions happen through Next fields or terminal states.

Cloud Workflows thinks in steps. Each step can call an HTTP endpoint, assign variables, use conditionals, or run loops. The execution flows sequentially through steps unless you explicitly jump to another step.

Here is a side-by-side comparison of a simple workflow:

```json
// AWS Step Functions - ASL format
{
  "StartAt": "GetOrder",
  "States": {
    "GetOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456:function:getOrder",
      "Next": "ProcessPayment"
    },
    "ProcessPayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456:function:processPayment",
      "End": true
    }
  }
}
```

The equivalent in Cloud Workflows:

```yaml
# Google Cloud Workflows - YAML format
main:
  steps:
    - getOrder:
        # Call a Cloud Function to retrieve order details
        call: http.get
        args:
          url: https://us-central1-my-project.cloudfunctions.net/getOrder
        result: orderData
    - processPayment:
        # Call a Cloud Function to process the payment
        call: http.post
        args:
          url: https://us-central1-my-project.cloudfunctions.net/processPayment
          body:
            order: ${orderData.body}
        result: paymentResult
```

## Step 1: Inventory Your Step Functions

Start by listing and exporting all your Step Functions state machines.

```bash
# List all state machines in your AWS account
aws stepfunctions list-state-machines \
  --query 'stateMachines[*].{Name:name,ARN:stateMachineArn}' \
  --output table

# Export a specific state machine definition
aws stepfunctions describe-state-machine \
  --state-machine-arn arn:aws:states:us-east-1:123456:stateMachine:my-workflow \
  --query 'definition' \
  --output text > workflow-definition.json
```

Document the integrations each workflow uses - Lambda functions, DynamoDB operations, SQS queues, SNS topics, and any other AWS service integrations.

## Step 2: Map State Types to Workflow Steps

Each Step Functions state type has an equivalent pattern in Cloud Workflows.

### Task States

Task states that invoke Lambda functions become HTTP call steps in Cloud Workflows:

```yaml
# Task state calling a Cloud Function
- invokeFunction:
    call: http.post
    args:
      url: https://us-central1-my-project.cloudfunctions.net/myFunction
      auth:
        type: OIDC
      body:
        input: ${inputData}
    result: functionResult
```

For direct GCP service integrations, Cloud Workflows has built-in connectors:

```yaml
# Direct Firestore read (equivalent to DynamoDB GetItem task)
- readDocument:
    call: googleapis.firestore.v1.projects.databases.documents.get
    args:
      name: ${"projects/my-project/databases/(default)/documents/orders/" + orderId}
    result: document
```

### Choice States

Step Functions Choice states map to switch blocks in Cloud Workflows:

```yaml
# Equivalent of a Choice state with multiple conditions
- checkOrderStatus:
    switch:
      - condition: ${orderData.body.status == "approved"}
        next: processOrder
      - condition: ${orderData.body.status == "pending"}
        next: waitForApproval
      - condition: true
        next: rejectOrder
```

### Wait States

Wait states translate directly:

```yaml
# Wait for a fixed duration (equivalent to Wait state with Seconds)
- waitStep:
    call: sys.sleep
    args:
      seconds: 300
```

### Parallel States

Step Functions Parallel states become parallel branches in Cloud Workflows:

```yaml
# Run multiple branches in parallel
- parallelProcessing:
    parallel:
      branches:
        - branch1:
            steps:
              - processImages:
                  call: http.post
                  args:
                    url: https://us-central1-my-project.cloudfunctions.net/processImages
                    body: ${imageData}
                  result: imageResult
        - branch2:
            steps:
              - processMetadata:
                  call: http.post
                  args:
                    url: https://us-central1-my-project.cloudfunctions.net/processMetadata
                    body: ${metaData}
                  result: metaResult
```

### Map States

Step Functions Map states (iterating over arrays) use for loops in Cloud Workflows:

```yaml
# Iterate over a list of items (equivalent to Map state)
- processItems:
    for:
      value: item
      in: ${orderData.body.items}
      steps:
        - processItem:
            call: http.post
            args:
              url: https://us-central1-my-project.cloudfunctions.net/processItem
              body:
                item: ${item}
            result: itemResult
```

## Step 3: Convert Error Handling

Step Functions uses Catch and Retry blocks. Cloud Workflows uses try/except/retry blocks that work similarly.

Step Functions error handling:

```json
{
  "Type": "Task",
  "Resource": "arn:aws:lambda:...",
  "Retry": [
    {
      "ErrorEquals": ["States.TaskFailed"],
      "IntervalSeconds": 3,
      "MaxAttempts": 3,
      "BackoffRate": 2
    }
  ],
  "Catch": [
    {
      "ErrorEquals": ["States.ALL"],
      "Next": "HandleError"
    }
  ]
}
```

The equivalent in Cloud Workflows:

```yaml
# Error handling with retry and catch
- callService:
    try:
      call: http.post
      args:
        url: https://us-central1-my-project.cloudfunctions.net/myFunction
        body: ${inputData}
      result: response
    retry:
      predicate: ${default_retry_predicate}
      max_retries: 3
      backoff:
        initial_delay: 3
        max_delay: 60
        multiplier: 2
    except:
      as: e
      steps:
        - handleError:
            call: http.post
            args:
              url: https://us-central1-my-project.cloudfunctions.net/handleError
              body:
                error: ${e.message}
```

## Step 4: Handle Input/Output Processing

Step Functions has InputPath, OutputPath, ResultPath, and Parameters for data transformation. Cloud Workflows handles this through variable assignments and expressions.

```yaml
# Assign and transform data between steps
- transformData:
    assign:
      - processedOrder:
          id: ${orderData.body.orderId}
          total: ${orderData.body.amount * 1.1}
          status: "processing"
```

For more involved transformations, consider calling a Cloud Function that does the heavy lifting.

## Step 5: Deploy and Test

Deploy your converted workflow:

```bash
# Deploy the workflow
gcloud workflows deploy my-migrated-workflow \
  --location=us-central1 \
  --source=workflow.yaml \
  --service-account=workflow-sa@my-project.iam.gserviceaccount.com

# Execute the workflow with test input
gcloud workflows run my-migrated-workflow \
  --location=us-central1 \
  --data='{"orderId": "test-123"}'

# Check execution status
gcloud workflows executions list my-migrated-workflow \
  --location=us-central1 \
  --limit=5
```

## Step 6: Migrate Triggers

Step Functions can be triggered by EventBridge rules, API Gateway, or direct SDK calls. Set up equivalent triggers in GCP:

```bash
# Trigger workflow from Cloud Scheduler (equivalent to EventBridge scheduled rule)
gcloud scheduler jobs create http my-workflow-trigger \
  --location=us-central1 \
  --schedule="0 */6 * * *" \
  --uri="https://workflowexecutions.googleapis.com/v1/projects/my-project/locations/us-central1/workflows/my-migrated-workflow/executions" \
  --http-method=POST \
  --oauth-service-account-email=workflow-sa@my-project.iam.gserviceaccount.com

# Trigger from Eventarc (equivalent to EventBridge event patterns)
gcloud eventarc triggers create my-workflow-trigger \
  --location=us-central1 \
  --destination-workflow=my-migrated-workflow \
  --destination-workflow-location=us-central1 \
  --event-filters="type=google.cloud.storage.object.v1.finalized" \
  --event-filters="bucket=my-bucket" \
  --service-account=workflow-sa@my-project.iam.gserviceaccount.com
```

## Things to Watch Out For

A few gotchas that tend to come up during migration:

- Cloud Workflows has a 32KB limit on variable sizes, and a 512KB limit on the total memory. For large payloads, store data in Cloud Storage or Firestore and pass references.
- Step Functions Express Workflows (synchronous, short-duration) map better to Cloud Workflows than Standard Workflows (long-running with exactly-once processing).
- Cloud Workflows has a maximum execution duration of one year, which should cover most use cases.
- The pricing models differ significantly. Step Functions charges per state transition; Cloud Workflows charges per step executed and per internal/external API call.

## Summary

Migrating Step Functions to Cloud Workflows is mostly a translation exercise. The concepts map fairly well - tasks become HTTP calls, choices become switch blocks, parallel stays parallel, and maps become for loops. The biggest differences are in data manipulation (Cloud Workflows is more explicit about variable assignments) and service integrations (HTTP calls vs. ARN-based resources). Take it one workflow at a time, test thoroughly with realistic inputs, and validate that error handling behaves correctly under failure conditions.
