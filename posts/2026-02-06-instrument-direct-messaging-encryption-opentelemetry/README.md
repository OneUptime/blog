# How to Instrument Direct Messaging System (Encryption, Delivery, Read Receipts) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Direct Messaging, End-to-End Encryption, Real-Time Communication

Description: Instrument direct messaging systems covering encryption, delivery, and read receipt workflows with OpenTelemetry for latency monitoring.

Direct messaging is a core feature of any social platform. Users expect messages to be delivered instantly, encrypted for privacy, and accompanied by delivery and read receipts. The backend handles message encryption, routing through WebSocket connections or push fallback, persistent storage, and receipt tracking. Each of these steps introduces latency and potential failure points. OpenTelemetry gives you the tracing and metrics to keep messaging fast and reliable.

## Setting Up Tracing

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(
    OTLPSpanExporter(endpoint="http://otel-collector:4317")
))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("messaging.direct")
meter = metrics.get_meter("messaging.direct")
```

## Tracing Message Send

When a user sends a message, the system needs to encrypt it, persist it, and deliver it to the recipient in real time.

```python
def send_message(sender_id: str, recipient_id: str, content: str, conversation_id: str):
    with tracer.start_as_current_span("messaging.send") as span:
        span.set_attribute("sender.id", sender_id)
        span.set_attribute("recipient.id", recipient_id)
        span.set_attribute("conversation.id", conversation_id)
        span.set_attribute("message.content_length", len(content))

        # Generate a unique message ID
        message_id = generate_message_id()
        span.set_attribute("message.id", message_id)

        # Encrypt the message content
        with tracer.start_as_current_span("messaging.encrypt") as encrypt_span:
            encrypted = encrypt_message(content, sender_id, recipient_id)
            encrypt_span.set_attribute("encryption.algorithm", "signal_protocol")
            encrypt_span.set_attribute("encryption.key_version", encrypted.key_version)
            encrypt_span.set_attribute("encryption.ciphertext_length", len(encrypted.ciphertext))

            if encrypted.key_rotation_needed:
                encrypt_span.add_event("key_rotation_triggered", {
                    "old_key_version": encrypted.key_version - 1,
                    "new_key_version": encrypted.key_version
                })

        # Persist the encrypted message to the database
        with tracer.start_as_current_span("messaging.persist") as persist_span:
            store_result = store_message(
                message_id, conversation_id, sender_id, recipient_id,
                encrypted.ciphertext
            )
            persist_span.set_attribute("db.system", "cassandra")
            persist_span.set_attribute("db.operation", "INSERT")
            persist_span.set_attribute("persist.success", store_result.success)

        # Deliver the message to the recipient
        with tracer.start_as_current_span("messaging.deliver") as deliver_span:
            delivery = deliver_message(recipient_id, message_id, encrypted.ciphertext)
            deliver_span.set_attribute("delivery.method", delivery.method)  # websocket or push
            deliver_span.set_attribute("delivery.success", delivery.success)
            deliver_span.set_attribute("delivery.latency_ms", delivery.latency_ms)

        span.set_attribute("message.delivered", delivery.success)
        return MessageResult(message_id=message_id, delivered=delivery.success)
```

## Tracing Message Delivery via WebSocket or Push Fallback

The delivery path depends on whether the recipient has an active WebSocket connection. If not, the system falls back to push notifications.

```python
def deliver_message(recipient_id: str, message_id: str, ciphertext: bytes):
    with tracer.start_as_current_span("messaging.route_delivery") as span:
        span.set_attribute("recipient.id", recipient_id)
        span.set_attribute("message.id", message_id)

        # Check if the recipient has an active WebSocket connection
        with tracer.start_as_current_span("messaging.check_ws_connection") as ws_check:
            ws_connection = find_active_websocket(recipient_id)
            ws_check.set_attribute("websocket.connected", ws_connection is not None)

            if ws_connection:
                ws_check.set_attribute("websocket.server", ws_connection.server_id)
                ws_check.set_attribute("websocket.session_age_seconds",
                                       ws_connection.session_age)

        if ws_connection:
            # Deliver via WebSocket
            with tracer.start_as_current_span("messaging.deliver_websocket") as ws_span:
                ws_result = send_via_websocket(ws_connection, message_id, ciphertext)
                ws_span.set_attribute("websocket.ack_received", ws_result.ack_received)
                ws_span.set_attribute("websocket.delivery_ms", ws_result.delivery_ms)

                if ws_result.ack_received:
                    return DeliveryResult(method="websocket", success=True,
                                          latency_ms=ws_result.delivery_ms)
                else:
                    ws_span.add_event("websocket_delivery_timeout", {
                        "timeout_ms": 5000
                    })

        # Fallback to push notification
        with tracer.start_as_current_span("messaging.deliver_push") as push_span:
            push_result = send_message_push(recipient_id, message_id)
            push_span.set_attribute("push.provider", push_result.provider)
            push_span.set_attribute("push.success", push_result.success)
            push_span.set_attribute("delivery.method", "push_fallback")

            return DeliveryResult(method="push", success=push_result.success,
                                  latency_ms=push_result.latency_ms)
```

## Tracing Read Receipts

Read receipts flow in the opposite direction: from the recipient back to the sender.

```python
def process_read_receipt(reader_id: str, message_id: str, conversation_id: str):
    with tracer.start_as_current_span("messaging.read_receipt") as span:
        span.set_attribute("reader.id", reader_id)
        span.set_attribute("message.id", message_id)
        span.set_attribute("conversation.id", conversation_id)

        # Update the message status in the database
        with tracer.start_as_current_span("messaging.read_receipt.update_status") as update_span:
            import time
            message = get_message(message_id)
            read_latency = time.time() - message.sent_at.timestamp()
            update_span.set_attribute("read.latency_seconds", round(read_latency))

            mark_message_read(message_id, reader_id)
            update_span.set_attribute("db.operation", "UPDATE")

        # Notify the sender that their message was read
        with tracer.start_as_current_span("messaging.read_receipt.notify_sender") as notify_span:
            sender_id = message.sender_id
            notify_result = send_read_receipt_to_sender(sender_id, message_id)
            notify_span.set_attribute("notification.method", notify_result.method)
            notify_span.set_attribute("notification.success", notify_result.success)

        span.set_attribute("receipt.processed", True)
```

## Tracing Delivery Receipts

Delivery receipts confirm the message reached the recipient's device but has not been read yet.

```python
def process_delivery_receipt(recipient_id: str, message_id: str):
    with tracer.start_as_current_span("messaging.delivery_receipt") as span:
        span.set_attribute("recipient.id", recipient_id)
        span.set_attribute("message.id", message_id)

        # Mark message as delivered in the database
        with tracer.start_as_current_span("messaging.delivery_receipt.update"):
            mark_message_delivered(message_id, recipient_id)

        # Calculate delivery latency
        message = get_message(message_id)
        import time
        delivery_latency_ms = (time.time() - message.sent_at.timestamp()) * 1000
        span.set_attribute("delivery.latency_ms", round(delivery_latency_ms))

        # Notify sender
        with tracer.start_as_current_span("messaging.delivery_receipt.notify"):
            send_delivery_receipt_to_sender(message.sender_id, message_id)
```

## Messaging Metrics

```python
message_send_latency = meter.create_histogram(
    "messaging.send.latency_ms",
    description="End-to-end message send latency",
    unit="ms"
)

delivery_method_counter = meter.create_counter(
    "messaging.delivery.method",
    description="Message deliveries by method (websocket vs push)"
)

encryption_latency = meter.create_histogram(
    "messaging.encryption.latency_ms",
    description="Message encryption latency",
    unit="ms"
)

receipt_latency = meter.create_histogram(
    "messaging.receipt.latency_seconds",
    description="Time between message send and read receipt",
    unit="s"
)
```

## Why This Matters

Messaging latency directly impacts user perception of your platform. A 100ms increase in delivery time feels like a sluggish app. With OpenTelemetry tracing every step from encryption through delivery, you can see whether the slowdown is in key exchange, database persistence, WebSocket routing, or push notification fallback. You can also track encryption key rotation issues before they cause message delivery failures. That level of detail is what separates a messaging system that feels instant from one that feels broken.
