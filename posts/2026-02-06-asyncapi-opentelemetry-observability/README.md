# How to Build Observability for Event-Driven Architectures Using AsyncAPI Specs and OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, AsyncAPI, Event-Driven Architecture, Observability

Description: Use AsyncAPI specifications to automatically generate OpenTelemetry instrumentation for your event-driven architecture channels.

AsyncAPI is to event-driven architectures what OpenAPI is to REST APIs. It describes your message channels, message schemas, and server bindings in a machine-readable format. By combining AsyncAPI specs with OpenTelemetry, you can automatically generate instrumentation that captures every message flowing through your system.

## The AsyncAPI Specification

Here is a minimal AsyncAPI spec describing an order processing system:

```yaml
# asyncapi.yaml
asyncapi: "2.6.0"
info:
  title: Order Processing Service
  version: "1.0.0"
channels:
  orders/created:
    subscribe:
      operationId: onOrderCreated
      message:
        name: OrderCreated
        payload:
          type: object
          properties:
            orderId:
              type: string
            customerId:
              type: string
            totalAmount:
              type: number
  orders/shipped:
    publish:
      operationId: publishOrderShipped
      message:
        name: OrderShipped
        payload:
          type: object
          properties:
            orderId:
              type: string
            trackingNumber:
              type: string
```

## Generating Instrumentation from the Spec

You can parse the AsyncAPI spec and generate OpenTelemetry wrappers automatically. Here is a Python utility that does this:

```python
import yaml
from opentelemetry import trace
from functools import wraps

tracer = trace.get_tracer("asyncapi.instrumentation")

def load_asyncapi_spec(spec_path):
    """Load and parse the AsyncAPI specification file."""
    with open(spec_path, "r") as f:
        return yaml.safe_load(f)

def create_instrumented_handlers(spec_path):
    """Generate instrumented handler decorators from AsyncAPI spec."""
    spec = load_asyncapi_spec(spec_path)
    channels = spec.get("channels", {})
    service_name = spec["info"]["title"]

    decorators = {}

    for channel_name, channel_config in channels.items():
        # Handle subscribe operations (consuming messages)
        if "subscribe" in channel_config:
            op = channel_config["subscribe"]
            operation_id = op.get("operationId", channel_name)
            message_name = op["message"]["name"]

            def make_consumer_decorator(ch_name, msg_name, op_id):
                def decorator(func):
                    @wraps(func)
                    def wrapper(*args, **kwargs):
                        with tracer.start_as_current_span(
                            f"consume {ch_name}",
                            kind=trace.SpanKind.CONSUMER,
                            attributes={
                                "messaging.system": "custom",
                                "messaging.destination": ch_name,
                                "messaging.operation": "receive",
                                "messaging.message.type": msg_name,
                                "asyncapi.operation_id": op_id,
                                "service.name": service_name,
                            }
                        ):
                            return func(*args, **kwargs)
                    return wrapper
                return decorator
            decorators[operation_id] = make_consumer_decorator(
                channel_name, message_name, operation_id
            )

        # Handle publish operations (producing messages)
        if "publish" in channel_config:
            op = channel_config["publish"]
            operation_id = op.get("operationId", channel_name)
            message_name = op["message"]["name"]

            def make_producer_decorator(ch_name, msg_name, op_id):
                def decorator(func):
                    @wraps(func)
                    def wrapper(*args, **kwargs):
                        with tracer.start_as_current_span(
                            f"publish {ch_name}",
                            kind=trace.SpanKind.PRODUCER,
                            attributes={
                                "messaging.system": "custom",
                                "messaging.destination": ch_name,
                                "messaging.operation": "publish",
                                "messaging.message.type": msg_name,
                                "asyncapi.operation_id": op_id,
                                "service.name": service_name,
                            }
                        ):
                            return func(*args, **kwargs)
                    return wrapper
                return decorator
            decorators[operation_id] = make_producer_decorator(
                channel_name, message_name, operation_id
            )

    return decorators
```

## Using the Generated Instrumentation

Once you have the decorators, apply them to your actual handlers:

```python
# Load decorators from the AsyncAPI spec
handlers = create_instrumented_handlers("asyncapi.yaml")

# Apply the decorator to your consumer handler
@handlers["onOrderCreated"]
def on_order_created(message):
    """Process a new order."""
    order_id = message["orderId"]
    customer_id = message["customerId"]

    # Business logic for processing the order
    validate_order(order_id)
    reserve_inventory(order_id)
    charge_payment(customer_id, message["totalAmount"])

    return {"status": "processed", "order_id": order_id}


# Apply the decorator to your producer handler
@handlers["publishOrderShipped"]
def publish_order_shipped(order_id, tracking_number):
    """Publish that an order has been shipped."""
    message = {
        "orderId": order_id,
        "trackingNumber": tracking_number,
    }
    # Send to your message broker
    broker.publish("orders/shipped", message)
    return message
```

## Adding Message Schema Validation Spans

You can go further and validate messages against the AsyncAPI schema, recording the result as a span:

```python
from jsonschema import validate, ValidationError

def create_validated_handler(spec_path, channel_name, operation_type):
    """Create a handler that validates messages against the AsyncAPI schema."""
    spec = load_asyncapi_spec(spec_path)
    channel = spec["channels"][channel_name]
    message_schema = channel[operation_type]["message"]["payload"]

    def decorator(func):
        @wraps(func)
        def wrapper(message, *args, **kwargs):
            with tracer.start_as_current_span(
                "validate_message_schema",
                attributes={
                    "messaging.destination": channel_name,
                    "asyncapi.schema_valid": True,
                }
            ) as span:
                try:
                    validate(instance=message, schema=message_schema)
                except ValidationError as e:
                    span.set_attribute("asyncapi.schema_valid", False)
                    span.set_attribute("asyncapi.validation_error", str(e.message))
                    span.set_status(trace.Status(trace.StatusCode.ERROR))
                    raise

            return func(message, *args, **kwargs)
        return wrapper
    return decorator
```

## Binding-Specific Attributes

AsyncAPI specs can include server bindings for Kafka, AMQP, MQTT, and more. You can extract these to set proper semantic convention attributes:

```python
def get_binding_attributes(spec, channel_name):
    """Extract messaging system attributes from AsyncAPI server bindings."""
    channel = spec["channels"][channel_name]
    bindings = channel.get("bindings", {})

    attrs = {}
    if "kafka" in bindings:
        attrs["messaging.system"] = "kafka"
        attrs["messaging.kafka.consumer_group"] = bindings["kafka"].get("groupId", "")
    elif "amqp" in bindings:
        attrs["messaging.system"] = "rabbitmq"
        attrs["messaging.rabbitmq.routing_key"] = bindings["amqp"].get("routingKey", "")
    elif "mqtt" in bindings:
        attrs["messaging.system"] = "mqtt"
        attrs["messaging.mqtt.qos"] = bindings["mqtt"].get("qos", 0)

    return attrs
```

## Benefits of This Approach

By generating instrumentation from your AsyncAPI spec, you get several advantages. First, your instrumentation stays in sync with your API definition. When you add a new channel to the spec, the instrumentation follows automatically. Second, you enforce consistent naming and attributes across all your event-driven services. Third, you can validate that your actual message payloads match the declared schemas and capture validation failures as span events.

This approach turns your AsyncAPI spec from documentation into an active part of your observability stack.
