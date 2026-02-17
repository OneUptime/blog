# How to Write Custom serde Serializers in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, serde, Serialization, JSON, Data Formats

Description: Learn how to write custom serde serializers and deserializers in Rust to handle complex data transformations, non-standard formats, and domain-specific serialization requirements.

---

> serde is the backbone of data serialization in Rust. While its derive macros handle most use cases, sometimes you need fine-grained control over how your data is transformed. This guide walks you through writing custom serializers from scratch.

Most Rust developers know serde through `#[derive(Serialize, Deserialize)]`. It works beautifully for straightforward data structures. But what happens when you need to serialize a Unix timestamp as an ISO 8601 string? Or when your API expects snake_case but your types use camelCase? Or when you need to flatten nested structures in specific ways?

That's where custom serializers come in.

---

## Understanding serde's Architecture

Before diving into custom implementations, let's understand how serde works. The library separates data structures from data formats through two core traits:

- **Serialize**: Implemented by types that can be serialized
- **Serializer**: Implemented by formats (JSON, YAML, TOML, etc.)

This separation is what makes serde so flexible. Your custom serializer bridges the gap between your Rust types and the target format.

```rust
// The Serialize trait - what your types implement
pub trait Serialize {
    fn serialize<Ser>(&self, serializer: Ser) -> Result<Ser::Ok, Ser::Error>
    where
        Ser: Serializer;
}
```

---

## Your First Custom Serializer

Let's start with a common scenario: serializing a timestamp. You have a `DateTime` stored internally, but your API expects a Unix timestamp as an integer.

```rust
use serde::{Serialize, Serializer};
use chrono::{DateTime, Utc};

// A module that provides custom serialization for DateTime
pub mod unix_timestamp {
    use super::*;

    // Custom serialize function for DateTime<Utc>
    pub fn serialize<Ser>(date: &DateTime<Utc>, serializer: Ser) -> Result<Ser::Ok, Ser::Error>
    where
        Ser: Serializer,
    {
        // Convert DateTime to Unix timestamp (seconds since epoch)
        let timestamp = date.timestamp();

        // Use the serializer to write the integer
        serializer.serialize_i64(timestamp)
    }
}

// Usage in your struct
#[derive(Serialize)]
pub struct Event {
    pub name: String,

    // Apply custom serializer to this field
    #[serde(serialize_with = "unix_timestamp::serialize")]
    pub created_at: DateTime<Utc>,
}
```

When you serialize an `Event`, the `created_at` field will appear as an integer like `1706188800` instead of an ISO 8601 string.

---

## Handling Deserialization Too

Custom serializers often come in pairs. Here's the complete module with both directions:

```rust
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde::de::Error;
use chrono::{DateTime, TimeZone, Utc};

pub mod unix_timestamp {
    use super::*;

    pub fn serialize<Ser>(date: &DateTime<Utc>, serializer: Ser) -> Result<Ser::Ok, Ser::Error>
    where
        Ser: Serializer,
    {
        serializer.serialize_i64(date.timestamp())
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<DateTime<Utc>, D::Error>
    where
        D: Deserializer<'de>,
    {
        // Deserialize as i64 first
        let timestamp = i64::deserialize(deserializer)?;

        // Convert to DateTime, handling potential errors
        Utc.timestamp_opt(timestamp, 0)
            .single()
            .ok_or_else(|| D::Error::custom("invalid Unix timestamp"))
    }
}

// Now you can use both directions
#[derive(Serialize, Deserialize)]
pub struct Event {
    pub name: String,

    #[serde(
        serialize_with = "unix_timestamp::serialize",
        deserialize_with = "unix_timestamp::deserialize"
    )]
    pub created_at: DateTime<Utc>,
}
```

---

## Serializing Optional Fields

Things get trickier with `Option<T>`. You need to handle the `None` case:

```rust
pub mod optional_unix_timestamp {
    use super::*;

    pub fn serialize<Ser>(date: &Option<DateTime<Utc>>, serializer: Ser) -> Result<Ser::Ok, Ser::Error>
    where
        Ser: Serializer,
    {
        match date {
            Some(d) => serializer.serialize_some(&d.timestamp()),
            None => serializer.serialize_none(),
        }
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Option<DateTime<Utc>>, D::Error>
    where
        D: Deserializer<'de>,
    {
        // Deserialize as Option<i64>
        let opt_timestamp: Option<i64> = Option::deserialize(deserializer)?;

        match opt_timestamp {
            Some(ts) => {
                let dt = Utc.timestamp_opt(ts, 0)
                    .single()
                    .ok_or_else(|| D::Error::custom("invalid Unix timestamp"))?;
                Ok(Some(dt))
            }
            None => Ok(None),
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct Task {
    pub title: String,

    #[serde(
        serialize_with = "optional_unix_timestamp::serialize",
        deserialize_with = "optional_unix_timestamp::deserialize"
    )]
    pub completed_at: Option<DateTime<Utc>>,
}
```

---

## Creating a Reusable SerializeWith Type

For commonly used transformations, you can create a wrapper type that encapsulates the serialization logic:

```rust
use serde::{Serialize, Deserialize, Serializer, Deserializer};
use std::marker::PhantomData;

// Marker trait for serialization strategies
pub trait TimestampFormat {
    fn format(secs: i64) -> String;
    fn parse(s: &str) -> Result<i64, String>;
}

// Unix timestamp as integer
pub struct UnixSeconds;

impl TimestampFormat for UnixSeconds {
    fn format(secs: i64) -> String {
        secs.to_string()
    }

    fn parse(s: &str) -> Result<i64, String> {
        s.parse().map_err(|e| format!("invalid integer: {}", e))
    }
}

// Unix timestamp in milliseconds
pub struct UnixMillis;

impl TimestampFormat for UnixMillis {
    fn format(secs: i64) -> String {
        (secs * 1000).to_string()
    }

    fn parse(s: &str) -> Result<i64, String> {
        let millis: i64 = s.parse().map_err(|e| format!("invalid integer: {}", e))?;
        Ok(millis / 1000)
    }
}

// Generic timestamp wrapper
#[derive(Debug, Clone)]
pub struct Timestamp<F: TimestampFormat> {
    pub value: DateTime<Utc>,
    _format: PhantomData<F>,
}

impl<F: TimestampFormat> Timestamp<F> {
    pub fn new(value: DateTime<Utc>) -> Self {
        Self {
            value,
            _format: PhantomData,
        }
    }
}

impl<F: TimestampFormat> Serialize for Timestamp<F> {
    fn serialize<Ser>(&self, serializer: Ser) -> Result<Ser::Ok, Ser::Error>
    where
        Ser: Serializer,
    {
        serializer.serialize_i64(self.value.timestamp())
    }
}
```

---

## Implementing the Full Serialize Trait

Sometimes you need complete control. Here's how to implement `Serialize` manually for a complex type:

```rust
use serde::ser::{Serialize, Serializer, SerializeStruct};

// A type representing a money amount
pub struct Money {
    pub amount: i64,      // Stored in cents
    pub currency: String,
}

impl Serialize for Money {
    fn serialize<Ser>(&self, serializer: Ser) -> Result<Ser::Ok, Ser::Error>
    where
        Ser: Serializer,
    {
        // Serialize as a struct with custom field handling
        let mut state = serializer.serialize_struct("Money", 3)?;

        // Convert cents to decimal string for display
        let dollars = self.amount as f64 / 100.0;
        let formatted = format!("{:.2}", dollars);

        state.serialize_field("amount", &formatted)?;
        state.serialize_field("currency", &self.currency)?;

        // Add a computed field that doesn't exist on the struct
        state.serialize_field("display", &format!("{} {}", formatted, self.currency))?;

        state.end()
    }
}

// Serializes to:
// {
//   "amount": "19.99",
//   "currency": "USD",
//   "display": "19.99 USD"
// }
```

---

## Serializing Enums with Custom Representations

Enums often need special handling, especially when working with external APIs:

```rust
use serde::{Serialize, Serializer};

#[derive(Debug, Clone)]
pub enum Status {
    Pending,
    InProgress { progress: u8 },
    Completed,
    Failed { reason: String },
}

impl Serialize for Status {
    fn serialize<Ser>(&self, serializer: Ser) -> Result<Ser::Ok, Ser::Error>
    where
        Ser: Serializer,
    {
        use serde::ser::SerializeMap;

        // Serialize all variants as a map with "type" and optional data
        let mut map = serializer.serialize_map(None)?;

        match self {
            Status::Pending => {
                map.serialize_entry("type", "pending")?;
            }
            Status::InProgress { progress } => {
                map.serialize_entry("type", "in_progress")?;
                map.serialize_entry("progress", progress)?;
            }
            Status::Completed => {
                map.serialize_entry("type", "completed")?;
            }
            Status::Failed { reason } => {
                map.serialize_entry("type", "failed")?;
                map.serialize_entry("reason", reason)?;
            }
        }

        map.end()
    }
}
```

---

## Using serde_with for Common Patterns

Before writing custom serializers, check if `serde_with` already provides what you need:

```rust
use serde::{Serialize, Deserialize};
use serde_with::{serde_as, DisplayFromStr, TimestampSeconds};
use chrono::{DateTime, Utc};

#[serde_as]
#[derive(Serialize, Deserialize)]
pub struct Config {
    // Serialize numbers as strings
    #[serde_as(as = "DisplayFromStr")]
    pub port: u16,

    // Serialize DateTime as Unix timestamp
    #[serde_as(as = "TimestampSeconds<i64>")]
    pub last_updated: DateTime<Utc>,

    // Handle Vec of items serialized as comma-separated string
    #[serde_as(as = "serde_with::StringWithSeparator::<serde_with::CommaSeparator, String>")]
    pub tags: Vec<String>,
}
```

The `serde_with` crate handles many common transformations out of the box, saving you from writing boilerplate.

---

## Conditional Serialization

Sometimes you need to serialize fields differently based on runtime conditions:

```rust
use serde::{Serialize, Serializer};

pub struct User {
    pub id: u64,
    pub email: String,
    pub password_hash: String,  // Never expose this
    pub is_admin: bool,
}

// A wrapper that controls visibility
pub struct PublicUser<'a> {
    user: &'a User,
    include_admin_fields: bool,
}

impl<'a> PublicUser<'a> {
    pub fn new(user: &'a User, include_admin_fields: bool) -> Self {
        Self { user, include_admin_fields }
    }
}

impl<'a> Serialize for PublicUser<'a> {
    fn serialize<Ser>(&self, serializer: Ser) -> Result<Ser::Ok, Ser::Error>
    where
        Ser: Serializer,
    {
        use serde::ser::SerializeStruct;

        // Determine field count based on visibility
        let field_count = if self.include_admin_fields { 3 } else { 2 };
        let mut state = serializer.serialize_struct("User", field_count)?;

        // Always include these
        state.serialize_field("id", &self.user.id)?;
        state.serialize_field("email", &self.user.email)?;

        // password_hash is never serialized

        // Conditionally include admin fields
        if self.include_admin_fields {
            state.serialize_field("is_admin", &self.user.is_admin)?;
        }

        state.end()
    }
}
```

---

## Error Handling in Custom Serializers

Proper error handling makes debugging much easier:

```rust
use serde::{Serialize, Serializer};
use serde::ser::Error;

pub struct PositiveNumber(i64);

impl Serialize for PositiveNumber {
    fn serialize<Ser>(&self, serializer: Ser) -> Result<Ser::Ok, Ser::Error>
    where
        Ser: Serializer,
    {
        if self.0 < 0 {
            // Return a custom error with a clear message
            return Err(Ser::Error::custom(format!(
                "cannot serialize negative number: {}",
                self.0
            )));
        }

        serializer.serialize_i64(self.0)
    }
}
```

---

## Testing Custom Serializers

Always test your serializers with round-trip tests:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;

    #[test]
    fn test_money_serialization() {
        let money = Money {
            amount: 1999,
            currency: "USD".to_string(),
        };

        let json = serde_json::to_string(&money).unwrap();

        assert!(json.contains("\"amount\":\"19.99\""));
        assert!(json.contains("\"currency\":\"USD\""));
        assert!(json.contains("\"display\":\"19.99 USD\""));
    }

    #[test]
    fn test_timestamp_roundtrip() {
        let event = Event {
            name: "Test".to_string(),
            created_at: Utc::now(),
        };

        let json = serde_json::to_string(&event).unwrap();
        let restored: Event = serde_json::from_str(&json).unwrap();

        // Timestamps should match within a second (we lose sub-second precision)
        assert_eq!(
            event.created_at.timestamp(),
            restored.created_at.timestamp()
        );
    }
}
```

---

## When to Write Custom Serializers

Custom serializers make sense when:

1. **Format requirements differ from Rust types** - Unix timestamps, money formatting, etc.
2. **External APIs have specific expectations** - Snake case, camelCase, or flattened structures
3. **You need computed fields** - Fields that don't exist on the struct but should appear in output
4. **Security requirements** - Redacting sensitive fields based on context
5. **Performance optimization** - Avoiding intermediate allocations for large data

For simple transformations like renaming fields or changing case, serde's built-in attributes are usually sufficient:

```rust
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    #[serde(rename = "serverPort")]
    pub server_port: u16,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub optional_field: Option<String>,
}
```

---

## Summary

Custom serde serializers give you complete control over data transformation in Rust. Start with the `serialize_with` attribute for field-level customization, move to implementing `Serialize` directly when you need full control, and always consider `serde_with` before writing boilerplate.

The key patterns to remember:

- Use `serialize_with` for individual fields
- Implement `Serialize` for complex types
- Use `SerializeStruct` or `SerializeMap` for structured output
- Test with round-trips when possible
- Return meaningful errors with `S::Error::custom()`

With these techniques, you can make Rust types serialize to any format your systems require.

---

**Related Reading:**
- [Rust Performance Tips for Production Systems](https://oneuptime.com/blog/post/2026-01-25-high-performance-web-crawler-async-rust)
- [Building Reliable APIs with Rust](https://oneuptime.com/blog/post/2026-01-25-multi-tenant-apis-tenant-isolation-rust)
