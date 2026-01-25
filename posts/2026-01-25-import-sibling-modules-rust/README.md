# How to Import Sibling Modules in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Modules, Project Structure, Imports, Organization

Description: Learn how to properly import sibling modules in Rust projects. Understand the module system, use statements, and project organization for clean code structure.

---

Rust's module system can be confusing when you need to import code from sibling modules. This guide explains how modules work and shows you the correct patterns for importing between them.

## Module Basics

Every Rust file is a module. The module hierarchy follows your file structure:

```
src/
  main.rs       # Root module (crate)
  lib.rs        # Library root (if library crate)
  models/
    mod.rs      # models module
    user.rs     # models::user submodule
    product.rs  # models::product submodule
  services/
    mod.rs      # services module
    auth.rs     # services::auth submodule
```

## Declaring Submodules

In `mod.rs` or the parent module, declare submodules:

```rust
// src/models/mod.rs
pub mod user;      // Declares models::user from user.rs
pub mod product;   // Declares models::product from product.rs

// Re-export commonly used items for convenience
pub use user::User;
pub use product::Product;
```

## Importing Sibling Modules

### From the Root Module

In `main.rs` or `lib.rs`, declare top-level modules:

```rust
// src/main.rs
mod models;    // Declares the models module
mod services;  // Declares the services module

use models::User;
use services::auth;

fn main() {
    let user = User::new("Alice");
    auth::login(&user);
}
```

### Between Sibling Modules

To import from a sibling module, use `crate::` or `super::`:

```rust
// src/services/auth.rs
// Import from sibling 'models' module using crate path
use crate::models::User;

pub fn login(user: &User) {
    println!("Logging in: {}", user.name);
}

pub fn validate(user: &User) -> bool {
    !user.name.is_empty()
}
```

```rust
// src/models/user.rs
#[derive(Debug)]
pub struct User {
    pub name: String,
    pub email: String,
}

impl User {
    pub fn new(name: &str) -> Self {
        User {
            name: name.to_string(),
            email: String::new(),
        }
    }
}
```

## Using super for Parent Module

Use `super` to refer to the parent module:

```rust
// src/models/product.rs
use super::user::User;  // Import from sibling via parent

pub struct Product {
    pub name: String,
    pub owner: User,
}
```

```rust
// src/models/mod.rs
pub mod user;
pub mod product;

// Within mod.rs, access children directly
use user::User;
use product::Product;

pub fn create_owned_product(owner: &User, name: &str) -> Product {
    Product {
        name: name.to_string(),
        owner: User::new(&owner.name),
    }
}
```

## Complete Project Example

Here is a full project structure showing module imports:

```
src/
  main.rs
  lib.rs
  config.rs
  models/
    mod.rs
    user.rs
    order.rs
  services/
    mod.rs
    user_service.rs
    order_service.rs
  utils/
    mod.rs
    helpers.rs
```

```rust
// src/lib.rs - Library root
pub mod config;
pub mod models;
pub mod services;
pub mod utils;
```

```rust
// src/main.rs - Binary root
use myproject::config::Config;
use myproject::models::User;
use myproject::services::user_service;

fn main() {
    let config = Config::load();
    let user = User::new("Alice");

    user_service::register(&user);
    println!("Config: {:?}", config);
}
```

```rust
// src/config.rs
#[derive(Debug)]
pub struct Config {
    pub database_url: String,
    pub port: u16,
}

impl Config {
    pub fn load() -> Self {
        Config {
            database_url: "localhost:5432".to_string(),
            port: 8080,
        }
    }
}
```

```rust
// src/models/mod.rs
pub mod user;
pub mod order;

pub use user::User;
pub use order::Order;
```

```rust
// src/models/user.rs
#[derive(Debug, Clone)]
pub struct User {
    pub id: u64,
    pub name: String,
}

impl User {
    pub fn new(name: &str) -> Self {
        User {
            id: 0,
            name: name.to_string(),
        }
    }
}
```

```rust
// src/models/order.rs
use super::user::User;  // Sibling import via super

#[derive(Debug)]
pub struct Order {
    pub id: u64,
    pub user: User,
    pub total: f64,
}

impl Order {
    pub fn new(user: User, total: f64) -> Self {
        Order { id: 0, user, total }
    }
}
```

```rust
// src/services/mod.rs
pub mod user_service;
pub mod order_service;
```

```rust
// src/services/user_service.rs
use crate::models::User;  // Import from sibling top-level module
use crate::utils::helpers;

pub fn register(user: &User) {
    let validated = helpers::validate_name(&user.name);
    if validated {
        println!("Registered user: {}", user.name);
    }
}

pub fn find_by_id(id: u64) -> Option<User> {
    // Simulated lookup
    if id > 0 {
        Some(User { id, name: "Found".to_string() })
    } else {
        None
    }
}
```

```rust
// src/services/order_service.rs
use crate::models::{Order, User};
use super::user_service;  // Import sibling service via super

pub fn create_order(user_id: u64, total: f64) -> Option<Order> {
    user_service::find_by_id(user_id)
        .map(|user| Order::new(user, total))
}
```

```rust
// src/utils/mod.rs
pub mod helpers;
```

```rust
// src/utils/helpers.rs
pub fn validate_name(name: &str) -> bool {
    !name.is_empty() && name.len() < 100
}

pub fn format_currency(amount: f64) -> String {
    format!("${:.2}", amount)
}
```

## Import Path Summary

| From | To | Path |
|------|-----|------|
| main.rs | models::User | `crate::models::User` or `models::User` |
| services/auth.rs | models::User | `crate::models::User` |
| models/order.rs | models::user::User | `super::user::User` |
| services/order_service.rs | services::user_service | `super::user_service` |

## Visibility Rules

Control what can be imported with visibility modifiers:

```rust
// src/models/user.rs
pub struct User {           // Public to everyone
    pub name: String,       // Public field
    pub(crate) id: u64,     // Public within crate only
    email: String,          // Private to this module
}

pub(super) fn internal_helper() {
    // Only visible to parent module (models)
}

pub(in crate::models) fn models_only() {
    // Only visible within models module tree
}
```

## Re-exports for Clean APIs

Re-export items to flatten module hierarchies:

```rust
// src/models/mod.rs
mod user;
mod order;

// Re-export at module level
pub use user::User;
pub use order::Order;

// Now users can do:
// use crate::models::User;
// Instead of:
// use crate::models::user::User;
```

## Common Mistakes

### Mistake 1: Forgetting mod Declaration

```rust
// src/main.rs
// This won't work without declaring the module
// use models::User;  // Error: unresolved import

mod models;  // Must declare first
use models::User;  // Now it works
```

### Mistake 2: Wrong Path from Nested Module

```rust
// src/services/auth.rs
// Wrong: models is not a child of services
// use super::models::User;

// Correct: use crate path
use crate::models::User;
```

### Mistake 3: Circular Dependencies

```rust
// Avoid circular imports
// models/user.rs imports services/auth.rs
// services/auth.rs imports models/user.rs
// This can cause issues

// Solution: restructure or use traits
```

## Summary

- Use `mod` to declare submodules
- Use `crate::` for absolute paths from crate root
- Use `super::` for relative paths to parent
- Use `self::` for current module (rarely needed)
- Re-export with `pub use` for cleaner APIs
- Control visibility with `pub`, `pub(crate)`, `pub(super)`

Understanding the module system takes practice, but following these patterns will help you organize Rust projects correctly.
