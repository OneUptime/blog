# How to Use Wasm Plugins for Request Transformation in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebAssembly, WASM, Request Transformation, Envoy

Description: Building Wasm plugins in Istio for transforming HTTP requests and responses including header manipulation, body rewriting, and URL routing.

---

Request transformation is one of the most common use cases for Wasm plugins in Istio. While Istio's VirtualService can handle basic header manipulation and URL rewriting, there are situations where you need more complex transformations: conditionally modifying headers based on request body content, rewriting JSON payloads, normalizing request formats between API versions, or adding computed values to requests. Wasm plugins handle all of these with full access to request and response data.

## Basic Header Transformation

The simplest form of request transformation is modifying headers. Here is a Wasm plugin that performs several common header operations:

```rust
use proxy_wasm::traits::*;
use proxy_wasm::types::*;

proxy_wasm::main! {{
    proxy_wasm::set_log_level(LogLevel::Info);
    proxy_wasm::set_root_context(|_| -> Box<dyn RootContext> {
        Box::new(TransformRoot::default())
    });
}}

#[derive(Default)]
struct TransformRoot {
    add_headers: Vec<(String, String)>,
    remove_headers: Vec<String>,
    rename_headers: Vec<(String, String)>,
}

impl Context for TransformRoot {}

impl RootContext for TransformRoot {
    fn on_configure(&mut self, _size: usize) -> bool {
        if let Some(config_bytes) = self.get_plugin_configuration() {
            if let Ok(config) = serde_json::from_slice::<serde_json::Value>(&config_bytes) {
                // Parse headers to add
                if let Some(add) = config["add_request_headers"].as_object() {
                    for (k, v) in add {
                        if let Some(val) = v.as_str() {
                            self.add_headers.push((k.clone(), val.to_string()));
                        }
                    }
                }
                // Parse headers to remove
                if let Some(remove) = config["remove_request_headers"].as_array() {
                    self.remove_headers = remove.iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect();
                }
                // Parse headers to rename
                if let Some(rename) = config["rename_request_headers"].as_object() {
                    for (old, new) in rename {
                        if let Some(new_name) = new.as_str() {
                            self.rename_headers.push((old.clone(), new_name.to_string()));
                        }
                    }
                }
            }
        }
        true
    }

    fn create_http_context(&self, _context_id: u32) -> Option<Box<dyn HttpContext>> {
        Some(Box::new(TransformHttp {
            add_headers: self.add_headers.clone(),
            remove_headers: self.remove_headers.clone(),
            rename_headers: self.rename_headers.clone(),
        }))
    }

    fn get_type(&self) -> Option<ContextType> {
        Some(ContextType::HttpContext)
    }
}

struct TransformHttp {
    add_headers: Vec<(String, String)>,
    remove_headers: Vec<String>,
    rename_headers: Vec<(String, String)>,
}

impl Context for TransformHttp {}

impl HttpContext for TransformHttp {
    fn on_http_request_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        // Add headers
        for (name, value) in &self.add_headers {
            self.add_http_request_header(name, value);
        }

        // Remove headers
        for name in &self.remove_headers {
            self.set_http_request_header(name, None);
        }

        // Rename headers (copy value to new name, remove old)
        for (old_name, new_name) in &self.rename_headers {
            if let Some(value) = self.get_http_request_header(old_name) {
                self.set_http_request_header(new_name, Some(&value));
                self.set_http_request_header(old_name, None);
            }
        }

        Action::Continue
    }
}
```

Deploy it:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: header-transform
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  url: oci://registry.example.com/plugins/header-transform:v1.0
  pluginConfig:
    add_request_headers:
      x-forwarded-service: api-gateway
      x-trace-enabled: "true"
    remove_request_headers:
    - x-internal-debug
    - x-test-mode
    rename_request_headers:
      x-old-auth: authorization
```

## URL Path Rewriting

For complex URL transformations that go beyond what VirtualService supports:

```rust
impl HttpContext for RewriteHttp {
    fn on_http_request_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        if let Some(path) = self.get_http_request_header(":path") {
            // Version prefix rewriting: /v1/users -> /api/users with version header
            if path.starts_with("/v1/") {
                let new_path = path.replacen("/v1/", "/api/", 1);
                self.set_http_request_header(":path", Some(&new_path));
                self.set_http_request_header("x-api-version", Some("v1"));
            } else if path.starts_with("/v2/") {
                let new_path = path.replacen("/v2/", "/api/", 1);
                self.set_http_request_header(":path", Some(&new_path));
                self.set_http_request_header("x-api-version", Some("v2"));
            }

            // Normalize trailing slashes
            if path.ends_with('/') && path.len() > 1 {
                let trimmed = path.trim_end_matches('/');
                self.set_http_request_header(":path", Some(trimmed));
            }
        }

        Action::Continue
    }
}
```

## Request Body Transformation

Transforming request bodies is more involved because you need to buffer the entire body before modifying it:

```rust
impl HttpContext for BodyTransformHttp {
    fn on_http_request_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        // Check if this is a JSON request we should transform
        if let Some(content_type) = self.get_http_request_header("content-type") {
            if content_type.contains("application/json") {
                self.should_transform = true;
            }
        }
        Action::Continue
    }

    fn on_http_request_body(&mut self, body_size: usize, end_of_stream: bool) -> Action {
        if !self.should_transform {
            return Action::Continue;
        }

        if !end_of_stream {
            // Buffer the body until we have all of it
            return Action::Pause;
        }

        // Get the full body
        if let Some(body_bytes) = self.get_http_request_body(0, body_size) {
            if let Ok(mut json) = serde_json::from_slice::<serde_json::Value>(&body_bytes) {
                // Add a timestamp field
                json["request_timestamp"] = serde_json::json!(
                    self.get_current_time()
                        .duration_since(std::time::SystemTime::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs()
                );

                // Rename a field: "user_name" -> "username"
                if let Some(user_name) = json.get("user_name").cloned() {
                    json["username"] = user_name;
                    json.as_object_mut().unwrap().remove("user_name");
                }

                // Write the modified body back
                let new_body = serde_json::to_vec(&json).unwrap();
                self.set_http_request_body(0, body_size, &new_body);

                // Update content-length header
                self.set_http_request_header(
                    "content-length",
                    Some(&new_body.len().to_string()),
                );
            }
        }

        Action::Continue
    }
}
```

## Response Transformation

You can also transform responses before they reach the client:

```rust
impl HttpContext for ResponseTransformHttp {
    fn on_http_response_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        // Add CORS headers
        self.set_http_response_header("access-control-allow-origin", Some("*"));
        self.set_http_response_header("access-control-allow-methods", Some("GET, POST, PUT, DELETE, OPTIONS"));
        self.set_http_response_header("access-control-allow-headers", Some("content-type, authorization, x-api-key"));

        // Strip internal headers
        self.set_http_response_header("x-envoy-upstream-service-time", None);
        self.set_http_response_header("server", None);

        // Add security headers
        self.set_http_response_header("x-content-type-options", Some("nosniff"));
        self.set_http_response_header("x-frame-options", Some("DENY"));

        Action::Continue
    }

    fn on_http_response_body(&mut self, body_size: usize, end_of_stream: bool) -> Action {
        if !end_of_stream {
            return Action::Pause;
        }

        // Wrap API responses in a standard envelope
        if let Some(body) = self.get_http_response_body(0, body_size) {
            if let Some(status) = self.get_http_response_header(":status") {
                let success = status.starts_with('2');
                let envelope = if success {
                    format!(r#"{{"status":"success","data":{}}}"#, String::from_utf8_lossy(&body))
                } else {
                    format!(r#"{{"status":"error","error":{}}}"#, String::from_utf8_lossy(&body))
                };

                self.set_http_response_body(0, body_size, envelope.as_bytes());
                self.set_http_response_header("content-length", Some(&envelope.len().to_string()));
            }
        }

        Action::Continue
    }
}
```

## Deploying a Complete Transformation Pipeline

You can chain multiple transformation plugins by using different phases and priorities:

```yaml
# First: normalize incoming requests
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: request-normalizer
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  url: oci://registry.example.com/plugins/normalizer:v1.0
  priority: 20
  pluginConfig:
    normalize_paths: true
    lowercase_headers: true
---
# Second: transform request body
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: body-transform
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  url: oci://registry.example.com/plugins/body-transform:v1.0
  priority: 10
  pluginConfig:
    add_timestamp: true
    rename_fields:
      user_name: username
      email_addr: email
---
# Third: transform responses
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: response-transform
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  url: oci://registry.example.com/plugins/response-transform:v1.0
  phase: STATS
  pluginConfig:
    add_cors: true
    add_security_headers: true
    wrap_response: true
```

## Testing Transformations

```bash
# Test header transformation
kubectl exec test-pod -n my-app -- curl -v -H "x-old-auth: Bearer token123" http://api-gateway:8080/api/users

# Test body transformation
kubectl exec test-pod -n my-app -- curl -v -X POST \
  -H "content-type: application/json" \
  -d '{"user_name":"john","email":"john@example.com"}' \
  http://api-gateway:8080/api/users

# Test URL rewriting
kubectl exec test-pod -n my-app -- curl -v http://api-gateway:8080/v1/users
```

## Summary

Wasm plugins give you complete control over request and response transformation in Istio. You can manipulate headers, rewrite URLs, transform JSON bodies, add standard response envelopes, and chain multiple transformations together using priority ordering. The proxy-wasm SDK provides methods for reading and writing headers and bodies at every stage of the request lifecycle, making it possible to implement any transformation logic you need.
