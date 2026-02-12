# Use EventBridge Scheduler for Cron and One-Time Events

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EventBridge, Scheduler, Serverless

Description: Learn how to use Amazon EventBridge Scheduler to create recurring cron schedules and one-time scheduled events for serverless automation.

---

If you've been using CloudWatch Events or EventBridge rules for scheduling, EventBridge Scheduler is the upgrade you didn't know you needed. It supports millions of schedules per account (compared to 300 rules per bus), flexible time zones, one-time schedules that clean themselves up, and universal targets that work with over 270 AWS services.

Let's look at how to use it for both recurring jobs and one-time future events.

## EventBridge Scheduler vs EventBridge Rules

EventBridge rules have scheduling capability, but Scheduler is purpose-built for the job. Here's why it's better.

| Feature | EventBridge Rules | EventBridge Scheduler |
|---------|------------------|----------------------|
| Max schedules | 300 per bus | Millions per account |
| One-time schedules | Not supported | Supported |
| Time zone support | UTC only | All time zones |
| Flexible time windows | No | Yes |
| Auto-delete after execution | No | Yes |
| Universal targets | Limited | 270+ services |
| Dead letter queue | No | Yes |

For anything beyond basic cron jobs, Scheduler is the way to go.

## Creating a Recurring Schedule

Let's start with a classic use case - running a cleanup job every night.

This creates a schedule that runs at midnight EST every day:

```bash
aws scheduler create-schedule \
  --name nightly-cleanup \
  --schedule-expression "cron(0 0 * * ? *)" \
  --schedule-expression-timezone "America/New_York" \
  --flexible-time-window '{"Mode": "OFF"}' \
  --target '{
    "Arn": "arn:aws:lambda:us-east-1:123456789:function:cleanup",
    "RoleArn": "arn:aws:iam::123456789:role/SchedulerRole",
    "Input": "{\"action\": \"cleanup\", \"retentionDays\": 30}"
  }'
```

Notice the `schedule-expression-timezone` parameter. This is huge. With EventBridge rules, you had to calculate UTC offsets and deal with daylight saving time yourself. Scheduler handles all of that.

## Cron Expression Reference

EventBridge Scheduler uses the same cron format as other AWS services, with six fields.

Here are common patterns:

```
# Every 5 minutes
cron(0/5 * * * ? *)

# Every hour at :30
cron(30 * * * ? *)

# Every weekday at 9 AM
cron(0 9 ? * MON-FRI *)

# First day of every month at noon
cron(0 12 1 * ? *)

# Every Sunday at 2 AM
cron(0 2 ? * SUN *)

# Every 15 minutes during business hours
cron(0/15 9-17 ? * MON-FRI *)
```

## Rate-Based Schedules

For simpler intervals, use rate expressions instead of cron.

This runs a health check every 5 minutes:

```bash
aws scheduler create-schedule \
  --name health-check \
  --schedule-expression "rate(5 minutes)" \
  --flexible-time-window '{"Mode": "OFF"}' \
  --target '{
    "Arn": "arn:aws:lambda:us-east-1:123456789:function:health-check",
    "RoleArn": "arn:aws:iam::123456789:role/SchedulerRole"
  }'
```

Rate expressions support `minutes`, `hours`, and `days`.

## One-Time Schedules

This is the feature that makes Scheduler really special. You can create a schedule that fires once at a specific time and then optionally deletes itself.

This schedules a reminder for a specific date and time:

```bash
aws scheduler create-schedule \
  --name reminder-order-12345 \
  --schedule-expression "at(2026-03-15T10:00:00)" \
  --schedule-expression-timezone "America/Los_Angeles" \
  --flexible-time-window '{"Mode": "OFF"}' \
  --action-after-completion DELETE \
  --target '{
    "Arn": "arn:aws:lambda:us-east-1:123456789:function:send-reminder",
    "RoleArn": "arn:aws:iam::123456789:role/SchedulerRole",
    "Input": "{\"orderId\": \"12345\", \"message\": \"Your trial expires tomorrow\"}"
  }'
```

The `action-after-completion DELETE` setting automatically removes the schedule after it fires. Without it, the schedule stays around as a one-time schedule that has already executed.

## Creating Schedules Programmatically

One-time schedules are perfect for application-driven scheduling. Here's a Lambda function that schedules future actions.

This function schedules a follow-up email 24 hours after sign-up:

```javascript
// scheduleFollowUp.js - Creates a one-time schedule for future execution
const { SchedulerClient, CreateScheduleCommand }
  = require('@aws-sdk/client-scheduler');

const schedulerClient = new SchedulerClient({});
const ROLE_ARN = process.env.SCHEDULER_ROLE_ARN;
const TARGET_ARN = process.env.FOLLOWUP_FUNCTION_ARN;

exports.handler = async (event) => {
  const { userId, email, signUpTime } = event;

  // Calculate 24 hours from now
  const followUpTime = new Date(signUpTime);
  followUpTime.setHours(followUpTime.getHours() + 24);

  // Format as ISO string without milliseconds
  const scheduleTime = followUpTime.toISOString().split('.')[0];

  await schedulerClient.send(new CreateScheduleCommand({
    Name: `followup-${userId}`,
    ScheduleExpression: `at(${scheduleTime})`,
    ScheduleExpressionTimezone: 'UTC',
    FlexibleTimeWindow: { Mode: 'OFF' },
    ActionAfterCompletion: 'DELETE',
    Target: {
      Arn: TARGET_ARN,
      RoleArn: ROLE_ARN,
      Input: JSON.stringify({
        userId,
        email,
        type: 'follow_up_24h'
      })
    }
  }));

  return { scheduled: true, scheduledFor: scheduleTime };
};
```

## Flexible Time Windows

For non-time-critical jobs, flexible time windows let Scheduler spread out invocations to reduce burst load on your targets.

This schedule runs sometime within a 15-minute window:

```bash
aws scheduler create-schedule \
  --name daily-report \
  --schedule-expression "cron(0 9 * * ? *)" \
  --schedule-expression-timezone "America/New_York" \
  --flexible-time-window '{"Mode": "FLEXIBLE", "MaximumWindowInSeconds": 900}' \
  --target '{
    "Arn": "arn:aws:lambda:us-east-1:123456789:function:generate-report",
    "RoleArn": "arn:aws:iam::123456789:role/SchedulerRole"
  }'
```

Instead of firing at exactly 9:00 AM, it fires sometime between 9:00 and 9:15 AM. This is useful when you have many schedules that would otherwise all fire at the same time.

## Schedule Groups

Organize schedules into groups for easier management and tagging.

This creates a schedule group and adds schedules to it:

```bash
# Create a group
aws scheduler create-schedule-group --name order-schedules

# Create a schedule in the group
aws scheduler create-schedule \
  --name followup-12345 \
  --group-name order-schedules \
  --schedule-expression "at(2026-03-15T10:00:00)" \
  --schedule-expression-timezone "UTC" \
  --flexible-time-window '{"Mode": "OFF"}' \
  --action-after-completion DELETE \
  --target '{
    "Arn": "arn:aws:lambda:us-east-1:123456789:function:send-followup",
    "RoleArn": "arn:aws:iam::123456789:role/SchedulerRole"
  }'
```

You can delete an entire group to clean up all its schedules at once. Great for cleaning up schedules related to a specific feature or customer.

## Dead Letter Queues

When a schedule fails to invoke its target, you want to know. Configure a dead letter queue to capture failed invocations.

This schedule has a DLQ for retry handling:

```bash
aws scheduler create-schedule \
  --name critical-job \
  --schedule-expression "rate(1 hour)" \
  --flexible-time-window '{"Mode": "OFF"}' \
  --target '{
    "Arn": "arn:aws:lambda:us-east-1:123456789:function:critical-process",
    "RoleArn": "arn:aws:iam::123456789:role/SchedulerRole",
    "DeadLetterConfig": {
      "Arn": "arn:aws:sqs:us-east-1:123456789:scheduler-dlq"
    },
    "RetryPolicy": {
      "MaximumEventAgeInSeconds": 3600,
      "MaximumRetryAttempts": 3
    }
  }'
```

The retry policy tells Scheduler to retry up to 3 times within 1 hour before sending the event to the DLQ.

## Universal Targets

Scheduler can invoke over 270 AWS service APIs directly. This means you don't always need a Lambda function as the target.

This schedule starts a Step Functions execution directly:

```bash
aws scheduler create-schedule \
  --name weekly-etl \
  --schedule-expression "cron(0 2 ? * MON *)" \
  --schedule-expression-timezone "UTC" \
  --flexible-time-window '{"Mode": "FLEXIBLE", "MaximumWindowInSeconds": 1800}' \
  --target '{
    "Arn": "arn:aws:scheduler:::aws-sdk:sfn:startExecution",
    "RoleArn": "arn:aws:iam::123456789:role/SchedulerRole",
    "Input": "{\"StateMachineArn\": \"arn:aws:states:us-east-1:123456789:stateMachine:ETLPipeline\", \"Input\": \"{\\\"week\\\": \\\"current\\\"}\"}"
  }'
```

This puts a message directly on an SQS queue:

```bash
aws scheduler create-schedule \
  --name queue-daily-tasks \
  --schedule-expression "cron(0 8 * * ? *)" \
  --schedule-expression-timezone "America/New_York" \
  --flexible-time-window '{"Mode": "OFF"}' \
  --target '{
    "Arn": "arn:aws:scheduler:::aws-sdk:sqs:sendMessage",
    "RoleArn": "arn:aws:iam::123456789:role/SchedulerRole",
    "Input": "{\"QueueUrl\": \"https://sqs.us-east-1.amazonaws.com/123456789/tasks\", \"MessageBody\": \"{\\\"task\\\": \\\"daily-digest\\\"}\"}"
  }'
```

## Practical Example: Trial Expiration System

Here's a real-world scenario - scheduling actions when a user's trial period expires.

This Lambda creates a chain of scheduled actions for each new trial:

```javascript
// setupTrialSchedules.js - Creates schedules for trial lifecycle events
const { SchedulerClient, CreateScheduleCommand }
  = require('@aws-sdk/client-scheduler');

const scheduler = new SchedulerClient({});
const ROLE_ARN = process.env.SCHEDULER_ROLE_ARN;

exports.handler = async (event) => {
  const { userId, email, trialEndDate } = event;
  const endDate = new Date(trialEndDate);

  // Schedule reminder 3 days before trial ends
  const reminderDate = new Date(endDate);
  reminderDate.setDate(reminderDate.getDate() - 3);

  await scheduler.send(new CreateScheduleCommand({
    Name: `trial-reminder-${userId}`,
    GroupName: 'trial-schedules',
    ScheduleExpression: `at(${reminderDate.toISOString().split('.')[0]})`,
    ScheduleExpressionTimezone: 'UTC',
    FlexibleTimeWindow: { Mode: 'FLEXIBLE', MaximumWindowInSeconds: 3600 },
    ActionAfterCompletion: 'DELETE',
    Target: {
      Arn: process.env.NOTIFICATION_FUNCTION_ARN,
      RoleArn: ROLE_ARN,
      Input: JSON.stringify({
        userId, email,
        type: 'trial_expiring_soon',
        daysLeft: 3
      })
    }
  }));

  // Schedule trial expiration action
  await scheduler.send(new CreateScheduleCommand({
    Name: `trial-expire-${userId}`,
    GroupName: 'trial-schedules',
    ScheduleExpression: `at(${endDate.toISOString().split('.')[0]})`,
    ScheduleExpressionTimezone: 'UTC',
    FlexibleTimeWindow: { Mode: 'OFF' },
    ActionAfterCompletion: 'DELETE',
    Target: {
      Arn: process.env.EXPIRATION_FUNCTION_ARN,
      RoleArn: ROLE_ARN,
      Input: JSON.stringify({ userId, email, type: 'trial_expired' })
    }
  }));

  return { scheduled: true };
};
```

## Wrapping Up

EventBridge Scheduler is a massive improvement over scheduling with EventBridge rules. The support for time zones, one-time schedules with auto-deletion, flexible time windows, and universal targets makes it the right tool for almost any scheduling need. Use it for cron jobs, delayed actions, trial expirations, follow-up emails, and anything else that needs to happen at a specific time in the future.
