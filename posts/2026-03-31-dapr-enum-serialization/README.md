# How to Handle Enum Serialization in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, ENUM, Serialization, JSON, Interoperability

Description: Handle enum serialization in Dapr across polyglot services using string-based enums, integer values, and custom converters to ensure cross-language compatibility.

---

## Enum Serialization Challenges in Dapr

Enums are a common source of deserialization failures in polyglot Dapr systems. The core problem: .NET serializes enums as integers by default (e.g., `2`), while Go expects string names (e.g., `"PROCESSING"`). A .NET service publishing `OrderStatus.Processing` as `1` will cause a Python or Go subscriber to fail with an unknown value.

**The fix**: Always serialize enums as strings across all services.

## .NET: String Enum Serialization

```csharp
using System.Text.Json.Serialization;
using Dapr.Client;

// Define enums with JSON string conversion
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum OrderStatus
{
    Pending,
    Processing,
    Fulfilled,
    Cancelled,
    Refunded
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PaymentMethod
{
    CreditCard,
    DebitCard,
    BankTransfer,
    Cryptocurrency
}

public record OrderEvent(
    string OrderId,
    [property: JsonConverter(typeof(JsonStringEnumConverter))]
    OrderStatus Status,
    [property: JsonConverter(typeof(JsonStringEnumConverter))]
    PaymentMethod Payment
);

// Register globally with Dapr client
builder.Services.AddDaprClient(c =>
{
    c.UseJsonSerializationOptions(new JsonSerializerOptions
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    });
});
```

## Go: Enum as String Constants

```go
// order_status.go
package models

import (
    "encoding/json"
    "fmt"
)

type OrderStatus string

const (
    OrderStatusPending    OrderStatus = "Pending"
    OrderStatusProcessing OrderStatus = "Processing"
    OrderStatusFulfilled  OrderStatus = "Fulfilled"
    OrderStatusCancelled  OrderStatus = "Cancelled"
)

// Validate on deserialization
func (s *OrderStatus) UnmarshalJSON(data []byte) error {
    var str string
    if err := json.Unmarshal(data, &str); err != nil {
        return err
    }

    valid := map[string]bool{
        "Pending": true, "Processing": true,
        "Fulfilled": true, "Cancelled": true,
    }

    if !valid[str] {
        return fmt.Errorf("invalid OrderStatus: %q", str)
    }

    *s = OrderStatus(str)
    return nil
}

type OrderEvent struct {
    OrderID string      `json:"orderId"`
    Status  OrderStatus `json:"status"`
}
```

## Python: Enum String Serialization

```python
# models.py
from enum import Enum
from dataclasses import dataclass
import json

class OrderStatus(str, Enum):
    """String enum - serializes as string value, not name."""
    PENDING = "Pending"
    PROCESSING = "Processing"
    FULFILLED = "Fulfilled"
    CANCELLED = "Cancelled"

class PaymentMethod(str, Enum):
    CREDIT_CARD = "CreditCard"
    DEBIT_CARD = "DebitCard"
    BANK_TRANSFER = "BankTransfer"

@dataclass
class OrderEvent:
    order_id: str
    status: OrderStatus
    payment_method: PaymentMethod

    def to_json(self) -> str:
        return json.dumps({
            "orderId": self.order_id,
            "status": self.status.value,        # "Pending" not 0
            "paymentMethod": self.payment_method.value
        })

    @classmethod
    def from_dict(cls, data: dict) -> "OrderEvent":
        return cls(
            order_id=data["orderId"],
            status=OrderStatus(data["status"]),
            payment_method=PaymentMethod(data["paymentMethod"])
        )
```

## Handling Unknown Enum Values Gracefully

```go
// Handle enum versions - new values from updated services
type OrderStatus struct {
    value string
}

var (
    StatusPending    = OrderStatus{"Pending"}
    StatusProcessing = OrderStatus{"Processing"}
    StatusFulfilled  = OrderStatus{"Fulfilled"}
    StatusUnknown    = OrderStatus{"Unknown"}
)

func ParseOrderStatus(s string) OrderStatus {
    switch s {
    case "Pending":    return StatusPending
    case "Processing": return StatusProcessing
    case "Fulfilled":  return StatusFulfilled
    default:
        // Log and use fallback instead of panicking
        fmt.Printf("unknown OrderStatus: %s, defaulting to Unknown\n", s)
        return StatusUnknown
    }
}
```

## Protobuf Enum Cross-Language

```protobuf
// For Dapr gRPC - define enums in proto
enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;
  ORDER_STATUS_PENDING = 1;
  ORDER_STATUS_PROCESSING = 2;
  ORDER_STATUS_FULFILLED = 3;
}
// Protobuf handles cross-language enum serialization as integers
// Unknown values are preserved as integers for forward compatibility
```

## Summary

Enum serialization in Dapr requires a cross-language contract. The most robust approach is to use string-based enums consistently - `JsonStringEnumConverter` in .NET, `string` type constants in Go, and `str, Enum` subclass in Python. Always validate incoming enum values rather than panicking, and treat unknown values gracefully to support forward compatibility when new enum values are added in updated services.
