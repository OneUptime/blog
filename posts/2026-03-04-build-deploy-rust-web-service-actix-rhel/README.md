# How to Build and Deploy a Rust Web Service with Actix on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Rust, Actix, Web Services, Deployments, Linux

Description: Build a high-performance web service using Rust and the Actix Web framework, then deploy it on RHEL with systemd and Nginx.

---

Actix Web is one of the fastest web frameworks available, built on Rust's async runtime. This guide covers building and deploying an Actix web service on RHEL.

## Install Rust

```bash
# Install build dependencies
sudo dnf install -y gcc gcc-c++ make curl openssl-devel

# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
```

## Create the Actix Web Project

```bash
cargo new actix-service && cd actix-service
```

Add dependencies to `Cargo.toml`:

```toml
# Cargo.toml
[package]
name = "actix-service"
version = "0.1.0"
edition = "2021"

[dependencies]
actix-web = "4"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
env_logger = "0.10"
log = "0.4"
```

Write the application:

```rust
// src/main.rs
use actix_web::{web, App, HttpServer, HttpResponse, middleware};
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Serialize)]
struct HealthCheck {
    status: String,
    version: String,
}

#[derive(Deserialize)]
struct CreateItem {
    name: String,
    description: String,
}

// Health check endpoint
async fn health() -> HttpResponse {
    let response = HealthCheck {
        status: "healthy".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    };
    HttpResponse::Ok().json(response)
}

// Example POST endpoint
async fn create_item(item: web::Json<CreateItem>) -> HttpResponse {
    log::info!("Creating item: {}", item.name);
    HttpResponse::Created().json(serde_json::json!({
        "name": item.name,
        "description": item.description,
        "created": true
    }))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize logging
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));

    let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let bind_addr = format!("127.0.0.1:{}", port);

    log::info!("Starting server at {}", bind_addr);

    HttpServer::new(|| {
        App::new()
            .wrap(middleware::Logger::default())
            .route("/health", web::get().to(health))
            .route("/items", web::post().to(create_item))
    })
    .bind(&bind_addr)?
    .workers(num_cpus::get())
    .run()
    .await
}
```

## Build for Production

```bash
# Build the release binary
cargo build --release

# Check the binary size
ls -lh target/release/actix-service

# Test locally
RUST_LOG=info ./target/release/actix-service &
curl http://localhost:8080/health
curl -X POST http://localhost:8080/items \
  -H "Content-Type: application/json" \
  -d '{"name":"test","description":"a test item"}'
kill %1
```

## Deploy on RHEL

```bash
# Create a service user
sudo useradd -r -s /sbin/nologin actixsvc

# Install the binary
sudo install -o actixsvc -g actixsvc -m 0755 \
  target/release/actix-service /usr/local/bin/actix-service

# Create systemd unit
sudo tee /etc/systemd/system/actix-service.service << 'UNIT'
[Unit]
Description=Actix Web Service
After=network.target

[Service]
Type=simple
User=actixsvc
Group=actixsvc
Environment=PORT=8080
Environment=RUST_LOG=info
ExecStart=/usr/local/bin/actix-service
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now actix-service
```

## Nginx Reverse Proxy

```bash
sudo dnf install -y nginx

sudo tee /etc/nginx/conf.d/actix-service.conf << 'CONF'
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
CONF

sudo nginx -t && sudo systemctl enable --now nginx
sudo setsebool -P httpd_can_network_connect 1
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

Actix Web on RHEL delivers outstanding request throughput with minimal resource consumption, making it an excellent choice for high-performance APIs.
