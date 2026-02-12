# How to Chain Lambda Functions with Step Functions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Step Functions, Orchestration, Serverless

Description: Learn how to use AWS Step Functions to orchestrate multiple Lambda functions into reliable, visual workflows with error handling, parallel execution, and retries.

---

Chaining Lambda functions together sounds simple - call one, pass its output to the next, repeat. But in practice, you hit problems fast. What if one function fails? How do you retry? What if you need parallel branches? How do you track the state of a multi-step process?

That's what Step Functions is for. It's a workflow orchestration service that lets you define state machines - sequences of steps that execute Lambda functions, handle errors, branch on conditions, run tasks in parallel, and keep track of the entire execution state. You define the workflow in JSON or YAML, and AWS handles the execution engine.

## Why Not Just Chain Lambdas Directly?

You could have one Lambda invoke another using the AWS SDK:

```javascript
// The naive approach - calling Lambda from Lambda (don't do this)
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const lambda = new LambdaClient({});

exports.handler = async (event) => {
  const result = await lambda.send(new InvokeCommand({
    FunctionName: 'step-two',
    Payload: JSON.stringify(event),
  }));
  // What if step-two fails? What if this Lambda times out waiting?
  // What about retry logic? State tracking? Parallel execution?
};
```

This approach has real problems:

- You're paying for Lambda execution time while it waits for the next function
- If the calling Lambda times out, you lose track of where you are
- Error handling and retries become your responsibility
- There's no visibility into the workflow state
- You can't easily add parallel branches or conditional logic

Step Functions solves all of these.

## Your First Step Functions Workflow

Let's build an order processing workflow that validates the order, charges the payment, sends a confirmation email, and updates inventory.

```json
{
  "Comment": "Order processing workflow",
  "StartAt": "ValidateOrder",
  "States": {
    "ValidateOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:validate-order",
      "Next": "ChargePayment",
      "Catch": [
        {
          "ErrorEquals": ["ValidationError"],
          "Next": "OrderFailed"
        }
      ]
    },
    "ChargePayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:charge-payment",
      "Next": "PostPaymentSteps",
      "Retry": [
        {
          "ErrorEquals": ["PaymentGatewayTimeout"],
          "IntervalSeconds": 5,
          "MaxAttempts": 3,
          "BackoffRate": 2.0
        }
      ],
      "Catch": [
        {
          "ErrorEquals": ["PaymentDeclined"],
          "Next": "OrderFailed"
        }
      ]
    },
    "PostPaymentSteps": {
      "Type": "Parallel",
      "Branches": [
        {
          "StartAt": "SendConfirmation",
          "States": {
            "SendConfirmation": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:us-east-1:123456789012:function:send-confirmation",
              "End": true
            }
          }
        },
        {
          "StartAt": "UpdateInventory",
          "States": {
            "UpdateInventory": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:us-east-1:123456789012:function:update-inventory",
              "End": true
            }
          }
        }
      ],
      "Next": "OrderComplete"
    },
    "OrderComplete": {
      "Type": "Succeed"
    },
    "OrderFailed": {
      "Type": "Fail",
      "Error": "OrderProcessingFailed",
      "Cause": "The order could not be processed"
    }
  }
}
```

This definition gives you built-in retries on payment failures, parallel execution of email and inventory updates, error catching at each step, and a visual representation in the AWS console.

## The Lambda Functions

Each Lambda function in the chain receives the output of the previous step as its input. Keep them focused - each function should do one thing well.

```javascript
// Step 1: Validate the order
exports.handler = async (event) => {
  const { items, customerId } = event;

  if (!items || items.length === 0) {
    // This error name matches the Catch block in the state machine
    const error = new Error('Order has no items');
    error.name = 'ValidationError';
    throw error;
  }

  // Validate each item
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Pass enriched data to the next step
  return {
    ...event,
    total,
    validatedAt: new Date().toISOString(),
  };
};
```

```javascript
// Step 2: Charge the payment
exports.handler = async (event) => {
  const { customerId, total, paymentMethod } = event;

  // Call your payment processor
  const charge = await processPayment({
    customerId,
    amount: total,
    method: paymentMethod,
  });

  if (!charge.success) {
    const error = new Error(`Payment declined: ${charge.reason}`);
    error.name = 'PaymentDeclined';
    throw error;
  }

  return {
    ...event,
    chargeId: charge.id,
    chargedAt: new Date().toISOString(),
  };
};
```

## Deploying with CloudFormation

Here's the full CloudFormation template:

```yaml
# Step Functions state machine with Lambda functions
Resources:
  OrderProcessingStateMachine:
    Type: AWS::StepFunctions::StateMachine
    Properties:
      StateMachineName: order-processing
      RoleArn: !GetAtt StepFunctionsRole.Arn
      DefinitionString: !Sub |
        {
          "StartAt": "ValidateOrder",
          "States": {
            "ValidateOrder": {
              "Type": "Task",
              "Resource": "${ValidateOrderFunction.Arn}",
              "Next": "ChargePayment"
            },
            "ChargePayment": {
              "Type": "Task",
              "Resource": "${ChargePaymentFunction.Arn}",
              "Retry": [{"ErrorEquals": ["States.TaskFailed"], "MaxAttempts": 2}],
              "Next": "SendConfirmation"
            },
            "SendConfirmation": {
              "Type": "Task",
              "Resource": "${SendConfirmationFunction.Arn}",
              "End": true
            }
          }
        }

  # IAM role that allows Step Functions to invoke Lambda
  StepFunctionsRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              Service: states.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: InvokeLambda
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              - Effect: Allow
                Action: lambda:InvokeFunction
                Resource:
                  - !GetAtt ValidateOrderFunction.Arn
                  - !GetAtt ChargePaymentFunction.Arn
                  - !GetAtt SendConfirmationFunction.Arn
```

## State Types You Should Know

Step Functions has several state types beyond Task:

**Choice** - Branch based on conditions:

```json
{
  "CheckOrderTotal": {
    "Type": "Choice",
    "Choices": [
      {
        "Variable": "$.total",
        "NumericGreaterThan": 1000,
        "Next": "RequireApproval"
      },
      {
        "Variable": "$.isPriorityCustomer",
        "BooleanEquals": true,
        "Next": "ExpressProcessing"
      }
    ],
    "Default": "StandardProcessing"
  }
}
```

**Wait** - Pause execution for a specified duration:

```json
{
  "WaitForPaymentSettlement": {
    "Type": "Wait",
    "Seconds": 300,
    "Next": "CheckPaymentStatus"
  }
}
```

**Map** - Iterate over a list, executing a sub-workflow for each item:

```json
{
  "ProcessEachItem": {
    "Type": "Map",
    "ItemsPath": "$.items",
    "MaxConcurrency": 5,
    "Iterator": {
      "StartAt": "ProcessItem",
      "States": {
        "ProcessItem": {
          "Type": "Task",
          "Resource": "arn:aws:lambda:us-east-1:123456789012:function:process-item",
          "End": true
        }
      }
    },
    "Next": "AllItemsProcessed"
  }
}
```

## Passing Data Between Steps

By default, each step receives the entire output of the previous step. You can control this with InputPath, OutputPath, and ResultPath:

```json
{
  "ChargePayment": {
    "Type": "Task",
    "Resource": "arn:aws:lambda:...:charge-payment",
    "InputPath": "$.paymentDetails",
    "ResultPath": "$.chargeResult",
    "OutputPath": "$",
    "Next": "SendConfirmation"
  }
}
```

- `InputPath` - Selects what part of the state to send to the Lambda
- `ResultPath` - Determines where to place the Lambda's output in the state
- `OutputPath` - Filters what's passed to the next state

## Starting Executions

You can start a Step Functions execution from the CLI, SDK, API Gateway, EventBridge, or another Lambda:

```bash
# Start an execution from the CLI
aws stepfunctions start-execution \
  --state-machine-arn arn:aws:states:us-east-1:123456789012:stateMachine:order-processing \
  --input '{
    "orderId": "ORD-12345",
    "customerId": "CUST-789",
    "items": [
      {"productId": "PROD-1", "quantity": 2, "price": 29.99}
    ],
    "paymentMethod": "card_ending_4242"
  }'
```

## Express vs Standard Workflows

Step Functions offers two workflow types:

- **Standard** - For long-running workflows (up to 1 year). Each state transition is durable and you can track execution history. Priced per state transition.
- **Express** - For high-volume, short-duration workflows (up to 5 minutes). Better for real-time processing. Priced by execution count and duration.

Use Standard for order processing, approval workflows, and ETL pipelines. Use Express for data transformation, real-time event processing, and high-throughput microservice orchestration.

## Monitoring Executions

The Step Functions console gives you a visual map of each execution, showing which states succeeded, failed, or are in progress. For programmatic monitoring:

```bash
# List recent executions and their status
aws stepfunctions list-executions \
  --state-machine-arn arn:aws:states:us-east-1:123456789012:stateMachine:order-processing \
  --status-filter FAILED \
  --max-results 10
```

For deeper Lambda monitoring within these workflows, check out [monitoring Lambda performance with CloudWatch](https://oneuptime.com/blog/post/monitor-lambda-function-performance-with-cloudwatch/view).

## Wrapping Up

Step Functions transforms fragile chains of Lambda calls into robust, observable workflows. You get built-in retries, parallel execution, conditional branching, and a visual execution history - all without writing orchestration code. Define your workflow as a state machine, let each Lambda function focus on a single task, and let Step Functions handle the plumbing.
