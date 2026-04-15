# How to Implement Data Validation at Service Boundaries with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Data Validation, Service Boundary, Middleware, Architecture

Description: Enforce data contracts at Dapr service boundaries using middleware, schema validation, and input sanitization to prevent bad data from propagating.

---

Service boundaries are the right place to validate data because they represent trust boundaries. Data entering a service from outside - via Dapr service invocation or pub/sub - cannot be assumed to be valid. Validating at the boundary prevents bad data from corrupting state stores or propagating downstream. Dapr middleware makes this validation declarative and reusable.

## Validation Layers for Dapr Services

Two key validation points exist for Dapr services:

1. **Service invocation boundary** - validate incoming HTTP requests via middleware
2. **Pub/sub boundary** - validate event payloads before processing

## Dapr Middleware for Request Validation

Dapr supports custom middleware pipelines for HTTP service invocation. Use the OPA (Open Policy Agent) or custom middleware:

```yaml
# components/validation-middleware.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: schema-validator
  namespace: default
spec:
  type: middleware.http.opa
  version: v1
  metadata:
  - name: rego
    value: |
      package httpapi.authz
      default allow = false
      allow {
        input.request.method == "POST"
        count(input.request.body.customer_id) > 0
        count(input.request.body.product_id) > 0
        input.request.body.quantity > 0
      }
  - name: defaultStatus
    value: "403"
  - name: readBody
    value: "true"
```

For custom validation, implement middleware in your service:

```python
# middleware/validation.py - Flask middleware example
from functools import wraps
from flask import request, jsonify
import jsonschema

# JSON Schema definitions for each endpoint
SCHEMAS = {
    'POST /orders': {
        'type': 'object',
        'required': ['customer_id', 'product_id', 'quantity'],
        'properties': {
            'customer_id': {'type': 'string', 'minLength': 1, 'maxLength': 100},
            'product_id': {'type': 'string', 'pattern': '^[a-zA-Z0-9-]+$'},
            'quantity': {'type': 'integer', 'minimum': 1, 'maximum': 1000},
            'notes': {'type': 'string', 'maxLength': 500}
        },
        'additionalProperties': False
    }
}

def validate_request(schema_key):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            schema = SCHEMAS.get(schema_key)
            if not schema:
                return f(*args, **kwargs)

            try:
                data = request.get_json(force=True)
                if data is None:
                    return jsonify({'error': 'Request body must be valid JSON'}), 400
                jsonschema.validate(data, schema)
            except jsonschema.ValidationError as e:
                return jsonify({
                    'error': 'Validation failed',
                    'field': list(e.path),
                    'message': e.message
                }), 422
            except Exception as e:
                return jsonify({'error': 'Invalid request format'}), 400

            return f(*args, **kwargs)
        return decorated
    return decorator
```

Apply validation to routes:

```python
# app.py
@app.route('/orders', methods=['POST'])
@validate_request('POST /orders')
def create_order():
    order = request.get_json()
    # Data is guaranteed valid here
    return process_order(order)
```

## Pub/Sub Event Validation

Validate incoming Dapr events before processing:

```python
# validators/event_validator.py
from dataclasses import dataclass
from typing import Optional
import re

@dataclass
class OrderCreatedEvent:
    order_id: str
    customer_id: str
    product_id: str
    quantity: int
    total_amount: float

    def __post_init__(self):
        if not re.match(r'^[a-f0-9-]{36}$', self.order_id):
            raise ValueError(f"Invalid order_id format: {self.order_id}")
        if self.quantity <= 0:
            raise ValueError(f"Quantity must be positive: {self.quantity}")
        if self.total_amount <= 0:
            raise ValueError(f"Total amount must be positive: {self.total_amount}")

@app.route('/events/order-created', methods=['POST'])
def handle_order_created():
    cloud_event = request.json
    raw_data = cloud_event.get('data', {})

    try:
        event = OrderCreatedEvent(
            order_id=raw_data['order_id'],
            customer_id=raw_data['customer_id'],
            product_id=raw_data['product_id'],
            quantity=int(raw_data['quantity']),
            total_amount=float(raw_data['total_amount'])
        )
    except (KeyError, ValueError, TypeError) as e:
        # Log invalid event but return SUCCESS to prevent Dapr retry loop
        # Send to dead-letter manually for review
        publish_to_dead_letter(raw_data, str(e))
        return jsonify({'status': 'SUCCESS'})

    process_order_event(event)
    return jsonify({'status': 'SUCCESS'})
```

## Input Sanitization

Sanitize string inputs to prevent injection attacks:

```python
# utils/sanitizer.py
import html
import re

def sanitize_string(value: str, max_length: int = 255) -> str:
    """Remove dangerous characters and truncate"""
    if not isinstance(value, str):
        raise ValueError("Expected string input")

    # Remove null bytes and control characters
    sanitized = re.sub(r'[\x00-\x1f\x7f]', '', value)
    # HTML encode to prevent XSS if value is displayed
    sanitized = html.escape(sanitized)
    # Truncate to max length
    return sanitized[:max_length]

def sanitize_order(order: dict) -> dict:
    return {
        'customer_id': sanitize_string(order['customer_id'], 100),
        'product_id': sanitize_string(order['product_id'], 50),
        'quantity': int(order['quantity']),
        'notes': sanitize_string(order.get('notes', ''), 500)
    }
```

## Schema Registry for Cross-Service Contract Enforcement

Publish schemas to a shared location:

```bash
# Register schema via Apicurio or Confluent Schema Registry
curl -X POST http://schema-registry:8081/subjects/order-created-value/versions \
  -H 'Content-Type: application/vnd.schemaregistry.v1+json' \
  -d '{"schema": "{\"type\":\"record\",\"name\":\"OrderCreated\",...}"}'
```

## Summary

Data validation at Dapr service boundaries uses JSON Schema validation for service invocation requests, dataclass-based validation for pub/sub events, and input sanitization for string fields. Returning SUCCESS for invalid pub/sub events while routing to a dead-letter queue prevents infinite retry loops while preserving bad messages for investigation.
