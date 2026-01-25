# How to Use PhantomData in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, PhantomData, Type System, Generics, Zero-Cost Abstractions

Description: Learn how to use PhantomData in Rust for type-level programming. This guide covers phantom type parameters, variance, ownership markers, and practical use cases.

---

PhantomData is a zero-sized marker type that tells the compiler about type relationships that do not have runtime representation. It is used for type-level programming, ownership markers, and variance annotations without adding any memory overhead.

## What is PhantomData?

PhantomData lets you use type parameters in structs even when those types are not stored directly.

```rust
use std::marker::PhantomData;

// Without PhantomData, T is unused and causes an error
// struct Container<T> {
//     id: u64,
// }
// error[E0392]: parameter `T` is never used

// With PhantomData, T is "used" at the type level
struct Container<T> {
    id: u64,
    _marker: PhantomData<T>,
}

fn main() {
    let int_container: Container<i32> = Container {
        id: 1,
        _marker: PhantomData,
    };

    let str_container: Container<String> = Container {
        id: 2,
        _marker: PhantomData,
    };

    // These are different types even though they hold the same data
    // int_container = str_container;  // Error: mismatched types

    println!("Container IDs: {}, {}", int_container.id, str_container.id);
}
```

## Type State Pattern

PhantomData enables the type state pattern, where state transitions are enforced at compile time.

```rust
use std::marker::PhantomData;

// Type states
struct Locked;
struct Unlocked;

// Door with state parameter
struct Door<State> {
    name: String,
    _state: PhantomData<State>,
}

// Methods only available for Locked doors
impl Door<Locked> {
    fn new(name: &str) -> Self {
        Door {
            name: name.to_string(),
            _state: PhantomData,
        }
    }

    fn unlock(self) -> Door<Unlocked> {
        println!("{} door unlocked", self.name);
        Door {
            name: self.name,
            _state: PhantomData,
        }
    }
}

// Methods only available for Unlocked doors
impl Door<Unlocked> {
    fn lock(self) -> Door<Locked> {
        println!("{} door locked", self.name);
        Door {
            name: self.name,
            _state: PhantomData,
        }
    }

    fn open(&self) {
        println!("{} door opened", self.name);
    }

    fn close(&self) {
        println!("{} door closed", self.name);
    }
}

fn main() {
    let door = Door::<Locked>::new("Front");

    // door.open();  // Error: open() not available for Locked

    let door = door.unlock();
    door.open();
    door.close();

    let door = door.lock();
    // door.open();  // Error: open() not available for Locked
}
```

## Ownership and Lifetime Markers

PhantomData can indicate ownership semantics without storing data.

```rust
use std::marker::PhantomData;

// Pointer wrapper that "owns" the data it points to
struct Owned<T> {
    ptr: *const T,
    _marker: PhantomData<T>,  // Indicates T is owned
}

// Pointer wrapper that borrows data
struct Borrowed<'a, T> {
    ptr: *const T,
    _marker: PhantomData<&'a T>,  // Indicates T is borrowed
}

impl<T> Owned<T> {
    fn new(value: T) -> Self {
        let boxed = Box::new(value);
        Owned {
            ptr: Box::into_raw(boxed),
            _marker: PhantomData,
        }
    }
}

impl<T> Drop for Owned<T> {
    fn drop(&mut self) {
        // Owned drops the value
        unsafe {
            drop(Box::from_raw(self.ptr as *mut T));
        }
    }
}

impl<'a, T> Borrowed<'a, T> {
    fn new(value: &'a T) -> Self {
        Borrowed {
            ptr: value as *const T,
            _marker: PhantomData,
        }
    }
}

fn main() {
    let owned = Owned::new(42);
    println!("Owned created");

    let value = 100;
    let borrowed = Borrowed::new(&value);
    println!("Borrowed created");

    // owned will be dropped and free memory
    // borrowed will not free anything
}
```

## Variance Control

PhantomData affects how type parameters relate across assignments.

```rust
use std::marker::PhantomData;

// Covariant: if 'a: 'b, then Covariant<'a> can be used where Covariant<'b> is expected
struct Covariant<'a, T: 'a> {
    _marker: PhantomData<&'a T>,
}

// Contravariant: opposite direction
struct Contravariant<'a, T: 'a> {
    _marker: PhantomData<fn(&'a T)>,
}

// Invariant: no subtyping relationship
struct Invariant<'a, T: 'a> {
    _marker: PhantomData<fn(&'a T) -> &'a T>,
}

// Owned semantics (covariant over T, drop check)
struct OwnedMarker<T> {
    _marker: PhantomData<T>,
}

// Borrowed semantics (covariant)
struct BorrowedMarker<'a, T: 'a> {
    _marker: PhantomData<&'a T>,
}

fn main() {
    println!("Variance markers don't have runtime representation");
}
```

## Unit Type Markers

Create distinct types from the same underlying structure.

```rust
use std::marker::PhantomData;

// Unit types as markers
struct Meters;
struct Feet;
struct Seconds;

// Generic measurement with unit marker
struct Measurement<Unit> {
    value: f64,
    _unit: PhantomData<Unit>,
}

impl<Unit> Measurement<Unit> {
    fn new(value: f64) -> Self {
        Measurement {
            value,
            _unit: PhantomData,
        }
    }

    fn value(&self) -> f64 {
        self.value
    }
}

// Conversion methods only between compatible units
impl Measurement<Meters> {
    fn to_feet(self) -> Measurement<Feet> {
        Measurement::new(self.value * 3.28084)
    }
}

impl Measurement<Feet> {
    fn to_meters(self) -> Measurement<Meters> {
        Measurement::new(self.value / 3.28084)
    }
}

// Type-safe operations
impl<Unit> std::ops::Add for Measurement<Unit> {
    type Output = Self;

    fn add(self, other: Self) -> Self {
        Measurement::new(self.value + other.value)
    }
}

fn main() {
    let distance_m = Measurement::<Meters>::new(100.0);
    let distance_ft = distance_m.to_feet();

    println!("Distance: {} feet", distance_ft.value());

    let a = Measurement::<Meters>::new(10.0);
    let b = Measurement::<Meters>::new(20.0);
    let sum = a + b;
    println!("Sum: {} meters", sum.value());

    // Cannot add meters and feet
    // let invalid = Measurement::<Meters>::new(10.0) + Measurement::<Feet>::new(20.0);
}
```

## Database Connection Example

```rust
use std::marker::PhantomData;

// Connection states
struct NotConnected;
struct Connected;
struct InTransaction;

struct Database<State> {
    connection_string: String,
    _state: PhantomData<State>,
}

impl Database<NotConnected> {
    fn new(connection_string: &str) -> Self {
        Database {
            connection_string: connection_string.to_string(),
            _state: PhantomData,
        }
    }

    fn connect(self) -> Result<Database<Connected>, String> {
        println!("Connecting to {}", self.connection_string);
        Ok(Database {
            connection_string: self.connection_string,
            _state: PhantomData,
        })
    }
}

impl Database<Connected> {
    fn query(&self, sql: &str) {
        println!("Executing: {}", sql);
    }

    fn begin_transaction(self) -> Database<InTransaction> {
        println!("Beginning transaction");
        Database {
            connection_string: self.connection_string,
            _state: PhantomData,
        }
    }

    fn disconnect(self) -> Database<NotConnected> {
        println!("Disconnecting");
        Database {
            connection_string: self.connection_string,
            _state: PhantomData,
        }
    }
}

impl Database<InTransaction> {
    fn query(&self, sql: &str) {
        println!("Executing in transaction: {}", sql);
    }

    fn commit(self) -> Database<Connected> {
        println!("Committing transaction");
        Database {
            connection_string: self.connection_string,
            _state: PhantomData,
        }
    }

    fn rollback(self) -> Database<Connected> {
        println!("Rolling back transaction");
        Database {
            connection_string: self.connection_string,
            _state: PhantomData,
        }
    }
}

fn main() {
    let db = Database::<NotConnected>::new("postgres://localhost/mydb");

    // db.query("SELECT 1");  // Error: query not available for NotConnected

    let db = db.connect().unwrap();
    db.query("SELECT * FROM users");

    let db = db.begin_transaction();
    db.query("INSERT INTO users VALUES (1, 'Alice')");
    let db = db.commit();

    let _ = db.disconnect();
}
```

## Builder Pattern with PhantomData

```rust
use std::marker::PhantomData;

// Builder states
struct NoName;
struct HasName;
struct NoEmail;
struct HasEmail;

struct UserBuilder<NameState, EmailState> {
    name: Option<String>,
    email: Option<String>,
    age: Option<u32>,
    _name_state: PhantomData<NameState>,
    _email_state: PhantomData<EmailState>,
}

impl UserBuilder<NoName, NoEmail> {
    fn new() -> Self {
        UserBuilder {
            name: None,
            email: None,
            age: None,
            _name_state: PhantomData,
            _email_state: PhantomData,
        }
    }
}

impl<E> UserBuilder<NoName, E> {
    fn name(self, name: &str) -> UserBuilder<HasName, E> {
        UserBuilder {
            name: Some(name.to_string()),
            email: self.email,
            age: self.age,
            _name_state: PhantomData,
            _email_state: PhantomData,
        }
    }
}

impl<N> UserBuilder<N, NoEmail> {
    fn email(self, email: &str) -> UserBuilder<N, HasEmail> {
        UserBuilder {
            name: self.name,
            email: Some(email.to_string()),
            age: self.age,
            _name_state: PhantomData,
            _email_state: PhantomData,
        }
    }
}

impl<N, E> UserBuilder<N, E> {
    fn age(mut self, age: u32) -> Self {
        self.age = Some(age);
        self
    }
}

// build() only available when both name and email are set
impl UserBuilder<HasName, HasEmail> {
    fn build(self) -> User {
        User {
            name: self.name.unwrap(),
            email: self.email.unwrap(),
            age: self.age,
        }
    }
}

struct User {
    name: String,
    email: String,
    age: Option<u32>,
}

fn main() {
    let user = UserBuilder::new()
        .name("Alice")
        .age(30)
        .email("alice@example.com")
        .build();

    println!("User: {} <{}>", user.name, user.email);

    // This would not compile - missing email
    // let invalid = UserBuilder::new()
    //     .name("Bob")
    //     .build();  // Error: build() not available
}
```

## Summary

PhantomData enables type-level programming without runtime cost:

| Use Case | PhantomData Pattern |
|----------|---------------------|
| Unused type parameter | `PhantomData<T>` |
| Ownership semantics | `PhantomData<T>` (drop check) |
| Borrowed semantics | `PhantomData<&'a T>` |
| Type state machine | States as phantom types |
| Unit types | Marker structs in PhantomData |
| Variance control | Various PhantomData patterns |

Key points:

- PhantomData has zero size
- It affects type checking without runtime impact
- Use it for the type state pattern
- Use it to mark ownership or borrowing
- Use it for unit type markers (like measurement units)

PhantomData is a powerful tool for encoding invariants in the type system, catching errors at compile time instead of runtime.
