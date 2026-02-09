# How to deploy Envoy as a standalone proxy in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Envoy, Proxy

Description: Learn how to deploy Envoy as a standalone edge proxy in Kubernetes for advanced traffic management and load balancing capabilities.

---

Envoy is a high-performance L7 proxy and communication bus designed for large-scale microservices architectures. While Envoy is commonly deployed as a sidecar in service mesh implementations like Istio, running it as a standalone edge proxy gives you powerful traffic management capabilities without the complexity of a full mesh. This guide shows you how to deploy and configure Envoy as a standalone proxy in Kubernetes.

## Why Use Envoy as a Standalone Proxy

Envoy excels at edge proxy scenarios because it provides:

- Advanced HTTP/2 and gRPC support with protocol translation
- Rich routing capabilities including path-based, header-based, and weighted routing
- Built-in observability with detailed metrics and distributed tracing
- Sophisticated load balancing algorithms
- Circuit breaking and outlier detection for resilience
- Dynamic configuration updates without restarts

Compared to traditional proxies like NGINX, Envoy offers more advanced features for modern cloud-native applications. Compared to full service meshes, standalone Envoy has lower operational overhead.

## Basic Envoy Configuration Structure

Envoy configuration consists of several key components:

- Listeners: Bind to ports and accept incoming connections
- Routes: Define how to match and route requests
- Clusters: Define backend services to send traffic to
- Endpoints: Specific backend instances within clusters

Here's a minimal configuration file:

```yaml
static_resources:
  listeners:
  - name: main_listener
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
                  cluster: backend_service
          http_filters:
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
  - name: backend_service
    connect_timeout: 5s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: backend_service
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: backend.default.svc.cluster.local
                port_value: 8080

admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901
```

This configuration creates a listener on port 8080 that forwards all traffic to a backend service using round-robin load balancing.

## Deploying Envoy in Kubernetes

Create a ConfigMap to hold the Envoy configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: envoy-config
  namespace: default
data:
  envoy.yaml: |
    static_resources:
      listeners:
      - name: http_listener
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
              codec_type: AUTO
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

    admin:
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 9901
```

Deploy Envoy as a Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: envoy-proxy
  namespace: default
  labels:
    app: envoy-proxy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: envoy-proxy
  template:
    metadata:
      labels:
        app: envoy-proxy
    spec:
      containers:
      - name: envoy
        image: envoyproxy/envoy:v1.28-latest
        ports:
        - containerPort: 8080
          name: http
          protocol: TCP
        - containerPort: 9901
          name: admin
          protocol: TCP
        volumeMounts:
        - name: config
          mountPath: /etc/envoy
          readOnly: true
        command:
        - "envoy"
        args:
        - "-c"
        - "/etc/envoy/envoy.yaml"
        - "--log-level"
        - "info"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /ready
            port: 9901
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 9901
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: envoy-config
---
apiVersion: v1
kind: Service
metadata:
  name: envoy-proxy
  namespace: default
spec:
  type: LoadBalancer
  selector:
    app: envoy-proxy
  ports:
  - name: http
    port: 80
    targetPort: 8080
    protocol: TCP
  - name: admin
    port: 9901
    targetPort: 9901
    protocol: TCP
```

This deployment creates 3 replicas of Envoy for high availability and exposes them via a LoadBalancer service.

## Configuring Multiple Backend Services

Extend the configuration to route to multiple backend services:

```yaml
route_config:
  name: local_route
  virtual_hosts:
  - name: services
    domains: ["*"]
    routes:
    - match:
        prefix: "/api/users"
      route:
        cluster: user_service
    - match:
        prefix: "/api/orders"
      route:
        cluster: order_service
    - match:
        prefix: "/api/products"
      route:
        cluster: product_service
    - match:
        prefix: "/"
      route:
        cluster: frontend_service

clusters:
- name: user_service
  connect_timeout: 5s
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  load_assignment:
    cluster_name: user_service
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: user-service.default.svc.cluster.local
              port_value: 8080

- name: order_service
  connect_timeout: 5s
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  load_assignment:
    cluster_name: order_service
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: order-service.default.svc.cluster.local
              port_value: 8080

- name: product_service
  connect_timeout: 5s
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  load_assignment:
    cluster_name: product_service
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: product-service.default.svc.cluster.local
              port_value: 8080

- name: frontend_service
  connect_timeout: 5s
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  load_assignment:
    cluster_name: frontend_service
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: frontend-service.default.svc.cluster.local
              port_value: 3000
```

This configuration routes requests to different backend services based on URL prefixes.

## Adding Observability

Enable detailed access logging and metrics:

```yaml
http_connection_manager:
  stat_prefix: ingress_http
  access_log:
  - name: envoy.access_loggers.file
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog
      path: /dev/stdout
      format: "[%START_TIME%] \"%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %PROTOCOL%\" %RESPONSE_CODE% %RESPONSE_FLAGS% %BYTES_RECEIVED% %BYTES_SENT% %DURATION% %RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)% \"%REQ(X-FORWARDED-FOR)%\" \"%REQ(USER-AGENT)%\" \"%REQ(X-REQUEST-ID)%\" \"%REQ(:AUTHORITY)%\" \"%UPSTREAM_HOST%\"\n"
```

Deploy a Prometheus ServiceMonitor to scrape Envoy metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: envoy-proxy
  namespace: default
spec:
  selector:
    matchLabels:
      app: envoy-proxy
  endpoints:
  - port: admin
    path: /stats/prometheus
    interval: 30s
```

Envoy exposes hundreds of metrics at the `/stats/prometheus` endpoint of the admin interface.

## Implementing TLS Termination

Configure Envoy to terminate TLS at the edge:

```yaml
listeners:
- name: https_listener
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 8443
  filter_chains:
  - filters:
    - name: envoy.filters.network.http_connection_manager
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
        stat_prefix: ingress_https
        route_config:
          name: local_route
          virtual_hosts:
          - name: backend
            domains: ["*"]
            routes:
            - match:
                prefix: "/"
              route:
                cluster: backend_service
        http_filters:
        - name: envoy.filters.http.router
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
    transport_socket:
      name: envoy.transport_sockets.tls
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
        common_tls_context:
          tls_certificates:
          - certificate_chain:
              filename: "/etc/envoy/certs/tls.crt"
            private_key:
              filename: "/etc/envoy/certs/tls.key"
```

Mount TLS certificates from a Kubernetes Secret:

```yaml
volumes:
- name: certs
  secret:
    secretName: envoy-tls
volumeMounts:
- name: certs
  mountPath: /etc/envoy/certs
  readOnly: true
```

## Using the Admin Interface

The admin interface provides powerful debugging and operational capabilities. Access it via port 9901:

```bash
# Get cluster status
kubectl port-forward svc/envoy-proxy 9901:9901
curl http://localhost:9901/clusters

# Get configuration dump
curl http://localhost:9901/config_dump

# Get statistics
curl http://localhost:9901/stats

# Check health
curl http://localhost:9901/ready
```

The admin interface should not be exposed publicly. Use port-forwarding or restrict access with NetworkPolicies.

## Horizontal Scaling

Scale Envoy horizontally for increased capacity:

```bash
kubectl scale deployment envoy-proxy --replicas=10
```

Or use HPA for automatic scaling:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: envoy-proxy-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: envoy-proxy
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Monitoring Envoy Health

Track these key metrics:

- `envoy_http_downstream_rq_total`: Total requests received
- `envoy_http_downstream_rq_xx`: Requests by status code
- `envoy_cluster_upstream_rq_time`: Upstream request latency
- `envoy_cluster_membership_healthy`: Number of healthy upstream hosts

Create alerts for critical conditions:

```yaml
groups:
- name: envoy_alerts
  rules:
  - alert: EnvoyHighErrorRate
    expr: rate(envoy_http_downstream_rq_5xx[5m]) > 0.05
    annotations:
      summary: "Envoy proxy error rate is high"

  - alert: EnvoyNoHealthyUpstream
    expr: envoy_cluster_membership_healthy == 0
    annotations:
      summary: "Cluster {{ $labels.cluster_name }} has no healthy backends"
```

## Conclusion

Deploying Envoy as a standalone proxy in Kubernetes provides powerful traffic management capabilities without the complexity of a full service mesh. Configure listeners and clusters to route traffic to your backend services, enable rich observability with access logs and metrics, and scale horizontally to handle increasing load. The admin interface gives you deep visibility into Envoy's internal state, making it easy to debug and optimize your proxy configuration. Start with basic routing and gradually add advanced features like TLS termination, circuit breaking, and rate limiting as your needs grow.
