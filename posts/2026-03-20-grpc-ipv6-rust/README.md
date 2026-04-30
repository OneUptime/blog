# How to Configure gRPC Servers with IPv6 in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Rust, IPv6, Tonic, API

Description: Configure Rust gRPC servers using the Tonic framework to listen on and handle IPv6 connections with full async support.

## Dependencies (Cargo.toml)

```toml
[dependencies]
tonic = { version = "0.14", features = ["tls-ring"] }
tonic-prost = "0.14"
prost = "0.14"
tokio = { version = "1", features = ["full"] }
tokio-stream = "0.1"

[build-dependencies]
tonic-prost-build = "0.14"
```

## Step 1: Proto Definition

```protobuf
// proto/hello.proto
syntax = "proto3";
package helloworld;

service Greeter {
  rpc SayHello (HelloRequest) returns (HelloReply);
}

message HelloRequest { string name = 1; }
message HelloReply { string message = 1; }
```

```rust
// build.rs
fn main() -> Result<(), Box<dyn std::error::Error>> {
    tonic_prost_build::compile_protos("proto/hello.proto")?;
    Ok(())
}
```

## Step 2: gRPC Server on IPv6

```rust
// src/bin/server.rs
use tonic::{transport::Server, Request, Response, Status};
use std::net::SocketAddr;

// Include generated gRPC code
pub mod helloworld {
    tonic::include_proto!("helloworld");
}

use helloworld::greeter_server::{Greeter, GreeterServer};
use helloworld::{HelloReply, HelloRequest};

#[derive(Debug, Default)]
pub struct MyGreeter {}

#[tonic::async_trait]
impl Greeter for MyGreeter {
    async fn say_hello(
        &self,
        request: Request<HelloRequest>,
    ) -> Result<Response<HelloReply>, Status> {
        // Inspect the client socket address when the transport provides it
        let remote_addr = request.remote_addr();
        println!("Request from: {:?}", remote_addr);

        let reply = HelloReply {
            message: format!("Hello, {}!", request.into_inner().name),
        };

        Ok(Response::new(reply))
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Bind to all IPv6 interfaces - [::]:50051
    // SocketAddr parses "[::]:50051" correctly
    let addr: SocketAddr = "[::]:50051".parse()?;

    println!("gRPC server listening on {}", addr);

    Server::builder()
        .add_service(GreeterServer::new(MyGreeter::default()))
        .serve(addr)
        .await?;

    Ok(())
}
```

## Step 3: gRPC Client Connecting to IPv6

```rust
// src/bin/client.rs
use tonic::transport::Channel;

pub mod helloworld {
    tonic::include_proto!("helloworld");
}

use helloworld::greeter_client::GreeterClient;
use helloworld::HelloRequest;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to IPv6 gRPC server - use http://[addr]:port format
    let endpoint = "http://[::1]:50051";

    let channel = Channel::from_static(endpoint)
        .connect()
        .await?;

    let mut client = GreeterClient::new(channel);

    let request = tonic::Request::new(HelloRequest {
        name: "World".to_string(),
    });

    let response = client.say_hello(request).await?;
    println!("RESPONSE: {:?}", response.into_inner().message);

    Ok(())
}
```

## Step 4: TLS over IPv6

```rust
// src/bin/server_tls.rs
use tonic::transport::{
    Certificate, Channel, ClientTlsConfig, Identity, Server, ServerTlsConfig,
};
use tonic::{Request, Response, Status};

pub mod helloworld {
    tonic::include_proto!("helloworld");
}

use helloworld::greeter_client::GreeterClient;
use helloworld::greeter_server::{Greeter, GreeterServer};
use helloworld::{HelloReply, HelloRequest};

#[derive(Debug, Default)]
pub struct MyGreeter {}

#[tonic::async_trait]
impl Greeter for MyGreeter {
    async fn say_hello(
        &self,
        request: Request<HelloRequest>,
    ) -> Result<Response<HelloReply>, Status> {
        let reply = HelloReply {
            message: format!("Hello, {}!", request.into_inner().name),
        };

        Ok(Response::new(reply))
    }
}

async fn serve_with_tls() -> Result<(), Box<dyn std::error::Error>> {
    // Load TLS certificate and key
    let cert = tokio::fs::read("server.crt").await?;
    let key = tokio::fs::read("server.key").await?;
    let identity = Identity::from_pem(cert, key);

    let tls_config = ServerTlsConfig::new().identity(identity);

    let addr: std::net::SocketAddr = "[::]:443".parse()?;

    Server::builder()
        .tls_config(tls_config)?
        .add_service(GreeterServer::new(MyGreeter::default()))
        .serve(addr)
        .await?;

    Ok(())
}

// Client with TLS to IPv6 server
async fn connect_with_tls() -> Result<GreeterClient<Channel>, Box<dyn std::error::Error>> {
    let ca_cert = tokio::fs::read("ca.crt").await?;
    let ca = Certificate::from_pem(ca_cert);

    let tls_config = ClientTlsConfig::new()
        .ca_certificate(ca)
        .domain_name("example.com");

    let channel = Channel::from_static("https://[2001:db8::1]:443")
        .tls_config(tls_config)?
        .connect()
        .await?;

    Ok(GreeterClient::new(channel))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    serve_with_tls().await
}
```

## Step 5: Dynamic IPv6 Address from Config

```rust
// src/config.rs
use std::net::SocketAddr;

fn get_grpc_addr() -> SocketAddr {
    let host = std::env::var("GRPC_HOST").unwrap_or_else(|_| "::".to_string());
    let port = std::env::var("GRPC_PORT").unwrap_or_else(|_| "50051".to_string());

    // Parse IPv6 address correctly
    let addr_str = if host.contains(':') {
        // IPv6 address - wrap in brackets
        format!("[{}]:{}", host, port)
    } else {
        // IPv4 address
        format!("{}:{}", host, port)
    };

    addr_str.parse().expect("Invalid socket address")
}
```

## Testing

```bash
# Build and run server

cargo run --bin server

# Test with grpcurl (in another terminal)
grpcurl -import-path proto -proto hello.proto list
grpcurl -plaintext -import-path proto -proto hello.proto -d '{"name":"World"}' '[::1]:50051' helloworld.Greeter/SayHello

# Run client
cargo run --bin client
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your Rust Tonic gRPC service availability over IPv6. Configure TCP port monitors on port 50051 for your IPv6 address, and build a complementary HTTP health endpoint using Axum or Actix alongside your gRPC server.

## Conclusion

Rust Tonic gRPC servers bind to IPv6 using `"[::]:port".parse::<SocketAddr>()`. Clients connect using `http://[ipv6addr]:port` as the endpoint URL. Tonic's async Rust implementation handles IPv6 transparently through Tokio's networking layer.
