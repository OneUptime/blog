# How to Implement a Simple HTTP Server in Rust over IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, HTTP, IPv4, TCP, Server, Networking, Std::net

Description: Build a multithreaded HTTP/1.0 server in Rust using std::net TcpListener, manually parsing HTTP requests and generating responses over IPv4.

## Introduction

Building an HTTP server from scratch in Rust teaches both Rust's networking primitives and the HTTP/1.0 protocol. This implementation uses Rust's standard library without external HTTP crates - using `TcpListener`, `TcpStream`, threads, and string parsing.

## Single-Threaded HTTP Server

```rust
use std::net::{TcpListener, TcpStream};
use std::io::{BufRead, BufReader, Write};

fn handle_request(mut stream: TcpStream) {
    let peer = stream.peer_addr()
        .map(|addr| addr.to_string())
        .unwrap_or_else(|_| "unknown".to_string());
    
    // Read the HTTP request
    let reader = BufReader::new(&stream);
    let request_line = match reader.lines().next() {
        Some(Ok(line)) => line,
        _ => return,
    };
    
    println!("{}: {}", peer, request_line);
    
    // Parse the request line: "GET /path HTTP/1.0"
    let parts: Vec<&str> = request_line.split_whitespace().collect();
    let (method, path) = if parts.len() >= 2 {
        (parts[0], parts[1])
    } else {
        ("", "/")
    };
    
    // Generate response based on path
    let (status, body) = match (method, path) {
        ("GET", "/") => (
            "200 OK",
            "<html><body><h1>Hello from Rust!</h1></body></html>"
        ),
        ("GET", "/health") => ("200 OK", "OK"),
        ("GET", _) => ("404 Not Found", "<h1>404 Not Found</h1>"),
        _ => ("405 Method Not Allowed", "<h1>Method Not Allowed</h1>"),
    };
    
    let response = format!(
        "HTTP/1.0 {}\r\nContent-Type: text/html\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        status,
        body.len(),
        body
    );
    
    let _ = stream.write_all(response.as_bytes());
}

fn main() -> std::io::Result<()> {
    let listener = TcpListener::bind("0.0.0.0:8080")?;
    println!("HTTP server listening on 0.0.0.0:8080");
    
    for stream in listener.incoming() {
        match stream {
            Ok(s) => handle_request(s),
            Err(e) => eprintln!("Accept error: {}", e),
        }
    }
    Ok(())
}
```

## Multithreaded HTTP Server

```rust
use std::net::{TcpListener, TcpStream};
use std::io::{BufRead, BufReader, Read, Write};
use std::thread;
use std::collections::HashMap;
use std::time::Duration;

#[derive(Debug)]
struct HttpRequest {
    method: String,
    path: String,
    version: String,
    headers: HashMap<String, String>,
    body: Vec<u8>,
}

fn parse_request(stream: &TcpStream) -> Option<HttpRequest> {
    stream.set_read_timeout(Some(Duration::from_secs(10))).ok()?;
    
    let mut reader = BufReader::new(stream);
    let mut request_line = String::new();
    reader.read_line(&mut request_line).ok()?;
    
    let parts: Vec<&str> = request_line.trim().split_whitespace().collect();
    if parts.len() < 2 { return None; }
    
    let method = parts[0].to_string();
    let path = parts[1].to_string();
    let version = parts.get(2).unwrap_or(&"HTTP/1.0").to_string();
    
    // Parse headers
    let mut headers = HashMap::new();
    let mut content_length = 0usize;
    
    loop {
        let mut header_line = String::new();
        if reader.read_line(&mut header_line).ok()? == 0 { break; }
        let header_line = header_line.trim();
        if header_line.is_empty() { break; }
        
        if let Some((key, value)) = header_line.split_once(':') {
            let key = key.trim().to_lowercase();
            let value = value.trim().to_string();
            if key == "content-length" {
                content_length = value.parse().unwrap_or(0);
            }
            headers.insert(key, value);
        }
    }
    
    // Read body if present
    let mut body = vec![0u8; content_length];
    if content_length > 0 {
        reader.read_exact(&mut body).ok()?;
    }
    
    Some(HttpRequest { method, path, version, headers, body })
}

fn generate_response(req: &HttpRequest) -> String {
    let (status, content_type, body) = match req.path.as_str() {
        "/" => ("200 OK", "text/html", 
                "<html><body><h1>Rust HTTP Server</h1><p>Built from scratch!</p></body></html>".to_string()),
        "/health" => ("200 OK", "application/json", 
                      r#"{"status":"healthy","server":"rust"}"#.to_string()),
        "/echo" => {
            let body = String::from_utf8_lossy(&req.body);
            ("200 OK", "text/plain",
             format!("{} {} {}\nHeaders: {:?}\nBody: {}", req.method, req.path, req.version, req.headers, body))
        }
        _ => ("404 Not Found", "text/html", "<h1>404 Not Found</h1>".to_string()),
    };
    
    format!(
        "HTTP/1.0 {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        status, content_type, body.len(), body
    )
}

fn handle_client(mut stream: TcpStream) {
    let peer = stream.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    
    if let Some(req) = parse_request(&stream) {
        println!("{}: {} {}", peer, req.method, req.path);
        let response = generate_response(&req);
        let _ = stream.write_all(response.as_bytes());
    }
}

fn main() -> std::io::Result<()> {
    let listener = TcpListener::bind("0.0.0.0:8080")?;
    println!("Multithreaded HTTP server on port 8080");
    
    for stream in listener.incoming() {
        match stream {
            Ok(s) => {
                thread::spawn(|| handle_client(s));
            }
            Err(e) => eprintln!("Accept error: {}", e),
        }
    }
    Ok(())
}
```

## Testing the Server

```bash
# Build and run

cargo run

# Test with curl
curl http://localhost:8080/
curl http://localhost:8080/health
curl http://localhost:8080/echo -X POST -d "hello"
```

## Conclusion

Building an HTTP server from Rust's standard library teaches manual HTTP parsing, TCP socket management, and thread-per-connection patterns. For production HTTP services, use `hyper` or `axum` which handle HTTP/1.1 keep-alive, chunked encoding, and HTTP/2 correctly.
