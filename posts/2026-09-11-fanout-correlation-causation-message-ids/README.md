# Model Correlation, Causation, and Message IDs in Fan-Out Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Correlation ID, Messaging, Event-Driven Architecture, Distributed Tracing, Observability

Description: Design event envelopes that preserve workflow correlation and immediate causation across fan-out, duplicate delivery, and fan-in without conflating message identity.

---

When one order event starts inventory, payment, and notification work, a shared correlation ID helps locate the workflow. It cannot tell you which event caused each branch or whether two records represent separate messages or duplicate delivery.

Model those relationships explicitly. Give every distinct event an identity, carry a stable workflow correlation value, and identify the immediate cause when a new event is produced. For fan-in, retain all contributing identities rather than choosing an arbitrary parent.

## Define the relationships before the schema

Consider an order workflow:

```text
OrderPlaced E1, correlation W1
  -> InventoryReserved E2, caused by E1, correlation W1
  -> PaymentAuthorized E3, caused by E1, correlation W1
E2 + E3 -> OrderConfirmed E4, correlation W1
```

`W1` groups the conversation. `E2` and `E3` remain different events even though they share that group and the same immediate cause. `E4` depends on two inputs, so a single `causation_id` would omit part of the explanation.

These are application semantics. An observability backend cannot infer them reliably from timestamps, queue names, or a reused trace ID.

## Build on the CloudEvents event identity

CloudEvents 1.0 defines event identity through the combination of `source` and `id`. A duplicate resend can retain the same identity. Correlation and causation are additional application fields; do not describe them as mandatory built-in CloudEvents attributes.

Here is a structured JSON event using custom extension names:

```json
{
  "specversion": "1.0",
  "id": "4c11935a-10b0-4cab-bbdd-a1f7114e6f18",
  "source": "/services/inventory",
  "type": "com.example.inventory.reserved.v1",
  "datacontenttype": "application/json",
  "correlationid": "b6ac047d-1ac7-4ae3-a86d-1e40ff346c86",
  "causationid": "41b4a9f8-a5a5-4aef-88ec-8c6766be40f7",
  "causationsource": "/services/orders",
  "data": {
    "order_id": "order-1042",
    "reservation_id": "reservation-93"
  }
}
```

`causationsource` accompanies `causationid` because IDs are scoped by event source. The extension names use lowercase letters and avoid punctuation. Document their meaning, type, maximum length, and requiredness in your own schema.

The [CloudEvents specification](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md) defines the identity rule, supported attribute types, and extension conventions. Your envelope should preserve those rules even when the broker adds another message identifier.

## Create a fresh event for each branch

This Python example constructs independent branch events:

```python
from uuid import uuid4


def child_event(parent, source, event_type, data):
    return {
        "specversion": "1.0",
        "id": str(uuid4()),
        "source": source,
        "type": event_type,
        "datacontenttype": "application/json",
        "correlationid": parent["correlationid"],
        "causationid": parent["id"],
        "causationsource": parent["source"],
        "data": data,
    }


order = {
    "specversion": "1.0",
    "id": str(uuid4()),
    "source": "/services/orders",
    "type": "com.example.order.placed.v1",
    "correlationid": str(uuid4()),
}

inventory = child_event(order, "/services/inventory",
    "com.example.inventory.reserved.v1", {"order_id": "order-1042"})
payment = child_event(order, "/services/payments",
    "com.example.payment.authorized.v1", {"order_id": "order-1042"})

assert inventory["id"] != payment["id"]
assert inventory["correlationid"] == payment["correlationid"]
assert inventory["causationid"] == payment["causationid"] == order["id"]
```

Do not mutate and reuse one shared dictionary for both branches. Concurrent publication or delayed serialization can otherwise make both messages contain whichever branch wrote last.

When retrying delivery of the same event, preserve its event identity. When producing a new business event, assign a new identity and point to the event that caused it. The transport's redelivery flag or broker message ID remains useful evidence but does not replace this application contract.

## Represent fan-in with multiple contributors

A confirmation after both inventory and payment complete should identify both contributing events. Put the list in application data, where JSON arrays are valid, rather than assuming a CloudEvents extension supports arbitrary arrays:

```json
{
  "order_id": "order-1042",
  "contributors": [
    {"source": "/services/inventory", "id": "inventory-event-id"},
    {"source": "/services/payments", "id": "payment-event-id"}
  ]
}
```

Keep the normal event envelope around this `data` object. Define whether the single causation field is absent for fan-in or identifies a separate coordinator decision event. Make that rule explicit so consumers do not misinterpret the last arriving input as the only cause.

Use durable workflow state to determine whether both required branches completed. An ID relationship does not prevent duplicate confirmation; the coordinator still needs an atomic state transition or another appropriate idempotency mechanism.

## Align traces without replacing domain lineage

OpenTelemetry span links can connect a new processing operation to several inputs. A span has zero or one parent, so links are useful for fan-in and for delayed work that starts a new trace.

Keep message lineage in durable event metadata even when traces are sampled or expire. A trace ID is an execution identifier, not a replacement for the workflow record or event identity. Record the event's `source`, `id`, correlation value, and current trace context together in logs for navigation.

Avoid putting these unbounded IDs into ordinary metric labels. Count bounded outcomes such as branch type, success, timeout, and duplicate delivery while keeping exact identities in logs and events.

## Verify the event graph

Test three branches completing in different orders, duplicate delivery of each branch, a failed branch, and coordinator restart before confirmation. Assert unique identities for distinct events, stable workflow correlation, immediate cause references, and complete contributor lists.

Finally, search the workflow using only event metadata with tracing disabled. If the lineage disappears when a trace is unavailable, too much business identity is stored solely in telemetry.

## Conclusion

Use correlation to group a workflow, event identity to distinguish envelopes, and causation to describe immediate relationships. Preserve all contributors at fan-in and keep that lineage durable so retries, duplicate delivery, and sampled traces do not erase the explanation of what happened.

## Official Documentation

- [CloudEvents 1.0.2 specification](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md)
- [OpenTelemetry span links](https://opentelemetry.io/docs/specs/otel/trace/api/#link)
- [OpenTelemetry context propagation](https://opentelemetry.io/docs/concepts/context-propagation/)
