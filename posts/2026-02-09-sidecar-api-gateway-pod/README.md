# How to Implement Sidecar Containers for API Gateway Pattern at Pod Level

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sidecar, API Gateway

Description: Learn how to implement a pod-level API gateway using sidecar containers to handle authentication, rate limiting, and request transformation for individual microservices.

---

Traditional API gateways operate at the cluster ingress layer, but sometimes you need gateway functionality at the pod level. Sidecar API gateways provide authentication, rate limiting, request transformation, and routing logic directly alongside your application, enabling fine-grained control without centralized infrastructure.

This pattern is particularly useful for multi-tenant applications, services requiring specialized authentication, or scenarios where different services need different gateway policies. By deploying a lightweight gateway as a sidecar, each service gets its own dedicated gateway instance that scales with the application.

## Understanding Pod-Level API Gateway Pattern

A pod-level API gateway sits between external clients and your application container within the same pod. All requests enter through the gateway sidecar, which enforces policies before proxying to the application on localhost.

This differs from traditional API gateways in several ways. First, there's no single point of failure since each pod has its own gateway. Second, gateway resources scale automatically with your application. Third, you can customize gateway behavior per service without affecting others.

The sidecar shares the pod's network namespace, making communication between gateway and application extremely fast with minimal latency overhead. Your application simply listens on localhost and remains unaware of the gateway layer.

## Basic Sidecar API Gateway with Kong

Kong is a popular API gateway that works well as a sidecar. Here's how to deploy it alongside your application.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kong-sidecar-config
  namespace: default
data:
  kong.yml: |
    _format_version: "3.0"

    services:
    - name: local-app
      url: http://localhost:8080
      routes:
      - name: api-route
        paths:
        - /api
        strip_path: false
        methods:
        - GET
        - POST
        - PUT
        - DELETE

    plugins:
    - name: rate-limiting
      service: local-app
      config:
        minute: 100
        policy: local

    - name: request-transformer
      service: local-app
      config:
        add:
          headers:
          - "X-Gateway:Kong-Sidecar"
          - "X-Request-ID:$(uuid)"

    - name: cors
      service: local-app
      config:
        origins:
        - "*"
        methods:
        - GET
        - POST
        - PUT
        - DELETE
        - OPTIONS
        headers:
        - Accept
        - Authorization
        - Content-Type
        exposed_headers:
        - X-Auth-Token
        credentials: true
        max_age: 3600
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-kong-gateway
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: app-with-kong
  template:
    metadata:
      labels:
        app: app-with-kong
    spec:
      containers:
      # Kong API Gateway sidecar
      - name: kong-gateway
        image: kong:3.4-alpine
        env:
        - name: KONG_DATABASE
          value: "off"
        - name: KONG_DECLARATIVE_CONFIG
          value: "/config/kong.yml"
        - name: KONG_PROXY_LISTEN
          value: "0.0.0.0:8000"
        - name: KONG_ADMIN_LISTEN
          value: "127.0.0.1:8001"
        - name: KONG_LOG_LEVEL
          value: "info"
        ports:
        - containerPort: 8000
          name: proxy
          protocol: TCP
        volumeMounts:
        - name: kong-config
          mountPath: /config
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /status
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 10

      # Application container
      - name: app
        image: myorg/api-service:v1.0.0
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: PORT
          value: "8080"
        - name: BIND_ADDRESS
          value: "127.0.0.1"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

      volumes:
      - name: kong-config
        configMap:
          name: kong-sidecar-config
---
apiVersion: v1
kind: Service
metadata:
  name: app-with-kong-gateway
  namespace: default
spec:
  selector:
    app: app-with-kong
  ports:
  - port: 80
    targetPort: 8000
    protocol: TCP
    name: http
  type: ClusterIP
```

Kong handles rate limiting, CORS, and request transformation before proxying to the application on port 8080. The application binds to localhost only, ensuring all traffic flows through Kong.

## Authentication and Authorization with Envoy

Envoy provides sophisticated authentication capabilities as a sidecar gateway.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: envoy-gateway-config
  namespace: default
data:
  envoy.yaml: |
    admin:
      address:
        socket_address:
          address: 127.0.0.1
          port_value: 9901

    static_resources:
      listeners:
      - name: ingress
        address:
          socket_address:
            address: 0.0.0.0
            port_value: 8000
        filter_chains:
        - filters:
          - name: envoy.filters.network.http_connection_manager
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
              stat_prefix: ingress_http
              route_config:
                name: local_route
                virtual_hosts:
                - name: backend
                  domains: ["*"]
                  routes:
                  - match:
                      prefix: "/"
                    route:
                      cluster: local_app
              http_filters:
              # JWT Authentication
              - name: envoy.filters.http.jwt_authn
                typed_config:
                  "@type": type.googleapis.com/envoy.extensions.filters.http.jwt_authn.v3.JwtAuthentication
                  providers:
                    auth0:
                      issuer: "https://myapp.auth0.com/"
                      audiences:
                      - "https://api.myapp.com"
                      remote_jwks:
                        http_uri:
                          uri: "https://myapp.auth0.com/.well-known/jwks.json"
                          cluster: auth0_jwks
                          timeout: 5s
                        cache_duration: 300s
                  rules:
                  - match:
                      prefix: "/api"
                    requires:
                      provider_name: "auth0"

              # RBAC Authorization
              - name: envoy.filters.http.rbac
                typed_config:
                  "@type": type.googleapis.com/envoy.extensions.filters.http.rbac.v3.RBAC
                  rules:
                    action: ALLOW
                    policies:
                      "admin-access":
                        permissions:
                        - any: true
                        principals:
                        - metadata:
                            filter: envoy.filters.http.jwt_authn
                            path:
                            - key: auth0
                            - key: role
                            value:
                              string_match:
                                exact: "admin"

              # Rate Limiting
              - name: envoy.filters.http.local_ratelimit
                typed_config:
                  "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
                  stat_prefix: http_local_rate_limiter
                  token_bucket:
                    max_tokens: 100
                    tokens_per_fill: 100
                    fill_interval: 60s
                  filter_enabled:
                    runtime_key: local_rate_limit_enabled
                    default_value:
                      numerator: 100
                      denominator: HUNDRED

              - name: envoy.filters.http.router
                typed_config:
                  "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

      clusters:
      - name: local_app
        connect_timeout: 5s
        type: STATIC
        lb_policy: ROUND_ROBIN
        load_assignment:
          cluster_name: local_app
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: 127.0.0.1
                    port_value: 8080

      - name: auth0_jwks
        connect_timeout: 5s
        type: STRICT_DNS
        lb_policy: ROUND_ROBIN
        load_assignment:
          cluster_name: auth0_jwks
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: myapp.auth0.com
                    port_value: 443
        transport_socket:
          name: envoy.transport_sockets.tls
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
            sni: myapp.auth0.com
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secured-api-service
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: secured-api
  template:
    metadata:
      labels:
        app: secured-api
    spec:
      containers:
      - name: envoy-gateway
        image: envoyproxy/envoy:v1.28.0
        command:
        - envoy
        - -c
        - /config/envoy.yaml
        ports:
        - containerPort: 8000
          name: http
        volumeMounts:
        - name: envoy-config
          mountPath: /config
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"

      - name: app
        image: myorg/secured-api:v1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: BIND_ADDRESS
          value: "127.0.0.1:8080"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

      volumes:
      - name: envoy-config
        configMap:
          name: envoy-gateway-config
```

This configuration implements JWT authentication with Auth0, RBAC authorization, and local rate limiting. The application receives only authenticated and authorized requests.

## Request/Response Transformation

Sometimes you need to transform requests or responses to match different API contracts.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: transformation-gateway-config
  namespace: default
data:
  nginx.conf: |
    events {
      worker_connections 1024;
    }

    http {
      log_format detailed '$remote_addr - $remote_user [$time_local] '
                          '"$request" $status $body_bytes_sent '
                          '"$http_referer" "$http_user_agent" '
                          'rt=$request_time';

      access_log /dev/stdout detailed;

      # Lua script for request transformation
      init_by_lua_block {
        cjson = require "cjson"
      }

      server {
        listen 8000;

        location /api/v2/ {
          # Transform v2 API requests to v1 format
          access_by_lua_block {
            ngx.req.read_body()
            local body = ngx.req.get_body_data()

            if body then
              local data = cjson.decode(body)

              -- Transform field names
              if data.user_id then
                data.userId = data.user_id
                data.user_id = nil
              end

              if data.created_at then
                data.createdAt = data.created_at
                data.created_at = nil
              end

              ngx.req.set_body_data(cjson.encode(data))
            end
          }

          # Add API version header
          proxy_set_header X-API-Version "v2";
          proxy_set_header X-Original-URI $request_uri;

          # Rewrite to v1 endpoint
          rewrite ^/api/v2/(.*)$ /api/v1/$1 break;

          proxy_pass http://127.0.0.1:8080;
        }

        location /api/v1/ {
          proxy_pass http://127.0.0.1:8080;
          proxy_set_header X-API-Version "v1";
        }

        location /health {
          access_log off;
          return 200 "healthy\n";
        }
      }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-transformer
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-transformer
  template:
    metadata:
      labels:
        app: api-transformer
    spec:
      containers:
      - name: nginx-gateway
        image: openresty/openresty:1.21.4.1-alpine
        ports:
        - containerPort: 8000
        volumeMounts:
        - name: nginx-config
          mountPath: /usr/local/openresty/nginx/conf/nginx.conf
          subPath: nginx.conf
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"

      - name: app
        image: myorg/api-v1:v1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: BIND_ADDRESS
          value: "127.0.0.1:8080"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"

      volumes:
      - name: nginx-config
        configMap:
          name: transformation-gateway-config
```

OpenResty with Lua enables sophisticated request and response transformations, allowing you to maintain API compatibility while evolving your application.

## Multi-Tenant Request Routing

For multi-tenant applications, the sidecar gateway can route requests based on tenant identification.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: multitenant-gateway-config
  namespace: default
data:
  envoy.yaml: |
    admin:
      address:
        socket_address:
          address: 127.0.0.1
          port_value: 9901

    static_resources:
      listeners:
      - name: multitenant_listener
        address:
          socket_address:
            address: 0.0.0.0
            port_value: 8000
        filter_chains:
        - filters:
          - name: envoy.filters.network.http_connection_manager
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
              stat_prefix: multitenant
              route_config:
                name: local_route
                virtual_hosts:
                - name: tenants
                  domains: ["*"]
                  routes:
                  # Route based on X-Tenant-ID header
                  - match:
                      prefix: "/"
                      headers:
                      - name: X-Tenant-ID
                        string_match:
                          exact: "premium"
                    route:
                      cluster: premium_app
                      timeout: 30s

                  - match:
                      prefix: "/"
                      headers:
                      - name: X-Tenant-ID
                        string_match:
                          exact: "standard"
                    route:
                      cluster: standard_app
                      timeout: 15s

                  # Default route for free tier
                  - match:
                      prefix: "/"
                    route:
                      cluster: free_app
                      timeout: 5s

              http_filters:
              - name: envoy.filters.http.router
                typed_config:
                  "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

      clusters:
      - name: premium_app
        connect_timeout: 5s
        type: STATIC
        lb_policy: ROUND_ROBIN
        load_assignment:
          cluster_name: premium_app
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: 127.0.0.1
                    port_value: 8081

      - name: standard_app
        connect_timeout: 5s
        type: STATIC
        lb_policy: ROUND_ROBIN
        load_assignment:
          cluster_name: standard_app
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: 127.0.0.1
                    port_value: 8082

      - name: free_app
        connect_timeout: 5s
        type: STATIC
        lb_policy: ROUND_ROBIN
        load_assignment:
          cluster_name: free_app
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: 127.0.0.1
                    port_value: 8083
```

The gateway routes requests to different application instances based on tenant tier, enabling different service levels per tenant.

## Caching and Performance Optimization

Sidecar gateways can implement caching to improve performance.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: caching-gateway-config
  namespace: default
data:
  varnish.vcl: |
    vcl 4.1;

    backend default {
      .host = "127.0.0.1";
      .port = "8080";
    }

    sub vcl_recv {
      # Cache GET and HEAD requests only
      if (req.method != "GET" && req.method != "HEAD") {
        return (pass);
      }

      # Don't cache authenticated requests
      if (req.http.Authorization) {
        return (pass);
      }

      # Add cache key based on path and query string
      set req.http.X-Cache-Key = req.url;

      return (hash);
    }

    sub vcl_backend_response {
      # Cache successful responses for 5 minutes
      if (beresp.status == 200) {
        set beresp.ttl = 5m;
      }

      # Don't cache error responses
      if (beresp.status >= 400) {
        set beresp.ttl = 0s;
      }

      # Add cache control headers
      set beresp.http.X-Cache-TTL = beresp.ttl;
    }

    sub vcl_deliver {
      # Add cache hit/miss header
      if (obj.hits > 0) {
        set resp.http.X-Cache = "HIT";
      } else {
        set resp.http.X-Cache = "MISS";
      }

      set resp.http.X-Cache-Hits = obj.hits;
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cached-api
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cached-api
  template:
    metadata:
      labels:
        app: cached-api
    spec:
      containers:
      - name: varnish-cache
        image: varnish:7.4-alpine
        ports:
        - containerPort: 8000
        volumeMounts:
        - name: varnish-config
          mountPath: /etc/varnish/default.vcl
          subPath: varnish.vcl
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"

      - name: app
        image: myorg/api:v1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: BIND_ADDRESS
          value: "127.0.0.1:8080"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"

      volumes:
      - name: varnish-config
        configMap:
          name: caching-gateway-config
```

Varnish provides high-performance caching at the pod level, reducing load on the application and improving response times.

## Conclusion

Pod-level API gateways implemented as sidecar containers provide fine-grained control over authentication, authorization, rate limiting, request transformation, and caching without requiring centralized gateway infrastructure. This pattern scales naturally with your applications, eliminates single points of failure, and allows per-service customization of gateway behavior. Whether you use Kong, Envoy, NGINX, or other gateway technologies, the sidecar pattern enables sophisticated API management at the pod level.
