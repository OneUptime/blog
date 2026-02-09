# How to implement Envoy clusters for backend service discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Service Discovery, Networking

Description: Learn how to configure Envoy clusters with various service discovery mechanisms for dynamic backend endpoint resolution.

---

Envoy clusters define logical groups of upstream hosts that receive traffic routed from listeners. The cluster configuration determines how Envoy discovers backend endpoints, balances load across them, and handles failures. Understanding cluster configuration is essential for building resilient proxy architectures. This guide covers different service discovery mechanisms and cluster configuration patterns.

## Cluster Types and Service Discovery

Envoy supports several cluster types for endpoint discovery:

- STATIC: Manually configured endpoints that never change
- STRICT_DNS: DNS-based discovery with strict health checking
- LOGICAL_DNS: DNS-based discovery for external services
- EDS: Endpoint Discovery Service for dynamic xDS-based discovery
- ORIGINAL_DST: Forward to the original destination (transparent proxy)

Choose the type based on your infrastructure and operational requirements.

## Static Cluster Configuration

Static clusters define fixed endpoints at configuration time:

```yaml
clusters:
- name: static_backend
  connect_timeout: 5s
  type: STATIC
  lb_policy: ROUND_ROBIN
  load_assignment:
    cluster_name: static_backend
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: 192.168.1.10
              port_value: 8080
      - endpoint:
          address:
            socket_address:
              address: 192.168.1.11
              port_value: 8080
      - endpoint:
          address:
            socket_address:
              address: 192.168.1.12
              port_value: 8080
```

Static clusters work well for development or when endpoints rarely change, but require configuration updates to add or remove backends.

## STRICT_DNS Cluster for Kubernetes Services

STRICT_DNS resolves DNS names and treats each A record as a separate endpoint:

```yaml
clusters:
- name: backend_service
  connect_timeout: 5s
  type: STRICT_DNS
  dns_refresh_rate: 30s
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
  health_checks:
  - timeout: 5s
    interval: 10s
    unhealthy_threshold: 3
    healthy_threshold: 2
    http_health_check:
      path: /health
      expected_statuses:
      - start: 200
        end: 299
```

This configuration queries DNS every 30 seconds and updates the endpoint list automatically. Perfect for Kubernetes Services where DNS returns multiple pod IPs.

## LOGICAL_DNS for External Services

LOGICAL_DNS treats the DNS result as a single logical endpoint, useful for external services with DNS-based load balancing:

```yaml
clusters:
- name: external_api
  connect_timeout: 5s
  type: LOGICAL_DNS
  dns_refresh_rate: 60s
  lb_policy: ROUND_ROBIN
  load_assignment:
    cluster_name: external_api
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: api.external-service.com
              port_value: 443
  transport_socket:
    name: envoy.transport_sockets.tls
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
      sni: api.external-service.com
```

Use LOGICAL_DNS when the external service handles load balancing (like AWS ELB or CloudFlare CDN).

## EDS Cluster for Dynamic Discovery

EDS (Endpoint Discovery Service) enables fully dynamic endpoint management:

```yaml
clusters:
- name: dynamic_backend
  connect_timeout: 5s
  type: EDS
  lb_policy: LEAST_REQUEST
  eds_cluster_config:
    eds_config:
      api_config_source:
        api_type: GRPC
        grpc_services:
        - envoy_grpc:
            cluster_name: xds_cluster
        transport_api_version: V3
    service_name: dynamic_backend
```

EDS requires a control plane (like Istio or your own xDS server) that provides endpoint information via gRPC. This is the most flexible approach for large-scale dynamic environments.

## Multiple Priority Levels

Define multiple priority levels for locality-aware load balancing:

```yaml
clusters:
- name: multi_zone_backend
  connect_timeout: 5s
  type: STRICT_DNS
  dns_refresh_rate: 30s
  lb_policy: ROUND_ROBIN
  load_assignment:
    cluster_name: multi_zone_backend
    endpoints:
    - priority: 0
      locality:
        zone: us-east-1a
      lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: backend-zone-a.default.svc.cluster.local
              port_value: 8080
    - priority: 1
      locality:
        zone: us-east-1b
      lb_endpoints:
      - endpoint:
          address:
            socket_socket:
              address: backend-zone-b.default.svc.cluster.local
              port_value: 8080
```

Envoy prefers endpoints with lower priority values and only uses higher-priority endpoints when lower ones are unavailable.

## Connection Pool Settings

Configure connection pooling for efficient resource usage:

```yaml
clusters:
- name: pooled_backend
  connect_timeout: 5s
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  load_assignment:
    cluster_name: pooled_backend
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: backend.default.svc.cluster.local
              port_value: 8080
  circuit_breakers:
    thresholds:
    - priority: DEFAULT
      max_connections: 1024
      max_pending_requests: 1024
      max_requests: 1024
      max_retries: 3
  http2_protocol_options:
    max_concurrent_streams: 100
```

Connection pool limits prevent resource exhaustion and control upstream load.

## Upstream TLS Configuration

Enable TLS for upstream connections:

```yaml
clusters:
- name: secure_backend
  connect_timeout: 5s
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  load_assignment:
    cluster_name: secure_backend
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: secure-backend.default.svc.cluster.local
              port_value: 8443
  transport_socket:
    name: envoy.transport_sockets.tls
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
      common_tls_context:
        validation_context:
          trusted_ca:
            filename: /etc/envoy/certs/ca.crt
        tls_certificates:
        - certificate_chain:
            filename: /etc/envoy/certs/client.crt
          private_key:
            filename: /etc/envoy/certs/client.key
```

This configures mutual TLS authentication between Envoy and upstream services.

## Outlier Detection

Automatically remove unhealthy hosts from the load balancing pool:

```yaml
clusters:
- name: backend_with_outlier_detection
  connect_timeout: 5s
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  load_assignment:
    cluster_name: backend_with_outlier_detection
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: backend.default.svc.cluster.local
              port_value: 8080
  outlier_detection:
    consecutive_5xx: 5
    interval: 10s
    base_ejection_time: 30s
    max_ejection_percent: 50
    enforcing_consecutive_5xx: 100
    success_rate_minimum_hosts: 5
    success_rate_request_volume: 100
    success_rate_stdev_factor: 1900
```

Outlier detection ejects hosts that exhibit abnormal behavior, improving overall reliability.

## Cluster Monitoring

Track cluster health with these metrics:

```promql
# Upstream connection metrics
envoy_cluster_upstream_cx_total
envoy_cluster_upstream_cx_active

# Request metrics
envoy_cluster_upstream_rq_total
envoy_cluster_upstream_rq_pending_active

# Health check metrics
envoy_cluster_health_check_success
envoy_cluster_health_check_failure

# Membership metrics
envoy_cluster_membership_healthy
envoy_cluster_membership_total
```

## Conclusion

Envoy clusters provide flexible service discovery mechanisms for different infrastructure patterns. Use STRICT_DNS for Kubernetes services, LOGICAL_DNS for external APIs, and EDS for fully dynamic environments. Configure health checks, outlier detection, and connection pooling to build resilient backend communication. Monitor cluster metrics to understand endpoint health and connection behavior.
