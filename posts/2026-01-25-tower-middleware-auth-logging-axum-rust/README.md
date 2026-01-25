# How to Build Tower Middleware for Auth and Logging in Axum

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Axum, Tower, Middleware, Authentication

Description: Learn how to build reusable Tower middleware layers in Axum for authentication and request logging, with practical code examples you can drop into production.

---

Axum has quickly become one of the most popular web frameworks in the Rust ecosystem. Built on top of Tower, it gives you a powerful middleware system that lets you intercept requests and responses without cluttering your handlers. In this post, we'll build two practical middleware layers: one for authentication and one for request logging.

## Why Tower Middleware?

Tower is a library of modular, reusable components for building network applications. Axum uses Tower's `Service` and `Layer` traits under the hood, which means any middleware you write can be composed, stacked, and reused across different parts of your application.

The key abstractions are:

- **Service**: Something that takes a request and returns a response (eventually).
- **Layer**: A factory that wraps a service to add behavior before or after the inner service runs.

This design keeps your route handlers clean. Authentication, logging, rate limiting, and tracing all live in middleware where they belong.

## Setting Up Your Project

First, add the necessary dependencies to your `Cargo.toml`:

```toml
[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
tower = "0.4"
tower-http = { version = "0.5", features = ["trace"] }
tracing = "0.1"
tracing-subscriber = "0.3"
http = "1"
pin-project-lite = "0.2"
```

## Building an Authentication Middleware

Let's start with a practical authentication layer. This middleware will check for an `Authorization` header and validate it before the request reaches your handler.

```rust
use axum::{
    body::Body,
    http::{Request, Response, StatusCode},
    response::IntoResponse,
};
use pin_project_lite::pin_project;
use std::{
    future::Future,
    pin::Pin,
    task::{Context, Poll},
};
use tower::{Layer, Service};

// The layer that will be applied to routes
#[derive(Clone)]
pub struct AuthLayer {
    // In production, you'd inject a token validator or database pool
    expected_token: String,
}

impl AuthLayer {
    pub fn new(expected_token: impl Into<String>) -> Self {
        Self {
            expected_token: expected_token.into(),
        }
    }
}

impl<S> Layer<S> for AuthLayer {
    type Service = AuthMiddleware<S>;

    fn layer(&self, inner: S) -> Self::Service {
        AuthMiddleware {
            inner,
            expected_token: self.expected_token.clone(),
        }
    }
}

// The actual middleware service
#[derive(Clone)]
pub struct AuthMiddleware<S> {
    inner: S,
    expected_token: String,
}

impl<S> Service<Request<Body>> for AuthMiddleware<S>
where
    S: Service<Request<Body>, Response = Response<Body>> + Clone + Send + 'static,
    S::Future: Send,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = AuthFuture<S::Future>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, req: Request<Body>) -> Self::Future {
        // Extract the Authorization header
        let auth_header = req
            .headers()
            .get("Authorization")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string());

        // Check if the token matches
        let is_authorized = auth_header
            .as_ref()
            .map(|token| token.strip_prefix("Bearer ").unwrap_or(token))
            .map(|token| token == self.expected_token)
            .unwrap_or(false);

        if is_authorized {
            // Token is valid, proceed to the inner service
            AuthFuture::Authorized(self.inner.call(req))
        } else {
            // Token is missing or invalid, return 401
            AuthFuture::Unauthorized
        }
    }
}

// Custom future to handle both authorized and unauthorized cases
pin_project! {
    #[project = AuthFutureProj]
    pub enum AuthFuture<F> {
        Authorized { #[pin] future: F },
        Unauthorized,
    }
}

impl<F, E> Future for AuthFuture<F>
where
    F: Future<Output = Result<Response<Body>, E>>,
{
    type Output = Result<Response<Body>, E>;

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        match self.project() {
            AuthFutureProj::Authorized { future } => future.poll(cx),
            AuthFutureProj::Unauthorized => {
                let response = (StatusCode::UNAUTHORIZED, "Unauthorized").into_response();
                Poll::Ready(Ok(response))
            }
        }
    }
}
```

The middleware validates tokens before requests reach your handlers. If authentication fails, it short-circuits and returns a 401 response immediately.

## Building a Logging Middleware

Next, let's build a logging layer that captures request details and response times. This is invaluable for debugging and observability.

```rust
use axum::{body::Body, http::Request};
use std::{
    future::Future,
    pin::Pin,
    task::{Context, Poll},
    time::Instant,
};
use tower::{Layer, Service};

#[derive(Clone)]
pub struct LoggingLayer;

impl<S> Layer<S> for LoggingLayer {
    type Service = LoggingMiddleware<S>;

    fn layer(&self, inner: S) -> Self::Service {
        LoggingMiddleware { inner }
    }
}

#[derive(Clone)]
pub struct LoggingMiddleware<S> {
    inner: S,
}

impl<S, ResBody> Service<Request<Body>> for LoggingMiddleware<S>
where
    S: Service<Request<Body>, Response = axum::http::Response<ResBody>> + Clone + Send + 'static,
    S::Future: Send,
    ResBody: Send,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = LoggingFuture<S::Future>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, req: Request<Body>) -> Self::Future {
        // Capture request details before passing to inner service
        let method = req.method().clone();
        let uri = req.uri().clone();
        let start = Instant::now();

        tracing::info!(
            method = %method,
            uri = %uri,
            "Incoming request"
        );

        LoggingFuture {
            future: self.inner.call(req),
            method,
            uri,
            start,
        }
    }
}

pin_project! {
    pub struct LoggingFuture<F> {
        #[pin]
        future: F,
        method: axum::http::Method,
        uri: axum::http::Uri,
        start: Instant,
    }
}

impl<F, ResBody, E> Future for LoggingFuture<F>
where
    F: Future<Output = Result<axum::http::Response<ResBody>, E>>,
{
    type Output = F::Output;

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        let this = self.project();

        match this.future.poll(cx) {
            Poll::Ready(result) => {
                let elapsed = this.start.elapsed();

                match &result {
                    Ok(response) => {
                        tracing::info!(
                            method = %this.method,
                            uri = %this.uri,
                            status = %response.status(),
                            duration_ms = elapsed.as_millis(),
                            "Request completed"
                        );
                    }
                    Err(_) => {
                        tracing::error!(
                            method = %this.method,
                            uri = %this.uri,
                            duration_ms = elapsed.as_millis(),
                            "Request failed"
                        );
                    }
                }

                Poll::Ready(result)
            }
            Poll::Pending => Poll::Pending,
        }
    }
}
```

This middleware logs the method, URI, status code, and duration for every request. You can extend it to include headers, request IDs, or user information extracted from the auth layer.

## Wiring It All Together

Now let's compose these layers in an Axum application:

```rust
use axum::{routing::get, Router};
use tower::ServiceBuilder;
use tracing_subscriber;

// Your handler - notice how clean it is without auth or logging logic
async fn protected_handler() -> &'static str {
    "You have access to the secret data!"
}

async fn health_check() -> &'static str {
    "OK"
}

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Build the middleware stack
    let middleware_stack = ServiceBuilder::new()
        .layer(LoggingLayer)
        .layer(AuthLayer::new("my-secret-token"));

    // Create protected routes with the middleware stack
    let protected_routes = Router::new()
        .route("/secret", get(protected_handler))
        .layer(middleware_stack);

    // Public routes without auth (but still with logging)
    let public_routes = Router::new()
        .route("/health", get(health_check))
        .layer(LoggingLayer);

    // Combine into the final app
    let app = Router::new()
        .merge(protected_routes)
        .merge(public_routes);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    tracing::info!("Server running on http://0.0.0.0:3000");
    axum::serve(listener, app).await.unwrap();
}
```

The `ServiceBuilder` applies layers in order from bottom to top. In this example, requests first hit the logging layer, then the auth layer. This means every request gets logged, even failed authentication attempts.

## Testing Your Middleware

You can test the endpoints with curl:

```bash
# This should return 401 Unauthorized
curl -i http://localhost:3000/secret

# This should succeed
curl -i -H "Authorization: Bearer my-secret-token" http://localhost:3000/secret

# Health check is public
curl -i http://localhost:3000/health
```

Your logs will show structured output like:

```
INFO Incoming request method=GET uri=/secret
INFO Request completed method=GET uri=/secret status=401 duration_ms=0
```

## Practical Tips

A few things I've learned from running Tower middleware in production:

**Keep layers focused.** Each layer should do one thing well. Don't combine auth and logging into a single layer - compose them instead.

**Clone carefully.** Services need to be `Clone` because Axum may clone them for concurrent request handling. Make sure your middleware state is cheap to clone or wrapped in `Arc`.

**Use tower-http for common cases.** The `tower-http` crate provides battle-tested middleware for tracing, compression, CORS, and more. Don't reinvent the wheel unless you have specific requirements.

**Consider using `from_fn` for simple cases.** Axum provides `axum::middleware::from_fn` for simpler middleware that doesn't need the full Tower machinery:

```rust
use axum::{middleware, extract::Request, http::StatusCode};

async fn simple_auth(
    req: Request,
    next: middleware::Next,
) -> Result<impl IntoResponse, StatusCode> {
    // Quick auth check for simpler use cases
    let auth = req.headers().get("Authorization");
    if auth.is_some() {
        Ok(next.run(req).await)
    } else {
        Err(StatusCode::UNAUTHORIZED)
    }
}
```

This is great for prototyping, but the full `Layer` and `Service` implementation gives you more control over async behavior and error handling.

---

Tower middleware in Axum gives you a clean way to handle cross-cutting concerns like authentication and logging. The initial boilerplate might seem verbose compared to other frameworks, but the composability and type safety pay off as your application grows. Start simple, extract common patterns into layers, and your route handlers stay focused on business logic.
