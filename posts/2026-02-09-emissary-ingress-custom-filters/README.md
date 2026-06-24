# How to Configure Emissary-ingress with Custom Filters for Request Transformation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Emissary, API Gateway

Description: Learn how to use Emissary-ingress custom filters to transform requests and responses, modify headers, implement authentication logic, and build sophisticated API gateway patterns in Kubernetes.

---

Emissary-ingress (formerly Ambassador) is a Kubernetes-native API gateway built on Envoy Proxy that provides request transformation capabilities through its Mapping system. Mappings allow you to route requests, rewrite paths, modify request and response headers, and call external authentication services before traffic reaches your backend. This guide explores how to configure and use these features effectively.

## Understanding Emissary Request Processing

Emissary resources process HTTP requests at the edge of your cluster. They can:

- Transform request and response headers
- Rewrite request paths
- Match requests by host, path, method, query parameters, and headers
- Implement authentication and authorization with an external AuthService
- Add rate limiting through RateLimitService
- Integrate with JWT and OAuth2 when using Ambassador Edge Stack filters

Emissary-ingress itself does not install the Ambassador Edge Stack `Filter` and `FilterPolicy` CRDs. Use Emissary `Mapping`, `AuthService`, and related resources for open source Emissary-ingress deployments; use Ambassador Edge Stack if you need Edge Stack filter resources such as `External`, `JWT`, `OAuth2`, or `Plugin` filters.

## Installing Emissary-ingress

Install Emissary-ingress in your cluster:

```bash
# Install the Emissary CRDs
helm install emissary-crds \
  oci://ghcr.io/emissary-ingress/emissary-crds-chart --version=4.1.0 \
  --wait

# Install Emissary
helm install emissary \
  --namespace emissary --create-namespace \
  oci://ghcr.io/emissary-ingress/emissary-ingress --version=4.1.0 \
  --wait
```

Verify installation:

```bash
kubectl get pods -n emissary
kubectl get svc -n emissary emissary
```

## Request Header Transformation

Transform request headers using Mapping configuration.

### Adding Headers

Add headers to requests:

```yaml
# add-headers-mapping.yaml
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
    x-client-ip:
      value: "%DOWNSTREAM_REMOTE_ADDRESS_WITHOUT_PORT%"
    x-forwarded-proto:
      value: "%PROTOCOL%"
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

Modify headers based on request matching conditions:

```yaml
# conditional-headers.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: mobile-routing
  namespace: default
spec:
  hostname: api.example.com
  prefix: /api/
  service: backend-service:80

  # Headers for mobile clients
  regex_headers:
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
  add_request_headers:
    x-client-type:
      value: "desktop"
```

## Response Transformation

Modify response headers.

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

## External Authentication

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

### Configure External AuthService

Create an AuthService:

```yaml
# external-auth-service.yaml
apiVersion: getambassador.io/v3alpha1
kind: AuthService
metadata:
  name: external-auth
  namespace: emissary
spec:
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

  # Include request body in auth check
  include_body:
    max_bytes: 4096
    allow_partial: true

  # Status when Emissary cannot communicate with the auth service
  status_on_error:
    code: 403
```

With an `AuthService` configured, Emissary calls the authentication service for incoming HTTP requests before forwarding allowed requests to matching Mappings.

## Request Transformation

Use Mapping configuration for common transformations.

### Path Rewriting

Rewrite paths using Mapping configuration:

```yaml
# path-rewrite-mapping.yaml
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

### Query Parameter Matching

Match requests by query parameters:

```yaml
# query-param-routing.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: json-v1-routing
  namespace: default
spec:
  hostname: api.example.com
  prefix: /api/data
  service: backend-service:80
  query_parameters:
    format: json
    version: v1
  add_request_headers:
    x-api-format:
      value: "json"
    x-api-version:
      value: "v1"
```

## Combining Multiple Resources

Combine AuthService and Mapping configuration:

```yaml
# protected-mapping.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: secure-api
  namespace: default
spec:
  hostname: api.example.com
  prefix: /secure/
  service: backend-service:80
  rewrite: /api/v2/
  remove_request_headers:
  - x-internal-auth
  add_request_headers:
    x-protected-route:
      value: "true"
```

Emissary applies the external `AuthService` check before forwarding matching requests to the upstream service, and Mapping transformations are applied as part of request routing.

## Testing Custom Configuration

Test behavior:

```bash
# Test header addition
curl -v https://api.example.com/api/test

# Test authentication
curl -H "Authorization: Bearer valid-token-12345" \
  https://api.example.com/api/protected

# Test path rewriting
curl -v https://api.example.com/v1/users

# Test query parameter matching
curl "https://api.example.com/api/data?format=json&version=v1"
```

Check Emissary logs:

```bash
kubectl logs -n emissary -l app.kubernetes.io/name=emissary-ingress --follow
```

## Debugging Configuration

Enable the diagnostics service:

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
```

View diagnostics:

```bash
kubectl port-forward -n emissary service/emissary 8877:8877
# Visit http://localhost:8877/ambassador/v0/diag/
```

## Conclusion

Emissary-ingress request and response transformation features enable you to implement API gateway patterns without modifying application code. By combining external authentication, Mapping rewrites, and header manipulation, you can build secure and maintainable gateways in a declarative, Kubernetes-native way. If you need `Filter` and `FilterPolicy` resources for JWT, OAuth2, API key, External, or Plugin filters, use Ambassador Edge Stack rather than the open source Emissary-ingress CRDs.
