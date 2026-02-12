# Use Step Functions Standard vs Express Workflows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Step Functions, Serverless

Description: A practical comparison of AWS Step Functions Standard and Express workflows to help you choose the right type for your use case.

---

When you create a Step Functions state machine, the first thing you need to decide is whether to use Standard or Express. This isn't just a configuration toggle - it fundamentally changes how your workflow behaves, what it costs, and what it can do. Picking the wrong one can mean paying 10x more than you should or hitting limitations that force a rewrite.

Let's break down the differences and figure out which one you actually need.

## The Quick Comparison

Here's the key difference in one sentence: Standard workflows are for long-running, exactly-once processes. Express workflows are for high-volume, short-lived, at-least-once processes.

That might sound abstract, so let's make it concrete.

| Feature | Standard | Express |
|---------|----------|---------|
| Max duration | 1 year | 5 minutes |
| Execution guarantee | Exactly once | At least once |
| Pricing model | Per state transition | Per execution + duration |
| Max execution rate | 2,000/sec | 100,000/sec |
| Execution history | Stored for 90 days | CloudWatch Logs only |
| Visual debugging | Full support | Limited |

## Standard Workflows in Detail

Standard workflows are the default. They're designed for processes that might take a long time, need exactly-once execution guarantees, and benefit from built-in execution history.

Every state transition is recorded and persisted. If your state machine fails halfway through, you can look at exactly which state it was in, what the input was, and what went wrong. This history sticks around for 90 days.

Here's what a Standard workflow looks like when you create it.

This creates a Standard state machine for order processing:

```bash
aws stepfunctions create-state-machine \
  --name OrderProcessor \
  --type STANDARD \
  --definition '{
    "Comment": "Order processing - Standard workflow",
    "StartAt": "ValidateOrder",
    "States": {
      "ValidateOrder": {
        "Type": "Task",
        "Resource": "arn:aws:lambda:us-east-1:123456789:function:validate",
        "Next": "WaitForApproval"
      },
      "WaitForApproval": {
        "Type": "Task",
        "Resource": "arn:aws:states:::sqs:sendMessage.waitForTaskToken",
        "Parameters": {
          "QueueUrl": "https://sqs.us-east-1.amazonaws.com/123456789/approvals",
          "MessageBody": {
            "taskToken.$": "$$.Task.Token",
            "orderId.$": "$.orderId"
          }
        },
        "Next": "ProcessOrder"
      },
      "ProcessOrder": {
        "Type": "Task",
        "Resource": "arn:aws:lambda:us-east-1:123456789:function:process",
        "End": true
      }
    }
  }' \
  --role-arn arn:aws:iam::123456789:role/StepFunctionsRole
```

Notice the `WaitForApproval` state - it uses a task token to pause execution until a human approves the order. This could take minutes, hours, or days. Standard workflows handle this naturally because they can run for up to a year.

## Express Workflows in Detail

Express workflows are built for speed and volume. They're perfect for processing events, transforming data, and handling high-throughput workloads where you need sub-second response times.

There are actually two subtypes: Synchronous Express and Asynchronous Express.

### Synchronous Express

Synchronous Express workflows wait for the execution to complete and return the result. They're ideal when you need a response, like an API call.

This creates a synchronous Express workflow for real-time data validation:

```json
{
  "Comment": "Data validation - Express workflow",
  "StartAt": "ValidateInput",
  "States": {
    "ValidateInput": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:validate-input",
      "Next": "EnrichData"
    },
    "EnrichData": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:enrich-data",
      "Next": "FormatResponse"
    },
    "FormatResponse": {
      "Type": "Pass",
      "Parameters": {
        "statusCode": 200,
        "body.$": "$"
      },
      "End": true
    }
  }
}
```

You'd invoke it synchronously like this:

```javascript
// Invoking a synchronous Express workflow
const { SFNClient, StartSyncExecutionCommand } = require('@aws-sdk/client-sfn');

const sfnClient = new SFNClient({});

exports.handler = async (event) => {
  const result = await sfnClient.send(new StartSyncExecutionCommand({
    stateMachineArn: process.env.EXPRESS_STATE_MACHINE_ARN,
    input: JSON.stringify(event)
  }));

  // Result is available immediately
  return {
    statusCode: 200,
    body: result.output
  };
};
```

### Asynchronous Express

Asynchronous Express workflows fire and forget. You start them and they run in the background. Good for event processing pipelines where you don't need an immediate response.

## Pricing Breakdown

This is where the choice gets really practical. Let me show you the math.

Standard workflow pricing is based on state transitions. You pay $0.025 per 1,000 transitions. If your workflow has 5 states and runs 100,000 times per month, that's 500,000 transitions, costing $12.50.

Express workflow pricing is based on number of executions and duration. You pay $1.00 per million executions plus $0.00001667 per GB-second of memory. Those same 100,000 executions (assuming 2 seconds each at 64MB) would cost about $0.31.

That's a 40x cost difference for the same workload. Here's a comparison at different scales:

```
Monthly Executions | Standard (5 states) | Express (2s each)
10,000             | $1.25               | $0.03
100,000            | $12.50              | $0.31
1,000,000          | $125.00             | $3.10
10,000,000         | $1,250.00           | $31.00
```

If your workflow fits within Express's constraints, the cost savings are enormous.

## When to Use Standard

Standard workflows are the right choice when your workflow:

- Might run for more than 5 minutes
- Needs exactly-once execution (payment processing, inventory updates)
- Uses callback patterns (waiting for human approval)
- Requires execution history for auditing
- Has relatively low volume (under 100k executions/day)

A good example is an employee onboarding workflow:

```json
{
  "Comment": "Employee onboarding - needs Standard for long waits",
  "StartAt": "CreateAccount",
  "States": {
    "CreateAccount": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:create-account",
      "Next": "WaitForBackgroundCheck"
    },
    "WaitForBackgroundCheck": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sqs:sendMessage.waitForTaskToken",
      "TimeoutSeconds": 604800,
      "Next": "ProvisionAccess"
    },
    "ProvisionAccess": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:provision-access",
      "End": true
    }
  }
}
```

The background check could take days. Only Standard workflows can handle that wait.

## When to Use Express

Express workflows are the right choice when your workflow:

- Completes in under 5 minutes
- Can tolerate at-least-once execution
- Handles high volume (event processing, IoT data, API orchestration)
- Needs to be cost-effective at scale
- Benefits from synchronous invocation

Event processing is the classic Express use case:

```json
{
  "Comment": "IoT event processing - Express for high throughput",
  "StartAt": "ParseEvent",
  "States": {
    "ParseEvent": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:parse-iot-event",
      "Next": "CheckThreshold"
    },
    "CheckThreshold": {
      "Type": "Choice",
      "Choices": [
        {
          "Variable": "$.temperature",
          "NumericGreaterThan": 100,
          "Next": "TriggerAlert"
        }
      ],
      "Default": "StoreReading"
    },
    "TriggerAlert": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:trigger-alert",
      "Next": "StoreReading"
    },
    "StoreReading": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:store-reading",
      "End": true
    }
  }
}
```

Processing thousands of IoT events per second? Express can handle 100,000 executions per second while keeping your bill reasonable.

## Monitoring Both Types

Standard workflows give you built-in execution history in the console, which is fantastic for debugging. Express workflows push execution details to CloudWatch Logs, so you'll want to set up log groups and dashboards. For tips on monitoring Step Functions executions effectively, check out our post on [monitoring Step Functions in the console](https://oneuptime.com/blog/post/monitor-step-functions-executions-console/view).

## Making the Decision

Start by asking three questions. Will the workflow ever run longer than 5 minutes? If yes, Standard. Do I need exactly-once execution? If yes, Standard. Will I have more than 10,000 executions per day? If yes, seriously consider Express.

Most teams start with Standard because it's easier to debug and reason about. Then they switch specific high-volume workflows to Express when cost becomes a factor. There's nothing wrong with using both types in the same application.

## Wrapping Up

Standard and Express aren't better or worse - they're designed for different jobs. Standard gives you durability, visibility, and exactly-once guarantees. Express gives you speed, throughput, and cost efficiency. Understanding the tradeoffs means you can pick the right tool for each workflow instead of forcing everything into one model.
