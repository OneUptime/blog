# How to Configure Basic Authentication at Istio Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Basic Auth, Security, Gateway, Kubernetes

Description: How to add HTTP Basic Authentication to Istio ingress gateway for protecting internal tools and staging environments with username and password access control.

---

HTTP Basic Authentication is not fancy, but it gets the job done when you need a quick way to password-protect something. Staging environments, internal admin panels, and development APIs all benefit from a simple username/password gate. While you would not use basic auth for user-facing production applications (use OAuth2 for that), it is perfect for protecting internal tools.

Istio does not have native basic auth support, but there are clean ways to add it using either an EnvoyFilter with Lua or an external authorization service.

## Approach 1: EnvoyFilter with Lua Script

The simplest approach for basic auth is a Lua script that runs in the Envoy proxy. It checks the `Authorization` header against hardcoded credentials:

First, generate the base64-encoded credentials:

```bash
echo -n "admin:secretpassword" | base64
# Output: YWRtaW46c2VjcmV0cGFzc3dvcmQ=
```

Now create the EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: basic-auth
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: GATEWAY
        listener:
          filterChain:
            filter:
              name: "envoy.filters.network.http_connection_manager"
              subFilter:
                name: "envoy.filters.http.router"
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inline_code: |
              function envoy_on_request(request_handle)
                local auth = request_handle:headers():get("authorization")
                if auth == nil then
                  request_handle:respond(
                    {[":status"] = "401", ["www-authenticate"] = "Basic realm=\"Restricted\""},
                    "Authentication required"
                  )
                  return
                end

                local expected = "Basic YWRtaW46c2VjcmV0cGFzc3dvcmQ="
                if auth ~= expected then
                  request_handle:respond(
                    {[":status"] = "403"},
                    "Forbidden"
                  )
                  return
                end
              end
```

This filter runs on every request to the ingress gateway. If the `Authorization` header is missing, it returns a 401 with a `WWW-Authenticate` header, which causes browsers to show the login dialog. If the header is present but wrong, it returns 403.

## Restricting Basic Auth to Specific Hosts

You probably do not want basic auth on every host going through the gateway. Modify the Lua script to only apply to specific hosts:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: basic-auth-staging
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: GATEWAY
        listener:
          filterChain:
            filter:
              name: "envoy.filters.network.http_connection_manager"
              subFilter:
                name: "envoy.filters.http.router"
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inline_code: |
              function envoy_on_request(request_handle)
                local host = request_handle:headers():get(":authority")

                -- Only apply basic auth to staging
                if host ~= "staging.example.com" and host ~= "admin.example.com" then
                  return
                end

                local auth = request_handle:headers():get("authorization")
                if auth == nil then
                  request_handle:respond(
                    {[":status"] = "401", ["www-authenticate"] = "Basic realm=\"Staging\""},
                    "Authentication required"
                  )
                  return
                end

                local credentials = {
                  ["Basic YWRtaW46c2VjcmV0cGFzc3dvcmQ="] = true,
                  ["Basic ZGV2OnRlc3QxMjM="] = true,
                }

                if not credentials[auth] then
                  request_handle:respond(
                    {[":status"] = "403"},
                    "Invalid credentials"
                  )
                  return
                end

                -- Strip the auth header before forwarding
                request_handle:headers():remove("authorization")
              end
```

This version supports multiple username/password combinations and only applies to `staging.example.com` and `admin.example.com`. It also strips the Authorization header before forwarding to the backend, so the credentials do not leak.

## Approach 2: External Authorization Service

For a more maintainable solution, especially if you need to change passwords without redeploying, use an external authorization service.

Create a simple auth service:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: basic-auth-config
  namespace: default
data:
  htpasswd: |
    admin:$apr1$xyz$hashedpassword1
    dev:$apr1$abc$hashedpassword2
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: basic-auth-service
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: basic-auth-service
  template:
    metadata:
      labels:
        app: basic-auth-service
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 8080
          volumeMounts:
            - name: config
              mountPath: /etc/nginx/conf.d/default.conf
              subPath: default.conf
            - name: htpasswd
              mountPath: /etc/nginx/.htpasswd
              subPath: htpasswd
      volumes:
        - name: config
          configMap:
            name: nginx-auth-config
        - name: htpasswd
          configMap:
            name: basic-auth-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-auth-config
  namespace: default
data:
  default.conf: |
    server {
      listen 8080;
      location / {
        auth_basic "Restricted";
        auth_basic_user_file /etc/nginx/.htpasswd;

        # Return 200 on successful auth
        # The request headers will be forwarded back to Istio
        proxy_pass http://127.0.0.1:8081;
      }
    }
    server {
      listen 8081;
      location / {
        return 200 'ok';
        add_header Content-Type text/plain;
      }
    }
---
apiVersion: v1
kind: Service
metadata:
  name: basic-auth-service
  namespace: default
spec:
  selector:
    app: basic-auth-service
  ports:
    - name: http
      port: 8080
      targetPort: 8080
```

Generate htpasswd entries:

```bash
# Install htpasswd utility
# On Ubuntu: apt-get install apache2-utils
# On Mac: brew install httpd

htpasswd -nb admin secretpassword
# Output: admin:$apr1$xyz$hashedpassword

htpasswd -nb dev test123
# Output: dev:$apr1$abc$hashedpassword
```

Register as an external authorizer in the Istio mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: basic-auth
        envoyExtAuthz:
          service: basic-auth-service.default.svc.cluster.local
          port: 8080
          includeRequestHeadersInCheck:
            - authorization
          headersToDownstreamOnDeny:
            - www-authenticate
```

Apply the AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: basic-auth-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-staging-app
  action: CUSTOM
  provider:
    name: basic-auth
  rules:
    - to:
        - operation:
            paths: ["/*"]
```

## Approach 3: Using Kubernetes Secrets for Credentials

If you do not want credentials in the EnvoyFilter YAML, you can store them in a Kubernetes Secret and reference them. However, Lua scripts in EnvoyFilter cannot directly read secrets. The workaround is to mount the secret as an environment variable and read it in the Lua script using a shared data approach.

A simpler option is to use a ConfigMap that the Lua script reads via httpCall to a local sidecar:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: auth-credentials
  namespace: default
data:
  credentials.json: |
    {
      "users": {
        "admin": "secretpassword",
        "dev": "test123"
      }
    }
```

Mount this into a simple HTTP server that the Lua script can query locally. This keeps credentials out of the EnvoyFilter definition.

## Excluding Paths from Basic Auth

For health check endpoints and public paths, skip authentication:

```yaml
inline_code: |
  function envoy_on_request(request_handle)
    local path = request_handle:headers():get(":path")

    -- Skip auth for these paths
    local public_paths = {"/healthz", "/ready", "/metrics"}
    for _, p in ipairs(public_paths) do
      if path == p then
        return
      end
    end

    local auth = request_handle:headers():get("authorization")
    if auth == nil then
      request_handle:respond(
        {[":status"] = "401", ["www-authenticate"] = "Basic realm=\"Restricted\""},
        "Authentication required"
      )
      return
    end

    local expected = "Basic YWRtaW46c2VjcmV0cGFzc3dvcmQ="
    if auth ~= expected then
      request_handle:respond(
        {[":status"] = "403"},
        "Forbidden"
      )
      return
    end
  end
```

## Testing

Test from the command line:

```bash
# Should return 401
curl -v https://staging.example.com/

# Should return 200
curl -v -u admin:secretpassword https://staging.example.com/

# Health endpoint should work without auth
curl -v https://staging.example.com/healthz
```

## Security Considerations

Basic auth sends credentials in base64 encoding (not encryption), so you must use it over HTTPS only. Make sure your Gateway has TLS configured:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: staging-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: staging-cert
      hosts:
        - "staging.example.com"
    - port:
        number: 80
        name: http
        protocol: HTTP
      tls:
        httpsRedirect: true
      hosts:
        - "staging.example.com"
```

## Summary

Basic authentication at the Istio gateway is best handled through either an EnvoyFilter with Lua scripting for simple setups, or an external authorization service for more maintainable configurations. The Lua approach is quick to set up and requires no additional deployments. The external auth approach lets you manage credentials separately and supports htpasswd-style hashed passwords. Always use TLS when using basic auth, and exclude health check paths from authentication.
