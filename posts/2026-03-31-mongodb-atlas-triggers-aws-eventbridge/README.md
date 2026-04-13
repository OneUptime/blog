# How to Forward Atlas Trigger Events to AWS EventBridge

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Triggers, AWS

Description: Configure MongoDB Atlas database triggers to forward change events to AWS EventBridge for event-driven integrations with Lambda, SNS, SQS, and other AWS services.

---

Instead of running an Atlas Function directly, you can configure an Atlas Database Trigger to forward change events to AWS EventBridge. This is useful when your event consumers are in AWS - Lambda functions, SNS topics, or SQS queues - and you want to keep MongoDB trigger logic out of Atlas Functions.

## Architecture

```text
MongoDB Atlas
  -> Database Trigger fires on insert/update/delete
  -> Event payload forwarded to AWS EventBridge event bus
  -> EventBridge routes to Lambda / SNS / SQS / Step Functions
```

## Prerequisites

- An AWS account with an EventBridge event bus
- An Atlas project linked to your AWS account via AWS PrivateLink or public access
- IAM permissions to create EventBridge rules and targets

## Configuring the EventBridge Partner Event Source

Atlas creates an EventBridge Partner Event Source. In the Atlas UI:

1. Go to App Services - Triggers - Add Trigger
2. Select Database as the trigger type
3. Under "Event Ordering", optionally enable ordering
4. Under "Function" select "EventBridge" instead of a function
5. Enter your AWS Account ID and region

Atlas will create a Partner Event Source named:
```text
aws.partner/mongodb.com/stitch.trigger/<trigger-id>
```

## Activating the Event Source in AWS

After Atlas creates the Partner Event Source, activate it in the AWS Console:

```bash
# List partner event sources shared with your account
aws events list-event-sources \
  --name-prefix "aws.partner/mongodb.com"

# Create an event bus from the partner source
# The bus name must exactly match the partner event source name
aws events create-event-bus \
  --name "aws.partner/mongodb.com/stitch.trigger/<trigger-id>" \
  --event-source-name "aws.partner/mongodb.com/stitch.trigger/<trigger-id>"
```

## Creating an EventBridge Rule to Route Events

Route Atlas events to a Lambda function:

```bash
# Create a rule matching all Atlas trigger events
aws events put-rule \
  --name "atlas-trigger-all" \
  --event-bus-name "aws.partner/mongodb.com/stitch.trigger/<trigger-id>" \
  --event-pattern '{"source": [{"prefix": "aws.partner/mongodb.com"}]}' \
  --state ENABLED

# Add Lambda as the target
aws events put-targets \
  --rule "atlas-trigger-all" \
  --event-bus-name "aws.partner/mongodb.com/stitch.trigger/<trigger-id>" \
  --targets '[{
    "Id": "process-atlas-event",
    "Arn": "arn:aws:lambda:us-east-1:123456789012:function:process-mongodb-change"
  }]'
```

## Processing Atlas Events in Lambda

```python
import json

def handler(event, context):
    # The Atlas change event is in event["detail"]
    detail = event.get("detail", {})

    operation_type = detail.get("operationType")
    collection = detail.get("ns", {}).get("coll")
    document = detail.get("fullDocument", {})
    document_key = detail.get("documentKey", {})

    print(f"Operation: {operation_type} on {collection}")
    print(f"Document key: {document_key}")

    if operation_type == "insert":
        handle_insert(document)
    elif operation_type == "update":
        update_desc = detail.get("updateDescription", {})
        handle_update(document_key, update_desc)
    elif operation_type == "delete":
        handle_delete(document_key)

    return {"statusCode": 200}

def handle_insert(document):
    print(f"New document: {json.dumps(document, default=str)}")
    # Add your business logic here

def handle_update(key, update_desc):
    print(f"Updated fields: {update_desc.get('updatedFields', {})}")

def handle_delete(key):
    print(f"Deleted document: {key}")
```

## Filtering Events with EventBridge Pattern Matching

Route only insert events for the "orders" collection to one Lambda, and delete events to another:

```json
{
  "source": [{"prefix": "aws.partner/mongodb.com"}],
  "detail": {
    "operationType": ["insert"],
    "ns": {
      "coll": ["orders"]
    }
  }
}
```

## Summary

Forwarding Atlas trigger events to AWS EventBridge decouples MongoDB change detection from event processing. Atlas creates a Partner Event Source; you activate it in AWS as an event bus, create EventBridge rules to filter events by operation type and collection, and target Lambda or other AWS services. This enables complex event routing and fan-out without writing Atlas Functions for every consumer.
