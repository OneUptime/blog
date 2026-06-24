# How to Use Podman with Istio Service Mesh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Istio, Service Mesh, Microservice, Networking

Description: Learn how to use Podman with Istio service mesh concepts to implement traffic management, security, and observability for containerized microservices.

---

> Istio service mesh patterns applied to Podman containers bring enterprise-grade traffic management, mutual TLS authentication, and deep observability to your microservices without modifying application code.

Istio is a leading service mesh platform that manages communication between microservices. While Istio itself is typically deployed on Kubernetes, many of its core patterns can be applied to Podman to bring service mesh capabilities to non-Kubernetes container environments. By running Envoy sidecar proxies alongside your Podman containers and managing the proxy configuration directly, you can implement traffic management, security policies, and comprehensive observability for your containerized services.

---

## Understanding Istio Components

Istio consists of a data plane and a control plane. The data plane is made up of Envoy proxy sidecars deployed alongside each service. The control plane, primarily the `istiod` component, manages and configures these proxies in a Kubernetes-based mesh. In a Podman environment, you deploy Envoy sidecars manually as containers within pods and manage their configuration directly.

## Setting Up the Sidecar Pattern

The fundamental Istio pattern is the sidecar proxy. With Podman pods, this is straightforward:

```bash
# Create a user-defined network for service DNS
podman network create mesh

# Create a pod for the service
podman pod create \
  --name bookinfo-productpage \
  --network mesh \
  -p 9080:8080 \
  -p 15000:15000

# Run the application container and send outbound calls through the local Envoy
podman run -d \
  --pod bookinfo-productpage \
  --name productpage \
  -e DETAILS_HOSTNAME=127.0.0.1 \
  -e DETAILS_SERVICE_PORT=15001 \
  -e REVIEWS_HOSTNAME=127.0.0.1 \
  -e REVIEWS_SERVICE_PORT=15001 \
  docker.io/istio/examples-bookinfo-productpage-v1:1.20.3

# Run the Envoy sidecar
podman run -d \
  --pod bookinfo-productpage \
  --name productpage-proxy \
  -v ./envoy/productpage.yaml:/etc/envoy/envoy.yaml:ro,Z \
  envoyproxy/envoy:v1.29-latest
```

The sidecar Envoy configuration:

```yaml
# envoy/productpage.yaml
static_resources:
  listeners:
    - name: inbound
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 8080
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: inbound
                route_config:
                  virtual_hosts:
                    - name: local
                      domains: ["*"]
                      routes:
                        - match:
                            prefix: "/"
                          route:
                            cluster: local_service
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

    - name: outbound
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 15001
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: outbound
                route_config:
                  virtual_hosts:
                    - name: services
                      domains: ["*"]
                      routes:
                        - match:
                            prefix: "/reviews"
                          route:
                            cluster: reviews_service
                        - match:
                            prefix: "/details"
                          route:
                            cluster: details_service
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: local_service
      connect_timeout: 5s
      type: STATIC
      load_assignment:
        cluster_name: local_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: 127.0.0.1
                      port_value: 9080

    - name: reviews_service
      connect_timeout: 5s
      type: STRICT_DNS
      load_assignment:
        cluster_name: reviews_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: reviews-proxy
                      port_value: 8080

    - name: details_service
      connect_timeout: 5s
      type: STRICT_DNS
      load_assignment:
        cluster_name: details_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: details-proxy
                      port_value: 8080

admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 15000
```

## Deploying a Microservice Application

Deploy a complete microservice application with sidecar proxies:

```yaml
# bookinfo-mesh.yml
services:
  productpage:
    image: docker.io/istio/examples-bookinfo-productpage-v1:1.20.3
    network_mode: "service:productpage-proxy"
    environment:
      DETAILS_HOSTNAME: 127.0.0.1
      DETAILS_SERVICE_PORT: "15001"
      REVIEWS_HOSTNAME: 127.0.0.1
      REVIEWS_SERVICE_PORT: "15001"

  productpage-proxy:
    image: envoyproxy/envoy:v1.29-latest
    ports:
      - "9080:8080"
      - "15000:15000"
    volumes:
      - ./envoy/productpage.yaml:/etc/envoy/envoy.yaml:ro

  reviews-v1:
    image: docker.io/istio/examples-bookinfo-reviews-v1:1.20.3
    network_mode: "service:reviews-proxy"

  reviews-proxy:
    image: envoyproxy/envoy:v1.29-latest
    ports:
      - "15001:15000"
    volumes:
      - ./envoy/reviews.yaml:/etc/envoy/envoy.yaml:ro

  details:
    image: docker.io/istio/examples-bookinfo-details-v1:1.20.3
    network_mode: "service:details-proxy"

  details-proxy:
    image: envoyproxy/envoy:v1.29-latest
    ports:
      - "15002:15000"
    volumes:
      - ./envoy/details.yaml:/etc/envoy/envoy.yaml:ro

  ratings:
    image: docker.io/istio/examples-bookinfo-ratings-v1:1.20.3
    network_mode: "service:ratings-proxy"

  ratings-proxy:
    image: envoyproxy/envoy:v1.29-latest
    ports:
      - "15003:15000"
    volumes:
      - ./envoy/ratings.yaml:/etc/envoy/envoy.yaml:ro
```

## Implementing Mutual TLS

Secure service-to-service communication with mTLS:

```bash
# Generate a CA certificate
openssl req -x509 -newkey rsa:4096 -keyout ca-key.pem -out ca-cert.pem \
  -days 365 -nodes -subj "/CN=Mesh CA"

# Generate a certificate for each service
for service in productpage reviews details ratings; do
    openssl req -newkey rsa:2048 -keyout "${service}-key.pem" -out "${service}-csr.pem" \
      -nodes -subj "/CN=${service}.mesh.local"

    openssl x509 -req -in "${service}-csr.pem" -CA ca-cert.pem -CAkey ca-key.pem \
      -CAcreateserial -out "${service}-cert.pem" -days 365

    rm "${service}-csr.pem"
done
```

Configure Envoy for mTLS:

```yaml
# Add TLS to the listener and cluster configuration
listeners:
  - name: inbound
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 8080
    filter_chains:
      - transport_socket:
          name: envoy.transport_sockets.tls
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
            require_client_certificate: true
            common_tls_context:
              tls_certificates:
                - certificate_chain:
                    filename: /certs/reviews-cert.pem
                  private_key:
                    filename: /certs/reviews-key.pem
              validation_context:
                trusted_ca:
                  filename: /certs/ca-cert.pem
        filters:
          - name: envoy.filters.network.http_connection_manager
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
              stat_prefix: inbound

clusters:
  - name: reviews_service
    connect_timeout: 5s
    type: STRICT_DNS
    transport_socket:
      name: envoy.transport_sockets.tls
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
        common_tls_context:
          tls_certificates:
            - certificate_chain:
                filename: /certs/productpage-cert.pem
              private_key:
                filename: /certs/productpage-key.pem
          validation_context:
            trusted_ca:
              filename: /certs/ca-cert.pem
    load_assignment:
      cluster_name: reviews_service
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: reviews-proxy
                    port_value: 8080
```

## Traffic Management Patterns

Implement common Istio traffic patterns with Envoy configuration. Because Podman does not automatically capture traffic the way Istio sidecar injection does on Kubernetes, configure the application to send outbound requests through Envoy, as shown with `127.0.0.1:15001`, or add your own traffic-redirection rules.

Assuming you define separate upstream clusters for each `reviews` version, canary deployment with traffic splitting:

```yaml
routes:
  - match:
      prefix: "/reviews"
    route:
      weighted_clusters:
        clusters:
          - name: reviews_v1
            weight: 80
          - name: reviews_v2
            weight: 15
          - name: reviews_v3
            weight: 5
```

Header-based routing for A/B testing:

```yaml
routes:
  - match:
      prefix: "/reviews"
      headers:
        - name: "x-user-group"
          exact_match: "beta"
    route:
      cluster: reviews_v3
  - match:
      prefix: "/reviews"
    route:
      cluster: reviews_v1
```

Fault injection for resilience testing requires the HTTP fault filter to be present before the router filter in the same HTTP connection manager:

```yaml
routes:
  - match:
      prefix: "/reviews"
    route:
      cluster: reviews_v1
    typed_per_filter_config:
      envoy.filters.http.fault:
        "@type": type.googleapis.com/envoy.extensions.filters.http.fault.v3.HTTPFault
        delay:
          fixed_delay: 5s
          percentage:
            numerator: 10
            denominator: HUNDRED
        abort:
          http_status: 503
          percentage:
            numerator: 5
            denominator: HUNDRED
```

## Observability Stack

Deploy a complete observability stack alongside the mesh:

```yaml
# observability.yml
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning:ro

  jaeger:
    image: cr.jaegertracing.io/jaegertracing/jaeger:2.15.0
    ports:
      - "16686:16686"
      - "9411:9411"
```

Configure Envoy to export traces:

```yaml
# Add tracing under the HTTP connection manager
typed_config:
  "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
  stat_prefix: inbound
  tracing:
    provider:
      name: envoy.tracers.zipkin
      typed_config:
        "@type": type.googleapis.com/envoy.config.trace.v3.ZipkinConfig
        collector_service:
          http_uri:
            uri: "http://jaeger:9411/api/v2/spans"
            cluster: jaeger
            timeout: 5s
        trace_id_128bit: true

clusters:
  - name: jaeger
    type: STRICT_DNS
    connect_timeout: 5s
    load_assignment:
      cluster_name: jaeger
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: jaeger
                    port_value: 9411
```

## Mesh Management Script

Create a script to manage the service mesh:

```bash
#!/bin/bash
# mesh-ctl.sh

ACTION="${1:-status}"

case "$ACTION" in
    deploy)
        echo "Deploying service mesh..."
        podman compose -f bookinfo-mesh.yml up -d
        podman compose -f observability.yml up -d
        echo "Mesh deployed. Services available at http://localhost:9080"
        echo "Grafana: http://localhost:3000"
        echo "Jaeger: http://localhost:16686"
        ;;
    status)
        echo "=== Service Mesh Status ==="
        echo ""
        echo "Application:"
        podman compose -f bookinfo-mesh.yml ps
        echo ""
        echo "Observability:"
        podman compose -f observability.yml ps
        echo ""
        echo "Envoy Admin:"
        for proxy in productpage-proxy reviews-proxy details-proxy ratings-proxy; do
            PORT=$(podman compose -f bookinfo-mesh.yml port "$proxy" 15000 2>/dev/null | cut -d: -f2)
            if [ -n "$PORT" ]; then
                CLUSTERS=$(curl -s "http://localhost:$PORT/clusters" | grep -c "::healthy")
                echo "  $proxy: $CLUSTERS healthy upstream(s)"
            fi
        done
        ;;
    canary)
        VERSION="$2"
        WEIGHT="${3:-10}"
        echo "Setting canary for reviews to v${VERSION} at ${WEIGHT}%..."
        # Update Envoy configuration for traffic splitting
        ;;
    destroy)
        echo "Destroying service mesh..."
        podman compose -f bookinfo-mesh.yml down
        podman compose -f observability.yml down
        echo "Mesh destroyed"
        ;;
    *)
        echo "Usage: $0 {deploy|status|canary|destroy}"
        exit 1
        ;;
esac
```

## Local Rate Limiting on Each Proxy

Implement per-proxy rate limiting:

```yaml
http_filters:
  - name: envoy.filters.http.local_ratelimit
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
      stat_prefix: mesh_rate_limit
      token_bucket:
        max_tokens: 1000
        tokens_per_fill: 1000
        fill_interval: 60s
  - name: envoy.filters.http.router
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

## Health Checking and Circuit Breaking

Configure health checking across the mesh:

```yaml
clusters:
  - name: reviews_service
    connect_timeout: 5s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    health_checks:
      - timeout: 2s
        interval: 10s
        healthy_threshold: 2
        unhealthy_threshold: 3
        http_health_check:
          path: /reviews/0
    circuit_breakers:
      thresholds:
        - max_connections: 100
          max_pending_requests: 50
          max_requests: 200
          max_retries: 3
    outlier_detection:
      consecutive_5xx: 3
      interval: 10s
      base_ejection_time: 30s
      max_ejection_percent: 30
    load_assignment:
      cluster_name: reviews_service
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: reviews-proxy
                    port_value: 8080
```

## Conclusion

While Istio is designed for Kubernetes, its core sidecar, traffic management, mTLS, and observability patterns can be implemented with Podman by running and configuring Envoy directly. Podman pods provide the shared network namespace needed for the sidecar pattern, and Envoy configuration lets you reproduce many of the traffic management capabilities commonly associated with Istio. This approach is valuable for environments where Kubernetes is not available or appropriate, but you still need modern service-to-service security and routing patterns. By combining Podman's pod model with Envoy's proxy capabilities and Istio's architectural patterns, you get a practical service-mesh-inspired solution for container-based microservices.
