# How to Add Custom Clusters with EnvoyFilter

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, EnvoyFilter, Envoy, Kubernetes, Service Mesh, Networking

Description: Learn how to add custom upstream clusters to Envoy proxies using EnvoyFilter resources in Istio for advanced traffic routing scenarios.

---

Istio gives you a ton of flexibility when it comes to traffic management, but sometimes the built-in abstractions like VirtualService and DestinationRule just aren't enough. Maybe you need to route traffic to an external service that isn't part of your mesh, or you want to define a custom upstream cluster with very specific connection settings. That's where EnvoyFilter comes in, and specifically the ability to add custom clusters.

## What Are Envoy Clusters?

In Envoy's architecture, a "cluster" is a group of logically similar upstream hosts that Envoy connects to. When your sidecar proxy needs to forward a request, it picks a cluster based on routing rules, then picks an endpoint within that cluster based on the load balancing policy. Istio normally manages these clusters for you automatically, but EnvoyFilter lets you step in and define your own.

## Why Would You Need Custom Clusters?

There are several common reasons:

- You need to connect to a legacy service that uses a protocol Envoy doesn't auto-discover
- You want very granular control over connection pool settings for a specific upstream
- You need to route to an endpoint that isn't registered in the Kubernetes service registry
- You're building custom filters that need to reference a specific cluster by name

## Basic Custom Cluster Example

Here's an EnvoyFilter that adds a custom cluster pointing to an external API:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-external-cluster
  namespace: istio-system
spec:
  configPatches:
  - applyTo: CLUSTER
    patch:
      operation: ADD
      value:
        name: external-api-cluster
        type: STRICT_DNS
        connect_timeout: 5s
        lb_policy: ROUND_ROBIN
        load_assignment:
          cluster_name: external-api-cluster
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

This creates a cluster called `external-api-cluster` that connects to `api.external-service.com` on port 443 with TLS enabled. The `STRICT_DNS` type means Envoy will resolve the DNS name and use all returned addresses.

## Cluster Discovery Types

The `type` field in your cluster definition controls how Envoy discovers the endpoints. Here are the options you'll use most often:

- `STATIC` - endpoints are hardcoded in the configuration
- `STRICT_DNS` - Envoy resolves DNS and uses all returned A records
- `LOGICAL_DNS` - Envoy resolves DNS but only uses the first returned address
- `EDS` - endpoints come from Envoy's discovery service (this is what Istio normally uses)

For external services, `STRICT_DNS` is usually what you want. For hardcoded IPs, use `STATIC`:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: static-cluster
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
  - applyTo: CLUSTER
    patch:
      operation: ADD
      value:
        name: my-static-cluster
        type: STATIC
        connect_timeout: 3s
        lb_policy: ROUND_ROBIN
        load_assignment:
          cluster_name: my-static-cluster
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: 10.0.0.50
                    port_value: 8080
            - endpoint:
                address:
                  socket_address:
                    address: 10.0.0.51
                    port_value: 8080
```

Notice the `workloadSelector` here. This scopes the EnvoyFilter to only apply to pods with the label `app: my-app`, rather than applying it mesh-wide.

## Adding Connection Pool Settings

Custom clusters give you fine-grained control over connection behavior:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-cluster-with-pool
  namespace: default
spec:
  configPatches:
  - applyTo: CLUSTER
    patch:
      operation: ADD
      value:
        name: rate-limited-upstream
        type: STRICT_DNS
        connect_timeout: 2s
        lb_policy: ROUND_ROBIN
        circuit_breakers:
          thresholds:
          - max_connections: 100
            max_pending_requests: 50
            max_requests: 200
            max_retries: 3
        load_assignment:
          cluster_name: rate-limited-upstream
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: upstream.example.com
                    port_value: 8080
```

The `circuit_breakers` section is particularly useful. It prevents your service from overwhelming an upstream by capping the number of concurrent connections, pending requests, and active requests.

## Using Custom Clusters with Route Configuration

Adding a cluster by itself doesn't do much. You also need to tell Envoy when to route traffic to it. You can do this with another EnvoyFilter patch that modifies the route configuration:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: route-to-custom-cluster
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
  - applyTo: CLUSTER
    patch:
      operation: ADD
      value:
        name: external-api-cluster
        type: STRICT_DNS
        connect_timeout: 5s
        lb_policy: ROUND_ROBIN
        load_assignment:
          cluster_name: external-api-cluster
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: api.example.com
                    port_value: 443
        transport_socket:
          name: envoy.transport_sockets.tls
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
            sni: api.example.com
  - applyTo: VIRTUAL_HOST
    match:
      context: SIDECAR_OUTBOUND
      routeConfiguration:
        vhost:
          name: "api.example.com:443"
    patch:
      operation: MERGE
      value:
        routes:
        - match:
            prefix: "/"
          route:
            cluster: external-api-cluster
```

## Health Checking on Custom Clusters

You can also configure health checks for your custom clusters so Envoy can automatically remove unhealthy endpoints:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: healthchecked-cluster
  namespace: default
spec:
  configPatches:
  - applyTo: CLUSTER
    patch:
      operation: ADD
      value:
        name: healthchecked-upstream
        type: STRICT_DNS
        connect_timeout: 5s
        lb_policy: ROUND_ROBIN
        health_checks:
        - timeout: 2s
          interval: 10s
          unhealthy_threshold: 3
          healthy_threshold: 2
          http_health_check:
            path: /healthz
        load_assignment:
          cluster_name: healthchecked-upstream
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: backend.example.com
                    port_value: 8080
```

## Verifying Your Custom Cluster

After applying your EnvoyFilter, you can verify it took effect by checking the Envoy configuration dump:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request GET clusters
```

This lists all clusters known to the proxy. Look for your custom cluster name in the output. For a more detailed view:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request GET config_dump | grep -A 20 "external-api-cluster"
```

## Common Pitfalls

A few things to watch out for when working with custom clusters:

1. **Name collisions**: Make sure your cluster name doesn't collide with one that Istio generates automatically. Istio uses a naming convention like `outbound|PORT||HOSTNAME`, so as long as you pick something different, you should be fine.

2. **DNS resolution**: If you use `STRICT_DNS`, make sure the DNS name is resolvable from the pod's network namespace. The Envoy proxy resolves DNS directly, not through kube-dns necessarily.

3. **TLS configuration**: If the upstream requires TLS, you must configure the `transport_socket` section. Without it, Envoy will try to connect with plain TCP.

4. **Patch ordering**: EnvoyFilter patches are applied in a specific order based on priority. If you have multiple EnvoyFilters modifying the same area, the order matters. You can set the `priority` field (default is 0, higher values are applied later).

## Cleanup

To remove your custom cluster, just delete the EnvoyFilter:

```bash
kubectl delete envoyfilter custom-external-cluster -n istio-system
```

Envoy will automatically remove the cluster from its configuration within a few seconds.

Working with custom clusters through EnvoyFilter is one of those features you don't need every day, but when you do need it, nothing else will do. Just remember that EnvoyFilter is a powerful but low-level tool. If you can accomplish what you need with VirtualService, DestinationRule, or ServiceEntry, prefer those higher-level abstractions. They're easier to maintain and less likely to break during Istio upgrades.
