# How to Build a Consul Service Registry Client in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Consul, Service Discovery, Microservices, HashiCorp

Description: A practical guide to building a Consul service registry client in Rust, covering service registration, health checks, and discovery patterns for microservice architectures.

---

Service discovery is one of those problems that looks simple until you actually build distributed systems. You have dozens of services spinning up and down, each needing to find the others without hardcoded addresses. HashiCorp's Consul has become a go-to solution for this, and Rust's performance characteristics make it an excellent choice for building clients that need to handle high-throughput service mesh operations.

In this guide, we will build a Consul service registry client from scratch in Rust. You will learn how to register services, implement health checks, and discover other services - all with proper error handling and async patterns.

## Setting Up the Project

First, create a new Rust project and add the necessary dependencies:

```bash
cargo new consul-client
cd consul-client
```

Add these dependencies to your `Cargo.toml`:

```toml
[dependencies]
reqwest = { version = "0.11", features = ["json"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
thiserror = "1.0"
uuid = { version = "1.0", features = ["v4"] }
```

## Defining the Core Types

Let's start by defining the data structures that represent Consul's API. Consul uses JSON for its HTTP API, so we will leverage Serde for serialization:

```rust
use serde::{Deserialize, Serialize};

// Represents a service registration request
#[derive(Debug, Serialize, Clone)]
pub struct ServiceRegistration {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "Name")]
    pub name: String,
    #[serde(rename = "Address")]
    pub address: String,
    #[serde(rename = "Port")]
    pub port: u16,
    #[serde(rename = "Tags")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    #[serde(rename = "Check")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub check: Option<HealthCheck>,
}

// Health check configuration for the service
#[derive(Debug, Serialize, Clone)]
pub struct HealthCheck {
    #[serde(rename = "HTTP")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub http: Option<String>,
    #[serde(rename = "TCP")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tcp: Option<String>,
    #[serde(rename = "Interval")]
    pub interval: String,
    #[serde(rename = "Timeout")]
    pub timeout: String,
    #[serde(rename = "DeregisterCriticalServiceAfter")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deregister_after: Option<String>,
}

// Response from service discovery queries
#[derive(Debug, Deserialize, Clone)]
pub struct ServiceInstance {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "Node")]
    pub node: String,
    #[serde(rename = "Address")]
    pub address: String,
    #[serde(rename = "ServiceID")]
    pub service_id: String,
    #[serde(rename = "ServiceName")]
    pub service_name: String,
    #[serde(rename = "ServiceAddress")]
    pub service_address: String,
    #[serde(rename = "ServicePort")]
    pub service_port: u16,
    #[serde(rename = "ServiceTags")]
    pub service_tags: Option<Vec<String>>,
}
```

Note the `#[serde(rename = "...")]` attributes. Consul's API uses PascalCase field names, but Rust conventions favor snake_case. This mapping keeps our code idiomatic while maintaining API compatibility.

## Building the Client

Now let's create the main client struct with proper error handling:

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ConsulError {
    #[error("HTTP request failed: {0}")]
    HttpError(#[from] reqwest::Error),
    #[error("Service not found: {0}")]
    ServiceNotFound(String),
    #[error("Registration failed: {0}")]
    RegistrationFailed(String),
}

pub struct ConsulClient {
    base_url: String,
    http_client: reqwest::Client,
}

impl ConsulClient {
    // Create a new client pointing to the Consul agent
    pub fn new(consul_addr: &str) -> Self {
        Self {
            base_url: format!("http://{}", consul_addr),
            http_client: reqwest::Client::new(),
        }
    }

    // Register a service with Consul
    pub async fn register_service(
        &self,
        registration: &ServiceRegistration,
    ) -> Result<(), ConsulError> {
        let url = format!("{}/v1/agent/service/register", self.base_url);

        let response = self
            .http_client
            .put(&url)
            .json(registration)
            .send()
            .await?;

        if response.status().is_success() {
            Ok(())
        } else {
            let error_text = response.text().await.unwrap_or_default();
            Err(ConsulError::RegistrationFailed(error_text))
        }
    }

    // Deregister a service by its ID
    pub async fn deregister_service(&self, service_id: &str) -> Result<(), ConsulError> {
        let url = format!(
            "{}/v1/agent/service/deregister/{}",
            self.base_url, service_id
        );

        self.http_client.put(&url).send().await?;
        Ok(())
    }

    // Discover healthy instances of a service
    pub async fn discover_service(
        &self,
        service_name: &str,
    ) -> Result<Vec<ServiceInstance>, ConsulError> {
        let url = format!(
            "{}/v1/health/service/{}?passing=true",
            self.base_url, service_name
        );

        let response = self.http_client.get(&url).send().await?;

        if !response.status().is_success() {
            return Err(ConsulError::ServiceNotFound(service_name.to_string()));
        }

        // Consul wraps service info in a health check response
        let health_responses: Vec<serde_json::Value> = response.json().await?;

        let instances: Vec<ServiceInstance> = health_responses
            .into_iter()
            .filter_map(|entry| {
                serde_json::from_value(entry.get("Service")?.clone()).ok()
            })
            .collect();

        Ok(instances)
    }
}
```

The `?passing=true` query parameter in `discover_service` filters out unhealthy instances. This is crucial for production systems where you only want to route traffic to services that are actually ready to handle requests.

## Implementing Service Registration with Health Checks

Here is a complete example that registers a service with an HTTP health check:

```rust
use uuid::Uuid;

pub struct ServiceBuilder {
    name: String,
    address: String,
    port: u16,
    tags: Vec<String>,
    health_endpoint: Option<String>,
}

impl ServiceBuilder {
    pub fn new(name: &str, address: &str, port: u16) -> Self {
        Self {
            name: name.to_string(),
            address: address.to_string(),
            port,
            tags: Vec::new(),
            health_endpoint: None,
        }
    }

    pub fn with_tags(mut self, tags: Vec<&str>) -> Self {
        self.tags = tags.into_iter().map(String::from).collect();
        self
    }

    pub fn with_http_health_check(mut self, path: &str) -> Self {
        self.health_endpoint = Some(format!(
            "http://{}:{}{}",
            self.address, self.port, path
        ));
        self
    }

    pub fn build(self) -> ServiceRegistration {
        // Generate a unique ID combining name and UUID
        let id = format!("{}-{}", self.name, Uuid::new_v4());

        let check = self.health_endpoint.map(|endpoint| HealthCheck {
            http: Some(endpoint),
            tcp: None,
            interval: "10s".to_string(),
            timeout: "5s".to_string(),
            deregister_after: Some("1m".to_string()),
        });

        ServiceRegistration {
            id,
            name: self.name,
            address: self.address,
            port: self.port,
            tags: if self.tags.is_empty() {
                None
            } else {
                Some(self.tags)
            },
            check,
        }
    }
}
```

## Putting It All Together

Here is a complete example showing registration, discovery, and cleanup:

```rust
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to local Consul agent
    let client = ConsulClient::new("127.0.0.1:8500");

    // Build and register our service
    let registration = ServiceBuilder::new("payment-service", "192.168.1.100", 8080)
        .with_tags(vec!["api", "payments", "v2"])
        .with_http_health_check("/health")
        .build();

    let service_id = registration.id.clone();

    println!("Registering service: {}", service_id);
    client.register_service(&registration).await?;

    // Discover other services we depend on
    println!("Discovering user-service instances...");
    match client.discover_service("user-service").await {
        Ok(instances) => {
            for instance in instances {
                println!(
                    "  Found: {}:{} (tags: {:?})",
                    instance.service_address,
                    instance.service_port,
                    instance.service_tags
                );
            }
        }
        Err(ConsulError::ServiceNotFound(name)) => {
            println!("  No healthy instances of {} found", name);
        }
        Err(e) => return Err(e.into()),
    }

    // In a real application, you would keep the service running
    // For demo purposes, we will deregister after a delay
    tokio::time::sleep(tokio::time::Duration::from_secs(30)).await;

    println!("Deregistering service...");
    client.deregister_service(&service_id).await?;

    Ok(())
}
```

## Adding Load Balancing Logic

Once you can discover services, you will want to distribute requests across instances. Here is a simple round-robin implementation:

```rust
use std::sync::atomic::{AtomicUsize, Ordering};

pub struct LoadBalancer {
    client: ConsulClient,
    counter: AtomicUsize,
}

impl LoadBalancer {
    pub fn new(consul_addr: &str) -> Self {
        Self {
            client: ConsulClient::new(consul_addr),
            counter: AtomicUsize::new(0),
        }
    }

    // Get the next healthy instance using round-robin
    pub async fn get_instance(
        &self,
        service_name: &str,
    ) -> Result<ServiceInstance, ConsulError> {
        let instances = self.client.discover_service(service_name).await?;

        if instances.is_empty() {
            return Err(ConsulError::ServiceNotFound(service_name.to_string()));
        }

        // Atomic increment and wrap around
        let index = self.counter.fetch_add(1, Ordering::Relaxed) % instances.len();

        Ok(instances[index].clone())
    }

    // Build a URL for the next available instance
    pub async fn get_url(
        &self,
        service_name: &str,
        path: &str,
    ) -> Result<String, ConsulError> {
        let instance = self.get_instance(service_name).await?;
        Ok(format!(
            "http://{}:{}{}",
            instance.service_address, instance.service_port, path
        ))
    }
}
```

## Production Considerations

Before deploying this client, keep these points in mind:

**Caching**: Hitting Consul for every request adds latency. Consider caching discovered instances and refreshing periodically or using Consul's blocking queries for push-based updates.

**Connection pooling**: The `reqwest::Client` already pools connections, but ensure you reuse the same client instance across your application rather than creating new ones per request.

**Retries**: Network calls fail. Wrap your registration and discovery calls with retry logic using a crate like `backoff` or `tokio-retry`.

**Graceful shutdown**: Always deregister your service when shutting down. Use Tokio's signal handling to catch SIGTERM and clean up properly.

**TLS**: In production, you should enable TLS for Consul communication. The `reqwest` client supports this through its `ClientBuilder`.

## Wrapping Up

You now have a working Consul client in Rust that handles the core service mesh operations: registration, health checks, and discovery. The patterns shown here - builder for configuration, async/await for I/O, and proper error types - form a solid foundation you can extend for your specific needs.

The code is intentionally straightforward. Real production clients might add features like automatic re-registration on network failures, KV store operations for distributed configuration, or integration with Consul Connect for service mesh security. But the fundamentals remain the same: register yourself, check your health, and help others find you.

Service discovery might not be glamorous, but getting it right means your microservices can find each other reliably without manual configuration. And that is worth the investment.
