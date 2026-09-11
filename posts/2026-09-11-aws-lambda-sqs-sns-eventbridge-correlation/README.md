# Propagate Correlation IDs Through Lambda, SQS, SNS, and EventBridge

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Correlation ID, AWS Lambda, Amazon SQS, SNS, EventBridge

Description: Carry a stable application correlation ID from API Gateway through Lambda and AWS messaging, while keeping invocation, broker, and trace identifiers distinct.

---

API Gateway request IDs, Lambda invocation IDs, SQS message IDs, SNS message IDs, and EventBridge event IDs identify different boundaries. None automatically becomes a single application correlation ID across the entire workflow.

Create an application ID at the trusted entry point, place it in a durable message envelope, and restore it for each consumer execution. Keep AWS-generated identifiers alongside it so you can investigate both the business workflow and the transport.

## Create an envelope in the API Lambda

For a public API, generate an opaque ID rather than trusting a caller's chosen value. A proxy-integrated Lambda can return it as a response header and include it in the message:

```python
import json
from uuid import uuid4


def make_envelope(event, context, payload):
    correlation_id = uuid4().hex
    envelope = {
        "schema_version": 1,
        "message_id": uuid4().hex,
        "meta": {"correlation_id": correlation_id},
        "data": payload,
    }
    print(json.dumps({
        "event": "request.accepted",
        "correlation_id": correlation_id,
        "message_id": envelope["message_id"],
        "api_request_id": event.get("requestContext", {}).get("requestId"),
        "lambda_request_id": context.aws_request_id,
    }))
    return envelope
```

Validate and authorize the business payload before publication. If an authenticated internal gateway already assigns the correlation ID, extract it under that contract and validate its format. Do not use a diagnostic header as proof of tenant membership.

The API Gateway proxy response format includes `statusCode`, `headers`, and a serialized `body`. Return `202` only after the required publish operation succeeds or after a durable outbox accepts the work.

## Publish to SQS or SNS with explicit attributes

The following are alternative transport helpers using Boto3. They require appropriate IAM permissions and pre-existing destinations:

```python
import boto3

sqs = boto3.client("sqs")
sns = boto3.client("sns")
events = boto3.client("events")


def attributes(envelope):
    return {
        "correlation_id": {
            "DataType": "String",
            "StringValue": envelope["meta"]["correlation_id"],
        }
    }


def send_sqs(queue_url, envelope):
    return sqs.send_message(
        QueueUrl=queue_url,
        MessageBody=json.dumps(envelope),
        MessageAttributes=attributes(envelope),
    )["MessageId"]


def publish_sns(topic_arn, envelope):
    return sns.publish(
        TopicArn=topic_arn,
        Message=json.dumps(envelope),
        MessageAttributes=attributes(envelope),
    )["MessageId"]
```

These examples target a standard queue/topic. FIFO destinations require their own ordering and deduplication parameters. Do not reuse a correlation ID as `MessageDeduplicationId` if multiple distinct messages belong to one workflow.

The envelope retains the correlation field even if a later bridge drops custom attributes. When both are present, validate that they agree; silently choosing different values at different hops creates split log histories.

SNS raw delivery changes the SQS payload shape. With raw delivery enabled, the body is the published message. Without it, the body contains an SNS notification wrapper whose `Message` field contains the serialized envelope. Configure the consumer for its subscription shape. SNS also limits raw SQS deliveries to ten message attributes; exceeding that limit can prevent delivery.

## Put application context in EventBridge detail

EventBridge does not use the same arbitrary `MessageAttributes` map. Put the envelope in `Detail`:

```python
def put_event(bus_name, envelope):
    result = events.put_events(Entries=[{
        "EventBusName": bus_name,
        "Source": "com.example.orders",
        "DetailType": "OrderRequested",
        "Detail": json.dumps(envelope),
    }])
    if result["FailedEntryCount"]:
        raise RuntimeError("EventBridge entry failed")
    return result["Entries"][0]["EventId"]
```

The consumer receives the envelope under `event["detail"]`. If a rule uses an input transformer, explicitly preserve the metadata fields in the transformed output.

Check per-entry publication results even when the HTTP request succeeded. For batches, retry only failed entries while maintaining each event's intended application identity and idempotency behavior.

The `TraceHeader` parameter on an EventBridge entry expects AWS X-Ray header syntax. It is not a place for arbitrary `X-Correlation-ID` or a W3C `traceparent` string. Keep those formats separate.

## Restore context for each SQS record

A Lambda invocation can contain several SQS records from unrelated workflows. Establish a separate scope per record instead of assigning one correlation ID to the entire invocation:

```python
import contextvars
import re

current_id = contextvars.ContextVar("correlation_id", default=None)
valid_id = re.compile(r"[0-9a-f]{32}")


def sqs_handler(event, context):
    failures = []
    for record in event["Records"]:
        token = None
        try:
            envelope = json.loads(record["body"])
            value = envelope["meta"]["correlation_id"]
            if not isinstance(value, str) or not valid_id.fullmatch(value):
                raise ValueError("Invalid correlation metadata")
            attribute = record.get("messageAttributes", {}).get("correlation_id")
            if attribute is not None and attribute.get("stringValue") != value:
                raise ValueError("Conflicting correlation metadata")
            token = current_id.set(value)
            print(json.dumps({
                "event": "message.received",
                "correlation_id": current_id.get(),
                "message_id": envelope["message_id"],
                "sqs_message_id": record["messageId"],
                "lambda_request_id": context.aws_request_id,
            }))
            # Invoke the idempotent business processor here.
        except Exception:
            failures.append({"itemIdentifier": record["messageId"]})
        finally:
            if token is not None:
                current_id.reset(token)
    return {"batchItemFailures": failures}
```

This handler demonstrates direct SQS or SNS raw-delivery bodies. Adapt decoding for wrapped SNS messages. Enable `ReportBatchItemFailures` on the event source mapping for the returned partial-failure structure to take effect. FIFO processing needs the documented ordering-aware failure policy rather than continuing through later records indiscriminately.

## Verify each transport boundary

Publish one message through each configured path and compare the entry Lambda log, broker identifier, consumer envelope, and downstream logs. Test SNS raw and wrapped delivery separately, plus EventBridge transformations and a multi-record SQS batch.

Redeliver a message and confirm its workflow ID remains stable while the Lambda invocation ID changes. Keep business processing idempotent because correlation does not prevent duplicate delivery.

## Conclusion

Carry application correlation explicitly in a durable envelope and restore it per consumed message. Preserve AWS request and message IDs as separate evidence, handle each service's payload shape, and keep X-Ray and W3C trace formats distinct from the application ID.

## Official Documentation

- [API Gateway and Lambda proxy integration](https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html)
- [SQS SendMessage](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessage.html)
- [SNS message attributes](https://docs.aws.amazon.com/sns/latest/dg/sns-message-attributes.html)
- [EventBridge PutEvents entries](https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_PutEventsRequestEntry.html)
- [Lambda SQS processing](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html)
