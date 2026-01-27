# How to Use SQS with SNS for Fan-Out

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, SQS, SNS, Fan-Out, Messaging, Terraform, Microservices, Event-Driven Architecture

Description: A practical guide to implementing the fan-out pattern using Amazon SNS and SQS for scalable, decoupled event distribution across multiple consumers.

---

> "Publish once, deliver everywhere. The fan-out pattern turns a single event into parallel workflows without the publisher knowing or caring who is listening."

## What is the Fan-Out Pattern?

The fan-out pattern is a messaging architecture where a single message is broadcast to multiple consumers simultaneously. Instead of sending the same message to each subscriber individually, you publish once and let the messaging infrastructure handle distribution.

In AWS, the combination of **Simple Notification Service (SNS)** and **Simple Queue Service (SQS)** is the canonical implementation:

- **SNS** acts as the broadcast layer. It receives messages and pushes copies to all subscribed endpoints.
- **SQS** acts as the buffer layer. Each consumer has its own queue, decoupling processing speed from publish rate.

This architecture shines when:

- Multiple services need to react to the same event (order placed, user signed up, payment received)
- Consumers process at different speeds or have different availability guarantees
- You want to add new consumers without modifying the publisher
- Retry logic and dead-letter handling need to be consumer-specific

## Setting Up SNS Topic Subscriptions

The foundation is an SNS topic that SQS queues subscribe to. When a message hits the topic, SNS delivers a copy to every subscribed queue.

```hcl
# Create the SNS topic that will broadcast messages
resource "aws_sns_topic" "order_events" {
  name = "order-events"

  # Optional: Enable server-side encryption
  kms_master_key_id = "alias/aws/sns"

  tags = {
    Environment = "production"
    Service     = "orders"
  }
}

# Create SQS queues for each consumer
resource "aws_sqs_queue" "billing_queue" {
  name                       = "billing-order-events"
  visibility_timeout_seconds = 300  # 5 minutes for processing
  message_retention_seconds  = 1209600  # 14 days

  # Enable dead-letter queue for failed messages
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.billing_dlq.arn
    maxReceiveCount     = 3  # Move to DLQ after 3 failures
  })

  tags = {
    Consumer = "billing-service"
  }
}

resource "aws_sqs_queue" "billing_dlq" {
  name                      = "billing-order-events-dlq"
  message_retention_seconds = 1209600
}

resource "aws_sqs_queue" "inventory_queue" {
  name                       = "inventory-order-events"
  visibility_timeout_seconds = 120

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.inventory_dlq.arn
    maxReceiveCount     = 5
  })

  tags = {
    Consumer = "inventory-service"
  }
}

resource "aws_sqs_queue" "inventory_dlq" {
  name                      = "inventory-order-events-dlq"
  message_retention_seconds = 1209600
}

# Subscribe queues to the SNS topic
resource "aws_sns_topic_subscription" "billing_subscription" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.billing_queue.arn

  # Important: Confirm subscription automatically for SQS
  # No manual confirmation needed when both resources are in same account
}

resource "aws_sns_topic_subscription" "inventory_subscription" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.inventory_queue.arn
}
```

## Configuring SQS Queue Policies

SQS queues deny all access by default. You must explicitly allow SNS to send messages to each queue. This is the most common point of failure in fan-out setups.

```hcl
# Policy document allowing SNS to send messages to the billing queue
data "aws_iam_policy_document" "billing_queue_policy" {
  statement {
    sid    = "AllowSNSPublish"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["sns.amazonaws.com"]
    }

    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.billing_queue.arn]

    # Critical: Restrict to messages from your specific SNS topic
    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [aws_sns_topic.order_events.arn]
    }
  }
}

# Attach the policy to the queue
resource "aws_sqs_queue_policy" "billing_queue_policy" {
  queue_url = aws_sqs_queue.billing_queue.id
  policy    = data.aws_iam_policy_document.billing_queue_policy.json
}

# Same pattern for inventory queue
data "aws_iam_policy_document" "inventory_queue_policy" {
  statement {
    sid    = "AllowSNSPublish"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["sns.amazonaws.com"]
    }

    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.inventory_queue.arn]

    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [aws_sns_topic.order_events.arn]
    }
  }
}

resource "aws_sqs_queue_policy" "inventory_queue_policy" {
  queue_url = aws_sqs_queue.inventory_queue.id
  policy    = data.aws_iam_policy_document.inventory_queue_policy.json
}
```

Without these policies, SNS will silently fail to deliver messages. Always check CloudWatch metrics for `NumberOfMessagesPublished` on SNS and `NumberOfMessagesSent` on SQS to verify the pipeline is working.

## Using Filter Policies for Selective Delivery

Not every consumer needs every message. SNS filter policies let you route messages to specific queues based on message attributes, reducing noise and processing cost.

```hcl
# Billing only cares about orders above $100
resource "aws_sns_topic_subscription" "billing_subscription" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.billing_queue.arn

  # Filter policy: only deliver messages matching these criteria
  filter_policy = jsonencode({
    # Match orders with total >= 100
    order_total = [{
      numeric = [">=", 100]
    }]

    # Match specific event types
    event_type = ["order.placed", "order.updated"]
  })

  # Use attribute-based filtering (default)
  filter_policy_scope = "MessageAttributes"
}

# Inventory cares about all orders but only for physical products
resource "aws_sns_topic_subscription" "inventory_subscription" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.inventory_queue.arn

  filter_policy = jsonencode({
    product_type = ["physical"]
    event_type   = ["order.placed", "order.cancelled", "order.returned"]
  })

  filter_policy_scope = "MessageAttributes"
}

# Analytics wants everything - no filter policy means all messages
resource "aws_sns_topic_subscription" "analytics_subscription" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.analytics_queue.arn
  # No filter_policy = receives all messages
}
```

Filter policies support various operators:

```json
{
  "store_id": ["store-123", "store-456"],
  "price": [{ "numeric": [">=", 10, "<=", 100] }],
  "customer_tier": [{ "prefix": "premium" }],
  "is_priority": [true],
  "region": [{ "anything-but": ["us-west-2"] }]
}
```

## Working with Message Attributes

Message attributes are key-value pairs attached to SNS messages. They enable filter policies and carry metadata without polluting the message body.

```python
import boto3
import json

# Initialize the SNS client
sns = boto3.client('sns', region_name='us-east-1')

def publish_order_event(order: dict) -> str:
    """
    Publish an order event to SNS with message attributes for filtering.

    Args:
        order: Dictionary containing order details

    Returns:
        The MessageId from SNS
    """
    # Message body contains the full event payload
    message_body = json.dumps({
        'order_id': order['id'],
        'customer_id': order['customer_id'],
        'items': order['items'],
        'total': order['total'],
        'timestamp': order['created_at']
    })

    # Message attributes enable filtering and carry metadata
    # These are NOT part of the message body
    message_attributes = {
        'event_type': {
            'DataType': 'String',
            'StringValue': 'order.placed'
        },
        'order_total': {
            'DataType': 'Number',
            'StringValue': str(order['total'])  # Numbers are passed as strings
        },
        'product_type': {
            'DataType': 'String',
            'StringValue': 'physical' if order['has_physical_items'] else 'digital'
        },
        'customer_tier': {
            'DataType': 'String',
            'StringValue': order.get('customer_tier', 'standard')
        },
        'store_id': {
            'DataType': 'String',
            'StringValue': order['store_id']
        }
    }

    response = sns.publish(
        TopicArn='arn:aws:sns:us-east-1:123456789012:order-events',
        Message=message_body,
        MessageAttributes=message_attributes,
        # Optional: Group related messages for FIFO topics
        # MessageGroupId=order['customer_id'],
        # MessageDeduplicationId=order['id']
    )

    return response['MessageId']


# Example usage
order = {
    'id': 'ord-12345',
    'customer_id': 'cust-789',
    'store_id': 'store-123',
    'items': [
        {'sku': 'WIDGET-001', 'quantity': 2, 'price': 29.99}
    ],
    'total': 59.98,
    'has_physical_items': True,
    'customer_tier': 'premium',
    'created_at': '2026-01-27T10:30:00Z'
}

message_id = publish_order_event(order)
print(f"Published message: {message_id}")
```

On the consumer side, message attributes arrive in the SQS message envelope:

```python
import boto3
import json

sqs = boto3.client('sqs', region_name='us-east-1')

def process_messages(queue_url: str, max_messages: int = 10):
    """
    Receive and process messages from an SQS queue subscribed to SNS.

    The message structure differs from direct SQS publishes because
    SNS wraps the original message in an envelope.
    """
    response = sqs.receive_message(
        QueueUrl=queue_url,
        MaxNumberOfMessages=max_messages,
        WaitTimeSeconds=20,  # Long polling reduces empty responses
        MessageAttributeNames=['All'],  # Request all message attributes
        AttributeNames=['All']  # Request all system attributes
    )

    for message in response.get('Messages', []):
        # The Body contains the SNS envelope, not your original message
        sns_envelope = json.loads(message['Body'])

        # Extract the original message from the envelope
        original_message = json.loads(sns_envelope['Message'])

        # Message attributes are in the envelope (not SQS message attributes)
        message_attributes = sns_envelope.get('MessageAttributes', {})

        # Extract attribute values
        event_type = message_attributes.get('event_type', {}).get('Value')
        order_total = message_attributes.get('order_total', {}).get('Value')

        print(f"Processing {event_type} for order {original_message['order_id']}")
        print(f"Order total: ${order_total}")

        # Process the message...
        handle_order_event(original_message, event_type)

        # Delete the message after successful processing
        sqs.delete_message(
            QueueUrl=queue_url,
            ReceiptHandle=message['ReceiptHandle']
        )


def handle_order_event(order: dict, event_type: str):
    """Handle the order event based on type."""
    if event_type == 'order.placed':
        # Reserve inventory, charge payment, etc.
        pass
    elif event_type == 'order.cancelled':
        # Release inventory, refund payment, etc.
        pass
```

## Enabling Raw Message Delivery

By default, SNS wraps messages in a JSON envelope containing metadata. This is useful for most cases but adds overhead when consumers only need the original payload.

Raw message delivery sends the original message body directly to SQS without the SNS envelope. Enable it when:

- You control both publisher and consumer
- You do not need SNS metadata (TopicArn, Timestamp, etc.) in the consumer
- You want to reduce parsing overhead

```hcl
resource "aws_sns_topic_subscription" "analytics_raw" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.analytics_queue.arn

  # Enable raw message delivery
  raw_message_delivery = true
}
```

With raw delivery enabled, the SQS message body IS your original message:

```python
def process_raw_messages(queue_url: str):
    """Process messages with raw message delivery enabled."""
    response = sqs.receive_message(
        QueueUrl=queue_url,
        MaxNumberOfMessages=10,
        WaitTimeSeconds=20,
        # Message attributes come through SQS attributes now
        MessageAttributeNames=['All']
    )

    for message in response.get('Messages', []):
        # Body is now the original message directly
        # No SNS envelope to unwrap
        order_event = json.loads(message['Body'])

        # Message attributes are now SQS message attributes
        # (only works if your publisher uses SQS directly or
        # SNS FIFO topics with raw delivery)
        print(f"Order ID: {order_event['order_id']}")
```

**Warning:** With raw delivery, you lose access to SNS message attributes in the consumer. If you use filter policies, the filtering still works, but the consumer cannot see which attributes matched.

## Complete Terraform Example

Here is a production-ready Terraform module for SNS/SQS fan-out:

```hcl
# variables.tf
variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "topic_name" {
  description = "Name of the SNS topic"
  type        = string
}

variable "consumers" {
  description = "Map of consumer configurations"
  type = map(object({
    visibility_timeout = number
    max_receive_count  = number
    filter_policy      = optional(map(any))
    raw_delivery       = optional(bool, false)
  }))
}

# main.tf
locals {
  # Generate resource names with environment prefix
  topic_full_name = "${var.environment}-${var.topic_name}"
}

# SNS Topic
resource "aws_sns_topic" "main" {
  name              = local.topic_full_name
  kms_master_key_id = "alias/aws/sns"

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Create a queue and DLQ for each consumer
resource "aws_sqs_queue" "consumer_dlq" {
  for_each = var.consumers

  name                      = "${var.environment}-${each.key}-${var.topic_name}-dlq"
  message_retention_seconds = 1209600  # 14 days

  tags = {
    Environment = var.environment
    Consumer    = each.key
    Type        = "dlq"
  }
}

resource "aws_sqs_queue" "consumer" {
  for_each = var.consumers

  name                       = "${var.environment}-${each.key}-${var.topic_name}"
  visibility_timeout_seconds = each.value.visibility_timeout
  message_retention_seconds  = 1209600

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.consumer_dlq[each.key].arn
    maxReceiveCount     = each.value.max_receive_count
  })

  tags = {
    Environment = var.environment
    Consumer    = each.key
  }
}

# Queue policies allowing SNS to publish
data "aws_iam_policy_document" "queue_policy" {
  for_each = var.consumers

  statement {
    sid    = "AllowSNSPublish"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["sns.amazonaws.com"]
    }

    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.consumer[each.key].arn]

    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [aws_sns_topic.main.arn]
    }
  }
}

resource "aws_sqs_queue_policy" "consumer" {
  for_each = var.consumers

  queue_url = aws_sqs_queue.consumer[each.key].id
  policy    = data.aws_iam_policy_document.queue_policy[each.key].json
}

# SNS subscriptions
resource "aws_sns_topic_subscription" "consumer" {
  for_each = var.consumers

  topic_arn            = aws_sns_topic.main.arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.consumer[each.key].arn
  raw_message_delivery = each.value.raw_delivery

  # Only set filter policy if provided
  filter_policy = each.value.filter_policy != null ? jsonencode(each.value.filter_policy) : null
}

# outputs.tf
output "topic_arn" {
  description = "ARN of the SNS topic"
  value       = aws_sns_topic.main.arn
}

output "queue_urls" {
  description = "Map of consumer names to queue URLs"
  value       = { for k, v in aws_sqs_queue.consumer : k => v.url }
}

output "queue_arns" {
  description = "Map of consumer names to queue ARNs"
  value       = { for k, v in aws_sqs_queue.consumer : k => v.arn }
}

output "dlq_urls" {
  description = "Map of consumer names to DLQ URLs"
  value       = { for k, v in aws_sqs_queue.consumer_dlq : k => v.url }
}
```

Usage example:

```hcl
module "order_fanout" {
  source = "./modules/sns-sqs-fanout"

  environment = "production"
  topic_name  = "order-events"

  consumers = {
    billing = {
      visibility_timeout = 300
      max_receive_count  = 3
      filter_policy = {
        event_type  = ["order.placed", "order.updated"]
        order_total = [{ "numeric" = [">=", 100] }]
      }
    }

    inventory = {
      visibility_timeout = 120
      max_receive_count  = 5
      filter_policy = {
        product_type = ["physical"]
      }
    }

    analytics = {
      visibility_timeout = 60
      max_receive_count  = 10
      raw_delivery       = true
      # No filter_policy - receives everything
    }

    notifications = {
      visibility_timeout = 30
      max_receive_count  = 3
      filter_policy = {
        customer_tier = [{ "prefix" = "premium" }]
        event_type    = ["order.placed", "order.shipped"]
      }
    }
  }
}

# Grant your services permission to receive from their queues
resource "aws_iam_role_policy" "billing_sqs_access" {
  name = "billing-sqs-access"
  role = aws_iam_role.billing_service.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = module.order_fanout.queue_arns["billing"]
      }
    ]
  })
}
```

## Best Practices Summary

**Architecture:**
- Use SNS for broadcast, SQS for buffering. Never have consumers poll SNS directly.
- Give each consumer its own queue. Shared queues create coupling and complicate scaling.
- Always configure dead-letter queues. Messages that fail repeatedly need a place to go.

**Security:**
- Restrict queue policies to specific SNS topic ARNs. Never allow `*` as source.
- Enable encryption at rest (KMS) for both SNS topics and SQS queues.
- Use IAM roles for consumers, not access keys.

**Reliability:**
- Set visibility timeout to at least 6x your expected processing time.
- Use long polling (WaitTimeSeconds=20) to reduce empty responses and cost.
- Implement idempotent consumers. SNS/SQS guarantees at-least-once delivery, not exactly-once.

**Performance:**
- Use filter policies to reduce message volume per consumer.
- Enable raw message delivery when you do not need SNS metadata.
- Batch message processing with `MaxNumberOfMessages` up to 10.

**Observability:**
- Monitor `ApproximateNumberOfMessagesVisible` to detect processing lag.
- Alert on `ApproximateAgeOfOldestMessage` exceeding your SLO.
- Track DLQ depth. Messages in DLQ indicate bugs or downstream failures.

**Operations:**
- Use Terraform or CloudFormation for infrastructure. Manual setup leads to configuration drift.
- Test filter policies with the SNS console before deploying. A typo means silent message drops.
- Document which services subscribe to which topics. Fan-out hides dependencies.

The SNS/SQS fan-out pattern is foundational for event-driven architectures on AWS. Get the queue policies right, use filter policies to reduce noise, and monitor everything. Your future self will thank you when that 3 AM page turns out to be a consumer bug, not an infrastructure mystery.

---

Need to monitor your SNS/SQS fan-out pipelines? [OneUptime](https://oneuptime.com) provides unified observability for your AWS infrastructure, helping you track message delivery, detect queue backlogs, and alert on dead-letter queue activity before your customers notice.
