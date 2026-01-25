# How to Extend Protocol Buffers with prost in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Protocol Buffers, prost, Serialization, gRPC

Description: A hands-on guide to extending Protocol Buffer messages with custom behavior in Rust using the prost library, covering derive macros, custom implementations, and real-world patterns.

---

Protocol Buffers (protobuf) provide a language-neutral way to serialize structured data. When working with Rust, the `prost` crate is the go-to solution for generating Rust code from `.proto` files. But generated code is just the starting point. In real applications, you often need to add custom methods, implement traits, or extend the generated structs in ways that survive code regeneration.

This guide walks through practical techniques for extending prost-generated types while keeping your codebase maintainable.

## Setting Up Your Project

First, add the necessary dependencies to your `Cargo.toml`:

```toml
[dependencies]
prost = "0.12"
prost-types = "0.12"

[build-dependencies]
prost-build = "0.12"
```

Create a basic proto file at `proto/user.proto`:

```protobuf
syntax = "proto3";

package myapp;

message User {
    string id = 1;
    string email = 2;
    string name = 3;
    int64 created_at = 4;
    repeated string roles = 5;
}

message UserList {
    repeated User users = 1;
}
```

Your `build.rs` should compile the proto file:

```rust
fn main() -> Result<(), Box<dyn std::error::Error>> {
    prost_build::compile_protos(&["proto/user.proto"], &["proto/"])?;
    Ok(())
}
```

## The Extension Pattern

The key insight is that prost generates plain Rust structs. You can extend them using Rust's `impl` blocks in a separate file. This keeps your custom code separate from generated code.

Create a file called `src/user_ext.rs`:

```rust
use crate::myapp::User;

impl User {
    // Create a new user with default timestamp
    pub fn new(id: impl Into<String>, email: impl Into<String>, name: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            email: email.into(),
            name: name.into(),
            created_at: chrono::Utc::now().timestamp(),
            roles: Vec::new(),
        }
    }

    // Check if user has a specific role
    pub fn has_role(&self, role: &str) -> bool {
        self.roles.iter().any(|r| r == role)
    }

    // Add a role if not already present
    pub fn add_role(&mut self, role: impl Into<String>) {
        let role = role.into();
        if !self.has_role(&role) {
            self.roles.push(role);
        }
    }

    // Validate the user data
    pub fn validate(&self) -> Result<(), ValidationError> {
        if self.id.is_empty() {
            return Err(ValidationError::MissingField("id"));
        }
        if !self.email.contains('@') {
            return Err(ValidationError::InvalidEmail);
        }
        if self.name.len() < 2 {
            return Err(ValidationError::NameTooShort);
        }
        Ok(())
    }
}

#[derive(Debug)]
pub enum ValidationError {
    MissingField(&'static str),
    InvalidEmail,
    NameTooShort,
}
```

## Adding Custom Derives with prost-build

You can configure prost-build to add derives and attributes to generated types. This is useful for adding serialization traits, database mappings, or debug formatting:

```rust
// build.rs
use prost_build::Config;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut config = Config::new();

    // Add derives to all generated types
    config.type_attribute(".", "#[derive(serde::Serialize, serde::Deserialize)]");

    // Add derives to specific types
    config.type_attribute("myapp.User", "#[derive(Hash, Eq)]");

    // Add field attributes for serde customization
    config.field_attribute("myapp.User.email", "#[serde(skip_serializing_if = \"String::is_empty\")]");

    config.compile_protos(&["proto/user.proto"], &["proto/"])?;
    Ok(())
}
```

## Implementing Traits for Proto Types

Sometimes you need your proto types to implement specific traits. Here are common patterns:

### Display Trait

```rust
use std::fmt;
use crate::myapp::User;

impl fmt::Display for User {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "User({}, {})", self.id, self.email)
    }
}
```

### From and Into Conversions

Converting between proto types and your domain types keeps your business logic clean:

```rust
// Your domain type
pub struct DomainUser {
    pub id: uuid::Uuid,
    pub email: String,
    pub display_name: String,
    pub permissions: Vec<Permission>,
}

impl TryFrom<User> for DomainUser {
    type Error = ConversionError;

    fn try_from(proto: User) -> Result<Self, Self::Error> {
        Ok(DomainUser {
            id: uuid::Uuid::parse_str(&proto.id)
                .map_err(|_| ConversionError::InvalidUuid)?,
            email: proto.email,
            display_name: proto.name,
            permissions: proto.roles
                .into_iter()
                .filter_map(|r| Permission::from_str(&r).ok())
                .collect(),
        })
    }
}

impl From<DomainUser> for User {
    fn from(domain: DomainUser) -> Self {
        User {
            id: domain.id.to_string(),
            email: domain.email,
            name: domain.display_name,
            created_at: 0, // Set appropriately
            roles: domain.permissions.iter().map(|p| p.to_string()).collect(),
        }
    }
}
```

## Working with Nested Types

When proto messages contain other messages, you can extend both and have them work together:

```rust
use crate::myapp::{User, UserList};

impl UserList {
    // Find a user by ID
    pub fn find_by_id(&self, id: &str) -> Option<&User> {
        self.users.iter().find(|u| u.id == id)
    }

    // Filter users by role
    pub fn with_role(&self, role: &str) -> Vec<&User> {
        self.users.iter().filter(|u| u.has_role(role)).collect()
    }

    // Get all unique roles across users
    pub fn all_roles(&self) -> Vec<&str> {
        let mut roles: Vec<&str> = self.users
            .iter()
            .flat_map(|u| u.roles.iter().map(|s| s.as_str()))
            .collect();
        roles.sort();
        roles.dedup();
        roles
    }

    // Validate all users
    pub fn validate_all(&self) -> Result<(), Vec<(usize, ValidationError)>> {
        let errors: Vec<_> = self.users
            .iter()
            .enumerate()
            .filter_map(|(i, u)| u.validate().err().map(|e| (i, e)))
            .collect();

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}
```

## Handling Optional Fields

Proto3 uses wrapper types for optional primitives. Here is how to work with them ergonomically:

```protobuf
syntax = "proto3";

import "google/protobuf/wrappers.proto";

message Profile {
    string user_id = 1;
    google.protobuf.StringValue bio = 2;
    google.protobuf.Int32Value age = 3;
}
```

Extend with helper methods:

```rust
use crate::myapp::Profile;

impl Profile {
    // Get bio with a default
    pub fn bio_or_default(&self) -> &str {
        self.bio.as_ref().map(|w| w.value.as_str()).unwrap_or("")
    }

    // Set bio from an Option
    pub fn set_bio(&mut self, bio: Option<String>) {
        self.bio = bio.map(|value| prost_types::StringValue { value });
    }

    // Check if profile is complete
    pub fn is_complete(&self) -> bool {
        self.bio.is_some() && self.age.is_some()
    }
}
```

## Builder Pattern for Complex Messages

For messages with many fields, a builder pattern makes construction cleaner:

```rust
use crate::myapp::User;

pub struct UserBuilder {
    user: User,
}

impl UserBuilder {
    pub fn new(id: impl Into<String>) -> Self {
        Self {
            user: User {
                id: id.into(),
                ..Default::default()
            },
        }
    }

    pub fn email(mut self, email: impl Into<String>) -> Self {
        self.user.email = email.into();
        self
    }

    pub fn name(mut self, name: impl Into<String>) -> Self {
        self.user.name = name.into();
        self
    }

    pub fn role(mut self, role: impl Into<String>) -> Self {
        self.user.roles.push(role.into());
        self
    }

    pub fn roles(mut self, roles: impl IntoIterator<Item = impl Into<String>>) -> Self {
        self.user.roles.extend(roles.into_iter().map(|r| r.into()));
        self
    }

    pub fn build(self) -> Result<User, ValidationError> {
        self.user.validate()?;
        Ok(self.user)
    }
}

// Usage
impl User {
    pub fn builder(id: impl Into<String>) -> UserBuilder {
        UserBuilder::new(id)
    }
}
```

Now you can create users like this:

```rust
let user = User::builder("user-123")
    .email("alice@example.com")
    .name("Alice Smith")
    .roles(["admin", "editor"])
    .build()?;
```

## Testing Your Extensions

Test your extensions like any other Rust code:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_role_management() {
        let mut user = User::new("1", "test@example.com", "Test User");

        assert!(!user.has_role("admin"));

        user.add_role("admin");
        assert!(user.has_role("admin"));

        // Adding duplicate role should not create duplicates
        user.add_role("admin");
        assert_eq!(user.roles.len(), 1);
    }

    #[test]
    fn test_user_validation() {
        let user = User {
            id: String::new(),
            email: "invalid".into(),
            name: "A".into(),
            ..Default::default()
        };

        assert!(user.validate().is_err());
    }
}
```

## Wrapping Up

Extending prost-generated types lets you add business logic, validation, and ergonomic APIs to your Protocol Buffer messages without modifying generated code. The key patterns are:

1. Use separate extension files with `impl` blocks
2. Configure prost-build to add derives and attributes
3. Implement standard traits like `Display`, `From`, and `TryFrom`
4. Create builders for complex message construction
5. Add validation methods that fit your domain rules

This approach keeps your proto definitions focused on data structure while letting you write idiomatic Rust around them. When you regenerate code after proto changes, your extensions stay intact and the compiler tells you exactly what needs updating.
