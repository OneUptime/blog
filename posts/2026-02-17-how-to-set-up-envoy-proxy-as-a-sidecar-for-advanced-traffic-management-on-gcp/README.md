# How to Set Up Envoy Proxy as a Sidecar for Advanced Traffic Management on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Envoy Proxy, Service Mesh, GKE, Traffic Management, Google Cloud

Description: Deploy Envoy Proxy as a sidecar container alongside your applications on GKE for advanced traffic management including retries, circuit breaking, and load balancing.

---

Envoy Proxy has become the backbone of modern service mesh architectures, and for good reason. When deployed as a sidecar alongside your application containers, it handles retries, circuit breaking, load balancing, observability, and traffic shaping - all without changing your application code. On Google Cloud, Envoy pairs naturally with GKE, and Google's own Traffic Director uses Envoy under the hood.

This guide covers deploying Envoy as a sidecar on GKE, configuring it for common traffic management patterns, and connecting it to Google Cloud's ecosystem.

## Why Sidecar Envoy

The sidecar pattern places an Envoy proxy container in every pod alongside your application container. Your application talks to localhost, and Envoy handles everything else - service discovery, load balancing, TLS termination, retries, and observability.

This approach works because it separates infrastructure concerns from application logic. Your Python service does not need retry logic in its HTTP client. Your Java service does not need to implement circuit breaking. Envoy handles all of it consistently across every service regardless of language.

## Basic Sidecar Deployment on GKE

Let us start with a deployment that includes an Envoy sidecar.

```yaml
# deployment-with-envoy-sidecar.yaml
# Application deployment with Envoy proxy running as a sidecar container
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
        # Your application container
        - name: user-service
          image: gcr.io/my-project/user-service:v1
          ports:
            - containerPort: 8080
              name: http
          env:
            # Application sends all outbound traffic through the Envoy sidecar
            - name: UPSTREAM_HOST
              value: "localhost"
            - name: UPSTREAM_PORT
              value: "9901"
          resources:
            requests:
              cpu: 200m
              memory: 256Mi

        # Envoy sidecar container
        - name: envoy
          image: envoyproxy/envoy:v1.28-latest
          ports:
            - containerPort: 9901
              name: envoy-admin
            - containerPort: 10000
              name: envoy-ingress
          volumeMounts:
            - name: envoy-config
              mountPath: /etc/envoy
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 200m
              memory: 256Mi

      volumes:
        - name: envoy-config
          configMap:
            name: user-service-envoy-config
```

## Configuring Envoy for Traffic Management

The power of Envoy is in its configuration. Here is a configuration that covers the most common traffic management patterns.

```yaml
# envoy-config.yaml
# Envoy sidecar configuration with retries, circuit breaking, and load balancing
apiVersion: v1
kind: ConfigMap
metadata:
  name: user-service-envoy-config
  namespace: production
data:
  envoy.yaml: |
    admin:
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 9901

    static_resources:
      listeners:
        # Inbound listener - receives traffic destined for this service
        - name: inbound_listener
          address:
            socket_address:
              address: 0.0.0.0
              port_value: 10000
          filter_chains:
            - filters:
                - name: envoy.filters.network.http_connection_manager
                  typed_config:
                    "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                    stat_prefix: inbound
                    codec_type: AUTO
                    route_config:
                      name: local_route
                      virtual_hosts:
                        - name: local_service
                          domains: ["*"]
                          routes:
                            - match:
                                prefix: "/"
                              route:
                                cluster: local_service
                                # Retry configuration for inbound requests
                                retry_policy:
                                  retry_on: "5xx,connect-failure,retriable-4xx"
                                  num_retries: 2
                                  per_try_timeout: 5s
                    http_filters:
                      - name: envoy.filters.http.router
                        typed_config:
                          "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

        # Outbound listener - handles outbound traffic to other services
        - name: outbound_listener
          address:
            socket_address:
              address: 0.0.0.0
              port_value: 10001
          filter_chains:
            - filters:
                - name: envoy.filters.network.http_connection_manager
                  typed_config:
                    "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                    stat_prefix: outbound
                    codec_type: AUTO
                    route_config:
                      name: outbound_routes
                      virtual_hosts:
                        - name: order_service
                          domains: ["order-service", "order-service.production.svc.cluster.local"]
                          routes:
                            - match:
                                prefix: "/"
                              route:
                                cluster: order_service_cluster
                                timeout: 10s
                                retry_policy:
                                  retry_on: "5xx,connect-failure"
                                  num_retries: 3
                                  per_try_timeout: 3s
                                  retry_back_off:
                                    base_interval: 0.1s
                                    max_interval: 1s
                        - name: payment_service
                          domains: ["payment-service", "payment-service.production.svc.cluster.local"]
                          routes:
                            - match:
                                prefix: "/"
                              route:
                                cluster: payment_service_cluster
                                timeout: 30s
                    http_filters:
                      - name: envoy.filters.http.router
                        typed_config:
                          "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

      clusters:
        # Local application backend
        - name: local_service
          connect_timeout: 1s
          type: STATIC
          load_assignment:
            cluster_name: local_service
            endpoints:
              - lb_endpoints:
                  - endpoint:
                      address:
                        socket_address:
                          address: 127.0.0.1
                          port_value: 8080

        # Upstream order service with circuit breaking
        - name: order_service_cluster
          connect_timeout: 2s
          type: STRICT_DNS
          dns_lookup_family: V4_ONLY
          load_assignment:
            cluster_name: order_service_cluster
            endpoints:
              - lb_endpoints:
                  - endpoint:
                      address:
                        socket_address:
                          address: order-service.production.svc.cluster.local
                          port_value: 8080
          # Circuit breaker configuration
          circuit_breakers:
            thresholds:
              - priority: DEFAULT
                max_connections: 100
                max_pending_requests: 50
                max_requests: 200
                max_retries: 3
          # Health check configuration
          health_checks:
            - timeout: 2s
              interval: 10s
              unhealthy_threshold: 3
              healthy_threshold: 2
              http_health_check:
                path: "/health"
          # Outlier detection - ejects unhealthy endpoints
          outlier_detection:
            consecutive_5xx: 5
            interval: 10s
            base_ejection_time: 30s
            max_ejection_percent: 50

        # Upstream payment service with longer timeouts
        - name: payment_service_cluster
          connect_timeout: 5s
          type: STRICT_DNS
          dns_lookup_family: V4_ONLY
          load_assignment:
            cluster_name: payment_service_cluster
            endpoints:
              - lb_endpoints:
                  - endpoint:
                      address:
                        socket_address:
                          address: payment-service.production.svc.cluster.local
                          port_value: 8080
          circuit_breakers:
            thresholds:
              - priority: DEFAULT
                max_connections: 50
                max_pending_requests: 25
                max_requests: 100
```

## Deploying the Configuration

```bash
# Apply the ConfigMap and Deployment
kubectl apply -f envoy-config.yaml
kubectl apply -f deployment-with-envoy-sidecar.yaml

# Verify the pods have both containers running
kubectl get pods -n production -l app=user-service
kubectl describe pod -n production -l app=user-service | grep -A 5 "Containers:"
```

## Adding Rate Limiting

Envoy supports local rate limiting per sidecar, which is useful for protecting your service from being overwhelmed.

```yaml
# Add this to the HTTP filter chain in your listener configuration
# Limits inbound requests to 100 per second per pod
http_filters:
  - name: envoy.filters.http.local_ratelimit
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
      stat_prefix: http_local_rate_limiter
      token_bucket:
        max_tokens: 100
        tokens_per_fill: 100
        fill_interval: 1s
      filter_enabled:
        runtime_key: local_rate_limit_enabled
        default_value:
          numerator: 100
          denominator: HUNDRED
      filter_enforced:
        runtime_key: local_rate_limit_enforced
        default_value:
          numerator: 100
          denominator: HUNDRED
      response_headers_to_add:
        - append_action: OVERWRITE_IF_EXISTS_OR_ADD
          header:
            key: x-rate-limit
            value: "100"
  - name: envoy.filters.http.router
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

## Observability with Cloud Monitoring

Configure Envoy to export metrics to Google Cloud Monitoring via OpenTelemetry or Prometheus.

```yaml
# Add stats configuration to export metrics
stats_sinks:
  - name: envoy.stat_sinks.statsd
    typed_config:
      "@type": type.googleapis.com/envoy.config.metrics.v3.StatsdSink
      tcp_cluster_name: statsd_cluster
      prefix: envoy

# Enable Prometheus metrics endpoint
stats_config:
  stats_tags:
    - tag_name: cluster_name
      regex: "^cluster\\.((.+?)\\.).*$"
    - tag_name: route_name
      regex: "^vhost\\.((.+?)\\.).*$"
```

Then scrape the metrics with Prometheus or use the GKE Managed Prometheus integration to send them to Cloud Monitoring.

```yaml
# PodMonitor for GKE Managed Prometheus to scrape Envoy metrics
apiVersion: monitoring.googleapis.com/v1
kind: PodMonitoring
metadata:
  name: envoy-sidecar-metrics
  namespace: production
spec:
  selector:
    matchLabels:
      app: user-service
  endpoints:
    - port: envoy-admin
      path: /stats/prometheus
      interval: 30s
```

## Practical Tips

Start with a minimal configuration and add features incrementally. Retry policies, circuit breakers, and timeouts each need tuning based on your specific traffic patterns. Setting aggressive circuit breakers before you understand your baseline will cause unnecessary outages.

Use Envoy's admin interface during development to inspect cluster health, see active connections, and trigger config dumps. Access it at `localhost:9901` on the pod.

Monitor Envoy's memory usage. Under heavy load with many active connections, Envoy can consume significant memory. Set resource limits appropriately and watch for OOM kills.

Envoy as a sidecar on GKE gives you a powerful traffic management layer that scales with your service mesh. The initial configuration takes some effort, but the consistency and reliability it provides across all your services makes it a worthwhile investment.
