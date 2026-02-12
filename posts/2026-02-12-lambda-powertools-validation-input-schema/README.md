# How to Use Lambda Powertools Validation for Input Schema

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Serverless, Python

Description: Learn how to validate Lambda function input and output using AWS Lambda Powertools Validation module with JSON Schema definitions.

---

Validating inputs to your Lambda functions is one of those things everyone knows they should do but often skip. You end up with functions that crash halfway through because someone passed a string where you expected a number. Lambda Powertools Validation fixes this by letting you define JSON Schema for your inputs and outputs, catching bad data before your business logic even runs.

## Why Validate at the Lambda Level?

You might think API Gateway validation is enough. It's not. Lambda functions get invoked from many sources - SQS, SNS, EventBridge, Step Functions, direct invocations, and more. API Gateway only covers one entry point. Validating inside the function means you're protected regardless of how the function gets called.

## Getting Started

Install Lambda Powertools if you haven't already.

This installs the library with validation support:

```bash
pip install aws-lambda-powertools
```

## Basic Input Validation

The simplest approach uses the `@validator` decorator with a JSON Schema definition.

Here's a function that validates an incoming order event against a strict schema:

```python
from aws_lambda_powertools.utilities.validation import validator

# Define the expected input schema
INPUT_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
        "order_id": {"type": "string", "pattern": "^ORD-[0-9]{6}$"},
        "customer_email": {"type": "string", "format": "email"},
        "items": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "properties": {
                    "product_id": {"type": "string"},
                    "quantity": {"type": "integer", "minimum": 1},
                    "price": {"type": "number", "minimum": 0},
                },
                "required": ["product_id", "quantity", "price"],
            },
        },
    },
    "required": ["order_id", "customer_email", "items"],
}


@validator(inbound_schema=INPUT_SCHEMA)
def lambda_handler(event, context):
    # If we get here, the event is guaranteed to match the schema
    order_id = event["order_id"]
    items = event["items"]

    total = sum(item["price"] * item["quantity"] for item in items)
    return {"order_id": order_id, "total": total, "status": "accepted"}
```

If the event doesn't match the schema, Powertools raises a `SchemaValidationError` before your handler code executes. The error message includes details about what went wrong, which makes debugging straightforward.

## Validating Both Input and Output

You can validate the function's return value too. This is handy when downstream consumers depend on a specific response format.

This validates both the incoming request and the outgoing response:

```python
from aws_lambda_powertools.utilities.validation import validator

INPUT_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
        "user_id": {"type": "string"},
        "action": {"type": "string", "enum": ["create", "update", "delete"]},
    },
    "required": ["user_id", "action"],
}

OUTPUT_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
        "success": {"type": "boolean"},
        "message": {"type": "string"},
        "timestamp": {"type": "string"},
    },
    "required": ["success", "message"],
}


@validator(inbound_schema=INPUT_SCHEMA, outbound_schema=OUTPUT_SCHEMA)
def lambda_handler(event, context):
    user_id = event["user_id"]
    action = event["action"]

    result = perform_action(user_id, action)

    return {
        "success": True,
        "message": f"Action '{action}' completed for user {user_id}",
        "timestamp": result.timestamp,
    }
```

## Validating Envelope-Wrapped Events

Most AWS services wrap your actual payload in an envelope. An SQS event, for instance, has your message buried inside `Records[*].body`. Powertools lets you specify an envelope to unwrap before validation.

This example validates the body of each SQS message rather than the raw SQS event:

```python
from aws_lambda_powertools.utilities.validation import validator
from aws_lambda_powertools.utilities.validation.envelopes import SQS

BODY_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
        "notification_type": {
            "type": "string",
            "enum": ["email", "sms", "push"],
        },
        "recipient": {"type": "string"},
        "message": {"type": "string", "minLength": 1, "maxLength": 500},
    },
    "required": ["notification_type", "recipient", "message"],
}


# SQS envelope unwraps Records[*].body automatically
@validator(inbound_schema=BODY_SCHEMA, envelope=SQS)
def lambda_handler(event, context):
    # event is now a list of validated message bodies
    for notification in event:
        send_notification(
            type=notification["notification_type"],
            to=notification["recipient"],
            body=notification["message"],
        )

    return {"processed": len(event)}
```

Powertools includes built-in envelopes for SQS, SNS, EventBridge, Kinesis, CloudWatch Events, and API Gateway. You can also write custom envelopes.

## Built-in Envelopes

Here's a quick reference of the available envelopes and what they unwrap:

```python
from aws_lambda_powertools.utilities.validation.envelopes import (
    API_GATEWAY_HTTP,     # Unwraps body from API Gateway HTTP API
    API_GATEWAY_REST,     # Unwraps body from API Gateway REST API
    CLOUDWATCH_EVENTS_SCHEDULED,  # Unwraps detail from scheduled events
    CLOUDWATCH_LOGS,      # Unwraps log data from CloudWatch
    EVENTBRIDGE,          # Unwraps detail from EventBridge
    KINESIS_DATA_STREAM,  # Unwraps data from Kinesis records
    SNS,                  # Unwraps Message from SNS records
    SQS,                  # Unwraps body from SQS records
)
```

## Using the validate() Function Directly

Sometimes you need to validate data mid-function rather than at the entry point. The standalone `validate()` function handles this.

This validates user input at a specific point in your processing logic:

```python
from aws_lambda_powertools.utilities.validation import validate
from aws_lambda_powertools.utilities.validation.exceptions import (
    SchemaValidationError,
)

ADDRESS_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
        "street": {"type": "string"},
        "city": {"type": "string"},
        "state": {"type": "string", "pattern": "^[A-Z]{2}$"},
        "zip": {"type": "string", "pattern": "^[0-9]{5}(-[0-9]{4})?$"},
    },
    "required": ["street", "city", "state", "zip"],
}


def lambda_handler(event, context):
    order = event["order"]
    shipping_address = order.get("shipping_address")

    # Validate just the address portion
    try:
        validate(event=shipping_address, schema=ADDRESS_SCHEMA)
    except SchemaValidationError as e:
        return {
            "statusCode": 400,
            "body": f"Invalid shipping address: {e.message}",
        }

    # Address is valid, continue processing
    ship_order(order["order_id"], shipping_address)
    return {"statusCode": 200, "body": "Order shipped"}
```

## Custom Format Validators

JSON Schema supports format keywords like "email" and "date-time", but you can add your own custom formats too.

This registers a custom format checker for phone numbers:

```python
import re
from aws_lambda_powertools.utilities.validation import validator

# Define a custom format checker
def check_phone_number(value):
    """Validate US phone number format."""
    pattern = r"^\+1[0-9]{10}$"
    if not re.match(pattern, value):
        raise ValueError(f"Invalid phone number: {value}")
    return True


CONTACT_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
        "name": {"type": "string", "minLength": 1},
        "phone": {"type": "string"},
        "preferred_contact": {
            "type": "string",
            "enum": ["phone", "email", "text"],
        },
    },
    "required": ["name", "phone"],
}


@validator(inbound_schema=CONTACT_SCHEMA)
def lambda_handler(event, context):
    # Additional phone validation beyond schema
    check_phone_number(event["phone"])

    save_contact(event)
    return {"saved": True}
```

## Reusing Schemas with $ref

For larger projects, you'll want to define schemas once and reference them across functions. JSON Schema's `$ref` keyword lets you do this.

This example uses schema references to avoid duplicating definitions:

```python
# schemas.py - shared schema definitions
DEFINITIONS = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "definitions": {
        "address": {
            "type": "object",
            "properties": {
                "street": {"type": "string"},
                "city": {"type": "string"},
                "country": {"type": "string"},
            },
            "required": ["street", "city", "country"],
        },
        "contact": {
            "type": "object",
            "properties": {
                "email": {"type": "string", "format": "email"},
                "phone": {"type": "string"},
            },
            "required": ["email"],
        },
    },
}

CUSTOMER_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "billing_address": {"$ref": "#/definitions/address"},
        "shipping_address": {"$ref": "#/definitions/address"},
        "contact_info": {"$ref": "#/definitions/contact"},
    },
    "required": ["name", "billing_address", "contact_info"],
    "definitions": DEFINITIONS["definitions"],
}
```

## Error Handling in Production

In production, you'll want to catch validation errors and return friendly error messages instead of letting the raw exception propagate.

This wraps validation errors in proper API responses:

```python
from aws_lambda_powertools.utilities.validation import validate
from aws_lambda_powertools.utilities.validation.exceptions import (
    SchemaValidationError,
)
import json


def lambda_handler(event, context):
    try:
        # Parse the API Gateway body
        body = json.loads(event.get("body", "{}"))
        validate(event=body, schema=INPUT_SCHEMA)
    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Request body is not valid JSON"}),
        }
    except SchemaValidationError as e:
        return {
            "statusCode": 422,
            "body": json.dumps({
                "error": "Validation failed",
                "details": e.message,
                "path": list(e.path) if hasattr(e, "path") else None,
            }),
        }

    # Validation passed - process the request
    result = process_request(body)
    return {"statusCode": 200, "body": json.dumps(result)}
```

## Performance Considerations

Schema validation adds a small overhead to each invocation. For most functions, it's negligible - a few milliseconds. But if you're processing thousands of records per invocation, consider these tips:

- Keep schemas simple. Deep nesting and complex patterns take longer to validate.
- Use `validate()` selectively on the parts that actually need checking rather than validating the entire event.
- Cache compiled schemas if you're using the standalone function in a loop.

For monitoring the performance impact of validation on your Lambda functions, check out our guide on [observability for serverless applications](https://oneuptime.com/blog/post/aws-lambda-monitoring-best-practices/view).

## Wrapping Up

Input validation isn't glamorous, but it saves you from debugging cryptic errors downstream. Lambda Powertools Validation gives you a clean, declarative way to define what your function expects and rejects anything that doesn't match. The envelope support is particularly useful since it handles the AWS service wrapper formats automatically. Add it early in your project and you'll catch integration bugs before they reach production.
