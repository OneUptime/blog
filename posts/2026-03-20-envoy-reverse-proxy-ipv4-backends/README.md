# How to Set Up Envoy as a Reverse Proxy for IPv4 Backend Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Reverse Proxy, IPv4, HTTP, Service Mesh, Load Balancing

Description: Configure Envoy as a reverse proxy that accepts HTTP/HTTPS traffic and forwards requests to IPv4 backend services with path-based routing.

## Introduction

Envoy is the data plane proxy behind Istio and many service meshes, but it also runs standalone as a high-performance reverse proxy. This guide sets up Envoy to route HTTP traffic to multiple IPv4 backends based on URL paths.

## Complete Reverse Proxy Configuration

```yaml
# /etc/envoy/reverse-proxy.yaml

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
                use_remote_address: true
                access_log:
                  - name: envoy.access_loggers.stdout
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.access_loggers.stream.v3.StdoutAccessLog

                route_config:
                  name: main_routes
                  virtual_hosts:
                    - name: backend_services
                      domains: ["*"]
                      routes:
                        # Route /api/ to API service
                        - match:
                            prefix: "/api/"
                          route:
                            cluster: api_cluster
                            prefix_rewrite: "/"

                        # Route /static/ to static server
                        - match:
                            prefix: "/static/"
                          route:
                            cluster: static_cluster

                        # Default route to web service
                        - match:
                            prefix: "/"
                          route:
                            cluster: web_cluster

                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: web_cluster
      connect_timeout: 5s
      type: STATIC
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: web_cluster
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address: { address: 192.168.1.10, port_value: 8080 }
              - endpoint:
                  address:
                    socket_address: { address: 192.168.1.11, port_value: 8080 }

    - name: api_cluster
      connect_timeout: 5s
      type: STATIC
      lb_policy: LEAST_REQUEST
      load_assignment:
        cluster_name: api_cluster
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address: { address: 192.168.2.10, port_value: 8080 }
              - endpoint:
                  address:
                    socket_address: { address: 192.168.2.11, port_value: 8080 }

    - name: static_cluster
      connect_timeout: 5s
      type: STATIC
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: static_cluster
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address: { address: 192.168.3.10, port_value: 80 }

admin:
  address:
    socket_address: { address: 127.0.0.1, port_value: 9901 }
```

## Adding Request Headers

Use `request_headers_to_add` for custom headers. Envoy manages `X-Forwarded-For` and `X-Forwarded-Proto` automatically, and `use_remote_address: true` is recommended when Envoy is acting as an edge reverse proxy:

```yaml
routes:
  - match: { prefix: "/" }
    route: { cluster: web_cluster }
    request_headers_to_add:
      - header:
          key: "X-Proxy-By"
          value: "envoy"
```

## Testing the Reverse Proxy

```bash
# Start Envoy

envoy -c /etc/envoy/reverse-proxy.yaml

# Test path routing
curl http://localhost:8080/api/users
curl http://localhost:8080/static/logo.png
curl http://localhost:8080/

# View routing table
curl -s 'http://127.0.0.1:9901/config_dump?resource=static_route_configs' | jq '.configs[0].static_route_configs'

# View traffic stats
curl http://127.0.0.1:9901/stats | grep cluster.*upstream_rq_total
```

## Conclusion

Envoy as a reverse proxy uses declarative YAML to define routes, clusters, and filters. Path-based routing with `prefix` matches routes to specific IPv4 backend clusters, `prefix_rewrite` transforms paths before forwarding, and `ROUND_ROBIN`/`LEAST_REQUEST` algorithms distribute load across endpoints. The admin API at port 9901 provides real-time introspection of the loaded routing configuration, traffic stats, and backend health.
