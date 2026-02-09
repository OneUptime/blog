# How to Implement Sidecar Containers for Request Proxying and Load Balancing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sidecar, Load Balancing

Description: Learn how to deploy sidecar proxy containers that handle request routing, load balancing, and traffic management at the pod level in Kubernetes.

---

Sidecar proxies are a fundamental pattern in modern cloud-native architectures. By placing a proxy container alongside your application in the same pod, you can handle cross-cutting concerns like load balancing, circuit breaking, retries, and observability without modifying application code.

This pattern forms the foundation of service mesh architectures, but you don't need a full service mesh to benefit from sidecar proxies. Individual applications can use sidecars for specific use cases like backend pooling, request routing, or protocol translation.

## Why Use Sidecar Proxies

Traditional load balancing happens at the network layer, often using external load balancers or ingress controllers. Sidecar proxies bring load balancing closer to the application, enabling more sophisticated routing logic and better observability.

The sidecar shares the pod's network namespace, which means it can intercept all network traffic on localhost. Your application sends requests to localhost, and the sidecar handles routing to backend services. This keeps networking logic separate from business logic.

Sidecar proxies also provide a consistent interface for implementing retries, timeouts, circuit breaking, and other resilience patterns. Rather than implementing these in every service, the proxy handles them transparently.

## Basic Envoy Sidecar Configuration

Envoy is a popular choice for sidecar proxies because of its powerful routing capabilities and extensive observability features. Here's a basic setup that proxies HTTP requests from your application to backend services.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: envoy-config
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
      - name: backend_proxy
        address:
          socket_address:
            address: 0.0.0.0
            port_value: 8080
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
                      cluster: backend_cluster
                      timeout: 30s
                      retry_policy:
                        retry_on: "5xx"
                        num_retries: 3
                        per_try_timeout: 10s
              http_filters:
              - name: envoy.filters.http.router
                typed_config:
                  "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

      clusters:
      - name: backend_cluster
        connect_timeout: 5s
        type: STRICT_DNS
        lb_policy: ROUND_ROBIN
        load_assignment:
          cluster_name: backend_cluster
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: backend-service.default.svc.cluster.local
                    port_value: 8080
        health_checks:
        - timeout: 1s
          interval: 10s
          unhealthy_threshold: 3
          healthy_threshold: 2
          http_health_check:
            path: "/health"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend-app
  template:
    metadata:
      labels:
        app: frontend-app
    spec:
      containers:
      # Application container
      - name: app
        image: myorg/frontend-app:v1.0.0
        ports:
        - containerPort: 3000
        env:
        # App sends requests to sidecar proxy
        - name: BACKEND_URL
          value: "http://localhost:8080"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

      # Envoy sidecar proxy
      - name: envoy
        image: envoyproxy/envoy:v1.28.0
        command:
        - envoy
        - -c
        - /etc/envoy/envoy.yaml
        ports:
        - containerPort: 8080
          name: proxy
        - containerPort: 9901
          name: admin
        volumeMounts:
        - name: envoy-config
          mountPath: /etc/envoy
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"

      volumes:
      - name: envoy-config
        configMap:
          name: envoy-config
```

The application sends all backend requests to localhost:8080, where Envoy receives them. Envoy performs health checking, load balancing, and automatic retries before forwarding requests to the backend service.

## Advanced Load Balancing with Multiple Backends

Real-world applications often need to route requests to multiple backend services based on paths, headers, or other criteria. Envoy supports sophisticated routing rules.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: envoy-multi-backend
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
      - name: multi_backend_proxy
        address:
          socket_address:
            address: 0.0.0.0
            port_value: 8080
        filter_chains:
        - filters:
          - name: envoy.filters.network.http_connection_manager
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
              stat_prefix: ingress_http
              route_config:
                name: local_route
                virtual_hosts:
                - name: backends
                  domains: ["*"]
                  routes:
                  # API requests go to API cluster
                  - match:
                      prefix: "/api/v1/"
                    route:
                      cluster: api_cluster
                      timeout: 60s
                      retry_policy:
                        retry_on: "5xx,reset,connect-failure"
                        num_retries: 3

                  # Static assets go to CDN cluster
                  - match:
                      prefix: "/static/"
                    route:
                      cluster: cdn_cluster
                      timeout: 10s

                  # WebSocket connections
                  - match:
                      prefix: "/ws/"
                      headers:
                      - name: upgrade
                        string_match:
                          exact: websocket
                    route:
                      cluster: websocket_cluster
                      timeout: 0s
                      upgrade_configs:
                      - upgrade_type: websocket

                  # Default route for everything else
                  - match:
                      prefix: "/"
                    route:
                      cluster: default_cluster
                      timeout: 30s

              http_filters:
              - name: envoy.filters.http.router
                typed_config:
                  "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

      clusters:
      # API backend with weighted load balancing
      - name: api_cluster
        connect_timeout: 5s
        type: STRICT_DNS
        lb_policy: LEAST_REQUEST
        load_assignment:
          cluster_name: api_cluster
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: api-v1.default.svc.cluster.local
                    port_value: 8080
              load_balancing_weight: 70
            - endpoint:
                address:
                  socket_address:
                    address: api-v2.default.svc.cluster.local
                    port_value: 8080
              load_balancing_weight: 30
        health_checks:
        - timeout: 2s
          interval: 10s
          http_health_check:
            path: "/health"

      # CDN/static assets cluster
      - name: cdn_cluster
        connect_timeout: 3s
        type: STRICT_DNS
        lb_policy: ROUND_ROBIN
        load_assignment:
          cluster_name: cdn_cluster
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: static-assets.default.svc.cluster.local
                    port_value: 80

      # WebSocket cluster with connection pooling
      - name: websocket_cluster
        connect_timeout: 5s
        type: STRICT_DNS
        lb_policy: MAGLEV
        load_assignment:
          cluster_name: websocket_cluster
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: websocket-service.default.svc.cluster.local
                    port_value: 8080

      # Default backend cluster
      - name: default_cluster
        connect_timeout: 5s
        type: STRICT_DNS
        lb_policy: ROUND_ROBIN
        load_assignment:
          cluster_name: default_cluster
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: default-backend.default.svc.cluster.local
                    port_value: 8080
```

This configuration demonstrates path-based routing to different backend clusters, each with appropriate load balancing strategies. API requests use least-request balancing, WebSockets use consistent hashing, and static assets use simple round-robin.

## Circuit Breaking and Connection Limits

Sidecar proxies can implement circuit breaking to prevent cascading failures when backend services become unhealthy or overloaded.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: envoy-circuit-breaker
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
      - name: backend_proxy
        address:
          socket_address:
            address: 0.0.0.0
            port_value: 8080
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
                      cluster: backend_cluster
                      timeout: 30s
                      retry_policy:
                        retry_on: "5xx,reset,connect-failure,refused-stream"
                        num_retries: 3
                        per_try_timeout: 10s
                        retry_host_predicate:
                        - name: envoy.retry_host_predicates.previous_hosts
                          typed_config:
                            "@type": type.googleapis.com/envoy.extensions.retry.host.previous_hosts.v3.PreviousHostsPredicate
              http_filters:
              - name: envoy.filters.http.router
                typed_config:
                  "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

      clusters:
      - name: backend_cluster
        connect_timeout: 5s
        type: STRICT_DNS
        lb_policy: ROUND_ROBIN
        load_assignment:
          cluster_name: backend_cluster
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: backend-service.default.svc.cluster.local
                    port_value: 8080

        # Circuit breaker thresholds
        circuit_breakers:
          thresholds:
          - priority: DEFAULT
            max_connections: 1000
            max_pending_requests: 1000
            max_requests: 1000
            max_retries: 3
          - priority: HIGH
            max_connections: 2000
            max_pending_requests: 2000
            max_requests: 2000
            max_retries: 5

        # Outlier detection for automatic unhealthy host ejection
        outlier_detection:
          consecutive_5xx: 5
          interval: 10s
          base_ejection_time: 30s
          max_ejection_percent: 50
          enforcing_consecutive_5xx: 100
          enforcing_success_rate: 100
          success_rate_minimum_hosts: 5
          success_rate_request_volume: 100
          success_rate_stdev_factor: 1900

        health_checks:
        - timeout: 1s
          interval: 10s
          unhealthy_threshold: 3
          healthy_threshold: 2
          http_health_check:
            path: "/health"
```

Circuit breakers prevent overwhelming unhealthy backends by limiting concurrent connections and requests. Outlier detection automatically removes hosts that consistently fail, giving them time to recover.

## Using NGINX as a Lightweight Sidecar Proxy

For simpler use cases, NGINX provides a lightweight alternative to Envoy. This example shows NGINX as a sidecar for basic load balancing and caching.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-proxy-config
  namespace: default
data:
  nginx.conf: |
    events {
      worker_connections 1024;
    }

    http {
      # Upstream backend servers
      upstream backend_pool {
        least_conn;
        server backend-1.default.svc.cluster.local:8080 max_fails=3 fail_timeout=30s;
        server backend-2.default.svc.cluster.local:8080 max_fails=3 fail_timeout=30s;
        server backend-3.default.svc.cluster.local:8080 max_fails=3 fail_timeout=30s;

        keepalive 32;
      }

      # Cache configuration
      proxy_cache_path /tmp/cache levels=1:2 keys_zone=backend_cache:10m max_size=1g inactive=60m;

      server {
        listen 8080;

        location / {
          proxy_pass http://backend_pool;

          # Connection settings
          proxy_http_version 1.1;
          proxy_set_header Connection "";
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

          # Timeouts
          proxy_connect_timeout 5s;
          proxy_send_timeout 30s;
          proxy_read_timeout 30s;

          # Enable caching for GET requests
          proxy_cache backend_cache;
          proxy_cache_valid 200 5m;
          proxy_cache_valid 404 1m;
          proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
          proxy_cache_lock on;
          add_header X-Cache-Status $upstream_cache_status;

          # Buffer settings
          proxy_buffering on;
          proxy_buffer_size 4k;
          proxy_buffers 8 4k;
          proxy_busy_buffers_size 8k;
        }

        location /health {
          access_log off;
          return 200 "healthy\n";
          add_header Content-Type text/plain;
        }
      }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-nginx-proxy
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: app-with-nginx-proxy
  template:
    metadata:
      labels:
        app: app-with-nginx-proxy
    spec:
      containers:
      - name: app
        image: myorg/app:v1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: BACKEND_URL
          value: "http://localhost:8080"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

      - name: nginx-proxy
        image: nginx:1.25-alpine
        ports:
        - containerPort: 8080
          name: proxy
        volumeMounts:
        - name: nginx-config
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"

      volumes:
      - name: nginx-config
        configMap:
          name: nginx-proxy-config
```

NGINX provides basic load balancing, connection pooling, and response caching with lower resource overhead than Envoy. This works well for straightforward proxying scenarios.

## Dynamic Configuration with Envoy Control Plane

For dynamic backend discovery without restarting proxies, Envoy supports xDS protocols that allow runtime configuration updates.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: envoy-dynamic-config
  namespace: default
data:
  envoy.yaml: |
    node:
      cluster: frontend-cluster
      id: frontend-proxy

    admin:
      address:
        socket_address:
          address: 127.0.0.1
          port_value: 9901

    dynamic_resources:
      lds_config:
        resource_api_version: V3
        api_config_source:
          api_type: GRPC
          transport_api_version: V3
          grpc_services:
          - envoy_grpc:
              cluster_name: xds_cluster

      cds_config:
        resource_api_version: V3
        api_config_source:
          api_type: GRPC
          transport_api_version: V3
          grpc_services:
          - envoy_grpc:
              cluster_name: xds_cluster

    static_resources:
      clusters:
      - name: xds_cluster
        type: STRICT_DNS
        connect_timeout: 1s
        load_assignment:
          cluster_name: xds_cluster
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: envoy-control-plane.monitoring.svc.cluster.local
                    port_value: 18000
        http2_protocol_options: {}
```

This configuration connects to a control plane service that provides dynamic listener and cluster configurations. As backend services scale up or down, the control plane updates Envoy without restarts.

## Monitoring Sidecar Proxy Performance

Sidecar proxies generate extensive metrics that you should monitor to ensure they don't become bottlenecks.

```yaml
containers:
- name: envoy
  image: envoyproxy/envoy:v1.28.0
  ports:
  - containerPort: 9901
    name: admin
  livenessProbe:
    httpGet:
      path: /ready
      port: admin
    initialDelaySeconds: 10
    periodSeconds: 10
  readinessProbe:
    httpGet:
      path: /ready
      port: admin
    initialDelaySeconds: 5
    periodSeconds: 5
```

Key metrics to monitor include request rate, latency percentiles, connection pool usage, and circuit breaker state. Envoy exposes these through its admin interface and Prometheus endpoint.

## Conclusion

Sidecar proxies provide a powerful mechanism for implementing load balancing, request routing, and resilience patterns at the pod level. Whether you use Envoy for advanced service mesh features or NGINX for simpler proxying, the sidecar pattern keeps networking concerns separate from application code. This separation makes it easier to implement consistent policies across services and update infrastructure without modifying applications.
