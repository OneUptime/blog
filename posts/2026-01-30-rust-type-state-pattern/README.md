# How to Create Type-State Pattern in Rust

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Rust, Design Patterns, Type System, Safety

Description: Implement the type-state pattern in Rust to encode state transitions in the type system, preventing invalid state sequences at compile time.

---

## Introduction

The type-state pattern is a technique where you encode the state of an object directly into its type. This means the compiler enforces valid state transitions, and invalid sequences become impossible to express in code. If you try to call a method on an object in the wrong state, the code simply won't compile.

This pattern is particularly powerful in Rust because of its ownership system. When a method consumes `self` (takes ownership), the old state is destroyed, and a new state is returned. You can't accidentally use the old state because it no longer exists.

## Why Type-State Matters

Consider a network connection. You shouldn't be able to send data before connecting, and you shouldn't connect twice. In most languages, you'd check these conditions at runtime:

```rust
// Traditional runtime checking - what we want to avoid
struct Connection {
    connected: bool,
}

impl Connection {
    fn connect(&mut self) -> Result<(), &'static str> {
        if self.connected {
            return Err("Already connected");
        }
        self.connected = true;
        Ok(())
    }

    fn send(&self, data: &[u8]) -> Result<(), &'static str> {
        if !self.connected {
            return Err("Not connected");
        }
        // send data...
        Ok(())
    }
}
```

This works, but has problems:

| Approach | Compile-Time Safety | Runtime Overhead | Error Discovery |
|----------|---------------------|------------------|-----------------|
| Runtime checks | No | Yes (boolean checks) | At runtime |
| Type-state | Yes | None | At compile time |

With type-state, invalid states are unrepresentable. Let's build this properly.

## Basic Type-State with Marker Types

The simplest approach uses empty structs as state markers. These are zero-sized types (ZSTs), meaning they have no runtime cost.

```rust
// Define states as empty structs
// These are zero-sized types - they exist only at compile time
struct Disconnected;
struct Connected;

// The connection type is generic over its state
struct Connection<State> {
    address: String,
    state: State,
}

impl Connection<Disconnected> {
    // Constructor returns a connection in the Disconnected state
    fn new(address: &str) -> Connection<Disconnected> {
        Connection {
            address: address.to_string(),
            state: Disconnected,
        }
    }

    // connect() consumes self and returns a new type
    // After calling this, the old Connection<Disconnected> no longer exists
    fn connect(self) -> Connection<Connected> {
        println!("Connecting to {}", self.address);
        Connection {
            address: self.address,
            state: Connected,
        }
    }
}

impl Connection<Connected> {
    // send() is only available on Connection<Connected>
    fn send(&self, data: &[u8]) {
        println!("Sending {} bytes to {}", data.len(), self.address);
    }

    // disconnect() returns to the Disconnected state
    fn disconnect(self) -> Connection<Disconnected> {
        println!("Disconnecting from {}", self.address);
        Connection {
            address: self.address,
            state: Disconnected,
        }
    }
}

fn main() {
    let conn = Connection::new("192.168.1.1:8080");

    // This won't compile - send() doesn't exist for Disconnected
    // conn.send(b"hello");  // ERROR!

    let conn = conn.connect();
    conn.send(b"hello");  // This works

    let conn = conn.disconnect();
    // conn.send(b"hello");  // ERROR again - back to Disconnected
}
```

The key insight: `connect()` takes `self` by value, destroying the `Connection<Disconnected>` and returning a `Connection<Connected>`. The Rust compiler tracks ownership, so you literally cannot use the disconnected connection after calling `connect()`.

## Using PhantomData for Cleaner State

Sometimes you don't want the state to be an actual field. Rust's `PhantomData` lets you have a type parameter without storing it:

```rust
use std::marker::PhantomData;

// States remain the same
struct Locked;
struct Unlocked;

// Using PhantomData means the state has no runtime representation
struct Door<State> {
    name: String,
    _state: PhantomData<State>,
}

impl<State> Door<State> {
    // Methods available in any state
    fn name(&self) -> &str {
        &self.name
    }
}

impl Door<Locked> {
    fn new(name: &str) -> Door<Locked> {
        Door {
            name: name.to_string(),
            _state: PhantomData,
        }
    }

    fn unlock(self, key: &str) -> Result<Door<Unlocked>, Door<Locked>> {
        if key == "secret" {
            Ok(Door {
                name: self.name,
                _state: PhantomData,
            })
        } else {
            // Wrong key - return the locked door back
            Err(self)
        }
    }
}

impl Door<Unlocked> {
    fn open(&self) {
        println!("Opening door: {}", self.name);
    }

    fn lock(self) -> Door<Locked> {
        println!("Locking door: {}", self.name);
        Door {
            name: self.name,
            _state: PhantomData,
        }
    }
}

fn main() {
    let door = Door::new("Front Door");

    match door.unlock("wrong") {
        Ok(unlocked) => unlocked.open(),
        Err(still_locked) => {
            println!("Door {} is still locked", still_locked.name());
            // Can try again with the returned door
            if let Ok(unlocked) = still_locked.unlock("secret") {
                unlocked.open();
            }
        }
    }
}
```

Notice how `unlock()` returns a `Result`. On failure, you get the locked door back, so you can try again. This is a common pattern when state transitions can fail.

## The Type-State Builder Pattern

Builders are a natural fit for type-state. You often want to ensure certain fields are set before building, and type-state makes this compile-time checked:

```rust
use std::marker::PhantomData;

// States for required fields
struct NoHost;
struct HasHost;
struct NoPort;
struct HasPort;

// Builder tracks which required fields are set
struct ServerConfigBuilder<HostState, PortState> {
    host: Option<String>,
    port: Option<u16>,
    timeout: Option<u64>,
    max_connections: Option<usize>,
    _host_state: PhantomData<HostState>,
    _port_state: PhantomData<PortState>,
}

// The final config - can only be created through the builder
struct ServerConfig {
    host: String,
    port: u16,
    timeout: u64,
    max_connections: usize,
}

impl ServerConfigBuilder<NoHost, NoPort> {
    fn new() -> Self {
        ServerConfigBuilder {
            host: None,
            port: None,
            timeout: None,
            max_connections: None,
            _host_state: PhantomData,
            _port_state: PhantomData,
        }
    }
}

impl<PortState> ServerConfigBuilder<NoHost, PortState> {
    // Setting host transitions from NoHost to HasHost
    fn host(self, host: &str) -> ServerConfigBuilder<HasHost, PortState> {
        ServerConfigBuilder {
            host: Some(host.to_string()),
            port: self.port,
            timeout: self.timeout,
            max_connections: self.max_connections,
            _host_state: PhantomData,
            _port_state: PhantomData,
        }
    }
}

impl<HostState> ServerConfigBuilder<HostState, NoPort> {
    // Setting port transitions from NoPort to HasPort
    fn port(self, port: u16) -> ServerConfigBuilder<HostState, HasPort> {
        ServerConfigBuilder {
            host: self.host,
            port: Some(port),
            timeout: self.timeout,
            max_connections: self.max_connections,
            _host_state: PhantomData,
            _port_state: PhantomData,
        }
    }
}

impl<HostState, PortState> ServerConfigBuilder<HostState, PortState> {
    // Optional fields don't change state
    fn timeout(mut self, timeout: u64) -> Self {
        self.timeout = Some(timeout);
        self
    }

    fn max_connections(mut self, max: usize) -> Self {
        self.max_connections = Some(max);
        self
    }
}

impl ServerConfigBuilder<HasHost, HasPort> {
    // build() only exists when both required fields are set
    fn build(self) -> ServerConfig {
        ServerConfig {
            host: self.host.unwrap(),
            port: self.port.unwrap(),
            timeout: self.timeout.unwrap_or(30),
            max_connections: self.max_connections.unwrap_or(100),
        }
    }
}

fn main() {
    // This compiles - both required fields set
    let config = ServerConfigBuilder::new()
        .host("localhost")
        .port(8080)
        .timeout(60)
        .build();

    println!("Server: {}:{}", config.host, config.port);

    // This won't compile - missing port
    // let bad_config = ServerConfigBuilder::new()
    //     .host("localhost")
    //     .build();  // ERROR: build() doesn't exist for ServerConfigBuilder<HasHost, NoPort>
}
```

The builder pattern with type-state guarantees at compile time that all required fields are provided. No runtime `Result` needed, no possibility of forgetting a required field.

## File Handle Example: Read, Write, and Append Modes

File handles are a classic example where operations depend on mode. Let's model this with type-state:

```rust
use std::marker::PhantomData;
use std::io::{self, Write as IoWrite, Read as IoRead};

// Mode markers
struct ReadMode;
struct WriteMode;
struct AppendMode;

// A type-safe file handle
struct FileHandle<Mode> {
    path: String,
    contents: Vec<u8>,
    position: usize,
    _mode: PhantomData<Mode>,
}

// Trait for modes that allow reading
trait CanRead {}
impl CanRead for ReadMode {}

// Trait for modes that allow writing
trait CanWrite {}
impl CanWrite for WriteMode {}
impl CanWrite for AppendMode {}

impl FileHandle<ReadMode> {
    fn open_read(path: &str) -> io::Result<FileHandle<ReadMode>> {
        // In real code, you'd read from the filesystem
        println!("Opening {} for reading", path);
        Ok(FileHandle {
            path: path.to_string(),
            contents: b"File contents here".to_vec(),
            position: 0,
            _mode: PhantomData,
        })
    }

    fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
        let remaining = &self.contents[self.position..];
        let to_read = buf.len().min(remaining.len());
        buf[..to_read].copy_from_slice(&remaining[..to_read]);
        self.position += to_read;
        Ok(to_read)
    }

    fn read_to_string(&mut self) -> io::Result<String> {
        let mut buf = Vec::new();
        buf.extend_from_slice(&self.contents[self.position..]);
        self.position = self.contents.len();
        String::from_utf8(buf).map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))
    }
}

impl FileHandle<WriteMode> {
    fn open_write(path: &str) -> io::Result<FileHandle<WriteMode>> {
        println!("Opening {} for writing (truncating)", path);
        Ok(FileHandle {
            path: path.to_string(),
            contents: Vec::new(),
            position: 0,
            _mode: PhantomData,
        })
    }

    fn write(&mut self, data: &[u8]) -> io::Result<usize> {
        self.contents.extend_from_slice(data);
        self.position = self.contents.len();
        Ok(data.len())
    }
}

impl FileHandle<AppendMode> {
    fn open_append(path: &str) -> io::Result<FileHandle<AppendMode>> {
        println!("Opening {} for appending", path);
        Ok(FileHandle {
            path: path.to_string(),
            contents: b"Existing content\n".to_vec(),
            position: 0,
            _mode: PhantomData,
        })
    }

    fn append(&mut self, data: &[u8]) -> io::Result<usize> {
        self.contents.extend_from_slice(data);
        Ok(data.len())
    }
}

// Methods available to all modes
impl<Mode> FileHandle<Mode> {
    fn path(&self) -> &str {
        &self.path
    }

    fn close(self) {
        println!("Closing {}", self.path);
        // self is consumed, file is closed
    }
}

fn main() -> io::Result<()> {
    // Reading
    let mut reader = FileHandle::open_read("data.txt")?;
    let content = reader.read_to_string()?;
    println!("Read: {}", content);
    reader.close();

    // Writing
    let mut writer = FileHandle::open_write("output.txt")?;
    writer.write(b"New content")?;
    writer.close();

    // Appending
    let mut appender = FileHandle::open_append("log.txt")?;
    appender.append(b"Log entry\n")?;
    appender.close();

    // These won't compile:
    // let mut reader = FileHandle::open_read("data.txt")?;
    // reader.write(b"oops");  // ERROR: no method write() for FileHandle<ReadMode>

    Ok(())
}
```

## State Machine: TCP Connection Lifecycle

Here's a more complex example modeling TCP connection states:

```rust
use std::marker::PhantomData;

// TCP connection states
struct Closed;
struct Listen;
struct SynSent;
struct SynReceived;
struct Established;
struct FinWait;
struct TimeWait;

struct TcpConnection<State> {
    local_port: u16,
    remote_addr: Option<String>,
    _state: PhantomData<State>,
}

impl TcpConnection<Closed> {
    fn new(local_port: u16) -> Self {
        TcpConnection {
            local_port,
            remote_addr: None,
            _state: PhantomData,
        }
    }

    // Passive open - start listening
    fn listen(self) -> TcpConnection<Listen> {
        println!("Listening on port {}", self.local_port);
        TcpConnection {
            local_port: self.local_port,
            remote_addr: None,
            _state: PhantomData,
        }
    }

    // Active open - initiate connection
    fn connect(self, addr: &str) -> TcpConnection<SynSent> {
        println!("Sending SYN to {}", addr);
        TcpConnection {
            local_port: self.local_port,
            remote_addr: Some(addr.to_string()),
            _state: PhantomData,
        }
    }
}

impl TcpConnection<Listen> {
    // Receive SYN from client
    fn accept(self, client_addr: &str) -> TcpConnection<SynReceived> {
        println!("Received SYN from {}, sending SYN-ACK", client_addr);
        TcpConnection {
            local_port: self.local_port,
            remote_addr: Some(client_addr.to_string()),
            _state: PhantomData,
        }
    }
}

impl TcpConnection<SynSent> {
    // Receive SYN-ACK, send ACK
    fn ack_received(self) -> TcpConnection<Established> {
        println!("Received SYN-ACK, sending ACK - connection established");
        TcpConnection {
            local_port: self.local_port,
            remote_addr: self.remote_addr,
            _state: PhantomData,
        }
    }
}

impl TcpConnection<SynReceived> {
    // Receive ACK from client
    fn ack_received(self) -> TcpConnection<Established> {
        println!("Received ACK - connection established");
        TcpConnection {
            local_port: self.local_port,
            remote_addr: self.remote_addr,
            _state: PhantomData,
        }
    }
}

impl TcpConnection<Established> {
    fn send(&self, data: &[u8]) {
        println!(
            "Sending {} bytes to {:?}",
            data.len(),
            self.remote_addr
        );
    }

    fn receive(&self) -> Vec<u8> {
        println!("Receiving data from {:?}", self.remote_addr);
        vec![1, 2, 3]  // Simulated data
    }

    // Initiate close
    fn close(self) -> TcpConnection<FinWait> {
        println!("Sending FIN");
        TcpConnection {
            local_port: self.local_port,
            remote_addr: self.remote_addr,
            _state: PhantomData,
        }
    }
}

impl TcpConnection<FinWait> {
    fn fin_ack_received(self) -> TcpConnection<TimeWait> {
        println!("Received FIN-ACK, entering TIME_WAIT");
        TcpConnection {
            local_port: self.local_port,
            remote_addr: self.remote_addr,
            _state: PhantomData,
        }
    }
}

impl TcpConnection<TimeWait> {
    fn timeout(self) -> TcpConnection<Closed> {
        println!("TIME_WAIT expired, connection closed");
        TcpConnection {
            local_port: self.local_port,
            remote_addr: None,
            _state: PhantomData,
        }
    }
}

fn client_flow() {
    let conn = TcpConnection::new(12345);
    let conn = conn.connect("server.com:80");
    let conn = conn.ack_received();
    conn.send(b"GET / HTTP/1.1\r\n\r\n");
    let _ = conn.receive();
    let conn = conn.close();
    let conn = conn.fin_ack_received();
    let _closed = conn.timeout();
}

fn server_flow() {
    let conn = TcpConnection::new(80);
    let conn = conn.listen();
    let conn = conn.accept("client.com:54321");
    let conn = conn.ack_received();
    let _ = conn.receive();
    conn.send(b"HTTP/1.1 200 OK\r\n\r\n");
    let conn = conn.close();
    let conn = conn.fin_ack_received();
    let _closed = conn.timeout();
}

fn main() {
    println!("=== Client Flow ===");
    client_flow();

    println!("\n=== Server Flow ===");
    server_flow();
}
```

Each state has only the methods that make sense for that state. You cannot call `send()` on a `Listen` connection or `accept()` on an `Established` connection.

## Handling Errors in State Transitions

When state transitions can fail, you need to decide what happens. Here are the common approaches:

```rust
use std::marker::PhantomData;

struct Unauthenticated;
struct Authenticated;

struct Session<State> {
    user_id: Option<String>,
    _state: PhantomData<State>,
}

// Approach 1: Return Result with the old state on failure
impl Session<Unauthenticated> {
    fn new() -> Self {
        Session {
            user_id: None,
            _state: PhantomData,
        }
    }

    // Returns the original session on failure so you can retry
    fn login_v1(
        self,
        username: &str,
        password: &str,
    ) -> Result<Session<Authenticated>, (Session<Unauthenticated>, &'static str)> {
        if username == "admin" && password == "secret" {
            Ok(Session {
                user_id: Some(username.to_string()),
                _state: PhantomData,
            })
        } else {
            Err((self, "Invalid credentials"))
        }
    }
}

// Approach 2: Use an enum for explicit states
enum AuthState {
    LoggedOut(Session<Unauthenticated>),
    LoggedIn(Session<Authenticated>),
}

impl Session<Unauthenticated> {
    fn login_v2(self, username: &str, password: &str) -> AuthState {
        if username == "admin" && password == "secret" {
            AuthState::LoggedIn(Session {
                user_id: Some(username.to_string()),
                _state: PhantomData,
            })
        } else {
            AuthState::LoggedOut(self)
        }
    }
}

// Approach 3: Separate success and failure types
struct LoginFailure {
    session: Session<Unauthenticated>,
    attempts: u32,
}

impl Session<Unauthenticated> {
    fn login_v3(
        self,
        username: &str,
        password: &str,
        attempts: u32,
    ) -> Result<Session<Authenticated>, LoginFailure> {
        if username == "admin" && password == "secret" {
            Ok(Session {
                user_id: Some(username.to_string()),
                _state: PhantomData,
            })
        } else {
            Err(LoginFailure {
                session: self,
                attempts: attempts + 1,
            })
        }
    }
}

fn main() {
    // Using Approach 1
    let session = Session::new();
    match session.login_v1("admin", "wrong") {
        Ok(authed) => println!("Logged in as {:?}", authed.user_id),
        Err((session, msg)) => {
            println!("Failed: {}. Retrying...", msg);
            match session.login_v1("admin", "secret") {
                Ok(authed) => println!("Logged in as {:?}", authed.user_id),
                Err(_) => println!("Failed again"),
            }
        }
    }
}
```

## Trade-offs and When to Use Type-State

Type-state is powerful but comes with costs. Here's when it makes sense:

| Use Type-State When | Avoid Type-State When |
|--------------------|-----------------------|
| Invalid states cause security issues | States are determined at runtime |
| Protocol correctness is critical | There are many possible states |
| API will be used by other developers | State transitions are complex graphs |
| States are known at compile time | Performance of state transitions matters |
| You want self-documenting code | The added complexity isn't worth the safety |

### Advantages

1. **Compile-time guarantees**: Invalid state transitions don't compile
2. **Self-documenting**: Types show what operations are valid
3. **No runtime checks**: Zero-cost abstractions
4. **Better IDE support**: Autocomplete shows only valid methods

### Disadvantages

1. **Verbose**: More boilerplate code
2. **Complex generics**: Can be hard to read
3. **Inflexible**: Runtime state changes require different patterns
4. **Learning curve**: Not intuitive for developers new to the pattern

### Comparison with Runtime State

```rust
// Runtime state - simpler but less safe
struct RuntimeConnection {
    state: ConnectionState,
}

enum ConnectionState {
    Disconnected,
    Connecting,
    Connected,
    Disconnecting,
}

impl RuntimeConnection {
    fn send(&self, data: &[u8]) -> Result<(), &'static str> {
        match self.state {
            ConnectionState::Connected => {
                // send data
                Ok(())
            }
            _ => Err("Not connected"),
        }
    }
}

// Type-state - more complex but compile-time safe
// (See earlier examples in this post)
```

## Combining Type-State with Traits

You can use traits to share behavior across states or to enable generic code:

```rust
use std::marker::PhantomData;

struct Empty;
struct Loaded;
struct Fired;

struct Weapon<State> {
    name: String,
    _state: PhantomData<State>,
}

// Trait for weapons that can be fired
trait Fireable {
    fn can_fire(&self) -> bool;
}

impl Fireable for Weapon<Loaded> {
    fn can_fire(&self) -> bool {
        true
    }
}

impl Fireable for Weapon<Empty> {
    fn can_fire(&self) -> bool {
        false
    }
}

// Generic function that works with any fireable weapon
fn check_weapon<W: Fireable>(weapon: &W) {
    if weapon.can_fire() {
        println!("Weapon ready!");
    } else {
        println!("Weapon empty!");
    }
}

impl Weapon<Empty> {
    fn new(name: &str) -> Self {
        Weapon {
            name: name.to_string(),
            _state: PhantomData,
        }
    }

    fn load(self) -> Weapon<Loaded> {
        println!("Loading {}", self.name);
        Weapon {
            name: self.name,
            _state: PhantomData,
        }
    }
}

impl Weapon<Loaded> {
    fn fire(self) -> Weapon<Empty> {
        println!("Firing {}!", self.name);
        Weapon {
            name: self.name,
            _state: PhantomData,
        }
    }
}

fn main() {
    let pistol = Weapon::new("Pistol");
    check_weapon(&pistol);  // "Weapon empty!"

    let pistol = pistol.load();
    check_weapon(&pistol);  // "Weapon ready!"

    let pistol = pistol.fire();
    check_weapon(&pistol);  // "Weapon empty!"
}
```

## Summary

The type-state pattern leverages Rust's type system to encode state machines. By using generic type parameters (often with `PhantomData`), you create distinct types for each state. Methods that transition between states consume `self` and return a new type, making it impossible to use an object in an invalid state.

Key techniques:

1. **Marker types**: Empty structs representing states
2. **PhantomData**: Include type parameters without runtime cost
3. **Consuming self**: Ownership transfer prevents use of old states
4. **Trait bounds**: Share behavior across states when needed
5. **Error handling**: Return the old state on failure to allow retry

The pattern works best when:

- States are known at compile time
- Invalid state transitions are serious bugs
- You want to document valid operations in the type signature

Start simple with basic marker types and add complexity only as needed. The goal is to make invalid states unrepresentable, not to encode every possible detail in the type system.
