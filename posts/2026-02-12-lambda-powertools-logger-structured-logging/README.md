# How to Use Lambda Powertools Logger for Structured Logging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Logging, Powertools, CloudWatch

Description: A deep dive into Lambda Powertools Logger for structured logging with custom keys, correlation IDs, log sampling, and CloudWatch Logs Insights queries.

---

Unstructured logs are basically useless at scale. When you've got hundreds of Lambda invocations per second, each writing "Processing request..." to CloudWatch, good luck finding anything. Structured logging means every log entry is a JSON object with consistent fields that you can filter, search, and analyze programmatically.

Lambda Powertools Logger makes structured logging trivial. It automatically includes Lambda context, supports custom keys, handles correlation IDs, and outputs JSON that's perfectly suited for CloudWatch Logs Insights.

## Basic Setup

The Logger is the most commonly used Powertools utility. Here's how to set it up.

```python
from aws_lambda_powertools import Logger

# Create a logger with service name
logger = Logger(service="payment-service")

# Environment variable alternative:
# Set POWERTOOLS_SERVICE_NAME=payment-service
# Then just use: logger = Logger()
```

The logger produces JSON output that looks like this.

```json
{
  "level": "INFO",
  "location": "handler:15",
  "message": "Payment processed",
  "timestamp": "2026-02-12T14:30:00.123Z",
  "service": "payment-service",
  "cold_start": true,
  "function_name": "payment-processor",
  "function_memory_size": 256,
  "function_arn": "arn:aws:lambda:us-east-1:123456789012:function:payment-processor",
  "function_request_id": "c6af9ac6-7b61-11e6-9a41-93e8deadbeef",
  "xray_trace_id": "1-5e7f5d1c-012345678901234567890123"
}
```

Every log entry automatically includes the function name, memory size, request ID, and X-Ray trace ID. You don't have to remember to add these - they're always there.

## Injecting Lambda Context

The `inject_lambda_context` decorator adds all Lambda context information to every log message in the invocation.

```python
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger(service="order-service")

@logger.inject_lambda_context(log_event=True, clear_state=True)
def handler(event: dict, context: LambdaContext) -> dict:
    # log_event=True logs the entire incoming event at INFO level
    # clear_state=True removes custom keys between invocations

    logger.info("Handler started")

    # All log messages now include Lambda context
    process_order(event)

    return {"statusCode": 200}


def process_order(event):
    # Lambda context is available in child functions too
    logger.info("Processing order", extra={"item_count": len(event.get("items", []))})
```

Setting `clear_state=True` is important for Lambda reuse. Without it, custom keys from a previous invocation might leak into the next one.

## Custom Keys and Correlation IDs

Adding custom keys to your logs makes them searchable and filterable.

```python
from aws_lambda_powertools import Logger
import uuid

logger = Logger(service="order-service")

@logger.inject_lambda_context(clear_state=True)
def handler(event: dict, context) -> dict:
    # Generate or extract a correlation ID
    correlation_id = event.get("headers", {}).get(
        "x-correlation-id",
        str(uuid.uuid4())
    )

    # Append keys that persist for the entire invocation
    logger.append_keys(
        correlation_id=correlation_id,
        customer_id=event.get("customer_id"),
        order_id=event.get("order_id")
    )

    logger.info("Request received")
    # Output includes: correlation_id, customer_id, order_id

    validate_order(event)
    result = process_payment(event)
    send_confirmation(event)

    # All log messages above include the appended keys
    return {"statusCode": 200, "body": result}


def validate_order(event):
    logger.info("Validating order")
    # This log includes correlation_id, customer_id, order_id


def process_payment(event):
    # Add temporary extra data to a specific log message
    logger.info(
        "Processing payment",
        extra={
            "payment_method": event.get("payment_method"),
            "amount": event.get("total")
        }
    )
    # "extra" fields appear only in this specific log entry
    return {"status": "paid"}


def send_confirmation(event):
    logger.info("Sending confirmation email")
```

## Log Levels and Sampling

Control log verbosity per environment and use sampling to reduce costs while maintaining visibility.

```python
from aws_lambda_powertools import Logger
import os

# Log level from environment variable
# Set LOG_LEVEL=DEBUG in dev, LOG_LEVEL=INFO in production
logger = Logger(
    service="order-service",
    level=os.environ.get("LOG_LEVEL", "INFO")
)

# Log sampling - log DEBUG messages for 10% of invocations
# This gives you detailed logs for troubleshooting without the cost
sampled_logger = Logger(
    service="order-service",
    sample_rate=0.1  # 10% of invocations will log at DEBUG level
)

@sampled_logger.inject_lambda_context
def handler(event, context):
    # For 90% of invocations, only INFO and above are logged
    # For 10% of invocations, DEBUG and above are logged
    sampled_logger.debug("Detailed event information", extra={"event": event})
    sampled_logger.info("Processing request")

    return {"statusCode": 200}
```

## Structured Exception Logging

When exceptions happen, you want the full context - not just a message.

```python
from aws_lambda_powertools import Logger

logger = Logger(service="order-service")

@logger.inject_lambda_context(clear_state=True)
def handler(event, context):
    logger.append_keys(order_id=event.get("order_id"))

    try:
        result = process_order(event)
        return {"statusCode": 200, "body": result}
    except ValueError as e:
        # Log with exception traceback
        logger.exception("Validation error processing order")
        return {"statusCode": 400, "body": str(e)}
    except Exception as e:
        # exception() includes the full stack trace
        logger.exception("Unexpected error processing order")
        return {"statusCode": 500, "body": "Internal error"}


def process_order(event):
    if not event.get("items"):
        raise ValueError("Order must contain at least one item")

    # Simulate a deeper error
    total = calculate_total(event["items"])
    return {"total": total}


def calculate_total(items):
    # This will raise TypeError if price is missing
    return sum(item["price"] * item["quantity"] for item in items)
```

The `logger.exception()` call produces output with the full stack trace included in the JSON.

## CloudWatch Logs Insights Queries

Structured logs really shine when you need to query them. Here are queries that become possible with Powertools Logger.

```
# Find all errors for a specific order
fields @timestamp, level, message, order_id
| filter order_id = "ORD-12345"
| sort @timestamp asc

# Count errors by service over time
filter level = "ERROR"
| stats count() as error_count by bin(5m), service
| sort error_count desc

# Trace a request across services using correlation ID
fields @timestamp, service, message, level
| filter correlation_id = "abc-123-def-456"
| sort @timestamp asc

# Find slow invocations
filter @type = "REPORT"
| stats avg(@duration), max(@duration), p99(@duration) by function_name
| sort max(@duration) desc

# Find cold starts with their duration
filter cold_start = true
| fields @timestamp, function_name, @duration
| stats count() as cold_starts, avg(@duration) as avg_cold_start_duration by function_name

# Error rate by customer
filter level = "ERROR"
| stats count() as errors by customer_id
| sort errors desc
| limit 20
```

## Cross-Service Correlation

When your Lambda functions call each other or process messages from SQS/SNS, you need to propagate correlation IDs.

```python
from aws_lambda_powertools import Logger
import json
import boto3

logger = Logger(service="order-orchestrator")
sqs = boto3.client("sqs")

@logger.inject_lambda_context(clear_state=True)
def handler(event, context):
    correlation_id = event.get("correlation_id", context.aws_request_id)
    logger.append_keys(correlation_id=correlation_id)

    logger.info("Starting order orchestration")

    # Pass correlation ID to downstream services via SQS
    sqs.send_message(
        QueueUrl="https://sqs.us-east-1.amazonaws.com/123456789012/payment-queue",
        MessageBody=json.dumps({
            "order_id": event["order_id"],
            "amount": event["total"],
            "correlation_id": correlation_id  # Propagate the correlation ID
        }),
        MessageAttributes={
            "correlation_id": {
                "DataType": "String",
                "StringValue": correlation_id
            }
        }
    )

    logger.info("Payment request queued")
    return {"statusCode": 202}
```

The downstream consumer picks up the correlation ID.

```python
from aws_lambda_powertools import Logger
import json

logger = Logger(service="payment-processor")

@logger.inject_lambda_context(clear_state=True)
def handler(event, context):
    for record in event["Records"]:
        body = json.loads(record["body"])

        # Extract correlation ID from the upstream service
        correlation_id = body.get("correlation_id", context.aws_request_id)
        logger.append_keys(
            correlation_id=correlation_id,
            order_id=body["order_id"]
        )

        logger.info("Processing payment from queue")
        # Process payment...
        logger.info("Payment processed successfully")

    return {"statusCode": 200}
```

Now you can trace a single request across both services using the correlation ID in CloudWatch Logs Insights.

## Custom Log Formatter

If you need to customize the log format (for instance, to match a specific SIEM format), you can create a custom formatter.

```python
from aws_lambda_powertools import Logger
from aws_lambda_powertools.logging.formatter import LambdaPowertoolsFormatter

class CustomFormatter(LambdaPowertoolsFormatter):
    def serialize(self, log: dict) -> str:
        # Add custom fields to every log entry
        log["application"] = "myapp"
        log["team"] = "platform"

        # Remove fields you don't want
        log.pop("function_memory_size", None)
        log.pop("function_arn", None)

        return super().serialize(log)

logger = Logger(service="order-service", logger_formatter=CustomFormatter())
```

## Summary

Structured logging isn't just a nice-to-have - it's essential for operating serverless applications at scale. Lambda Powertools Logger makes it easy to get right from day one, with automatic Lambda context injection, custom keys for searchability, correlation IDs for distributed tracing, and JSON output that's perfect for CloudWatch Logs Insights.

The investment in structured logging pays off the first time you need to troubleshoot a production issue. Instead of scrolling through thousands of unstructured log lines, you write a query and have your answer in seconds.

For the complete Powertools experience, see our posts on [tracing with Powertools](https://oneuptime.com/blog/post/2026-02-12-lambda-powertools-tracer-xray-integration/view) and [custom metrics with Powertools](https://oneuptime.com/blog/post/2026-02-12-lambda-powertools-metrics-custom-cloudwatch/view).
