# How to Use serde for Serialization in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Serde, JSON, Serialization, Data Formats

Description: A comprehensive guide to using serde for serialization and deserialization in Rust. Learn derive macros, attributes, custom serializers, and working with JSON, YAML, and other formats.

---

Serde is Rust's most popular serialization framework. It provides a powerful and flexible way to convert Rust data structures to and from various data formats like JSON, YAML, TOML, and more. This guide covers everything from basic usage to advanced customization.

## Getting Started

Add serde and a format-specific crate to your `Cargo.toml`:

```toml
[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

## Basic Serialization

Use the derive macros to automatically implement Serialize and Deserialize.

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
struct User {
    name: String,
    age: u32,
    email: String,
}

fn main() {
    // Create a user
    let user = User {
        name: String::from("Alice"),
        age: 30,
        email: String::from("alice@example.com"),
    };

    // Serialize to JSON string
    let json = serde_json::to_string(&user).unwrap();
    println!("Serialized: {}", json);

    // Pretty print JSON
    let pretty = serde_json::to_string_pretty(&user).unwrap();
    println!("Pretty:\n{}", pretty);

    // Deserialize from JSON
    let json_str = r#"{"name":"Bob","age":25,"email":"bob@example.com"}"#;
    let bob: User = serde_json::from_str(json_str).unwrap();
    println!("Deserialized: {:?}", bob);
}
```

## Struct Attributes

Serde provides attributes to customize serialization behavior.

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]  // Convert field names to camelCase
struct ApiResponse {
    user_id: u64,
    first_name: String,
    last_name: String,
    is_active: bool,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(deny_unknown_fields)]  // Fail if JSON has extra fields
struct StrictConfig {
    host: String,
    port: u16,
}

fn main() {
    let response = ApiResponse {
        user_id: 123,
        first_name: String::from("Alice"),
        last_name: String::from("Smith"),
        is_active: true,
    };

    let json = serde_json::to_string(&response).unwrap();
    println!("{}", json);
    // Output: {"userId":123,"firstName":"Alice","lastName":"Smith","isActive":true}

    // This will fail due to unknown field
    let bad_json = r#"{"host":"localhost","port":8080,"unknown":"value"}"#;
    let result: Result<StrictConfig, _> = serde_json::from_str(bad_json);
    println!("Parse result: {:?}", result.is_err());
}
```

## Field Attributes

Control individual field serialization.

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
struct Person {
    name: String,

    #[serde(rename = "years_old")]
    age: u32,

    #[serde(skip_serializing_if = "Option::is_none")]
    nickname: Option<String>,

    #[serde(default)]
    verified: bool,

    #[serde(skip)]  // Never serialize or deserialize
    internal_id: u64,

    #[serde(alias = "mail", alias = "email_address")]
    email: String,
}

fn main() {
    let person = Person {
        name: String::from("Alice"),
        age: 30,
        nickname: None,
        verified: true,
        internal_id: 12345,
        email: String::from("alice@example.com"),
    };

    let json = serde_json::to_string(&person).unwrap();
    println!("{}", json);
    // nickname is omitted, internal_id is skipped

    // Deserialize with alias
    let json = r#"{"name":"Bob","years_old":25,"mail":"bob@example.com"}"#;
    let bob: Person = serde_json::from_str(json).unwrap();
    println!("{:?}", bob);  // verified defaults to false
}
```

## Enums

Serde supports multiple enum representations.

```rust
use serde::{Deserialize, Serialize};

// Default: externally tagged
#[derive(Serialize, Deserialize, Debug)]
enum Message {
    Text(String),
    Number(i32),
    Coords { x: f64, y: f64 },
}

// Internally tagged
#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
enum Event {
    Click { x: i32, y: i32 },
    KeyPress { key: String },
}

// Adjacently tagged
#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "t", content = "c")]
enum Response {
    Success(String),
    Error { code: i32, message: String },
}

// Untagged - tries each variant in order
#[derive(Serialize, Deserialize, Debug)]
#[serde(untagged)]
enum Value {
    Integer(i64),
    Float(f64),
    Text(String),
}

fn main() {
    // Externally tagged
    let msg = Message::Coords { x: 1.0, y: 2.0 };
    println!("{}", serde_json::to_string(&msg).unwrap());
    // {"Coords":{"x":1.0,"y":2.0}}

    // Internally tagged
    let event = Event::Click { x: 100, y: 200 };
    println!("{}", serde_json::to_string(&event).unwrap());
    // {"type":"Click","x":100,"y":200}

    // Adjacently tagged
    let resp = Response::Error { code: 404, message: "Not found".to_string() };
    println!("{}", serde_json::to_string(&resp).unwrap());
    // {"t":"Error","c":{"code":404,"message":"Not found"}}

    // Untagged
    let val: Value = serde_json::from_str("42").unwrap();
    println!("{:?}", val);  // Integer(42)
}
```

## Custom Default Values

Provide default values for missing fields.

```rust
use serde::{Deserialize, Serialize};

fn default_port() -> u16 {
    8080
}

fn default_enabled() -> bool {
    true
}

#[derive(Serialize, Deserialize, Debug)]
struct ServerConfig {
    host: String,

    #[serde(default = "default_port")]
    port: u16,

    #[serde(default = "default_enabled")]
    enabled: bool,

    #[serde(default)]  // Uses Default trait
    max_connections: u32,
}

fn main() {
    let json = r#"{"host":"localhost"}"#;
    let config: ServerConfig = serde_json::from_str(json).unwrap();

    println!("{:?}", config);
    // ServerConfig { host: "localhost", port: 8080, enabled: true, max_connections: 0 }
}
```

## Working with Optional and Nullable Fields

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
struct Profile {
    name: String,

    // None if field is missing
    #[serde(default)]
    bio: Option<String>,

    // Distinguishes between missing and null
    #[serde(default, skip_serializing_if = "Option::is_none")]
    website: Option<String>,

    // Use custom deserializer for special null handling
    #[serde(deserialize_with = "deserialize_null_default")]
    score: i32,
}

// Custom deserializer that treats null as default
fn deserialize_null_default<'de, D, T>(deserializer: D) -> Result<T, D::Error>
where
    D: serde::Deserializer<'de>,
    T: Default + Deserialize<'de>,
{
    let opt = Option::deserialize(deserializer)?;
    Ok(opt.unwrap_or_default())
}

fn main() {
    let json = r#"{"name":"Alice","bio":null,"score":null}"#;
    let profile: Profile = serde_json::from_str(json).unwrap();
    println!("{:?}", profile);
    // Profile { name: "Alice", bio: None, website: None, score: 0 }
}
```

## Custom Serialization

Implement custom serialize/deserialize functions for complex cases.

```rust
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[derive(Debug)]
struct Timestamp(SystemTime);

impl Serialize for Timestamp {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let duration = self.0.duration_since(UNIX_EPOCH).unwrap();
        serializer.serialize_u64(duration.as_secs())
    }
}

impl<'de> Deserialize<'de> for Timestamp {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let secs = u64::deserialize(deserializer)?;
        let time = UNIX_EPOCH + Duration::from_secs(secs);
        Ok(Timestamp(time))
    }
}

// Using serialize_with and deserialize_with attributes
mod date_format {
    use serde::{self, Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(date: &str, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&format!("DATE:{}", date))
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<String, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        Ok(s.trim_start_matches("DATE:").to_string())
    }
}

#[derive(Serialize, Deserialize, Debug)]
struct Event {
    name: String,
    #[serde(with = "date_format")]
    date: String,
    created_at: Timestamp,
}

fn main() {
    let event = Event {
        name: String::from("Meeting"),
        date: String::from("2024-01-15"),
        created_at: Timestamp(SystemTime::now()),
    };

    let json = serde_json::to_string_pretty(&event).unwrap();
    println!("{}", json);
}
```

## Flatten Nested Structures

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug)]
struct Metadata {
    created_by: String,
    version: u32,
}

#[derive(Serialize, Deserialize, Debug)]
struct Document {
    title: String,
    content: String,

    #[serde(flatten)]
    metadata: Metadata,

    #[serde(flatten)]
    extra: HashMap<String, serde_json::Value>,
}

fn main() {
    let json = r#"{
        "title": "My Doc",
        "content": "Hello world",
        "created_by": "Alice",
        "version": 1,
        "custom_field": "extra data"
    }"#;

    let doc: Document = serde_json::from_str(json).unwrap();
    println!("{:?}", doc);

    // Serialize flattens the nested structure
    let output = serde_json::to_string_pretty(&doc).unwrap();
    println!("{}", output);
}
```

## Working with Other Formats

Serde works with many formats beyond JSON.

```toml
[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
serde_yaml = "0.9"
toml = "0.8"
```

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
struct Config {
    database: DatabaseConfig,
    server: ServerConfig,
}

#[derive(Serialize, Deserialize, Debug)]
struct DatabaseConfig {
    host: String,
    port: u16,
    name: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct ServerConfig {
    host: String,
    port: u16,
}

fn main() {
    let config = Config {
        database: DatabaseConfig {
            host: String::from("localhost"),
            port: 5432,
            name: String::from("mydb"),
        },
        server: ServerConfig {
            host: String::from("0.0.0.0"),
            port: 8080,
        },
    };

    // JSON
    let json = serde_json::to_string_pretty(&config).unwrap();
    println!("JSON:\n{}\n", json);

    // YAML
    let yaml = serde_yaml::to_string(&config).unwrap();
    println!("YAML:\n{}\n", yaml);

    // TOML
    let toml_str = toml::to_string_pretty(&config).unwrap();
    println!("TOML:\n{}", toml_str);
}
```

## Error Handling

Handle serialization errors properly.

```rust
use serde::{Deserialize, Serialize};
use serde_json::Error;

#[derive(Serialize, Deserialize, Debug)]
struct User {
    name: String,
    age: u32,
}

fn parse_user(json: &str) -> Result<User, Error> {
    serde_json::from_str(json)
}

fn main() {
    // Valid JSON
    match parse_user(r#"{"name":"Alice","age":30}"#) {
        Ok(user) => println!("Parsed: {:?}", user),
        Err(e) => println!("Error: {}", e),
    }

    // Invalid JSON - missing field
    match parse_user(r#"{"name":"Bob"}"#) {
        Ok(user) => println!("Parsed: {:?}", user),
        Err(e) => println!("Error: {}", e),
    }

    // Invalid JSON - wrong type
    match parse_user(r#"{"name":"Charlie","age":"thirty"}"#) {
        Ok(user) => println!("Parsed: {:?}", user),
        Err(e) => println!("Error: {}", e),
    }
}
```

## Summary

Serde provides powerful serialization capabilities:

- Derive macros automatically implement Serialize and Deserialize
- Attributes customize field names, skip fields, set defaults
- Enum representations include multiple tagging strategies
- Custom serializers handle complex types and formats
- Format agnostic design works with JSON, YAML, TOML, and more

Key patterns to remember:

- Use `#[serde(rename_all = "camelCase")]` for API compatibility
- Use `#[serde(skip_serializing_if)]` to omit None values
- Use `#[serde(flatten)]` to merge nested structures
- Use `#[serde(default)]` for optional fields with defaults

Serde is essential for any Rust application that needs to exchange data with external systems or persist configuration.
