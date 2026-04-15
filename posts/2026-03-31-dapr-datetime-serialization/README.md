# How to Handle DateTime Serialization in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, DateTime, Serialization, JSON, Interoperability

Description: Solve DateTime serialization issues in Dapr across polyglot services by standardizing on ISO 8601 UTC format with timezone awareness and custom converters.

---

## DateTime Pitfalls in Distributed Dapr Systems

DateTime serialization is a common source of bugs in distributed systems. In Dapr, when a .NET service publishes a DateTime value and a Python or Go service subscribes to that event, format mismatches cause parse failures or silent data corruption (timezone offsets treated as UTC).

The standard solution: always serialize DateTimes as ISO 8601 strings in UTC.

```yaml
Good: "2026-03-31T10:00:00Z"           (UTC, unambiguous)
Good: "2026-03-31T10:00:00.000Z"       (with milliseconds)
Avoid: "03/31/2026 10:00:00"           (locale-dependent)
Avoid: 1774951200                       (Unix timestamp, less readable)
Avoid: "2026-03-31T10:00:00+05:30"     (ambiguous in some parsers)
```

## .NET: Configure DateTime Serialization

```csharp
// Custom ISO 8601 UTC converter for System.Text.Json
public class UtcDateTimeConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader,
        Type typeToConvert, JsonSerializerOptions options)
    {
        var str = reader.GetString() ?? "";
        if (DateTime.TryParse(str, null,
            System.Globalization.DateTimeStyles.RoundtripKind,
            out var dt))
        {
            return dt.ToUniversalTime();
        }
        throw new JsonException($"Cannot convert '{str}' to DateTime");
    }

    public override void Write(Utf8JsonWriter writer,
        DateTime value, JsonSerializerOptions options)
    {
        // Always write as UTC ISO 8601
        writer.WriteStringValue(
            value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"));
    }
}

// Register with Dapr client
builder.Services.AddDaprClient(c =>
{
    c.UseJsonSerializationOptions(new JsonSerializerOptions
    {
        Converters = { new UtcDateTimeConverter() },
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    });
});

// DateTimeOffset is safer - preserves original timezone
public record OrderEvent(
    string OrderId,
    DateTimeOffset CreatedAt,   // Better than DateTime
    DateTimeOffset? FulfilledAt
);
```

## Go: DateTime Deserialization

```go
// datetime_model.go
package models

import (
    "encoding/json"
    "time"
)

type OrderEvent struct {
    OrderID     string     `json:"orderId"`
    CreatedAt   time.Time  `json:"createdAt"`
    FulfilledAt *time.Time `json:"fulfilledAt,omitempty"`
}

// Go's time.Time unmarshal handles RFC 3339 (a profile of ISO 8601) natively
func ParseOrderEvent(data []byte) (*OrderEvent, error) {
    var event OrderEvent
    if err := json.Unmarshal(data, &event); err != nil {
        return nil, err
    }
    // Ensure UTC
    event.CreatedAt = event.CreatedAt.UTC()
    if event.FulfilledAt != nil {
        utc := event.FulfilledAt.UTC()
        event.FulfilledAt = &utc
    }
    return &event, nil
}

// Always marshal as UTC RFC 3339
func (o OrderEvent) MarshalJSON() ([]byte, error) {
    type Alias OrderEvent
    a := struct {
        Alias
        CreatedAt   string  `json:"createdAt"`
        FulfilledAt *string `json:"fulfilledAt,omitempty"`
    }{
        Alias:     Alias(o),
        CreatedAt: o.CreatedAt.UTC().Format(time.RFC3339Nano),
    }
    if o.FulfilledAt != nil {
        s := o.FulfilledAt.UTC().Format(time.RFC3339Nano)
        a.FulfilledAt = &s
    }
    return json.Marshal(a)
}
```

## Python: DateTime Handling

```python
# datetime_utils.py
from datetime import datetime, timezone
from dataclasses import dataclass
from typing import Optional

@dataclass
class OrderEvent:
    order_id: str
    created_at: datetime
    fulfilled_at: Optional[datetime] = None

    def to_dict(self) -> dict:
        """Serialize with UTC ISO 8601 format."""
        result = {
            "orderId": self.order_id,
            "createdAt": self.created_at.astimezone(timezone.utc)
                                         .strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        }
        if self.fulfilled_at:
            result["fulfilledAt"] = (
                self.fulfilled_at.astimezone(timezone.utc)
                                  .strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
            )
        return result

    @classmethod
    def from_dict(cls, data: dict) -> "OrderEvent":
        """Deserialize with timezone awareness."""
        return cls(
            order_id=data["orderId"],
            created_at=datetime.fromisoformat(
                data["createdAt"].replace("Z", "+00:00")
            ),
            fulfilled_at=(
                datetime.fromisoformat(data["fulfilledAt"].replace("Z", "+00:00"))
                if data.get("fulfilledAt") else None
            )
        )
```

## Cross-Language DateTime Test

```bash
# Publish from .NET, subscribe in Python - verify no timezone drift
curl -X POST http://localhost:3500/v1.0/publish/pubsub/order-created \
  -H "Content-Type: application/json" \
  -d '{"orderId":"123","createdAt":"2026-03-31T10:00:00.000Z"}'

# Python subscriber should print: 2026-03-31 10:00:00+00:00
```

## Summary

DateTime serialization in Dapr requires explicit UTC normalization and ISO 8601 format enforcement across all polyglot services. Use `DateTimeOffset` over `DateTime` in .NET to preserve timezone information, Go's `time.RFC3339Nano` for formatting, and Python's `datetime.fromisoformat` with `+00:00` suffix replacement. Establish an explicit contract (ISO 8601 UTC) in your API documentation and validate it in integration tests.
