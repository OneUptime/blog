# How to Use Integration Events with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Integration Event, Pub/Sub, Microservice, DDD, Anti-Corruption Layer

Description: Implement integration events with Dapr pub/sub to decouple microservices across bounded context boundaries with schema isolation.

---

## Overview

Integration events differ from domain events in that they are designed for cross-service communication across bounded context boundaries. They include only the data needed by consumers and are versioned independently of the originating domain model. Dapr pub/sub provides the transport layer for integration events.

## Integration Event vs Domain Event

| Aspect | Domain Event | Integration Event |
|---|---|---|
| Scope | Within a bounded context | Across bounded contexts |
| Schema ownership | Owned by the publishing domain | Shared contract |
| Version strategy | Can change freely | Versioned carefully |
| Data included | Full aggregate state | Only consumer-needed fields |
| Publishing timing | After business logic | After domain event processing |

## Integration Event Contracts

Define integration events as explicit API contracts:

```csharp
// Published by: Order Service
// Version: v1
public record OrderConfirmedIntegrationEvent
{
    public string OrderId { get; init; }
    public string CustomerId { get; init; }
    public string CustomerEmail { get; init; }
    public List<OrderLineItem> Items { get; init; }
    public decimal TotalAmount { get; init; }
    public string Currency { get; init; }
    public DateTime ConfirmedAt { get; init; }
    public string EventVersion { get; init; } = "1.0";
    public string EventId { get; init; } = Guid.NewGuid().ToString();
}

public record OrderLineItem
{
    public string ProductId { get; init; }
    public string ProductName { get; init; }
    public int Quantity { get; init; }
    public decimal UnitPrice { get; init; }
}
```

## Publishing Integration Events

```csharp
using Dapr.Client;

public class OrderIntegrationEventPublisher
{
    private readonly DaprClient _daprClient;

    public OrderIntegrationEventPublisher(DaprClient daprClient)
    {
        _daprClient = daprClient;
    }

    public async Task PublishOrderConfirmedAsync(Order order)
    {
        // Map domain model to integration event contract
        var integrationEvent = new OrderConfirmedIntegrationEvent
        {
            OrderId = order.Id,
            CustomerId = order.Customer.Id,
            CustomerEmail = order.Customer.Email,
            Items = order.Lines.Select(l => new OrderLineItem
            {
                ProductId = l.ProductId,
                ProductName = l.ProductName,
                Quantity = l.Quantity,
                UnitPrice = l.UnitPrice
            }).ToList(),
            TotalAmount = order.TotalAmount,
            Currency = order.Currency,
            ConfirmedAt = DateTime.UtcNow
        };

        await _daprClient.PublishEventAsync(
            pubsubName: "orders-pubsub",
            topicName: "order-confirmed-v1",
            data: integrationEvent
        );

        Console.WriteLine($"Published OrderConfirmed integration event for {order.Id}");
    }
}
```

## Anti-Corruption Layer in Consuming Services

The notification service translates the integration event to its own domain model:

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

class NotificationDomainModel:
    """Internal domain model - isolated from order service schema"""
    def __init__(self, recipient_email: str, order_ref: str, line_count: int, total: float):
        self.recipient_email = recipient_email
        self.order_ref = order_ref
        self.line_count = line_count
        self.total = total

def translate_order_confirmed_event(event_data: dict) -> NotificationDomainModel:
    """Anti-corruption layer: translate integration event to local domain"""
    return NotificationDomainModel(
        recipient_email=event_data["customerEmail"],
        order_ref=event_data["orderId"],
        line_count=len(event_data.get("items", [])),
        total=event_data["totalAmount"]
    )

@app.route('/integration-events/order-confirmed', methods=['POST'])
def handle_order_confirmed():
    envelope = request.json
    event_data = envelope.get("data", {})

    # Translate via anti-corruption layer
    notification = translate_order_confirmed_event(event_data)

    send_order_confirmation_email(notification)

    return jsonify({"status": "SUCCESS"}), 200

def send_order_confirmation_email(notification: NotificationDomainModel):
    print(f"Sending confirmation to {notification.recipient_email} for order {notification.order_ref}")
```

## Dapr Subscription Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: order-confirmed-v1-subscription
spec:
  pubsubname: orders-pubsub
  topic: order-confirmed-v1
  route: /integration-events/order-confirmed
scopes:
- notification-service
- fulfillment-service
- analytics-service
```

## Event Schema Registry

Document integration event schemas in a shared registry for consumer discovery:

```yaml
# schema-registry/order-confirmed-v1.yaml
name: order-confirmed
version: "1.0"
topic: order-confirmed-v1
publisher: order-service
consumers:
  - notification-service
  - fulfillment-service
fields:
  - name: orderId
    type: string
    required: true
  - name: customerId
    type: string
    required: true
  - name: customerEmail
    type: string
    required: true
  - name: totalAmount
    type: number
    required: true
```

## Summary

Integration events in Dapr pub/sub create explicit, versioned contracts between bounded contexts. The anti-corruption layer pattern in consuming services ensures that changes to the publishing service's domain model do not cascade to consumers. Topic naming conventions like `order-confirmed-v1` enable parallel versioning when breaking changes are needed, allowing consumers to migrate at their own pace.
