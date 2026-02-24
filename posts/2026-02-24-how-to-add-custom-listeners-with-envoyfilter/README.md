# How to Add Custom Listeners with EnvoyFilter

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, EnvoyFilter, Envoy Listeners, Kubernetes, Service Mesh, Proxy

Description: Add custom Envoy listeners with EnvoyFilter in Istio for additional ports, custom protocols, admin endpoints, and specialized traffic handling beyond standard Istio APIs.

---

Envoy listeners are the entry points for all traffic flowing through the proxy. Each listener binds to a specific address and port and defines how incoming connections are handled. Istio automatically creates listeners based on your Services and Gateway definitions, but sometimes you need listeners that Istio's standard APIs cannot create. EnvoyFilter lets you add custom listeners for specialized use cases.

## Understanding Envoy Listeners in Istio

Before adding custom listeners, it helps to understand what Istio creates automatically. You can inspect the current listeners:

```bash
istioctl proxy-config listeners deploy/my-app -n default
```

A typical sidecar proxy has these listeners:

- **0.0.0.0:15006** (inbound): Catches all inbound traffic redirected by iptables
- **0.0.0.0:15001** (outbound): Catches all outbound traffic redirected by iptables
- **Virtual listeners**: One for each service port in the mesh

The inbound and outbound listeners are the "catch-all" listeners. They use the original destination address to determine which virtual listener should handle the traffic.

## Adding a Custom Listener for a Health Check Port

One common use case is adding a listener that Istio does not create automatically. For example, a custom health check endpoint that should bypass the normal filter chain:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: health-check-listener
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: LISTENER
      match:
        context: SIDECAR_INBOUND
      patch:
        operation: ADD
        value:
          name: health_check_listener
          address:
            socket_address:
              address: 0.0.0.0
              port_value: 15021
          filter_chains:
            - filters:
                - name: envoy.filters.network.http_connection_manager
                  typed_config:
                    "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                    stat_prefix: health_check
                    codec_type: AUTO
                    route_config:
                      name: local_route
                      virtual_hosts:
                        - name: health
                          domains:
                            - "*"
                          routes:
                            - match:
                                prefix: /healthz
                              direct_response:
                                status: 200
                                body:
                                  inline_string: "OK"
                    http_filters:
                      - name: envoy.filters.http.router
                        typed_config:
                          "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

This creates a listener on port 15021 that responds directly with a 200 OK for any request to `/healthz`. The response comes from Envoy itself without reaching your application. This is useful for Kubernetes liveness probes that should check the proxy health rather than the application.

## Adding a Custom TCP Listener

Add a listener for a custom TCP protocol on a specific port:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-tcp-listener
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: LISTENER
      match:
        context: SIDECAR_INBOUND
      patch:
        operation: ADD
        value:
          name: custom_tcp_9999
          address:
            socket_address:
              address: 0.0.0.0
              port_value: 9999
          filter_chains:
            - filters:
                - name: envoy.filters.network.tcp_proxy
                  typed_config:
                    "@type": type.googleapis.com/envoy.extensions.filters.network.tcp_proxy.v3.TcpProxy
                    stat_prefix: custom_tcp
                    cluster: inbound|9999||
                    idle_timeout: 3600s
                    access_log:
                      - name: envoy.access_loggers.file
                        typed_config:
                          "@type": type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog
                          path: /dev/stdout
                          log_format:
                            json_format:
                              timestamp: "%START_TIME%"
                              source: "%DOWNSTREAM_REMOTE_ADDRESS%"
                              bytes_rx: "%BYTES_RECEIVED%"
                              bytes_tx: "%BYTES_SENT%"
                              duration: "%DURATION%"
```

This creates a TCP listener on port 9999 with custom access logging and a 1-hour idle timeout.

## Adding a Listener with TLS Termination

Create a listener that terminates TLS and then processes the traffic as HTTP:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: tls-listener
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: LISTENER
      match:
        context: SIDECAR_INBOUND
      patch:
        operation: ADD
        value:
          name: tls_listener_8443
          address:
            socket_address:
              address: 0.0.0.0
              port_value: 8443
          listener_filters:
            - name: envoy.filters.listener.tls_inspector
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.listener.tls_inspector.v3.TlsInspector
          filter_chains:
            - transport_socket:
                name: envoy.transport_sockets.tls
                typed_config:
                  "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
                  common_tls_context:
                    tls_certificates:
                      - certificate_chain:
                          filename: /etc/certs/tls.crt
                        private_key:
                          filename: /etc/certs/tls.key
              filters:
                - name: envoy.filters.network.http_connection_manager
                  typed_config:
                    "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                    stat_prefix: tls_http
                    codec_type: AUTO
                    route_config:
                      name: local_route
                      virtual_hosts:
                        - name: backend
                          domains:
                            - "*"
                          routes:
                            - match:
                                prefix: /
                              route:
                                cluster: inbound|8080||
                    http_filters:
                      - name: envoy.filters.http.router
                        typed_config:
                          "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

This listener terminates TLS on port 8443 and routes the decrypted traffic to the application on port 8080. The certificate files must be mounted into the sidecar container.

## Adding a Direct Response Listener

Create a listener that serves static content directly from Envoy without routing to any upstream:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: static-response
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: LISTENER
      match:
        context: SIDECAR_INBOUND
      patch:
        operation: ADD
        value:
          name: static_response_8081
          address:
            socket_address:
              address: 0.0.0.0
              port_value: 8081
          filter_chains:
            - filters:
                - name: envoy.filters.network.http_connection_manager
                  typed_config:
                    "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                    stat_prefix: static
                    codec_type: AUTO
                    route_config:
                      name: static_routes
                      virtual_hosts:
                        - name: static_host
                          domains:
                            - "*"
                          routes:
                            - match:
                                prefix: /ready
                              direct_response:
                                status: 200
                                body:
                                  inline_string: '{"status":"ready"}'
                            - match:
                                prefix: /version
                              direct_response:
                                status: 200
                                body:
                                  inline_string: '{"version":"v1.2.3"}'
                            - match:
                                prefix: /
                              direct_response:
                                status: 404
                                body:
                                  inline_string: '{"error":"not found"}'
                    http_filters:
                      - name: envoy.filters.http.router
                        typed_config:
                          "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

This is useful for serving metadata endpoints, readiness checks, or version information directly from the sidecar without involving the application.

## Modifying Existing Listeners

Instead of adding new listeners, you can modify existing ones. For example, changing the connection buffer size on the inbound listener:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: modify-inbound-listener
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: LISTENER
      match:
        context: SIDECAR_INBOUND
        listener:
          portNumber: 8080
      patch:
        operation: MERGE
        value:
          per_connection_buffer_limit_bytes: 65536
          listener_filters_timeout: 10s
```

This uses MERGE to modify the existing listener for port 8080 rather than creating a new one.

## Adding Listener Filters

Listener filters run before the filter chain selection and can inspect the initial bytes of a connection. You can add custom listener filters:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: proxy-protocol-listener
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: LISTENER
      match:
        context: GATEWAY
        listener:
          portNumber: 8080
      patch:
        operation: MERGE
        value:
          listener_filters:
            - name: envoy.filters.listener.proxy_protocol
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.listener.proxy_protocol.v3.ProxyProtocol
            - name: envoy.filters.listener.tls_inspector
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.listener.tls_inspector.v3.TlsInspector
```

This adds the proxy protocol listener filter to the ingress gateway, which is needed when the gateway sits behind a load balancer that uses the PROXY protocol to pass client IP information.

## Verifying Custom Listeners

After adding a custom listener, verify it exists:

```bash
# List all listeners
istioctl proxy-config listeners deploy/my-app -n default

# Check your specific listener
istioctl proxy-config listeners deploy/my-app -n default --port 9999 -o json
```

Test the listener is working:

```bash
# For HTTP listeners
kubectl exec deploy/my-app -c istio-proxy -- curl -s http://localhost:8081/ready

# For TCP listeners
kubectl exec deploy/my-app -c istio-proxy -- curl -v telnet://localhost:9999
```

## Common Pitfalls

**Port conflicts**: If you add a listener on a port that is already used by another listener, the new listener will be rejected. Check existing listeners before adding new ones.

**Missing iptables rules**: Custom listeners on new ports might not have iptables rules to redirect traffic to them. If external traffic is not reaching your listener, you might need to add the port to the iptables redirect rules through pod annotations:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/includeInboundPorts: "8080,9999"
```

**Cluster references**: If your listener routes traffic to a cluster (like `inbound|9999||`), that cluster must exist. Istio creates clusters based on Service definitions, so make sure there is a Service port for the backend you are routing to.

**Resource limits**: Each listener consumes memory and CPU. Adding many listeners increases the sidecar's resource footprint. Monitor sidecar resources after adding custom listeners.

## When Not to Add Custom Listeners

Most use cases do not need custom listeners. Here are alternatives:

- **New service port**: Just add it to your Kubernetes Service. Istio creates the listener automatically.
- **Different routing rules**: Use VirtualService instead of a custom listener.
- **TLS termination**: Use Gateway resources instead of custom TLS listeners.
- **Health checks**: Istio already provides health check endpoints. Check if the built-in ones work before adding custom ones.

Only add custom listeners when the standard Istio APIs genuinely cannot handle your use case.

## Summary

Custom listeners with EnvoyFilter give you full control over how the Envoy proxy accepts and processes traffic. Use them for health check endpoints, custom protocol handling, direct response endpoints, and specialized TLS configurations that Istio's standard APIs do not support. Always verify listeners with istioctl proxy-config, check for port conflicts, and make sure iptables rules redirect traffic correctly. Keep custom listeners to a minimum since they add complexity and maintenance overhead during Istio upgrades. For most use cases, Istio's standard Service and Gateway resources automatically create the listeners you need.
