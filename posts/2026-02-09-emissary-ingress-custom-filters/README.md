# How to Configure Emissary-ingress with Custom Filters for Request Transformation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Emissary, API Gateway

Description: Learn how to use Emissary-ingress custom filters to transform requests and responses, modify headers, implement authentication logic, and build sophisticated API gateway patterns in Kubernetes.

---

Emissary-ingress (formerly Ambassador) is a Kubernetes-native API gateway built on Envoy Proxy that provides powerful request transformation capabilities through its Filter system. Filters allow you to intercept and modify requests and responses, implement custom authentication, add rate limiting, and more. This guide explores how to configure and use custom filters effectively.

## Understanding Emissary Filters

Emissary filters are plugins that process HTTP requests and responses at various stages of the request lifecycle. Filters can:

- Transform request and response headers
- Modify request paths and query parameters
- Implement authentication and authorization
- Add rate limiting and caching
- Inject custom logic via external services
- Integrate with OAuth2, JWT, and other auth systems

Filters are applied using FilterPolicy resources that specify which Mappings should use which Filters.

## Installing Emissary-ingress

Install Emissary-ingress in your cluster:

```bash
# Add the Emissary Helm repository
helm repo add datawire https://app.getambassador.io
helm repo update

# Install Emissary
kubectl create namespace emissary
kubectl apply -f https://app.getambassador.io/yaml/emissary/3.9.1/emissary-crds.yaml
kubectl wait --timeout=90s --for=condition=available deployment emissary-apiext -n emissary-system

helm install emissary-ingress datawire/emissary-ingress \
  --namespace emissary \
  --create-namespace
```

Verify installation:

```bash
kubectl get pods -n emissary
kubectl get svc -n emissary
```

## Request Header Transformation

Transform request headers using the Plugin filter.

### Adding Headers

Add headers to all requests:

```yaml
# add-headers-filter.yaml
apiVersion: getambassador.io/v3alpha1
kind: Filter
metadata:
  name: add-request-headers
  namespace: emissary
spec:
  Plugin:
    name: add-headers
---
apiVersion: getambassador.io/v3alpha1
kind: FilterPolicy
metadata:
  name: header-policy
  namespace: default
spec:
  rules:
  - host: "api.example.com"
    path: "/api/*"
    filters:
    - name: add-request-headers
      namespace: emissary
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: api-service
  namespace: default
spec:
  hostname: api.example.com
  prefix: /api/
  service: backend-service:80
  add_request_headers:
    x-custom-header:
      value: "custom-value"
    x-request-id:
      value: "%DOWNSTREAM_REMOTE_ADDRESS%-%START_TIME%"
    x-forwarded-proto:
      value: "https"
```

### Removing Headers

Remove sensitive headers before forwarding:

```yaml
# remove-headers-mapping.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: secure-api
  namespace: default
spec:
  hostname: api.example.com
  prefix: /secure/
  service: backend-service:80

  # Remove internal headers
  remove_request_headers:
  - x-internal-auth
  - x-admin-token
  - authorization

  # Add new sanitized headers
  add_request_headers:
    x-authenticated-user:
      value: "anonymous"
```

### Conditional Header Modification

Modify headers based on conditions:

```yaml
# conditional-headers.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: conditional-routing
  namespace: default
spec:
  hostname: api.example.com
  prefix: /api/
  service: backend-service:80

  # Headers for mobile clients
  headers:
    user-agent: ".*Mobile.*"
  add_request_headers:
    x-client-type:
      value: "mobile"
    x-optimize:
      value: "true"
---
# Default mapping for other clients
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: default-routing
  namespace: default
spec:
  hostname: api.example.com
  prefix: /api/
  service: backend-service:80
  priority: 1
  add_request_headers:
    x-client-type:
      value: "desktop"
```

## Response Transformation

Modify response headers and bodies.

### Adding Response Headers

Add headers to responses:

```yaml
# response-headers.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: api-with-headers
  namespace: default
spec:
  hostname: api.example.com
  prefix: /api/
  service: backend-service:80

  # Add response headers
  add_response_headers:
    x-api-version:
      value: "v1.0"
    x-response-time:
      value: "%DURATION%"
    cache-control:
      value: "public, max-age=300"
    strict-transport-security:
      value: "max-age=31536000; includeSubDomains"
```

### Removing Response Headers

Remove headers from responses:

```yaml
# remove-response-headers.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: clean-responses
  namespace: default
spec:
  hostname: api.example.com
  prefix: /api/
  service: backend-service:80

  # Remove internal headers from responses
  remove_response_headers:
  - x-powered-by
  - server
  - x-internal-version
```

## External Authentication Filter

Implement custom authentication using an external service.

### External Auth Service

Create an authentication service:

```python
# auth-service.py
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/auth', methods=['GET', 'POST'])
def authenticate():
    # Get authorization header
    auth_header = request.headers.get('Authorization')

    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Unauthorized'}), 401

    token = auth_header[7:]

    # Validate token (simplified example)
    if token == 'valid-token-12345':
        # Return success with custom headers
        response = jsonify({'status': 'authorized'})
        response.headers['X-Auth-User'] = 'user@example.com'
        response.headers['X-Auth-Roles'] = 'admin,user'
        return response, 200

    return jsonify({'error': 'Invalid token'}), 401

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

Deploy the auth service:

```yaml
# auth-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: your-registry/auth-service:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: default
spec:
  selector:
    app: auth-service
  ports:
  - port: 80
    targetPort: 8080
```

### Configure External Auth Filter

Create an External filter:

```yaml
# external-auth-filter.yaml
apiVersion: getambassador.io/v3alpha1
kind: Filter
metadata:
  name: external-auth
  namespace: emissary
spec:
  External:
    # Auth service endpoint
    auth_service: "auth-service.default:80"

    # Path to auth endpoint
    path_prefix: "/auth"

    # Timeout for auth check
    timeout_ms: 5000

    # Headers to send to auth service
    allowed_request_headers:
    - "authorization"
    - "x-api-key"
    - "cookie"

    # Headers to inject from auth response
    allowed_authorization_headers:
    - "x-auth-user"
    - "x-auth-roles"
    - "x-auth-scope"

    # Include request body in auth check
    include_body:
      max_bytes: 4096
      allow_partial: true

    # Status on auth failure
    status_on_error:
      code: 401
```

Apply the filter to services:

```yaml
# protected-mapping.yaml
apiVersion: getambassador.io/v3alpha1
kind: FilterPolicy
metadata:
  name: auth-policy
  namespace: default
spec:
  rules:
  # Require auth for all /api routes
  - host: "api.example.com"
    path: "/api/*"
    filters:
    - name: external-auth
      namespace: emissary

  # Allow public access to /public
  - host: "api.example.com"
    path: "/public/*"
    filters: null
```

## Request Transformation Filter

Use Lua scripts for advanced transformations.

### Lua Filter for Custom Logic

Create a Lua filter:

```yaml
# lua-filter.yaml
apiVersion: getambassador.io/v3alpha1
kind: Filter
metadata:
  name: request-transformer
  namespace: emissary
spec:
  Plugin:
    name: lua
    config:
      inline_code: |
        function envoy_on_request(request_handle)
          -- Get request path
          local path = request_handle:headers():get(":path")

          -- Transform path
          if string.match(path, "^/old%-api/") then
            local new_path = string.gsub(path, "^/old%-api/", "/api/v2/")
            request_handle:headers():replace(":path", new_path)
          end

          -- Add custom header with timestamp
          local timestamp = os.time()
          request_handle:headers():add("x-request-timestamp", tostring(timestamp))

          -- Extract and validate API version
          local version = request_handle:headers():get("x-api-version")
          if not version then
            request_handle:headers():add("x-api-version", "1.0")
          end
        end

        function envoy_on_response(response_handle)
          -- Add response timing
          response_handle:headers():add("x-processed-by", "emissary-lua-filter")
        end
```

### Complex Request Modification

More sophisticated Lua transformations:

```yaml
# advanced-lua-filter.yaml
apiVersion: getambassador.io/v3alpha1
kind: Filter
metadata:
  name: advanced-transformer
  namespace: emissary
spec:
  Plugin:
    name: lua
    config:
      inline_code: |
        function envoy_on_request(request_handle)
          local headers = request_handle:headers()

          -- Parse and validate JWT from header
          local auth = headers:get("authorization")
          if auth and string.match(auth, "^Bearer ") then
            local token = string.sub(auth, 8)

            -- Simple base64 decode and parse (production should use proper JWT library)
            -- Add claims as headers
            headers:add("x-token-present", "true")
          end

          -- Rate limit key generation
          local client_ip = headers:get("x-forwarded-for")
          if not client_ip then
            client_ip = headers:get("x-real-ip") or "unknown"
          end

          local rate_limit_key = string.format("ratelimit:%s", client_ip)
          headers:add("x-rate-limit-key", rate_limit_key)

          -- Add request fingerprint
          local method = headers:get(":method")
          local path = headers:get(":path")
          local fingerprint = string.format("%s:%s", method, path)
          headers:add("x-request-fingerprint", fingerprint)
        end
```

## Plugin Filter for Custom Processing

Use the Plugin filter type for various transformations.

### Path Rewriting Plugin

Rewrite paths using plugin configuration:

```yaml
# path-rewrite-filter.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: path-rewriter
  namespace: default
spec:
  hostname: api.example.com
  prefix: /v1/
  rewrite: /api/v2/
  service: backend-service:80

  # Add context to rewritten requests
  add_request_headers:
    x-original-prefix:
      value: "/v1"
    x-rewritten-prefix:
      value: "/api/v2"
```

### Query Parameter Manipulation

Modify query parameters:

```yaml
# query-param-filter.yaml
apiVersion: getambassador.io/v3alpha1
kind: Filter
metadata:
  name: query-modifier
  namespace: emissary
spec:
  Plugin:
    name: lua
    config:
      inline_code: |
        function envoy_on_request(request_handle)
          local path = request_handle:headers():get(":path")

          -- Add default query parameters if missing
          if not string.match(path, "format=") then
            local separator = string.match(path, "?") and "&" or "?"
            path = path .. separator .. "format=json"
          end

          if not string.match(path, "version=") then
            local separator = string.match(path, "?") and "&" or "?"
            path = path .. separator .. "version=v1"
          end

          request_handle:headers():replace(":path", path)
        end
```

## Chaining Multiple Filters

Apply multiple filters in sequence:

```yaml
# filter-chain.yaml
apiVersion: getambassador.io/v3alpha1
kind: FilterPolicy
metadata:
  name: multi-filter-policy
  namespace: default
spec:
  rules:
  - host: "api.example.com"
    path: "/secure/*"
    filters:
    # 1. Authentication first
    - name: external-auth
      namespace: emissary

    # 2. Then request transformation
    - name: request-transformer
      namespace: emissary

    # 3. Finally rate limiting
    - name: rate-limiter
      namespace: emissary
```

Filters are executed in the order specified.

## Testing Custom Filters

Test filter behavior:

```bash
# Test header addition
curl -v https://api.example.com/api/test

# Test authentication filter
curl -H "Authorization: Bearer valid-token-12345" \
  https://api.example.com/api/protected

# Test path rewriting
curl -v https://api.example.com/v1/users | grep x-original-prefix

# Test query parameter modification
curl https://api.example.com/api/data
# Should add format=json&version=v1
```

Check filter logs:

```bash
kubectl logs -n emissary -l app.kubernetes.io/name=emissary-ingress --follow
```

## Debugging Filters

Enable debug logging:

```yaml
# debug-config.yaml
apiVersion: getambassador.io/v3alpha1
kind: Module
metadata:
  name: ambassador
  namespace: emissary
spec:
  config:
    diagnostics:
      enabled: true

    # Enable Lua filter debugging
    lua_scripts:
      enabled: true
      log_level: debug
```

View diagnostics:

```bash
kubectl port-forward -n emissary service/emissary-ingress 8877:8877
# Visit http://localhost:8877/ambassador/v0/diag/
```

## Conclusion

Emissary-ingress filters provide powerful request and response transformation capabilities that enable you to implement sophisticated API gateway patterns without modifying application code. By combining external auth filters, Lua scripts, and header manipulation, you can build secure, flexible, and maintainable API gateways. The filter chaining capability allows you to compose complex processing pipelines that handle authentication, rate limiting, transformation, and more in a declarative, Kubernetes-native way.
