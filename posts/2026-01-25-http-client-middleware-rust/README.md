# How to Build an HTTP Client with Middleware in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, HTTP Client, Middleware, reqwest, Tower

Description: Learn how to build a flexible HTTP client in Rust with middleware support using Tower and reqwest, enabling reusable logic for logging, retries, authentication, and more.

---

When building production applications in Rust, you often need an HTTP client that does more than just send requests. You need logging, automatic retries, authentication headers, request timing, and maybe rate limiting. Instead of scattering this logic throughout your codebase, middleware lets you compose these concerns cleanly.

In this guide, we will build an HTTP client with middleware support using the `reqwest` crate combined with Tower's middleware system.

## Why Middleware?

Consider what happens in a typical HTTP request flow:

1. Add authentication headers
2. Log the outgoing request
3. Start a timer
4. Send the actual request
5. Retry on failure
6. Log the response
7. Record timing metrics

Without middleware, you end up copying this logic everywhere or wrapping everything in helper functions that become hard to compose. Middleware gives you a clean, composable pattern where each concern is isolated and reusable.

## Setting Up the Project

First, create a new Rust project and add the necessary dependencies:

```bash
cargo new http_client_middleware
cd http_client_middleware
```

Add these dependencies to your `Cargo.toml`:

```toml
[dependencies]
reqwest = { version = "0.12", features = ["json"] }
tokio = { version = "1", features = ["full"] }
tower = { version = "0.5", features = ["util", "retry", "timeout"] }
tower-http = { version = "0.6", features = ["trace", "set-header"] }
http = "1.1"
tracing = "0.1"
tracing-subscriber = "0.3"
```

## Building the Basic Client

Let's start with a basic HTTP client that we will enhance with middleware:

```rust
use reqwest::Client;
use std::time::Duration;

// Create a basic client with some sensible defaults
fn create_base_client() -> Client {
    Client::builder()
        .timeout(Duration::from_secs(30))
        .pool_max_idle_per_host(10)
        .build()
        .expect("Failed to create HTTP client")
}
```

## Creating Custom Middleware with Tower

Tower provides the `Service` trait, which is the foundation for middleware in Rust. Each middleware wraps another service and can modify requests, responses, or both.

Here's a logging middleware that records request and response details:

```rust
use std::task::{Context, Poll};
use std::pin::Pin;
use std::future::Future;
use tower::Service;
use http::{Request, Response};

// Our logging middleware wraps any inner service
#[derive(Clone)]
pub struct LoggingMiddleware<Svc> {
    inner: Svc,
    service_name: String,
}

impl<Svc> LoggingMiddleware<Svc> {
    pub fn new(inner: Svc, service_name: impl Into<String>) -> Self {
        Self {
            inner,
            service_name: service_name.into(),
        }
    }
}

impl<Svc, ReqBody, ResBody> Service<Request<ReqBody>> for LoggingMiddleware<Svc>
where
    Svc: Service<Request<ReqBody>, Response = Response<ResBody>> + Clone + Send + 'static,
    Svc::Future: Send,
    ReqBody: Send + 'static,
{
    type Response = Svc::Response;
    type Error = Svc::Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, request: Request<ReqBody>) -> Self::Future {
        // Log the outgoing request
        let method = request.method().clone();
        let uri = request.uri().clone();
        let service_name = self.service_name.clone();

        tracing::info!(
            service = %service_name,
            method = %method,
            uri = %uri,
            "Sending request"
        );

        let start = std::time::Instant::now();
        let mut inner = self.inner.clone();

        Box::pin(async move {
            let result = inner.call(request).await;
            let elapsed = start.elapsed();

            match &result {
                Ok(response) => {
                    tracing::info!(
                        service = %service_name,
                        method = %method,
                        uri = %uri,
                        status = %response.status(),
                        duration_ms = %elapsed.as_millis(),
                        "Request completed"
                    );
                }
                Err(_) => {
                    tracing::error!(
                        service = %service_name,
                        method = %method,
                        uri = %uri,
                        duration_ms = %elapsed.as_millis(),
                        "Request failed"
                    );
                }
            }

            result
        })
    }
}
```

## Adding Authentication Middleware

For APIs that require authentication, we can create middleware that automatically injects headers:

```rust
use http::header::{HeaderName, HeaderValue};

#[derive(Clone)]
pub struct AuthMiddleware<Svc> {
    inner: Svc,
    header_name: HeaderName,
    header_value: HeaderValue,
}

impl<Svc> AuthMiddleware<Svc> {
    pub fn bearer(inner: Svc, token: &str) -> Self {
        Self {
            inner,
            header_name: http::header::AUTHORIZATION,
            header_value: HeaderValue::from_str(&format!("Bearer {}", token))
                .expect("Invalid token format"),
        }
    }

    pub fn api_key(inner: Svc, key_name: &str, key_value: &str) -> Self {
        Self {
            inner,
            header_name: HeaderName::from_bytes(key_name.as_bytes())
                .expect("Invalid header name"),
            header_value: HeaderValue::from_str(key_value)
                .expect("Invalid header value"),
        }
    }
}

impl<Svc, ReqBody, ResBody> Service<Request<ReqBody>> for AuthMiddleware<Svc>
where
    Svc: Service<Request<ReqBody>, Response = Response<ResBody>> + Clone + Send + 'static,
    Svc::Future: Send,
    ReqBody: Send + 'static,
{
    type Response = Svc::Response;
    type Error = Svc::Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, mut request: Request<ReqBody>) -> Self::Future {
        // Insert the auth header into the request
        request.headers_mut().insert(
            self.header_name.clone(),
            self.header_value.clone(),
        );

        let mut inner = self.inner.clone();
        Box::pin(async move { inner.call(request).await })
    }
}
```

## Implementing Retry Logic

Retries are essential for handling transient failures. Here's a retry middleware that handles common failure scenarios:

```rust
use tower::retry::{Policy, Retry};

#[derive(Clone)]
pub struct RetryPolicy {
    max_attempts: usize,
    current_attempt: usize,
}

impl RetryPolicy {
    pub fn new(max_attempts: usize) -> Self {
        Self {
            max_attempts,
            current_attempt: 0,
        }
    }
}

impl<Req: Clone, Res, E> Policy<Req, Res, E> for RetryPolicy {
    type Future = std::future::Ready<()>;

    fn retry(&mut self, _req: &mut Req, result: &mut Result<Res, E>) -> Option<Self::Future> {
        // Only retry on errors, not on successful responses
        if result.is_ok() {
            return None;
        }

        if self.current_attempt < self.max_attempts {
            self.current_attempt += 1;
            tracing::warn!(
                attempt = self.current_attempt,
                max_attempts = self.max_attempts,
                "Retrying request"
            );
            Some(std::future::ready(()))
        } else {
            None
        }
    }

    fn clone_request(&mut self, req: &Req) -> Option<Req> {
        Some(req.clone())
    }
}
```

## Composing the Middleware Stack

Now we bring everything together. Tower's `ServiceBuilder` makes composing middleware straightforward:

```rust
use tower::ServiceBuilder;
use tower::timeout::TimeoutLayer;

pub fn build_client_with_middleware<Svc>(
    base_service: Svc,
    api_token: &str,
) -> impl Service<
    Request<reqwest::Body>,
    Response = Response<reqwest::Body>,
    Error = Svc::Error,
>
where
    Svc: Service<Request<reqwest::Body>, Response = Response<reqwest::Body>> + Clone + Send + 'static,
    Svc::Future: Send,
    Svc::Error: Send + Sync,
{
    ServiceBuilder::new()
        // Outermost layer - timeout for the entire request including retries
        .layer(TimeoutLayer::new(Duration::from_secs(60)))
        // Logging captures timing for each attempt
        .layer_fn(|s| LoggingMiddleware::new(s, "api-client"))
        // Retry layer wraps the auth and inner service
        .layer_fn(|s| Retry::new(RetryPolicy::new(3), s))
        // Auth is closest to the actual request
        .layer_fn(|s| AuthMiddleware::bearer(s, api_token))
        .service(base_service)
}
```

The order matters here. Layers are applied from bottom to top, so the request flows through timeout first, then logging, then retry, and finally auth before hitting your base service.

## Putting It All Together

Here's a complete example showing how to use the middleware stack:

```rust
use tracing_subscriber;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    tracing_subscriber::fmt::init();

    // In a real app, load this from environment or config
    let api_token = std::env::var("API_TOKEN")
        .unwrap_or_else(|_| "your-api-token".to_string());

    // Create the base reqwest client
    let client = create_base_client();

    // Build a request
    let request = Request::builder()
        .method("GET")
        .uri("https://api.example.com/users")
        .body(reqwest::Body::default())?;

    // The middleware stack handles auth, logging, retries, and timeouts
    // You just focus on what you want to request

    tracing::info!("Making API request with full middleware stack");

    Ok(())
}
```

## Testing Middleware in Isolation

One advantage of the middleware pattern is testability. You can test each middleware independently using Tower's `ServiceExt`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_auth_middleware_adds_header() {
        // Create a mock service that captures the request
        let mock = tower::service_fn(|req: Request<()>| async move {
            // Verify the auth header was added
            assert!(req.headers().contains_key(http::header::AUTHORIZATION));
            let auth_value = req.headers().get(http::header::AUTHORIZATION).unwrap();
            assert!(auth_value.to_str().unwrap().starts_with("Bearer "));

            Ok::<_, std::convert::Infallible>(Response::new(()))
        });

        let mut service = AuthMiddleware::bearer(mock, "test-token");

        let request = Request::builder()
            .uri("http://test.local")
            .body(())
            .unwrap();

        let _ = service.ready().await.unwrap().call(request).await;
    }
}
```

## Wrapping Up

Building HTTP clients with middleware in Rust gives you a clean separation of concerns. Each piece of functionality - logging, auth, retries, timeouts - lives in its own module and can be tested independently. Tower's `Service` trait provides the foundation, and libraries like `tower-http` offer pre-built middleware for common needs.

The pattern scales well too. Need rate limiting? Add a layer. Want request deduplication? Another layer. Circuit breakers? You guessed it. The composability makes it easy to build exactly the client your application needs without cluttering your business logic with infrastructure concerns.

Start simple with logging and auth, then add more middleware as your requirements grow. Your future self will thank you when debugging production issues at 2 AM.
