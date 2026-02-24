# How to Use Wasm Plugins for Custom Authentication in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebAssembly, Authentication, Security, Envoy

Description: Build a custom authentication Wasm plugin for Istio that validates API keys, JWT tokens, and integrates with external auth services.

---

Istio has built-in support for JWT validation and mTLS authentication, but sometimes you need custom authentication logic that goes beyond what the standard features offer. Maybe you need to validate API keys against a database, check custom token formats, or integrate with a proprietary identity provider. Wasm plugins let you implement custom authentication directly in the Envoy proxy, running in the AUTHN phase of the filter chain.

## Why Custom Authentication in Wasm

There are several scenarios where built-in Istio authentication falls short:

- API key validation where keys are stored in a database or external service
- Custom token formats that are not standard JWT
- Multi-step authentication flows (verify token, then check permissions against an external service)
- Authentication that depends on request body content
- Rate limiting tied to authentication (different limits for different API keys)

A Wasm authentication plugin runs inside Envoy, which means it adds minimal latency compared to an external authentication service. The request does not need to leave the proxy for the auth check.

## Building an API Key Authentication Plugin

Here is a complete Wasm plugin in Rust that validates API keys from a request header:

```rust
use proxy_wasm::traits::*;
use proxy_wasm::types::*;
use std::collections::HashMap;

proxy_wasm::main! {{
    proxy_wasm::set_log_level(LogLevel::Info);
    proxy_wasm::set_root_context(|_| -> Box<dyn RootContext> {
        Box::new(AuthRoot {
            api_keys: HashMap::new(),
            header_name: String::from("x-api-key"),
            bypass_paths: Vec::new(),
        })
    });
}}

struct AuthRoot {
    api_keys: HashMap<String, String>,  // key -> client_name
    header_name: String,
    bypass_paths: Vec<String>,
}

impl Context for AuthRoot {}

impl RootContext for AuthRoot {
    fn on_configure(&mut self, _size: usize) -> bool {
        if let Some(config_bytes) = self.get_plugin_configuration() {
            if let Ok(config) = serde_json::from_slice::<serde_json::Value>(&config_bytes) {
                // Parse API keys
                if let Some(keys) = config["api_keys"].as_object() {
                    for (key, name) in keys {
                        if let Some(name_str) = name.as_str() {
                            self.api_keys.insert(key.clone(), name_str.to_string());
                        }
                    }
                }
                // Parse header name
                if let Some(header) = config["header_name"].as_str() {
                    self.header_name = header.to_string();
                }
                // Parse bypass paths
                if let Some(paths) = config["bypass_paths"].as_array() {
                    self.bypass_paths = paths.iter()
                        .filter_map(|p| p.as_str().map(String::from))
                        .collect();
                }
            }
        }
        log::info!("Auth plugin loaded with {} API keys", self.api_keys.len());
        true
    }

    fn create_http_context(&self, _context_id: u32) -> Option<Box<dyn HttpContext>> {
        Some(Box::new(AuthHttp {
            api_keys: self.api_keys.clone(),
            header_name: self.header_name.clone(),
            bypass_paths: self.bypass_paths.clone(),
        }))
    }

    fn get_type(&self) -> Option<ContextType> {
        Some(ContextType::HttpContext)
    }
}

struct AuthHttp {
    api_keys: HashMap<String, String>,
    header_name: String,
    bypass_paths: Vec<String>,
}

impl Context for AuthHttp {}

impl HttpContext for AuthHttp {
    fn on_http_request_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        // Check if path is bypassed
        if let Some(path) = self.get_http_request_header(":path") {
            for bypass in &self.bypass_paths {
                if path.starts_with(bypass) {
                    return Action::Continue;
                }
            }
        }

        // Check for API key
        match self.get_http_request_header(&self.header_name) {
            None => {
                self.send_http_response(
                    401,
                    vec![("content-type", "application/json")],
                    Some(br#"{"error":"missing api key","message":"provide a valid API key in the x-api-key header"}"#),
                );
                Action::Pause
            }
            Some(key) => {
                match self.api_keys.get(&key) {
                    None => {
                        log::warn!("Invalid API key attempt: {}", &key[..4.min(key.len())]);
                        self.send_http_response(
                            403,
                            vec![("content-type", "application/json")],
                            Some(br#"{"error":"invalid api key"}"#),
                        );
                        Action::Pause
                    }
                    Some(client_name) => {
                        // Add client identity header for downstream services
                        self.set_http_request_header("x-authenticated-client", Some(client_name));
                        // Remove the API key header so it does not leak downstream
                        self.set_http_request_header(&self.header_name, None);
                        Action::Continue
                    }
                }
            }
        }
    }
}
```

## Deploying the Authentication Plugin

Deploy the plugin in the AUTHN phase so it runs before any other processing:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: api-key-auth
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  url: oci://registry.example.com/plugins/api-key-auth:v1.0
  phase: AUTHN
  failStrategy: FAIL_CLOSE
  pluginConfig:
    header_name: x-api-key
    bypass_paths:
    - /health
    - /ready
    - /metrics
    api_keys:
      ak_live_abc123def456: "mobile-app"
      ak_live_ghi789jkl012: "web-frontend"
      ak_live_mno345pqr678: "partner-integration"
```

The `failStrategy: FAIL_CLOSE` setting is important for authentication plugins. If the plugin fails to load, requests should be rejected rather than allowed through unauthenticated.

## External Authentication with HTTP Callouts

For cases where you need to validate tokens against an external service, Wasm plugins support HTTP callouts:

```rust
impl HttpContext for AuthHttp {
    fn on_http_request_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        let token = match self.get_http_request_header("authorization") {
            Some(t) => t,
            None => {
                self.send_http_response(401, vec![], Some(b"missing authorization header"));
                return Action::Pause;
            }
        };

        // Call external auth service
        let headers = vec![
            (":method", "POST"),
            (":path", "/validate"),
            (":authority", "auth-service.auth-system.svc.cluster.local"),
            ("content-type", "application/json"),
        ];

        let body = format!(r#"{{"token":"{}"}}"#, token);

        match self.dispatch_http_call(
            "auth-service",  // cluster name in Envoy config
            headers,
            Some(body.as_bytes()),
            vec![],
            std::time::Duration::from_millis(500),
        ) {
            Ok(_) => Action::Pause,  // Pause request until callout completes
            Err(e) => {
                log::error!("Failed to dispatch auth callout: {:?}", e);
                self.send_http_response(500, vec![], Some(b"auth service unavailable"));
                Action::Pause
            }
        }
    }
}

impl Context for AuthHttp {
    fn on_http_call_response(
        &mut self,
        _token_id: u32,
        _num_headers: usize,
        body_size: usize,
        _num_trailers: usize,
    ) {
        // Check the auth service response
        let status = self.get_http_call_response_header(":status")
            .unwrap_or_default();

        if status == "200" {
            // Auth succeeded - resume the request
            if let Some(body) = self.get_http_call_response_body(0, body_size) {
                // Parse user info from auth response and add as headers
                if let Ok(user_info) = serde_json::from_slice::<serde_json::Value>(&body) {
                    if let Some(user_id) = user_info["user_id"].as_str() {
                        self.set_http_request_header("x-user-id", Some(user_id));
                    }
                }
            }
            self.resume_http_request();
        } else {
            // Auth failed
            self.send_http_response(
                403,
                vec![("content-type", "application/json")],
                Some(br#"{"error":"authentication failed"}"#),
            );
        }
    }
}
```

For the HTTP callout to work, you need to configure the upstream cluster. The easiest way in Istio is to make sure the auth service is discoverable as a Kubernetes service:

```yaml
# The auth service should be accessible as a Kubernetes service
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: auth-system
spec:
  selector:
    app: auth-service
  ports:
  - port: 80
```

In the `dispatch_http_call`, the first argument references an Envoy cluster. In Istio, services are automatically registered as clusters using their FQDN.

## Testing the Authentication Plugin

```bash
# Test without API key - should get 401
kubectl exec test-pod -n my-app -- curl -s -o /dev/null -w "%{http_code}" http://api-gateway:8080/api/data

# Test with invalid API key - should get 403
kubectl exec test-pod -n my-app -- curl -s -o /dev/null -w "%{http_code}" -H "x-api-key: invalid" http://api-gateway:8080/api/data

# Test with valid API key - should get 200
kubectl exec test-pod -n my-app -- curl -s -o /dev/null -w "%{http_code}" -H "x-api-key: ak_live_abc123def456" http://api-gateway:8080/api/data

# Test bypass path - should get 200 without API key
kubectl exec test-pod -n my-app -- curl -s -o /dev/null -w "%{http_code}" http://api-gateway:8080/health

# Check that the authenticated client header is set
kubectl exec test-pod -n my-app -- curl -s -H "x-api-key: ak_live_abc123def456" http://api-gateway:8080/api/data -v 2>&1 | grep x-authenticated-client
```

## Security Considerations

When building authentication plugins:

- Always use `FAIL_CLOSE` failure strategy
- Never log full API keys or tokens - log only a prefix for debugging
- Set reasonable timeouts on HTTP callouts to external auth services
- Strip authentication headers after validation so they do not leak to downstream services
- Consider caching authentication results in shared data to reduce callout frequency

## Summary

Wasm plugins provide a powerful way to implement custom authentication in Istio. Whether you are validating API keys from a static list, checking custom tokens against an external service, or implementing multi-factor authentication flows, the proxy-wasm SDK gives you full access to request headers and the ability to make async HTTP callouts. Deploy auth plugins in the AUTHN phase with FAIL_CLOSE to ensure unauthenticated requests are always blocked.
