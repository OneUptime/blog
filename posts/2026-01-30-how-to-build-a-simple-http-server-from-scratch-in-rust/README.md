# How to Build a Simple HTTP Server from Scratch in Rust

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Rust, HTTP, Networking, TCP

Description: Learn how to build a basic HTTP server in Rust using TCP sockets without any frameworks to understand the protocol fundamentals.

---

Building an HTTP server from scratch is one of the best ways to understand how web communication works at a fundamental level. In this guide, we will create a simple HTTP server in Rust using only the standard library, covering TCP listeners, request parsing, response building, multithreading, keep-alive connections, and basic routing.

## Setting Up the TcpListener

The foundation of any HTTP server is a TCP socket listener. Rust's standard library provides `TcpListener` for this purpose.

```rust
use std::net::TcpListener;
use std::io::{Read, Write};

fn main() {
    let listener = TcpListener::bind("127.0.0.1:8080").unwrap();
    println!("Server listening on port 8080");

    for stream in listener.incoming() {
        match stream {
            Ok(stream) => handle_connection(stream),
            Err(e) => eprintln!("Connection failed: {}", e),
        }
    }
}
```

The `TcpListener::bind()` method creates a listener bound to the specified address. The `incoming()` method returns an iterator over incoming connections, each yielding a `TcpStream`.

## Parsing HTTP Requests

HTTP requests follow a specific format: a request line, headers, and an optional body. Let us parse the essential parts.

```rust
use std::net::TcpStream;
use std::collections::HashMap;

struct HttpRequest {
    method: String,
    path: String,
    headers: HashMap<String, String>,
}

fn parse_request(stream: &mut TcpStream) -> Option<HttpRequest> {
    let mut buffer = [0; 4096];
    let bytes_read = stream.read(&mut buffer).ok()?;
    let request_str = String::from_utf8_lossy(&buffer[..bytes_read]);

    let mut lines = request_str.lines();
    let request_line = lines.next()?;
    let mut parts = request_line.split_whitespace();

    let method = parts.next()?.to_string();
    let path = parts.next()?.to_string();

    let mut headers = HashMap::new();
    for line in lines {
        if line.is_empty() { break; }
        if let Some((key, value)) = line.split_once(": ") {
            headers.insert(key.to_lowercase(), value.to_string());
        }
    }

    Some(HttpRequest { method, path, headers })
}
```

## Building HTTP Responses

An HTTP response consists of a status line, headers, and a body. Here is a function to construct responses.

```rust
fn build_response(status_code: u16, status_text: &str, body: &str, keep_alive: bool) -> String {
    let connection = if keep_alive { "keep-alive" } else { "close" };
    format!(
        "HTTP/1.1 {} {}\r\n\
         Content-Type: text/html\r\n\
         Content-Length: {}\r\n\
         Connection: {}\r\n\r\n\
         {}",
        status_code, status_text, body.len(), connection, body
    )
}
```

## Implementing Basic Routing

Routing directs requests to appropriate handlers based on the path and method.

```rust
fn route_request(request: &HttpRequest) -> (u16, &str, String) {
    match (request.method.as_str(), request.path.as_str()) {
        ("GET", "/") => (200, "OK", "<h1>Welcome to Rust HTTP Server</h1>".to_string()),
        ("GET", "/health") => (200, "OK", r#"{"status": "healthy"}"#.to_string()),
        ("GET", "/about") => (200, "OK", "<h1>About Page</h1><p>Built with Rust</p>".to_string()),
        ("POST", "/echo") => (200, "OK", "<p>Echo endpoint received POST</p>".to_string()),
        _ => (404, "Not Found", "<h1>404 - Page Not Found</h1>".to_string()),
    }
}
```

## Handling Multiple Connections with Threads

A single-threaded server can only handle one connection at a time. Let us use threads to handle concurrent connections.

```rust
use std::thread;

fn main() {
    let listener = TcpListener::bind("127.0.0.1:8080").unwrap();
    println!("Server listening on port 8080");

    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                thread::spawn(move || {
                    handle_connection(stream);
                });
            }
            Err(e) => eprintln!("Connection failed: {}", e),
        }
    }
}
```

For production use, consider using a thread pool to limit resource consumption.

## Implementing Keep-Alive Connections

HTTP/1.1 supports persistent connections through the `Connection: keep-alive` header, allowing multiple requests over a single TCP connection.

```rust
use std::time::Duration;

fn handle_connection(mut stream: TcpStream) {
    stream.set_read_timeout(Some(Duration::from_secs(5))).ok();

    loop {
        let request = match parse_request(&mut stream) {
            Some(req) => req,
            None => break,
        };

        let keep_alive = request.headers
            .get("connection")
            .map(|v| v.to_lowercase() == "keep-alive")
            .unwrap_or(true);

        let (status, text, body) = route_request(&request);
        let response = build_response(status, text, &body, keep_alive);

        if stream.write_all(response.as_bytes()).is_err() {
            break;
        }

        if !keep_alive {
            break;
        }
    }
}
```

## Putting It All Together

Here is the complete server combining all components.

```rust
use std::net::{TcpListener, TcpStream};
use std::io::{Read, Write};
use std::collections::HashMap;
use std::thread;
use std::time::Duration;

fn main() {
    let listener = TcpListener::bind("127.0.0.1:8080").unwrap();
    println!("Server running at http://127.0.0.1:8080");

    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                thread::spawn(move || handle_connection(stream));
            }
            Err(e) => eprintln!("Error: {}", e),
        }
    }
}
```

Run the server with `cargo run` and test it using `curl http://127.0.0.1:8080` or your browser.

## Conclusion

Building an HTTP server from scratch teaches you the fundamentals of network programming and the HTTP protocol. While this implementation is educational, production servers should use established frameworks like Actix-web or Axum that handle edge cases, security, and performance optimizations. Understanding these basics, however, makes you a better developer when debugging network issues or choosing the right tools for your projects.
