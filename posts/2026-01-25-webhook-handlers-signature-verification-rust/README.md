# How to Build Webhook Handlers with Signature Verification in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Webhooks, Security, Signature Verification, API

Description: Learn how to build secure webhook handlers in Rust with HMAC signature verification. This guide covers parsing webhook payloads, validating signatures, and handling common providers like Stripe and GitHub.

---

> Webhooks are everywhere. Payment processors, version control systems, and countless SaaS products rely on them to notify your application about events. But accepting webhook requests without proper validation is a security risk. This guide shows you how to build secure webhook handlers in Rust.

When your application receives a webhook, how do you know it actually came from the service you expect? Without signature verification, anyone could send forged requests to your endpoint. Most webhook providers solve this by signing their payloads with a shared secret.

---

## How Webhook Signatures Work

Webhook providers typically sign payloads using HMAC-SHA256. The process looks like this:

1. Provider computes HMAC of the raw request body using your shared secret
2. Provider sends the signature in a header (like `X-Hub-Signature-256`)
3. Your server recomputes the HMAC and compares it to the header value
4. If they match, the request is authentic

The key insight: you need access to the raw request body before any parsing. Once you deserialize JSON, you can't reliably reproduce the exact bytes that were signed.

---

## Project Setup

First, set up a new Rust project with the dependencies you'll need:

```toml
# Cargo.toml
[package]
name = "webhook-handler"
version = "0.1.0"
edition = "2021"

[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
hmac = "0.12"
sha2 = "0.10"
hex = "0.4"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

---

## Building the Signature Verifier

Let's start with a reusable signature verification module:

```rust
// src/signature.rs
use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

pub struct SignatureVerifier {
    secret: Vec<u8>,
}

impl SignatureVerifier {
    pub fn new(secret: impl AsRef<[u8]>) -> Self {
        Self {
            secret: secret.as_ref().to_vec(),
        }
    }

    /// Verify a hex-encoded HMAC signature against a payload
    pub fn verify_hex(&self, payload: &[u8], signature: &str) -> bool {
        // Decode the hex signature
        let expected = match hex::decode(signature) {
            Ok(bytes) => bytes,
            Err(_) => return false,
        };

        self.verify_bytes(payload, &expected)
    }

    /// Verify a raw byte signature against a payload
    pub fn verify_bytes(&self, payload: &[u8], signature: &[u8]) -> bool {
        // Create HMAC instance with the secret
        let mut mac = match HmacSha256::new_from_slice(&self.secret) {
            Ok(mac) => mac,
            Err(_) => return false,
        };

        // Compute HMAC of the payload
        mac.update(payload);

        // Constant-time comparison to prevent timing attacks
        mac.verify_slice(signature).is_ok()
    }

    /// Compute signature for testing or debugging
    pub fn compute_hex(&self, payload: &[u8]) -> String {
        let mut mac = HmacSha256::new_from_slice(&self.secret)
            .expect("HMAC can take key of any size");
        mac.update(payload);
        hex::encode(mac.finalize().into_bytes())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_signature_verification() {
        let verifier = SignatureVerifier::new("my-secret-key");
        let payload = b"hello world";

        // Compute expected signature
        let signature = verifier.compute_hex(payload);

        // Verification should pass
        assert!(verifier.verify_hex(payload, &signature));

        // Wrong payload should fail
        assert!(!verifier.verify_hex(b"wrong payload", &signature));

        // Wrong signature should fail
        assert!(!verifier.verify_hex(payload, "invalid"));
    }
}
```

The `verify_slice` method from the `hmac` crate performs constant-time comparison. This is critical - using regular equality comparison would leak timing information that attackers could exploit.

---

## Axum Webhook Handler

Now let's build an HTTP handler with Axum that extracts the raw body and verifies the signature:

```rust
// src/main.rs
use axum::{
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode},
    routing::post,
    Router,
};
use serde::Deserialize;
use std::sync::Arc;

mod signature;
use signature::SignatureVerifier;

// Shared application state
struct AppState {
    verifier: SignatureVerifier,
}

#[tokio::main]
async fn main() {
    // Load secret from environment in production
    let secret = std::env::var("WEBHOOK_SECRET")
        .unwrap_or_else(|_| "development-secret".to_string());

    let state = Arc::new(AppState {
        verifier: SignatureVerifier::new(secret),
    });

    let app = Router::new()
        .route("/webhooks/github", post(github_webhook))
        .route("/webhooks/stripe", post(stripe_webhook))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .unwrap();

    println!("Listening on port 3000");
    axum::serve(listener, app).await.unwrap();
}

// GitHub webhook payload structure
#[derive(Debug, Deserialize)]
struct GitHubPushEvent {
    #[serde(rename = "ref")]
    git_ref: String,
    repository: GitHubRepository,
    commits: Vec<GitHubCommit>,
}

#[derive(Debug, Deserialize)]
struct GitHubRepository {
    full_name: String,
}

#[derive(Debug, Deserialize)]
struct GitHubCommit {
    id: String,
    message: String,
}

async fn github_webhook(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<StatusCode, StatusCode> {
    // Extract signature from header
    let signature = headers
        .get("x-hub-signature-256")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.strip_prefix("sha256="))
        .ok_or(StatusCode::UNAUTHORIZED)?;

    // Verify signature using raw bytes
    if !state.verifier.verify_hex(&body, signature) {
        eprintln!("Invalid webhook signature");
        return Err(StatusCode::UNAUTHORIZED);
    }

    // Now safe to parse the payload
    let event: GitHubPushEvent = serde_json::from_slice(&body)
        .map_err(|e| {
            eprintln!("Failed to parse payload: {}", e);
            StatusCode::BAD_REQUEST
        })?;

    // Process the verified webhook
    println!(
        "Push to {} on {}: {} commits",
        event.git_ref,
        event.repository.full_name,
        event.commits.len()
    );

    for commit in &event.commits {
        println!("  - {}: {}", &commit.id[..7], commit.message.lines().next().unwrap_or(""));
    }

    Ok(StatusCode::OK)
}
```

Notice that we extract the body as `Bytes` first, verify the signature, and only then parse the JSON. If you use an extractor like `Json<T>`, you lose access to the raw bytes.

---

## Handling Stripe Webhooks

Stripe uses a slightly different signature format that includes a timestamp to prevent replay attacks:

```rust
// Stripe signature header format: t=timestamp,v1=signature
fn parse_stripe_signature(header: &str) -> Option<(i64, String)> {
    let mut timestamp = None;
    let mut signature = None;

    for part in header.split(',') {
        if let Some(ts) = part.strip_prefix("t=") {
            timestamp = ts.parse().ok();
        } else if let Some(sig) = part.strip_prefix("v1=") {
            signature = Some(sig.to_string());
        }
    }

    match (timestamp, signature) {
        (Some(t), Some(s)) => Some((t, s)),
        _ => None,
    }
}

async fn stripe_webhook(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<StatusCode, StatusCode> {
    // Extract and parse Stripe signature header
    let sig_header = headers
        .get("stripe-signature")
        .and_then(|v| v.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let (timestamp, signature) = parse_stripe_signature(sig_header)
        .ok_or(StatusCode::UNAUTHORIZED)?;

    // Check timestamp to prevent replay attacks (5 minute window)
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    if (now - timestamp).abs() > 300 {
        eprintln!("Webhook timestamp too old");
        return Err(StatusCode::UNAUTHORIZED);
    }

    // Stripe signs: "{timestamp}.{payload}"
    let signed_payload = format!("{}.{}", timestamp, String::from_utf8_lossy(&body));

    if !state.verifier.verify_hex(signed_payload.as_bytes(), &signature) {
        eprintln!("Invalid Stripe signature");
        return Err(StatusCode::UNAUTHORIZED);
    }

    // Parse and process the event
    let event: serde_json::Value = serde_json::from_slice(&body)
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    let event_type = event["type"].as_str().unwrap_or("unknown");
    println!("Received Stripe event: {}", event_type);

    Ok(StatusCode::OK)
}
```

The timestamp check prevents replay attacks where an attacker captures a valid webhook and resends it later. Five minutes is a reasonable window that accounts for clock drift while limiting the attack surface.

---

## Error Handling Best Practices

When signature verification fails, be careful about what you reveal:

```rust
use axum::response::{IntoResponse, Response};

enum WebhookError {
    MissingSignature,
    InvalidSignature,
    PayloadTooLarge,
    ParseError(String),
}

impl IntoResponse for WebhookError {
    fn into_response(self) -> Response {
        // Log detailed error internally
        match &self {
            WebhookError::MissingSignature => {
                tracing::warn!("Webhook received without signature header");
            }
            WebhookError::InvalidSignature => {
                tracing::warn!("Webhook signature verification failed");
            }
            WebhookError::PayloadTooLarge => {
                tracing::warn!("Webhook payload exceeded size limit");
            }
            WebhookError::ParseError(e) => {
                tracing::error!("Failed to parse webhook payload: {}", e);
            }
        }

        // Return generic error to client - don't leak details
        StatusCode::UNAUTHORIZED.into_response()
    }
}
```

Always return the same status code for authentication failures. Returning different codes for "missing signature" versus "invalid signature" helps attackers probe your system.

---

## Testing Your Webhook Handler

Write integration tests that verify the complete flow:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, http::Request};
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_valid_github_webhook() {
        let secret = "test-secret";
        let state = Arc::new(AppState {
            verifier: SignatureVerifier::new(secret),
        });

        let app = Router::new()
            .route("/webhooks/github", post(github_webhook))
            .with_state(state.clone());

        let payload = r#"{"ref":"refs/heads/main","repository":{"full_name":"user/repo"},"commits":[]}"#;
        let signature = state.verifier.compute_hex(payload.as_bytes());

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/webhooks/github")
                    .header("content-type", "application/json")
                    .header("x-hub-signature-256", format!("sha256={}", signature))
                    .body(Body::from(payload))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_invalid_signature_rejected() {
        let state = Arc::new(AppState {
            verifier: SignatureVerifier::new("test-secret"),
        });

        let app = Router::new()
            .route("/webhooks/github", post(github_webhook))
            .with_state(state);

        let payload = r#"{"ref":"refs/heads/main","repository":{"full_name":"user/repo"},"commits":[]}"#;

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/webhooks/github")
                    .header("content-type", "application/json")
                    .header("x-hub-signature-256", "sha256=invalid")
                    .body(Body::from(payload))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }
}
```

---

## Production Considerations

A few things to keep in mind when deploying webhook handlers:

**Idempotency**: Webhooks can be delivered multiple times. Use the event ID to deduplicate, storing processed IDs in a database with an expiration window.

**Timeouts**: Webhook providers expect quick responses (usually under 30 seconds). For long-running tasks, acknowledge the webhook immediately and process asynchronously.

**Payload Size**: Set reasonable limits on request body size. Most webhooks are small, so 1MB is generous. Axum's `DefaultBodyLimit` layer handles this.

**Logging**: Log webhook events for debugging, but be careful not to log sensitive data from the payload.

---

## Conclusion

Webhook signature verification in Rust is straightforward once you understand the pattern: capture raw bytes, verify HMAC, then parse. The `hmac` crate handles the cryptographic heavy lifting, including constant-time comparison.

Key takeaways:

- Always verify signatures before processing webhooks
- Use constant-time comparison to prevent timing attacks
- Check timestamps when the provider includes them
- Return generic errors to avoid leaking information
- Test both valid and invalid signature scenarios

With these patterns, you can confidently accept webhooks from any provider while keeping your application secure.

---

*Need to monitor your webhook handlers in production? [OneUptime](https://oneuptime.com) provides endpoint monitoring with latency tracking and alerting.*

**Related Reading:**
- [How to Implement Retry with Exponential Backoff in Node.js](https://oneuptime.com/blog/post/2026-01-06-nodejs-retry-exponential-backoff/view)
