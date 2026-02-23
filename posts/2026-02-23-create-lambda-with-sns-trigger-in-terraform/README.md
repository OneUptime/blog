# How to Create Lambda with SNS Trigger in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Lambda, SNS, Event-Driven, Serverless, Notifications

Description: How to configure AWS Lambda functions as SNS topic subscribers in Terraform, with filtering policies, fan-out patterns, and cross-account subscription examples.

---

Amazon SNS is a pub/sub messaging service. Publishers send messages to topics, and subscribers receive them. Lambda functions can subscribe to SNS topics, getting invoked automatically whenever a message is published. Unlike SQS, where Lambda polls for messages, SNS pushes messages to Lambda directly. This makes the integration simpler but also means there is no built-in retry queue - if Lambda fails, SNS handles retries on its own.

This guide covers setting up Lambda as an SNS subscriber in Terraform, including subscription filtering, fan-out patterns where one topic triggers multiple functions, and the permissions model.

## Basic SNS to Lambda Setup

The setup requires three things: an SNS topic, a Lambda function, and an SNS subscription that connects them:

```hcl
# SNS topic
resource "aws_sns_topic" "notifications" {
  name = "app-notifications"

  tags = {
    Name = "app-notifications"
  }
}

# Lambda function
resource "aws_lambda_function" "notifier" {
  function_name = "notification-handler"
  handler       = "index.handler"
  runtime       = "python3.12"
  role          = aws_iam_role.lambda_exec.arn
  timeout       = 30
  memory_size   = 128

  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  environment {
    variables = {
      SLACK_WEBHOOK_URL = var.slack_webhook_url
    }
  }

  tags = {
    Name = "notification-handler"
  }
}

data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/lambda.zip"
}

# SNS subscription - Lambda subscribes to the topic
resource "aws_sns_topic_subscription" "lambda" {
  topic_arn = aws_sns_topic.notifications.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.notifier.arn
}

# Permission for SNS to invoke Lambda
resource "aws_lambda_permission" "sns_invoke" {
  statement_id  = "AllowSNSInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.notifier.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.notifications.arn
}
```

## IAM Role

```hcl
resource "aws_iam_role" "lambda_exec" {
  name = "notification-handler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
```

## Subscription Filter Policies

Filter policies let you route only specific messages to each subscriber. Instead of every Lambda getting every message, each function only receives messages that match its filter:

```hcl
# Topic for order events
resource "aws_sns_topic" "orders" {
  name = "order-events"
}

# Lambda for high-value order processing
resource "aws_sns_topic_subscription" "high_value_orders" {
  topic_arn = aws_sns_topic.orders.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.high_value_processor.arn

  # Only receive messages where order_value > 1000
  filter_policy = jsonencode({
    order_type = ["premium", "enterprise"]
    order_value = [{
      numeric = [">=", 1000]
    }]
  })

  # Use MESSAGE_BODY to filter on the message body instead of attributes
  # filter_policy_scope = "MessageBody"
}

# Lambda for standard order processing
resource "aws_sns_topic_subscription" "standard_orders" {
  topic_arn = aws_sns_topic.orders.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.standard_processor.arn

  filter_policy = jsonencode({
    order_type = ["standard"]
  })
}

# Lambda permissions for both functions
resource "aws_lambda_permission" "sns_high_value" {
  statement_id  = "AllowSNSInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.high_value_processor.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.orders.arn
}

resource "aws_lambda_permission" "sns_standard" {
  statement_id  = "AllowSNSInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.standard_processor.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.orders.arn
}
```

## Fan-Out Pattern

One of SNS's strengths is fan-out - one message triggers multiple subscribers simultaneously:

```hcl
# Topic for user signup events
resource "aws_sns_topic" "user_signup" {
  name = "user-signup-events"
}

# Each function handles a different aspect of signup
locals {
  signup_handlers = {
    welcome_email = {
      function_arn  = aws_lambda_function.welcome_email.arn
      function_name = aws_lambda_function.welcome_email.function_name
    }
    analytics = {
      function_arn  = aws_lambda_function.analytics_tracker.arn
      function_name = aws_lambda_function.analytics_tracker.function_name
    }
    onboarding = {
      function_arn  = aws_lambda_function.onboarding_setup.arn
      function_name = aws_lambda_function.onboarding_setup.function_name
    }
    crm_sync = {
      function_arn  = aws_lambda_function.crm_sync.arn
      function_name = aws_lambda_function.crm_sync.function_name
    }
  }
}

# Create subscriptions for all handlers
resource "aws_sns_topic_subscription" "signup_handlers" {
  for_each = local.signup_handlers

  topic_arn = aws_sns_topic.user_signup.arn
  protocol  = "lambda"
  endpoint  = each.value.function_arn
}

# Lambda permissions for all handlers
resource "aws_lambda_permission" "signup_handlers" {
  for_each = local.signup_handlers

  statement_id  = "AllowSNSInvoke"
  action        = "lambda:InvokeFunction"
  function_name = each.value.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.user_signup.arn
}
```

When a user signs up, one SNS publish triggers all four functions in parallel. Each function runs independently - if the analytics tracker fails, it does not affect the welcome email.

## The Lambda Handler

The SNS event wrapper includes metadata about the topic and subscription. The actual message is nested inside:

```python
# index.py - Lambda handler for SNS events
import json

def handler(event, context):
    """Process SNS messages."""
    for record in event['Records']:
        # Extract the SNS message
        sns_message = record['Sns']

        topic_arn = sns_message['TopicArn']
        message_id = sns_message['MessageId']
        subject = sns_message.get('Subject', 'No subject')
        timestamp = sns_message['Timestamp']

        # The actual message payload
        message = json.loads(sns_message['Message'])

        # Message attributes (used for filtering)
        attributes = sns_message.get('MessageAttributes', {})

        print(f"Received message {message_id} from {topic_arn}")
        print(f"Subject: {subject}")
        print(f"Message: {json.dumps(message)}")

        # Process the message
        process_notification(message, attributes)

    return {'statusCode': 200}

def process_notification(message, attributes):
    """Handle the notification."""
    event_type = message.get('event_type')
    # Your logic here
    print(f"Processing event: {event_type}")
```

## SNS with Dead Letter Queue

For SNS subscriptions, you can specify a dead letter queue where failed deliveries are sent:

```hcl
# DLQ for failed SNS deliveries
resource "aws_sqs_queue" "sns_dlq" {
  name                    = "sns-delivery-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled = true

  tags = {
    Name = "sns-delivery-dlq"
  }
}

# SNS subscription with DLQ
resource "aws_sns_topic_subscription" "with_dlq" {
  topic_arn = aws_sns_topic.notifications.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.notifier.arn

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.sns_dlq.arn
  })
}

# SNS needs permission to send to the DLQ
resource "aws_sqs_queue_policy" "sns_dlq" {
  queue_url = aws_sqs_queue.sns_dlq.url

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.sns_dlq.arn
      Condition = {
        ArnEquals = {
          "aws:SourceArn" = aws_sns_topic.notifications.arn
        }
      }
    }]
  })
}
```

## SNS Retry Behavior

SNS has its own retry policy for Lambda invocations. By default, it retries 3 times with no delay for Lambda endpoints. You cannot customize this for Lambda subscriptions the way you can for HTTP endpoints. If all retries fail and you have a DLQ configured, the message goes there.

This is different from the SQS + Lambda pattern where you have more control over retry behavior through visibility timeouts and `maxReceiveCount`.

## Outputs

```hcl
output "topic_arn" {
  description = "ARN of the SNS topic"
  value       = aws_sns_topic.notifications.arn
}

output "topic_name" {
  description = "Name of the SNS topic"
  value       = aws_sns_topic.notifications.name
}

output "subscription_arns" {
  description = "ARNs of the topic subscriptions"
  value       = { for k, v in aws_sns_topic_subscription.signup_handlers : k => v.arn }
}
```

## Summary

Lambda with SNS in Terraform uses `aws_sns_topic_subscription` with `protocol = "lambda"` and an `aws_lambda_permission` to allow SNS to invoke the function. Filter policies let you route specific messages to specific functions. The fan-out pattern lets one message trigger multiple independent processing pipelines. Configure a dead letter queue on the subscription for reliability. Unlike SQS triggers that use polling, SNS pushes messages directly to Lambda, making the setup simpler but giving you less control over retry behavior.
