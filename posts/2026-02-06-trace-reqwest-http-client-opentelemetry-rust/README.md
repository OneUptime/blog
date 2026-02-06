# How to Trace Reqwest HTTP Client Calls with OpenTelemetry in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Rust, Reqwest, HTTP Client, Tracing, Async

Description: Implement distributed tracing for Reqwest HTTP client calls using OpenTelemetry to monitor external API calls, track latency, and propagate trace context.

External HTTP calls often represent the most unpredictable part of application behavior. Third-party APIs introduce latency, rate limits, and failures beyond your control. Without proper instrumentation, diagnosing issues with external dependencies becomes nearly impossible.

This guide demonstrates how to instrument Reqwest, Rust's most popular HTTP client, with OpenTelemetry to capture detailed traces of outbound HTTP requests, propagate distributed trace context, and monitor external service health.

## Why Trace HTTP Client Calls

Monitoring outbound HTTP requests reveals critical system behavior:

- Track latency introduced by external services
- Identify retry patterns and failure rates
- Monitor rate limiting and throttling
- Correlate client calls with server-side traces
- Detect timeouts and connection issues
- Measure impact of third-party API changes

## Distributed Tracing Flow

Here's how trace context propagates through HTTP calls:

```mermaid
graph LR
    A[Your Service] -->|Create Span| B[Reqwest Client]
    B -->|Inject Headers| C[HTTP Request]
    C -->|W3C Traceparent| D[External API]
    D -->|Process with Context| E[External Service Span]
    E -->|Response| F[Return to Client]
    F -->|Record Metrics| G[OpenTelemetry]
    G -->|Export| H[Backend Collector]
```

The traceparent header carries context across service boundaries, enabling end-to-end distributed tracing.

## Dependencies Setup

Add required crates to your `Cargo.toml`:

```toml
[dependencies]
# Reqwest HTTP client with OpenTelemetry integration
reqwest = { version = "0.11", features = ["json", "rustls-tls"] }
reqwest-middleware = "0.2"
reqwest-tracing = { version = "0.4", features = ["opentelemetry_0_22"] }

# OpenTelemetry ecosystem
opentelemetry = { version = "0.22", features = ["trace"] }
opentelemetry_sdk = { version = "0.22", features = ["rt-tokio"] }
opentelemetry-otlp = { version = "0.15", features = ["tonic"] }
opentelemetry-http = "0.11"

# Tracing integration
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
tracing-opentelemetry = "0.23"

# Async runtime
tokio = { version = "1.35", features = ["full"] }

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Error handling
anyhow = "1.0"
thiserror = "1.0"
```

## Initialize OpenTelemetry Tracer

Set up the tracing pipeline with HTTP semantic conventions:

```rust
use opentelemetry::{global, trace::TracerProvider as _, KeyValue};
use opentelemetry_otlp::WithExportConfig;
use opentelemetry_sdk::{runtime, trace::TracerProvider, Resource};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

fn init_tracer() -> Result<TracerProvider, Box<dyn std::error::Error>> {
    let exporter = opentelemetry_otlp::new_exporter()
        .tonic()
        .with_endpoint("http://localhost:4317");

    let provider = opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(exporter)
        .with_trace_config(
            opentelemetry_sdk::trace::Config::default()
                .with_resource(Resource::new(vec![
                    KeyValue::new("service.name", "http-client-service"),
                    KeyValue::new("service.version", "1.0.0"),
                ]))
        )
        .install_batch(runtime::Tokio)?;

    let telemetry = tracing_opentelemetry::layer()
        .with_tracer(provider.tracer("reqwest-client"));

    tracing_subscriber::registry()
        .with(EnvFilter::from_default_env())
        .with(telemetry)
        .with(tracing_subscriber::fmt::layer())
        .init();

    Ok(provider)
}
```

## Create Instrumented Reqwest Client

Build a client with automatic tracing middleware:

```rust
use reqwest_middleware::{ClientBuilder, ClientWithMiddleware};
use reqwest_tracing::{TracingMiddleware, SpanBackendWithUrl};

fn create_traced_client() -> ClientWithMiddleware {
    let reqwest_client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .pool_max_idle_per_host(10)
        .build()
        .expect("Failed to build reqwest client");

    // Wrap with middleware that adds OpenTelemetry tracing
    ClientBuilder::new(reqwest_client)
        .with(TracingMiddleware::<SpanBackendWithUrl>::new())
        .build()
}
```

## Basic HTTP Request Tracing

Make traced HTTP requests with automatic instrumentation:

```rust
use tracing::{info, instrument};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
struct CreatePostRequest {
    title: String,
    body: String,
    user_id: u32,
}

#[derive(Debug, Deserialize)]
struct Post {
    id: u32,
    title: String,
    body: String,
    user_id: u32,
}

#[instrument(skip(client))]
async fn fetch_post(client: &ClientWithMiddleware, post_id: u32) -> Result<Post, reqwest::Error> {
    info!(post_id = post_id, "Fetching post from API");

    let url = format!("https://jsonplaceholder.typicode.com/posts/{}", post_id);

    // The TracingMiddleware automatically creates a span and propagates context
    let response = client
        .get(&url)
        .send()
        .await?;

    info!(
        status = response.status().as_u16(),
        "Response received"
    );

    let post = response.json::<Post>().await?;

    info!(post.id = post.id, post.title = %post.title, "Post fetched successfully");

    Ok(post)
}

#[instrument(skip(client, request))]
async fn create_post(
    client: &ClientWithMiddleware,
    request: CreatePostRequest,
) -> Result<Post, reqwest::Error> {
    info!(title = %request.title, "Creating new post");

    let url = "https://jsonplaceholder.typicode.com/posts";

    let response = client
        .post(url)
        .json(&request)
        .send()
        .await?;

    info!(status = response.status().as_u16(), "Post created");

    let post = response.json::<Post>().await?;

    Ok(post)
}
```

## Custom Request Headers and Context

Add custom headers and metadata to traced requests:

```rust
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};

#[instrument(skip(client))]
async fn authenticated_request(
    client: &ClientWithMiddleware,
    token: &str,
    user_id: u32,
) -> Result<serde_json::Value, reqwest::Error> {
    info!("Making authenticated API request");

    let mut headers = HeaderMap::new();
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Bearer {}", token))
            .expect("Invalid token format"),
    );
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

    // Add custom tracing headers
    headers.insert(
        "X-User-ID",
        HeaderValue::from_str(&user_id.to_string())
            .expect("Invalid user ID"),
    );

    let response = client
        .get("https://api.example.com/user/profile")
        .headers(headers)
        .send()
        .await?;

    info!(
        status = response.status().as_u16(),
        content_length = response.content_length().unwrap_or(0),
        "Authenticated request completed"
    );

    let data = response.json::<serde_json::Value>().await?;

    Ok(data)
}
```

## Error Handling with Trace Context

Implement comprehensive error handling that preserves trace information:

```rust
use thiserror::Error;
use tracing::{error, warn};

#[derive(Error, Debug)]
pub enum ApiError {
    #[error("HTTP request failed: {0}")]
    RequestFailed(#[from] reqwest::Error),

    #[error("Invalid response format: {0}")]
    InvalidResponse(String),

    #[error("API rate limit exceeded")]
    RateLimited,

    #[error("Resource not found")]
    NotFound,

    #[error("Unauthorized access")]
    Unauthorized,
}

#[instrument(skip(client))]
async fn fetch_with_error_handling(
    client: &ClientWithMiddleware,
    url: &str,
) -> Result<serde_json::Value, ApiError> {
    info!(url = url, "Sending HTTP request");

    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| {
            error!(error = %e, "HTTP request failed");
            ApiError::RequestFailed(e)
        })?;

    let status = response.status();

    // Handle different status codes with appropriate logging
    match status.as_u16() {
        200..=299 => {
            info!(status = status.as_u16(), "Request successful");
        }
        404 => {
            warn!("Resource not found");
            return Err(ApiError::NotFound);
        }
        401 | 403 => {
            warn!(status = status.as_u16(), "Authentication failed");
            return Err(ApiError::Unauthorized);
        }
        429 => {
            warn!("Rate limit exceeded");
            return Err(ApiError::RateLimited);
        }
        _ => {
            error!(status = status.as_u16(), "Unexpected status code");
        }
    }

    let data = response
        .json::<serde_json::Value>()
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to parse response");
            ApiError::InvalidResponse(e.to_string())
        })?;

    Ok(data)
}
```

## Retry Logic with Tracing

Implement retry mechanisms that capture each attempt:

```rust
use tokio::time::{sleep, Duration};

#[instrument(skip(client))]
async fn fetch_with_retry(
    client: &ClientWithMiddleware,
    url: &str,
    max_retries: u32,
) -> Result<serde_json::Value, ApiError> {
    let mut attempt = 0;

    loop {
        attempt += 1;

        info!(
            attempt = attempt,
            max_retries = max_retries,
            "Attempting HTTP request"
        );

        match client.get(url).send().await {
            Ok(response) => {
                let status = response.status();

                if status.is_success() {
                    info!(
                        attempt = attempt,
                        status = status.as_u16(),
                        "Request succeeded"
                    );

                    return response
                        .json::<serde_json::Value>()
                        .await
                        .map_err(|e| ApiError::InvalidResponse(e.to_string()));
                }

                if status.as_u16() == 429 || status.is_server_error() {
                    warn!(
                        attempt = attempt,
                        status = status.as_u16(),
                        "Retryable error occurred"
                    );

                    if attempt >= max_retries {
                        error!("Max retries exceeded");
                        return Err(ApiError::RateLimited);
                    }

                    // Exponential backoff
                    let delay = Duration::from_millis(100 * 2_u64.pow(attempt - 1));
                    warn!(delay_ms = delay.as_millis(), "Retrying after delay");
                    sleep(delay).await;
                    continue;
                } else {
                    error!(
                        status = status.as_u16(),
                        "Non-retryable error"
                    );
                    return Err(ApiError::NotFound);
                }
            }
            Err(e) => {
                error!(
                    attempt = attempt,
                    error = %e,
                    "Request failed"
                );

                if attempt >= max_retries {
                    error!("Max retries exceeded");
                    return Err(ApiError::RequestFailed(e));
                }

                let delay = Duration::from_millis(100 * 2_u64.pow(attempt - 1));
                warn!(delay_ms = delay.as_millis(), "Retrying after delay");
                sleep(delay).await;
            }
        }
    }
}
```

## Parallel Requests with Context Propagation

Execute multiple HTTP requests concurrently while maintaining trace context:

```rust
use futures::future::join_all;

#[instrument(skip(client))]
async fn fetch_multiple_posts(
    client: &ClientWithMiddleware,
    post_ids: Vec<u32>,
) -> Vec<Result<Post, reqwest::Error>> {
    info!(
        count = post_ids.len(),
        "Fetching multiple posts concurrently"
    );

    // Create a future for each post ID
    let futures: Vec<_> = post_ids
        .into_iter()
        .map(|id| {
            let client = client.clone();
            async move {
                fetch_post(&client, id).await
            }
        })
        .collect();

    // Execute all requests concurrently
    let results = join_all(futures).await;

    let success_count = results.iter().filter(|r| r.is_ok()).count();
    let error_count = results.len() - success_count;

    info!(
        total = results.len(),
        success = success_count,
        errors = error_count,
        "Batch request completed"
    );

    results
}

#[instrument(skip(client))]
async fn aggregate_user_data(
    client: &ClientWithMiddleware,
    user_id: u32,
) -> Result<UserData, ApiError> {
    info!(user_id = user_id, "Aggregating user data from multiple sources");

    // Fetch user profile, posts, and comments concurrently
    let (profile_result, posts_result, comments_result) = tokio::join!(
        fetch_user_profile(client, user_id),
        fetch_user_posts(client, user_id),
        fetch_user_comments(client, user_id)
    );

    let profile = profile_result?;
    let posts = posts_result?;
    let comments = comments_result?;

    info!(
        post_count = posts.len(),
        comment_count = comments.len(),
        "User data aggregated successfully"
    );

    Ok(UserData {
        profile,
        posts,
        comments,
    })
}

#[derive(Debug)]
struct UserData {
    profile: serde_json::Value,
    posts: Vec<Post>,
    comments: Vec<serde_json::Value>,
}

async fn fetch_user_profile(
    client: &ClientWithMiddleware,
    user_id: u32,
) -> Result<serde_json::Value, ApiError> {
    let url = format!("https://jsonplaceholder.typicode.com/users/{}", user_id);
    fetch_with_error_handling(client, &url).await
}

async fn fetch_user_posts(
    client: &ClientWithMiddleware,
    user_id: u32,
) -> Result<Vec<Post>, ApiError> {
    let url = format!("https://jsonplaceholder.typicode.com/posts?userId={}", user_id);
    let response = client.get(&url).send().await?;
    let posts = response.json::<Vec<Post>>().await
        .map_err(|e| ApiError::InvalidResponse(e.to_string()))?;
    Ok(posts)
}

async fn fetch_user_comments(
    client: &ClientWithMiddleware,
    user_id: u32,
) -> Result<Vec<serde_json::Value>, ApiError> {
    let url = format!("https://jsonplaceholder.typicode.com/comments?postId={}", user_id);
    let response = client.get(&url).send().await?;
    let comments = response.json::<Vec<serde_json::Value>>().await
        .map_err(|e| ApiError::InvalidResponse(e.to_string()))?;
    Ok(comments)
}
```

## Streaming Response Handling

Trace streaming responses and large downloads:

```rust
use futures::StreamExt;
use reqwest::Response;

#[instrument(skip(client))]
async fn download_large_file(
    client: &ClientWithMiddleware,
    url: &str,
) -> Result<Vec<u8>, ApiError> {
    info!(url = url, "Starting large file download");

    let response = client.get(url).send().await?;

    let total_size = response.content_length().unwrap_or(0);
    info!(total_bytes = total_size, "Download started");

    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;
    let mut buffer = Vec::new();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result?;
        downloaded += chunk.len() as u64;

        buffer.extend_from_slice(&chunk);

        // Log progress periodically
        if downloaded % (1024 * 1024) == 0 {
            let progress = if total_size > 0 {
                (downloaded as f64 / total_size as f64) * 100.0
            } else {
                0.0
            };

            info!(
                downloaded_bytes = downloaded,
                total_bytes = total_size,
                progress_percent = format!("{:.2}", progress),
                "Download progress"
            );
        }
    }

    info!(
        total_bytes = downloaded,
        "Download completed"
    );

    Ok(buffer)
}
```

## Request and Response Logging

Implement detailed logging for debugging:

```rust
use tracing::debug;

#[instrument(skip(client, body))]
async fn detailed_request(
    client: &ClientWithMiddleware,
    url: &str,
    body: serde_json::Value,
) -> Result<serde_json::Value, ApiError> {
    debug!(url = url, "Preparing request");
    debug!(body = ?body, "Request body");

    let request = client
        .post(url)
        .json(&body)
        .build()?;

    debug!(
        method = %request.method(),
        url = %request.url(),
        "Built request"
    );

    let response = client.execute(request).await?;

    debug!(
        status = response.status().as_u16(),
        headers = ?response.headers(),
        "Response received"
    );

    let response_body = response.json::<serde_json::Value>().await?;

    debug!(response = ?response_body, "Response body parsed");

    Ok(response_body)
}
```

## Complete Application Example

Bring everything together in a working application:

```rust
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize OpenTelemetry
    let provider = init_tracer()?;

    info!("HTTP client application started");

    // Create traced client
    let client = create_traced_client();

    // Execute various traced operations
    demo_traced_requests(&client).await?;

    // Graceful shutdown
    info!("Shutting down");
    opentelemetry::global::shutdown_tracer_provider();
    provider.shutdown()?;

    Ok(())
}

#[instrument(skip(client))]
async fn demo_traced_requests(client: &ClientWithMiddleware) -> Result<(), ApiError> {
    // Single request
    let post = fetch_post(client, 1).await?;
    info!(post.title = %post.title, "Fetched single post");

    // Create new resource
    let new_post = CreatePostRequest {
        title: "Test Post".to_string(),
        body: "This is a test post".to_string(),
        user_id: 1,
    };
    let created = create_post(client, new_post).await?;
    info!(created.id = created.id, "Created new post");

    // Parallel requests
    let post_ids = vec![1, 2, 3, 4, 5];
    let results = fetch_multiple_posts(client, post_ids).await;
    info!(success_count = results.iter().filter(|r| r.is_ok()).count(), "Batch fetch completed");

    // Request with retry
    let data = fetch_with_retry(
        client,
        "https://jsonplaceholder.typicode.com/posts/1",
        3,
    )
    .await?;
    info!("Fetch with retry succeeded");

    // Aggregate multiple sources
    let user_data = aggregate_user_data(client, 1).await?;
    info!(
        posts = user_data.posts.len(),
        comments = user_data.comments.len(),
        "User data aggregated"
    );

    Ok(())
}
```

## Testing Traced Clients

Write tests that verify tracing behavior:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::{MockServer, Mock, ResponseTemplate};
    use wiremock::matchers::{method, path};

    #[tokio::test]
    async fn test_traced_request() {
        let provider = init_tracer().unwrap();

        // Start mock server
        let mock_server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/posts/1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "id": 1,
                "title": "Test Post",
                "body": "Test body",
                "userId": 1
            })))
            .mount(&mock_server)
            .await;

        let client = create_traced_client();
        let url = format!("{}/posts/1", mock_server.uri());

        let result = fetch_with_error_handling(&client, &url).await;

        assert!(result.is_ok());

        provider.shutdown().unwrap();
    }
}
```

## Performance Considerations

When tracing HTTP client calls:

**Connection Reuse**: Always reuse the same client instance. Creating new clients per request defeats connection pooling and adds overhead.

**Selective Tracing**: Use sampling for high-frequency API calls to reduce trace storage costs while maintaining visibility.

**Timeout Configuration**: Set appropriate timeouts to prevent spans from remaining open indefinitely when external services hang.

**Header Overhead**: W3C traceparent headers add minimal overhead. The performance benefit of distributed tracing far outweighs the small additional bandwidth.

**Async Runtime**: Reqwest runs on Tokio. Ensure your OpenTelemetry exporter also uses the Tokio runtime to avoid blocking operations.

**Error Retry Spans**: Each retry attempt creates a new span, providing complete visibility into retry behavior and helping tune retry policies.

Instrumenting Reqwest with OpenTelemetry provides complete visibility into your application's external dependencies. Distributed trace context propagation enables end-to-end tracing across service boundaries, while detailed span attributes reveal exactly how your application interacts with external APIs. This observability is essential for building reliable systems that depend on third-party services.
