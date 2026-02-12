# How to Create EventBridge Rules with CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, EventBridge, Serverless

Description: Build Amazon EventBridge rules using AWS CDK to route events between services, schedule tasks, and create event-driven architectures with TypeScript.

---

EventBridge is the central nervous system of event-driven AWS architectures. It routes events from AWS services, custom applications, and SaaS providers to targets like Lambda, SQS, Step Functions, and more. CDK gives you a clean way to define these event routing rules as code, which is way better than clicking through the console and hoping you got the event pattern right.

Let's build out EventBridge rules for the most common patterns - AWS service events, scheduled tasks, custom events, and cross-account routing.

## Basic Event Rule

The simplest use case is catching an AWS service event and routing it somewhere. Here's a rule that triggers a Lambda function whenever an EC2 instance changes state:

```typescript
// lib/eventbridge-stack.ts - Basic EventBridge rule setup
import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class EventBridgeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda function that processes EC2 state changes
    const ec2Handler = new lambda.Function(this, 'EC2StateHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/ec2-handler'),
      functionName: 'ec2-state-change-handler',
    });

    // Rule that matches EC2 instance state changes
    new events.Rule(this, 'EC2StateChangeRule', {
      ruleName: 'ec2-state-change',
      description: 'Capture EC2 instance state changes',
      eventPattern: {
        source: ['aws.ec2'],
        detailType: ['EC2 Instance State-change Notification'],
        detail: {
          state: ['stopped', 'terminated'],
        },
      },
      targets: [new targets.LambdaFunction(ec2Handler)],
    });
  }
}
```

CDK handles the permissions automatically. When you add a Lambda function as a target, it creates the resource-based policy that allows EventBridge to invoke the function.

## Scheduled Rules

EventBridge replaces CloudWatch Events for scheduled tasks. You can use either rate expressions or cron expressions:

```typescript
// Scheduled rules with rate and cron expressions
const cleanupFunction = new lambda.Function(this, 'CleanupFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/cleanup'),
});

// Run every 6 hours using a rate expression
new events.Rule(this, 'PeriodicCleanup', {
  ruleName: 'periodic-cleanup',
  schedule: events.Schedule.rate(cdk.Duration.hours(6)),
  targets: [new targets.LambdaFunction(cleanupFunction)],
});

// Run at 2 AM UTC every weekday using a cron expression
new events.Rule(this, 'NightlyReport', {
  ruleName: 'nightly-report',
  schedule: events.Schedule.cron({
    minute: '0',
    hour: '2',
    weekDay: 'MON-FRI',
  }),
  targets: [new targets.LambdaFunction(reportFunction)],
});

// Run on the first day of every month
new events.Rule(this, 'MonthlyAudit', {
  ruleName: 'monthly-audit',
  schedule: events.Schedule.cron({
    minute: '0',
    hour: '9',
    day: '1',
    month: '*',
    year: '*',
  }),
  targets: [new targets.LambdaFunction(auditFunction)],
});
```

One gotcha with cron expressions - you can't specify both `day` and `weekDay`. Use a question mark for the one you don't need, or just omit it in CDK since undefined fields default to wildcards.

## Multiple Targets

A single rule can route events to multiple targets. This is the fan-out pattern without needing SNS:

```typescript
// One rule, multiple targets
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as logs from 'aws-cdk-lib/aws-logs';

const processingQueue = new sqs.Queue(this, 'ProcessingQueue');
const auditLogGroup = new logs.LogGroup(this, 'AuditLog', {
  logGroupName: '/events/audit',
  retention: logs.RetentionDays.ONE_YEAR,
});

const orderRule = new events.Rule(this, 'NewOrderRule', {
  ruleName: 'new-order-events',
  eventPattern: {
    source: ['com.myapp.orders'],
    detailType: ['OrderCreated'],
  },
});

// Add multiple targets to the same rule
orderRule.addTarget(new targets.LambdaFunction(orderProcessor));
orderRule.addTarget(new targets.SqsQueue(processingQueue));
orderRule.addTarget(new targets.CloudWatchLogGroup(auditLogGroup));
```

Each target gets its own copy of the event. If one target fails, it doesn't affect the others.

## Custom Event Buses

The default event bus receives AWS service events. For application events, create a custom bus:

```typescript
// Custom event bus for application events
const appBus = new events.EventBus(this, 'AppEventBus', {
  eventBusName: 'my-application',
});

// Rule on the custom bus
new events.Rule(this, 'UserSignupRule', {
  ruleName: 'user-signup',
  eventBus: appBus,
  eventPattern: {
    source: ['com.myapp.auth'],
    detailType: ['UserSignedUp'],
  },
  targets: [
    new targets.LambdaFunction(welcomeEmailFn),
    new targets.LambdaFunction(createProfileFn),
  ],
});
```

To publish events to your custom bus from application code:

```typescript
// Application code to publish custom events
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const client = new EventBridgeClient({});

await client.send(new PutEventsCommand({
  Entries: [{
    EventBusName: 'my-application',
    Source: 'com.myapp.auth',
    DetailType: 'UserSignedUp',
    Detail: JSON.stringify({
      userId: '12345',
      email: 'user@example.com',
      plan: 'premium',
    }),
  }],
}));
```

## Input Transformation

You don't always want to pass the raw event to your target. Input transformers let you reshape the data:

```typescript
// Transform event data before sending to target
const slackNotifier = new lambda.Function(this, 'SlackNotifier', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/slack-notifier'),
});

new events.Rule(this, 'DeploymentAlert', {
  ruleName: 'deployment-notification',
  eventPattern: {
    source: ['aws.codedeploy'],
    detailType: ['CodeDeploy Deployment State-change Notification'],
    detail: {
      state: ['FAILURE', 'STOP'],
    },
  },
  targets: [
    new targets.LambdaFunction(slackNotifier, {
      event: events.RuleTargetInput.fromObject({
        message: events.EventField.fromPath('$.detail.deploymentId'),
        status: events.EventField.fromPath('$.detail.state'),
        application: events.EventField.fromPath('$.detail.application'),
        timestamp: events.EventField.fromPath('$.time'),
      }),
    }),
  ],
});
```

## Step Functions as Target

EventBridge can start Step Functions executions directly:

```typescript
// Start a Step Functions execution from an EventBridge rule
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';

const orderWorkflow = new sfn.StateMachine(this, 'OrderWorkflow', {
  // ... state machine definition
  stateMachineName: 'order-workflow',
  definitionBody: sfn.DefinitionBody.fromChainable(definition),
});

new events.Rule(this, 'TriggerOrderWorkflow', {
  ruleName: 'trigger-order-workflow',
  eventPattern: {
    source: ['com.myapp.orders'],
    detailType: ['OrderCreated'],
  },
  targets: [new targets.SfnStateMachine(orderWorkflow, {
    input: events.RuleTargetInput.fromEventPath('$.detail'),
  })],
});
```

## Event Archive and Replay

EventBridge can archive events for later replay. This is incredibly useful for debugging and recovery:

```typescript
// Archive events for replay capability
const archive = new events.Archive(this, 'OrderEventArchive', {
  sourceEventBus: appBus,
  archiveName: 'order-events-archive',
  description: 'Archive of all order events for replay',
  eventPattern: {
    source: ['com.myapp.orders'],
  },
  retention: cdk.Duration.days(90),
});
```

## Cross-Account Event Routing

In multi-account setups, you can route events between accounts:

```typescript
// Allow another account to put events on your bus
appBus.addToResourcePolicy(new cdk.aws_iam.PolicyStatement({
  sid: 'AllowCrossAccountPut',
  effect: cdk.aws_iam.Effect.ALLOW,
  principals: [new cdk.aws_iam.AccountPrincipal('987654321098')],
  actions: ['events:PutEvents'],
  resources: [appBus.eventBusArn],
}));
```

For setting up security alerting with EventBridge, check out our post on [security alerting with EventBridge and SNS](https://oneuptime.com/blog/post/security-alerting-eventbridge-sns/view). If you need to wire up state machines as targets, see [Step Functions state machines with CDK](https://oneuptime.com/blog/post/step-functions-state-machines-cdk/view).

## Wrapping Up

EventBridge rules are the routing layer of modern AWS architectures. CDK makes them easy to define, test, and deploy consistently. Start with simple service event rules, add scheduled rules for periodic tasks, then build out custom event buses for your application events. The combination of pattern matching, input transformation, and multiple targets gives you incredible flexibility in how you connect services together.
