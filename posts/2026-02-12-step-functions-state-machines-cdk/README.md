# How to Create Step Functions State Machines with CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, Step Functions, Serverless

Description: Build AWS Step Functions state machines using CDK with TypeScript, including task states, error handling, parallel execution, and integration with Lambda.

---

AWS Step Functions lets you orchestrate complex workflows as visual state machines. Instead of chaining Lambda functions together with spaghetti code, you define the flow declaratively and let Step Functions handle retries, error catching, and state transitions. CDK makes defining these state machines much more pleasant than writing raw Amazon States Language JSON.

Let's build several state machine patterns using CDK, from simple sequences to parallel execution with error handling.

## Basic Sequential Workflow

Here's a simple order processing workflow that validates an order, charges the customer, and sends a confirmation:

```typescript
// lib/workflow-stack.ts - Sequential Step Functions workflow
import * as cdk from 'aws-cdk-lib';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class WorkflowStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define Lambda functions for each step
    const validateOrder = new lambda.Function(this, 'ValidateOrder', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/validate-order'),
      functionName: 'validate-order',
    });

    const chargeCustomer = new lambda.Function(this, 'ChargeCustomer', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/charge-customer'),
      functionName: 'charge-customer',
    });

    const sendConfirmation = new lambda.Function(this, 'SendConfirmation', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/send-confirmation'),
      functionName: 'send-confirmation',
    });

    // Define the state machine steps
    const validateTask = new tasks.LambdaInvoke(this, 'Validate Order', {
      lambdaFunction: validateOrder,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    const chargeTask = new tasks.LambdaInvoke(this, 'Charge Customer', {
      lambdaFunction: chargeCustomer,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    const confirmTask = new tasks.LambdaInvoke(this, 'Send Confirmation', {
      lambdaFunction: sendConfirmation,
      outputPath: '$.Payload',
    });

    // Chain them together
    const definition = validateTask
      .next(chargeTask)
      .next(confirmTask);

    // Create the state machine
    new sfn.StateMachine(this, 'OrderProcessing', {
      stateMachineName: 'order-processing',
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      timeout: cdk.Duration.minutes(5),
    });
  }
}
```

The `outputPath: '$.Payload'` is important when using Lambda tasks. Lambda invoke wraps the response in a `Payload` field, so this extracts the actual return value.

## Choice States and Branching

Real workflows branch based on conditions. Here's a state machine that routes orders differently based on their total:

```typescript
// Branching workflow with choice states
const smallOrderHandler = new tasks.LambdaInvoke(this, 'Handle Small Order', {
  lambdaFunction: processSmallOrder,
  outputPath: '$.Payload',
});

const largeOrderHandler = new tasks.LambdaInvoke(this, 'Handle Large Order', {
  lambdaFunction: processLargeOrder,
  outputPath: '$.Payload',
});

const fraudCheck = new tasks.LambdaInvoke(this, 'Fraud Check', {
  lambdaFunction: checkFraud,
  outputPath: '$.Payload',
});

// Define the choice state
const orderRouter = new sfn.Choice(this, 'Route By Order Size')
  .when(
    sfn.Condition.numberGreaterThan('$.orderTotal', 1000),
    fraudCheck.next(largeOrderHandler)
  )
  .when(
    sfn.Condition.numberLessThanEquals('$.orderTotal', 1000),
    smallOrderHandler
  )
  .otherwise(
    new sfn.Fail(this, 'Invalid Order', {
      cause: 'Order total is missing or invalid',
      error: 'INVALID_ORDER',
    })
  );

const definition = validateTask.next(orderRouter);
```

CDK's fluent API for defining choices reads much better than raw ASL JSON. You can combine conditions too:

```typescript
// Combined conditions with AND/OR logic
const needsApproval = sfn.Condition.and(
  sfn.Condition.numberGreaterThan('$.orderTotal', 5000),
  sfn.Condition.stringEquals('$.customerTier', 'new')
);
```

## Error Handling and Retries

Step Functions has excellent built-in retry and catch mechanisms. Here's how to use them:

```typescript
// Task with retry logic and error catching
const paymentTask = new tasks.LambdaInvoke(this, 'Process Payment', {
  lambdaFunction: processPayment,
  outputPath: '$.Payload',
});

// Retry on specific errors with exponential backoff
paymentTask.addRetry({
  errors: ['PaymentGatewayTimeout', 'States.TaskFailed'],
  interval: cdk.Duration.seconds(2),
  maxAttempts: 3,
  backoffRate: 2, // Each retry waits 2x longer
});

// Catch unrecoverable errors
const handlePaymentFailure = new tasks.LambdaInvoke(this, 'Handle Payment Failure', {
  lambdaFunction: notifyPaymentFailure,
  outputPath: '$.Payload',
});

paymentTask.addCatch(handlePaymentFailure, {
  errors: ['PaymentDeclined', 'InsufficientFunds'],
  resultPath: '$.error',
});

// Catch-all for unexpected errors
paymentTask.addCatch(
  new sfn.Fail(this, 'Unexpected Error', {
    cause: 'An unexpected error occurred during payment processing',
    error: 'UNEXPECTED_ERROR',
  }),
  { errors: ['States.ALL'] }
);
```

The `resultPath: '$.error'` in the catch block is clever - it adds the error information to the state input rather than replacing it, so the error handler has access to both the original order data and the error details.

## Parallel Execution

When steps are independent, run them in parallel to save time:

```typescript
// Parallel execution for independent tasks
const updateInventory = new tasks.LambdaInvoke(this, 'Update Inventory', {
  lambdaFunction: inventoryFn,
  outputPath: '$.Payload',
});

const generateInvoice = new tasks.LambdaInvoke(this, 'Generate Invoice', {
  lambdaFunction: invoiceFn,
  outputPath: '$.Payload',
});

const notifyWarehouse = new tasks.LambdaInvoke(this, 'Notify Warehouse', {
  lambdaFunction: warehouseFn,
  outputPath: '$.Payload',
});

// Run all three in parallel
const parallelStep = new sfn.Parallel(this, 'Post-Payment Processing')
  .branch(updateInventory)
  .branch(generateInvoice)
  .branch(notifyWarehouse);

// Add error handling to the parallel state
parallelStep.addCatch(
  new tasks.LambdaInvoke(this, 'Handle Post-Payment Error', {
    lambdaFunction: errorHandlerFn,
  }),
  { resultPath: '$.parallelError' }
);

const definition = validateTask
  .next(paymentTask)
  .next(parallelStep)
  .next(confirmTask);
```

The parallel state collects results from all branches into an array. If any branch fails (and isn't caught), the entire parallel state fails.

## Wait States and Callbacks

Sometimes you need to wait for an external process. Step Functions supports both timed waits and callback patterns:

```typescript
// Wait state for time-based delays
const waitForShipping = new sfn.Wait(this, 'Wait For Shipping Window', {
  time: sfn.WaitTime.duration(cdk.Duration.hours(2)),
});

// Dynamic wait based on input
const waitUntilDelivery = new sfn.Wait(this, 'Wait Until Delivery', {
  time: sfn.WaitTime.timestampPath('$.estimatedDelivery'),
});

// Callback pattern for human approval
const waitForApproval = new tasks.LambdaInvoke(this, 'Request Approval', {
  lambdaFunction: requestApprovalFn,
  integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
  payload: sfn.TaskInput.fromObject({
    taskToken: sfn.JsonPath.taskToken,
    orderId: sfn.JsonPath.stringAt('$.orderId'),
    orderTotal: sfn.JsonPath.numberAt('$.orderTotal'),
  }),
  timeout: cdk.Duration.days(7), // Approval must happen within 7 days
});
```

With the callback pattern, the state machine pauses until your Lambda function calls `SendTaskSuccess` or `SendTaskFailure` with the task token. This is perfect for human approval workflows.

## Direct Service Integrations

You don't always need Lambda. Step Functions can call AWS services directly:

```typescript
// Direct DynamoDB integration without Lambda
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

const ordersTable = new dynamodb.Table(this, 'OrdersTable', {
  tableName: 'orders',
  partitionKey: { name: 'orderId', type: dynamodb.AttributeType.STRING },
});

const saveOrder = new tasks.DynamoPutItem(this, 'Save Order', {
  table: ordersTable,
  item: {
    orderId: tasks.DynamoAttributeValue.fromString(
      sfn.JsonPath.stringAt('$.orderId')
    ),
    status: tasks.DynamoAttributeValue.fromString('COMPLETED'),
    total: tasks.DynamoAttributeValue.numberFromString(
      sfn.JsonPath.stringAt('$.orderTotal')
    ),
  },
  resultPath: sfn.JsonPath.DISCARD,
});

// Direct SNS publish
import * as sns from 'aws-cdk-lib/aws-sns';

const orderTopic = new sns.Topic(this, 'OrderTopic');

const notifyComplete = new tasks.SnsPublish(this, 'Notify Complete', {
  topic: orderTopic,
  message: sfn.TaskInput.fromJsonPathAt('$'),
  subject: 'Order Completed',
  resultPath: sfn.JsonPath.DISCARD,
});
```

Direct integrations skip the Lambda overhead entirely - no cold starts, no execution costs, and lower latency.

## Express vs Standard Workflows

CDK supports both workflow types. Express workflows are cheaper and faster but don't support all features:

```typescript
// Express workflow for high-volume, short-duration tasks
const expressWorkflow = new sfn.StateMachine(this, 'DataTransform', {
  stateMachineName: 'data-transform-express',
  stateMachineType: sfn.StateMachineType.EXPRESS,
  definitionBody: sfn.DefinitionBody.fromChainable(transformDefinition),
  timeout: cdk.Duration.minutes(5),
  logs: {
    destination: new cdk.aws_logs.LogGroup(this, 'ExpressLogs'),
    level: sfn.LogLevel.ALL,
  },
});
```

Express workflows are great for data processing pipelines where you're running thousands of executions per second. Standard workflows are better for long-running processes that need exactly-once execution.

For connecting your state machines to event-driven triggers, check out [creating EventBridge rules with CDK](https://oneuptime.com/blog/post/eventbridge-rules-cdk/view). If your workflows need queue-based input, see [creating SQS queues with CDK](https://oneuptime.com/blog/post/sqs-queues-cdk/view).

## Wrapping Up

CDK's Step Functions constructs turn complex workflow definitions into readable, maintainable TypeScript code. The key patterns - sequential chaining, choice branching, parallel execution, error handling, and direct service integrations - cover the vast majority of real-world use cases. Start with a simple sequential workflow, add error handling, then introduce parallelism and branching as your business logic requires.
