# How to Use Wasm Plugins for Custom Logging in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebAssembly, Logging, Observability, Envoy

Description: Building custom logging Wasm plugins for Istio to capture structured request data, send logs to external services, and implement access logging.

---

Istio provides access logging through Envoy, but the built-in logging format may not match what your organization needs. Maybe you need to log specific headers, include request body hashes for audit trails, send logs to a custom aggregation service, or apply conditional logging rules. Wasm plugins let you build exactly the logging pipeline you need, running directly in the proxy with access to all request and response data.

## Why Custom Logging with Wasm

The built-in Istio access log supports a template format that covers many use cases:

```yaml
# Standard Istio access logging config
meshConfig:
  accessLogFile: /dev/stdout
  accessLogFormat: "[%START_TIME%] \"%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%\" %RESPONSE_CODE%\n"
```

But this falls short when you need:

- Conditional logging (only log errors, only log specific endpoints)
- Structured JSON logs with custom fields
- Request/response body logging for audit trails
- Sending logs to external services via HTTP
- Sampling and rate-limited logging
- Correlation with application-level trace IDs

## Building a Structured Access Logger

Here is a Wasm plugin that captures request metadata and outputs structured JSON logs:

```rust
use proxy_wasm::traits::*;
use proxy_wasm::types::*;
use std::time::Duration;

proxy_wasm::main! {{
    proxy_wasm::set_log_level(LogLevel::Info);
    proxy_wasm::set_root_context(|_| -> Box<dyn RootContext> {
        Box::new(LoggerRoot {
            log_request_headers: Vec::new(),
            log_response_headers: Vec::new(),
            only_log_errors: false,
            sample_rate: 100,
        })
    });
}}

struct LoggerRoot {
    log_request_headers: Vec<String>,
    log_response_headers: Vec<String>,
    only_log_errors: bool,
    sample_rate: u32,  // percentage 0-100
}

impl Context for LoggerRoot {}

impl RootContext for LoggerRoot {
    fn on_configure(&mut self, _size: usize) -> bool {
        if let Some(config_bytes) = self.get_plugin_configuration() {
            if let Ok(config) = serde_json::from_slice::<serde_json::Value>(&config_bytes) {
                if let Some(headers) = config["log_request_headers"].as_array() {
                    self.log_request_headers = headers.iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect();
                }
                if let Some(headers) = config["log_response_headers"].as_array() {
                    self.log_response_headers = headers.iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect();
                }
                if let Some(errors_only) = config["only_log_errors"].as_bool() {
                    self.only_log_errors = errors_only;
                }
                if let Some(rate) = config["sample_rate"].as_u64() {
                    self.sample_rate = rate as u32;
                }
            }
        }
        true
    }

    fn create_http_context(&self, context_id: u32) -> Option<Box<dyn HttpContext>> {
        // Apply sampling
        if self.sample_rate < 100 && (context_id % 100) >= self.sample_rate {
            return Some(Box::new(NoOpHttp {}));
        }

        Some(Box::new(LoggerHttp {
            log_request_headers: self.log_request_headers.clone(),
            log_response_headers: self.log_response_headers.clone(),
            only_log_errors: self.only_log_errors,
            request_start: 0,
            method: String::new(),
            path: String::new(),
            captured_request_headers: Vec::new(),
        }))
    }

    fn get_type(&self) -> Option<ContextType> {
        Some(ContextType::HttpContext)
    }
}

struct NoOpHttp {}
impl Context for NoOpHttp {}
impl HttpContext for NoOpHttp {}

struct LoggerHttp {
    log_request_headers: Vec<String>,
    log_response_headers: Vec<String>,
    only_log_errors: bool,
    request_start: u64,
    method: String,
    path: String,
    captured_request_headers: Vec<(String, String)>,
}

impl Context for LoggerHttp {}

impl HttpContext for LoggerHttp {
    fn on_http_request_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        self.request_start = self.get_current_time()
            .duration_since(std::time::SystemTime::UNIX_EPOCH)
            .unwrap_or(Duration::from_secs(0))
            .as_millis() as u64;

        self.method = self.get_http_request_header(":method").unwrap_or_default();
        self.path = self.get_http_request_header(":path").unwrap_or_default();

        // Capture specified request headers
        for header_name in &self.log_request_headers {
            if let Some(value) = self.get_http_request_header(header_name) {
                self.captured_request_headers.push((header_name.clone(), value));
            }
        }

        Action::Continue
    }

    fn on_http_response_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        let status = self.get_http_response_header(":status").unwrap_or_default();
        let status_code: u32 = status.parse().unwrap_or(0);

        // Skip non-error responses if configured
        if self.only_log_errors && status_code < 400 {
            return Action::Continue;
        }

        let now = self.get_current_time()
            .duration_since(std::time::SystemTime::UNIX_EPOCH)
            .unwrap_or(Duration::from_secs(0))
            .as_millis() as u64;
        let duration_ms = now - self.request_start;

        // Build structured log entry
        let mut log_entry = serde_json::json!({
            "timestamp": now,
            "method": self.method,
            "path": self.path,
            "status_code": status_code,
            "duration_ms": duration_ms,
        });

        // Add captured request headers
        let entry = log_entry.as_object_mut().unwrap();
        for (name, value) in &self.captured_request_headers {
            let safe_name = name.replace('-', "_");
            entry.insert(format!("req_{}", safe_name), serde_json::json!(value));
        }

        // Add specified response headers
        for header_name in &self.log_response_headers {
            if let Some(value) = self.get_http_response_header(header_name) {
                let safe_name = header_name.replace('-', "_");
                entry.insert(format!("resp_{}", safe_name), serde_json::json!(value));
            }
        }

        // Output the log
        log::info!("{}", serde_json::to_string(&log_entry).unwrap_or_default());

        Action::Continue
    }
}
```

## Deploying the Logger

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: custom-logger
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  url: oci://registry.example.com/plugins/custom-logger:v1.0
  phase: STATS
  failStrategy: FAIL_OPEN
  pluginConfig:
    log_request_headers:
    - x-request-id
    - x-forwarded-for
    - user-agent
    - x-api-key
    - authorization
    log_response_headers:
    - content-type
    - x-ratelimit-remaining
    only_log_errors: false
    sample_rate: 100
```

The `FAIL_OPEN` strategy is appropriate for logging plugins because you do not want logging failures to block traffic.

## Sending Logs to External Services

Instead of writing to stdout, you can send logs to an external service using HTTP callouts:

```rust
impl HttpContext for LoggerHttp {
    fn on_log(&mut self) {
        let log_entry = serde_json::json!({
            "timestamp": self.get_current_time()
                .duration_since(std::time::SystemTime::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis(),
            "method": self.method,
            "path": self.path,
            "status_code": self.response_status,
            "duration_ms": self.duration_ms,
            "headers": self.captured_headers,
        });

        let body = serde_json::to_vec(&log_entry).unwrap_or_default();

        let _ = self.dispatch_http_call(
            "log-collector",
            vec![
                (":method", "POST"),
                (":path", "/ingest"),
                (":authority", "log-collector.logging.svc.cluster.local"),
                ("content-type", "application/json"),
            ],
            Some(&body),
            vec![],
            Duration::from_millis(1000),
        );
    }
}
```

The `on_log` callback is called after the request is complete, so it does not add latency to the request processing.

## Conditional Logging

You can build sophisticated logging rules:

```rust
impl HttpContext for ConditionalLoggerHttp {
    fn on_http_response_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        let status: u32 = self.get_http_response_header(":status")
            .unwrap_or_default()
            .parse()
            .unwrap_or(0);

        let should_log = match &self.log_condition {
            LogCondition::All => true,
            LogCondition::ErrorsOnly => status >= 400,
            LogCondition::SlowRequests(threshold_ms) => self.duration_ms > *threshold_ms,
            LogCondition::SpecificPaths(paths) => {
                paths.iter().any(|p| self.path.starts_with(p))
            }
            LogCondition::SpecificHeaders(headers) => {
                headers.iter().any(|h| {
                    self.get_http_request_header(h).is_some()
                })
            }
        };

        if should_log {
            self.emit_log();
        }

        Action::Continue
    }
}
```

Configure it:

```yaml
pluginConfig:
  conditions:
    log_errors: true
    log_slow_requests_ms: 500
    log_paths:
    - /api/payments
    - /api/auth
    log_if_header_present:
    - x-debug
```

## Audit Logging with Body Hashing

For compliance and audit trails, you might need to log a hash of the request body without logging the actual content:

```rust
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

impl HttpContext for AuditLoggerHttp {
    fn on_http_request_body(&mut self, body_size: usize, end_of_stream: bool) -> Action {
        if !end_of_stream {
            return Action::Pause;
        }

        if let Some(body) = self.get_http_request_body(0, body_size) {
            let mut hasher = DefaultHasher::new();
            body.hash(&mut hasher);
            self.body_hash = format!("{:x}", hasher.finish());
        }

        Action::Continue
    }

    fn on_http_response_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        let audit_log = serde_json::json!({
            "event": "api_request",
            "method": self.method,
            "path": self.path,
            "client_ip": self.get_http_request_header("x-forwarded-for").unwrap_or_default(),
            "user_agent": self.get_http_request_header("user-agent").unwrap_or_default(),
            "body_hash": self.body_hash,
            "status": self.get_http_response_header(":status").unwrap_or_default(),
        });

        log::info!("AUDIT: {}", serde_json::to_string(&audit_log).unwrap_or_default());
        Action::Continue
    }
}
```

## Collecting Logs

The logs emitted by Wasm plugins via `log::info!()` end up in the Envoy proxy's stdout, which Kubernetes captures as container logs:

```bash
# View logs from the proxy container
kubectl logs -n my-app -l app=api-gateway -c istio-proxy | grep "AUDIT\|custom-logger"

# Stream logs in real time
kubectl logs -n my-app -l app=api-gateway -c istio-proxy -f
```

You can then collect these logs with Fluentd, Fluent Bit, Vector, or any other log collector that reads container stdout.

## Performance Tips

- Use `FAIL_OPEN` for logging plugins so logging failures do not affect traffic
- Set a reasonable `sample_rate` for high-traffic services
- Avoid logging request/response bodies unless absolutely necessary (audit use cases)
- Use `on_log` for async log shipping to avoid adding latency to requests
- Batch log entries in shared data and flush periodically for high-throughput scenarios

## Summary

Wasm plugins give you full control over logging in Istio. You can capture any combination of request and response data, apply conditional logging rules, sample high-traffic endpoints, hash sensitive data for audit trails, and ship logs to external services. Deploy logging plugins in the STATS phase with FAIL_OPEN to keep them from affecting traffic when something goes wrong.
