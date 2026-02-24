# How to Use Wasm Plugins for Rate Limiting in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebAssembly, Rate Limiting, Envoy, Traffic Management

Description: Building a custom rate limiting Wasm plugin for Istio with per-client limiting, sliding windows, and configurable thresholds.

---

Istio supports rate limiting through Envoy's built-in rate limit service, but setting it up requires deploying a separate rate limit service (like envoy-ratelimit) with Redis. For simpler use cases, you can build a rate limiter directly as a Wasm plugin. It runs inside the proxy, requires no external dependencies, and gives you complete control over the limiting logic. The tradeoff is that it is per-proxy rather than global, but for many scenarios that is perfectly fine.

## Local vs Global Rate Limiting

Before building anything, it is important to understand the difference:

**Global rate limiting** uses a shared backend (like Redis) so all proxy instances share the same counters. If your rate limit is 100 requests per minute, the total across all instances is 100.

**Local rate limiting** maintains counters per proxy instance. If your rate limit is 100 requests per minute and you have 3 proxy replicas, the effective limit is 300 requests per minute.

Wasm plugins implement local rate limiting by default. For many use cases - protecting a single backend from overload, preventing abuse from specific clients, or enforcing fair usage - local rate limiting works well. You just need to account for the number of proxy instances when setting limits.

## Building a Token Bucket Rate Limiter

The token bucket algorithm is a good choice for rate limiting. Tokens are added to a bucket at a fixed rate, and each request consumes one token. If the bucket is empty, the request is rejected.

```rust
use proxy_wasm::traits::*;
use proxy_wasm::types::*;
use std::collections::HashMap;
use std::time::Duration;

proxy_wasm::main! {{
    proxy_wasm::set_log_level(LogLevel::Info);
    proxy_wasm::set_root_context(|_| -> Box<dyn RootContext> {
        Box::new(RateLimitRoot {
            max_tokens: 100,
            refill_rate: 10,  // tokens per second
            key_header: String::from("x-api-key"),
            response_code: 429,
        })
    });
}}

struct RateLimitRoot {
    max_tokens: u64,
    refill_rate: u64,
    key_header: String,
    response_code: u32,
}

impl Context for RateLimitRoot {}

impl RootContext for RateLimitRoot {
    fn on_configure(&mut self, _size: usize) -> bool {
        if let Some(config_bytes) = self.get_plugin_configuration() {
            if let Ok(config) = serde_json::from_slice::<serde_json::Value>(&config_bytes) {
                if let Some(max) = config["max_tokens"].as_u64() {
                    self.max_tokens = max;
                }
                if let Some(rate) = config["refill_rate"].as_u64() {
                    self.refill_rate = rate;
                }
                if let Some(header) = config["key_header"].as_str() {
                    self.key_header = header.to_string();
                }
                if let Some(code) = config["response_code"].as_u64() {
                    self.response_code = code as u32;
                }
            }
        }
        log::info!(
            "Rate limiter configured: max_tokens={}, refill_rate={}/s, key={}",
            self.max_tokens, self.refill_rate, self.key_header
        );
        true
    }

    fn create_http_context(&self, _context_id: u32) -> Option<Box<dyn HttpContext>> {
        Some(Box::new(RateLimitHttp {
            max_tokens: self.max_tokens,
            refill_rate: self.refill_rate,
            key_header: self.key_header.clone(),
            response_code: self.response_code,
        }))
    }

    fn get_type(&self) -> Option<ContextType> {
        Some(ContextType::HttpContext)
    }
}

struct RateLimitHttp {
    max_tokens: u64,
    refill_rate: u64,
    key_header: String,
    response_code: u32,
}

impl Context for RateLimitHttp {}

impl HttpContext for RateLimitHttp {
    fn on_http_request_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        // Get the rate limit key
        let key = self.get_http_request_header(&self.key_header)
            .unwrap_or_else(|| {
                // Fall back to source IP
                self.get_http_request_header("x-forwarded-for")
                    .unwrap_or_else(|| "unknown".to_string())
            });

        let bucket_key = format!("ratelimit_{}", key);
        let now = self.get_current_time()
            .duration_since(std::time::SystemTime::UNIX_EPOCH)
            .unwrap_or(Duration::from_secs(0))
            .as_secs();

        // Get current bucket state from shared data
        let (tokens, last_refill) = match self.get_shared_data(&bucket_key) {
            (Some(data), _) if data.len() >= 16 => {
                let tokens = u64::from_le_bytes(data[0..8].try_into().unwrap());
                let last = u64::from_le_bytes(data[8..16].try_into().unwrap());
                (tokens, last)
            }
            _ => (self.max_tokens, now),
        };

        // Calculate tokens to add based on elapsed time
        let elapsed = now.saturating_sub(last_refill);
        let new_tokens = (tokens + elapsed * self.refill_rate).min(self.max_tokens);

        if new_tokens == 0 {
            // Rate limited
            self.send_http_response(
                self.response_code,
                vec![
                    ("content-type", "application/json"),
                    ("retry-after", "1"),
                    ("x-ratelimit-limit", &self.max_tokens.to_string()),
                    ("x-ratelimit-remaining", "0"),
                ],
                Some(br#"{"error":"rate limit exceeded","message":"too many requests, try again later"}"#),
            );
            return Action::Pause;
        }

        // Consume a token
        let remaining = new_tokens - 1;
        let mut bucket_data = Vec::with_capacity(16);
        bucket_data.extend_from_slice(&remaining.to_le_bytes());
        bucket_data.extend_from_slice(&now.to_le_bytes());
        let _ = self.set_shared_data(&bucket_key, Some(&bucket_data), None);

        // Add rate limit headers to the response
        self.set_http_request_header("x-ratelimit-tokens", Some(&remaining.to_string()));

        Action::Continue
    }
}
```

## Deploying the Rate Limiter

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: rate-limiter
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  url: oci://registry.example.com/plugins/rate-limiter:v1.0
  phase: AUTHZ
  failStrategy: FAIL_OPEN
  pluginConfig:
    max_tokens: 100
    refill_rate: 10
    key_header: x-api-key
    response_code: 429
```

## Per-Endpoint Rate Limiting

You can extend the rate limiter to apply different limits per endpoint:

```yaml
pluginConfig:
  default_rate: 100
  endpoint_rates:
  - path_prefix: /api/search
    max_tokens: 20
    refill_rate: 2
  - path_prefix: /api/upload
    max_tokens: 5
    refill_rate: 1
  - path_prefix: /api/health
    max_tokens: 1000
    refill_rate: 100
```

In the plugin code, match the request path against configured endpoints:

```rust
fn on_http_request_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
    let path = self.get_http_request_header(":path").unwrap_or_default();

    // Find matching endpoint rate
    let (max_tokens, refill_rate) = self.endpoint_rates.iter()
        .find(|r| path.starts_with(&r.path_prefix))
        .map(|r| (r.max_tokens, r.refill_rate))
        .unwrap_or((self.default_max_tokens, self.default_refill_rate));

    // Use these values for the token bucket check
    // ... (same token bucket logic as before)

    Action::Continue
}
```

## Per-Client Tiered Rate Limiting

Different API clients might have different rate limits. You can implement tiered rate limiting:

```yaml
pluginConfig:
  tiers:
    free:
      max_tokens: 10
      refill_rate: 1
    basic:
      max_tokens: 100
      refill_rate: 10
    premium:
      max_tokens: 1000
      refill_rate: 100
  client_tiers:
    ak_free_001: free
    ak_basic_001: basic
    ak_premium_001: premium
  default_tier: free
```

## Adding Rate Limit Response Headers

It is good practice to include rate limit information in response headers so clients can self-regulate:

```rust
fn on_http_response_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
    if let Some(remaining) = self.get_http_request_header("x-ratelimit-tokens") {
        self.add_http_response_header("x-ratelimit-limit", &self.max_tokens.to_string());
        self.add_http_response_header("x-ratelimit-remaining", &remaining);
        self.add_http_response_header("x-ratelimit-reset", &self.next_reset_time());
    }
    Action::Continue
}
```

## Testing the Rate Limiter

```bash
# Send requests and observe rate limiting
for i in $(seq 1 120); do
  STATUS=$(kubectl exec test-pod -n my-app -- curl -s -o /dev/null -w "%{http_code}" \
    -H "x-api-key: test-key" http://api-gateway:8080/api/data)
  echo "Request $i: $STATUS"
done

# Check rate limit headers
kubectl exec test-pod -n my-app -- curl -v -H "x-api-key: test-key" http://api-gateway:8080/api/data 2>&1 | grep x-ratelimit
```

## Shared Data Limitations

The `set_shared_data` and `get_shared_data` functions share data across Wasm plugin instances within the same Envoy process. However, this data is not shared across:

- Different proxy pods (different Kubernetes pods)
- Different worker threads (depending on Envoy's configuration)

For true global rate limiting, you would need to use HTTP callouts to a rate limit service. But for per-proxy rate limiting, shared data works well and avoids the latency of external calls.

## Monitoring Rate Limiting

Define custom metrics to track rate limiting:

```rust
impl RootContext for RateLimitRoot {
    fn on_configure(&mut self, _size: usize) -> bool {
        self.allowed_counter = self.define_metric(
            MetricType::Counter, "custom_ratelimit_allowed_total"
        ).unwrap();
        self.rejected_counter = self.define_metric(
            MetricType::Counter, "custom_ratelimit_rejected_total"
        ).unwrap();
        true
    }
}
```

These metrics show up in Envoy's stats endpoint and can be scraped by Prometheus.

## Summary

Building a rate limiter as a Wasm plugin gives you complete control over limiting logic without requiring external dependencies like Redis. You can implement token bucket algorithms, per-endpoint limits, per-client tiers, and custom response headers. The tradeoff is that limiting is per-proxy instance rather than global, so you need to divide your limits by the number of proxy replicas. For many use cases, this local approach is simpler and faster than setting up a global rate limit service.
