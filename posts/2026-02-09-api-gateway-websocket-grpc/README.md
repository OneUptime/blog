# How to Implement API Gateway WebSocket and gRPC Protocol Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Gateway, WebSocket, gRPC

Description: Configure API gateways to handle WebSocket connections and gRPC services with load balancing, authentication, rate limiting, and protocol translation capabilities.

---

Modern applications require more than HTTP REST APIs. WebSocket provides bidirectional, real-time communication for chat applications, live updates, and streaming data. gRPC offers efficient binary protocol buffers for service-to-service communication with strong typing and code generation. API gateways must handle these protocols alongside traditional HTTP traffic for comprehensive API management.

## WebSocket Fundamentals

WebSocket connections start as HTTP requests with an Upgrade header, then transition to a persistent bidirectional TCP connection. Unlike HTTP where clients initiate all requests, WebSocket allows servers to push data to clients at any time. This makes it ideal for live dashboards, real-time notifications, and collaborative editing.

API gateways handling WebSocket must maintain connection state and support long-lived connections that potentially last hours. This requires different resource allocation and timeouts compared to short-lived HTTP requests.

## NGINX WebSocket Configuration

Configure NGINX to proxy WebSocket connections with appropriate headers and timeouts.

```nginx
# nginx-websocket.conf
upstream websocket_backend {
    server ws-service-1:8080;
    server ws-service-2:8080;
    server ws-service-3:8080;
}

map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name ws.example.com;

    location /ws/ {
        proxy_pass http://websocket_backend;

        # WebSocket specific headers
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        # Forward client information
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Increase timeouts for long-lived connections
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_connect_timeout 60s;

        # Disable buffering for real-time data
        proxy_buffering off;
    }
}
```

The `map` directive handles the Connection header properly. The extended timeouts allow WebSocket connections to remain open for extended periods without being terminated by the gateway.

## Kong WebSocket Support

Kong handles WebSocket transparently once configured with proper timeouts.

```yaml
# kong-websocket-config.yaml
_format_version: "3.0"

services:
- name: websocket-service
  url: http://ws-service:8080
  read_timeout: 3600000  # 1 hour in milliseconds
  write_timeout: 3600000
  connect_timeout: 60000
  routes:
  - name: websocket-route
    paths:
    - /ws
    protocols:
    - http
    - https
  plugins:
  - name: rate-limiting
    config:
      minute: 60
      policy: local
  - name: key-auth
```

Kong automatically handles the WebSocket upgrade handshake. The extended read and write timeouts prevent premature connection termination.

## WebSocket Authentication

Implement authentication for WebSocket connections. Token-based authentication works well since WebSocket doesn't support custom headers after the initial handshake.

```nginx
# NGINX WebSocket with token authentication
location /ws/ {
    # Extract token from query parameter
    set $auth_token $arg_token;

    # Validate token via auth service
    auth_request /auth/validate;
    auth_request_set $user_id $upstream_http_x_user_id;

    # Forward validated user ID to WebSocket service
    proxy_set_header X-User-ID $user_id;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;

    proxy_pass http://websocket_backend;
    proxy_http_version 1.1;
    proxy_read_timeout 3600s;
}

location = /auth/validate {
    internal;
    proxy_pass http://auth-service:8080/validate?token=$auth_token;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
}
```

Clients connect with: `ws://ws.example.com/ws/?token=user-token-here`

## Envoy WebSocket Configuration

Envoy handles WebSocket connections with HTTP/1.1 upgrades automatically.

```yaml
# envoy-websocket-config.yaml
static_resources:
  listeners:
  - name: websocket_listener
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 8080
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: websocket
          upgrade_configs:
          - upgrade_type: websocket
          route_config:
            name: local_route
            virtual_hosts:
            - name: websocket_service
              domains: ["*"]
              routes:
              - match:
                  prefix: "/ws/"
                route:
                  cluster: websocket_cluster
                  timeout: 0s  # Disable timeout for WebSocket
                  idle_timeout: 3600s
          http_filters:
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
  - name: websocket_cluster
    connect_timeout: 5s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: websocket_cluster
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: ws-service
                port_value: 8080
```

The `upgrade_configs` section enables WebSocket support. Setting `timeout: 0s` disables the route timeout while `idle_timeout: 3600s` closes inactive connections after an hour.

## gRPC Protocol Support

gRPC uses HTTP/2 for transport and protocol buffers for serialization. API gateways must support HTTP/2 and properly handle gRPC-specific headers and trailers.

```nginx
# NGINX with gRPC support (requires NGINX 1.13+)
upstream grpc_backend {
    server grpc-service-1:9090;
    server grpc-service-2:9090;
}

server {
    listen 443 ssl http2;
    server_name grpc.example.com;

    ssl_certificate /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    location /api.UserService/ {
        grpc_pass grpcs://grpc_backend;
        grpc_read_timeout 3600s;
        grpc_send_timeout 3600s;

        # Forward client certificate info for mTLS
        grpc_set_header X-Client-Cert $ssl_client_cert;
    }

    # Health check endpoint
    location /grpc.health.v1.Health/ {
        grpc_pass grpcs://grpc_backend;
    }
}
```

The `grpc_pass` directive proxies gRPC requests. Use `grpcs://` for TLS connections to backend services.

## Envoy gRPC Support

Envoy provides excellent gRPC support with built-in protocol translation capabilities.

```yaml
# envoy-grpc-config.yaml
static_resources:
  listeners:
  - name: grpc_listener
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 9090
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: grpc
          codec_type: AUTO
          route_config:
            name: local_route
            virtual_hosts:
            - name: grpc_services
              domains: ["*"]
              routes:
              - match:
                  prefix: "/api.UserService/"
                route:
                  cluster: user_grpc_cluster
              - match:
                  prefix: "/api.OrderService/"
                route:
                  cluster: order_grpc_cluster
          http_filters:
          - name: envoy.filters.http.grpc_web
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.grpc_web.v3.GrpcWeb
          - name: envoy.filters.http.grpc_stats
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.grpc_stats.v3.FilterConfig
              stats_for_all_methods: true
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
  - name: user_grpc_cluster
    connect_timeout: 5s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    http2_protocol_options: {}
    load_assignment:
      cluster_name: user_grpc_cluster
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: user-grpc-service
                port_value: 9090
```

The `http2_protocol_options` field enables HTTP/2 for gRPC communication. The `grpc_stats` filter provides detailed metrics for gRPC calls.

## gRPC-Web Support

gRPC-Web allows browser-based applications to call gRPC services. Envoy translates between gRPC-Web (HTTP/1.1) and native gRPC (HTTP/2).

```yaml
# The grpc_web filter shown above enables automatic translation
http_filters:
- name: envoy.filters.http.grpc_web
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.grpc_web.v3.GrpcWeb
- name: envoy.filters.http.cors
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.cors.v3.Cors
```

Now browsers can call gRPC services using grpc-web protocol:

```javascript
// JavaScript gRPC-Web client
const {UserServiceClient} = require('./generated/user_grpc_web_pb');
const {GetUserRequest} = require('./generated/user_pb');

const client = new UserServiceClient('https://grpc.example.com');

const request = new GetUserRequest();
request.setUserId(123);

client.getUser(request, {}, (err, response) => {
  if (err) {
    console.error(err);
  } else {
    console.log(response.toObject());
  }
});
```

## Kong gRPC Support

Kong handles gRPC with HTTP/2 support and gRPC-specific plugins.

```yaml
# kong-grpc-config.yaml
_format_version: "3.0"

services:
- name: user-grpc-service
  url: grpc://user-grpc-service:9090
  protocol: grpc
  routes:
  - name: user-grpc-route
    protocols:
    - grpc
    - grpcs
    paths:
    - /api.UserService
  plugins:
  - name: grpc-gateway
  - name: rate-limiting
    config:
      minute: 1000
      policy: local
```

## Load Balancing for gRPC

gRPC uses persistent HTTP/2 connections, which can cause load balancing issues. Implement connection-level load balancing rather than request-level.

```yaml
# Envoy with connection pooling for gRPC
clusters:
- name: grpc_cluster
  connect_timeout: 5s
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  http2_protocol_options:
    max_concurrent_streams: 100
  circuit_breakers:
    thresholds:
    - max_connections: 1000
      max_requests: 10000
  load_assignment:
    cluster_name: grpc_cluster
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: grpc-service
              port_value: 9090
```

## Monitoring WebSocket and gRPC

Track protocol-specific metrics to ensure healthy operation.

```yaml
# Prometheus metrics

# WebSocket connections
sum(nginx_vts_server_requests_total{code="101"})

# Active WebSocket connections
nginx_http_upstream_connections_active

# gRPC call rates by method
sum(rate(grpc_server_handled_total[5m])) by (grpc_method)

# gRPC error rates
sum(rate(grpc_server_handled_total{grpc_code!="OK"}[5m])) by (grpc_method)
```

## Testing WebSocket and gRPC

Verify gateway configuration with test clients.

```bash
# Test WebSocket connection
wscat -c ws://ws.example.com/ws/?token=test-token

# Test gRPC endpoint
grpcurl -plaintext grpc.example.com:9090 api.UserService/GetUser \
  -d '{"user_id": 123}'

# Load test WebSocket
artillery run websocket-load-test.yaml
```

## Conclusion

Supporting WebSocket and gRPC in API gateways extends their capabilities beyond traditional HTTP REST APIs. WebSocket enables real-time bidirectional communication for interactive applications, while gRPC provides efficient service-to-service communication with strong typing. Modern gateways like Envoy, NGINX, and Kong handle these protocols with appropriate configuration of timeouts, HTTP/2 support, and protocol-specific features. Implement proper authentication, load balancing, and monitoring to ensure reliable operation of WebSocket and gRPC endpoints through your API gateway.
