# How to Handle Services Without Selectors in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Services, Endpoint, External Services

Description: Configure Istio to work with Kubernetes services that have no pod selectors, including manual endpoints, external service routing, and hybrid architectures.

---

Not every Kubernetes Service has a pod selector. Services without selectors are used when you want to point a Service at something other than pods managed by Kubernetes. Maybe you have a database running on a VM, a legacy service outside the cluster, or endpoints managed by a custom controller. Istio can handle these services, but the configuration needs some extra attention.

## Why Services Without Selectors Exist

A normal Kubernetes Service has a selector that matches pods:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-api
spec:
  selector:
    app: my-api  # Matches pods with this label
  ports:
  - port: 8080
```

Kubernetes automatically creates and manages Endpoints based on pods that match the selector. When you remove the selector, Kubernetes does not create Endpoints automatically. You manage them yourself:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-database
spec:
  ports:
  - name: tcp-postgres
    port: 5432
    targetPort: 5432
---
apiVersion: v1
kind: Endpoints
metadata:
  name: external-database  # Must match the Service name
subsets:
- addresses:
  - ip: 10.200.1.50
  - ip: 10.200.1.51
  ports:
  - name: tcp-postgres
    port: 5432
```

Or using the newer EndpointSlice API:

```yaml
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: external-database-1
  labels:
    kubernetes.io/service-name: external-database
addressType: IPv4
ports:
- name: tcp-postgres
  port: 5432
endpoints:
- addresses:
  - "10.200.1.50"
- addresses:
  - "10.200.1.51"
```

## How Istio Sees Services Without Selectors

Istio discovers endpoints through the Kubernetes API, just like kube-proxy. When a Service has manually defined Endpoints (or EndpointSlices), Istio picks them up and creates Envoy cluster entries for them.

Check how Istio sees your selector-less service:

```bash
istioctl proxy-config endpoint deploy/my-app -n my-namespace | grep external-database
```

You should see the manually defined IPs (10.200.1.50 and 10.200.1.51) listed as endpoints.

## Common Use Cases

**External databases:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: production-db
  namespace: my-app
spec:
  ports:
  - name: tcp-postgres
    port: 5432
---
apiVersion: v1
kind: Endpoints
metadata:
  name: production-db
  namespace: my-app
subsets:
- addresses:
  - ip: 192.168.10.100
  ports:
  - name: tcp-postgres
    port: 5432
```

**Legacy services on VMs:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: legacy-auth
  namespace: my-app
spec:
  ports:
  - name: http-auth
    port: 8080
---
apiVersion: v1
kind: Endpoints
metadata:
  name: legacy-auth
  namespace: my-app
subsets:
- addresses:
  - ip: 10.0.5.20
  - ip: 10.0.5.21
  ports:
  - name: http-auth
    port: 8080
```

**Services in another cluster:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: remote-service
  namespace: my-app
spec:
  ports:
  - name: http-api
    port: 80
---
apiVersion: v1
kind: Endpoints
metadata:
  name: remote-service
  namespace: my-app
subsets:
- addresses:
  - ip: 172.16.0.100
  - ip: 172.16.0.101
  ports:
  - name: http-api
    port: 80
```

## Applying Istio Traffic Policies

The great thing about using Service + Endpoints instead of direct IP connections is that Istio treats them like any other service. You can apply DestinationRules:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: production-db-policy
spec:
  host: production-db.my-app.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 30
        connectTimeout: 5s
        tcpKeepalive:
          time: 7200s
          interval: 75s
    outlierDetection:
      consecutiveGatewayErrors: 3
      interval: 30s
      baseEjectionTime: 60s
```

This gives you connection pooling, timeouts, and outlier detection for your external database, exactly the same as for in-mesh services.

## TLS Configuration

When the endpoints point to external services that require TLS, configure TLS origination in the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: legacy-auth-tls
spec:
  host: legacy-auth.my-app.svc.cluster.local
  trafficPolicy:
    tls:
      mode: SIMPLE
      sni: auth.internal.example.com
```

For mutual TLS to external services (client certificate authentication):

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: legacy-auth-mtls
spec:
  host: legacy-auth.my-app.svc.cluster.local
  trafficPolicy:
    tls:
      mode: MUTUAL
      clientCertificate: /etc/certs/client.pem
      privateKey: /etc/certs/key.pem
      caCertificates: /etc/certs/ca.pem
      sni: auth.internal.example.com
```

Make sure the certificates are mounted into the sidecar using a secret volume.

## VirtualService Routing

VirtualService routing works the same way as with selector-based services:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: legacy-auth-routes
spec:
  hosts:
  - legacy-auth
  http:
  - route:
    - destination:
        host: legacy-auth
        port:
          number: 8080
    timeout: 5s
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx,connect-failure
```

## Authorization Policies

You can control which workloads can access services without selectors:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: db-access
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: production-db
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/my-app/sa/backend"
```

Wait, there is a problem. The `selector` field in AuthorizationPolicy matches pod labels. But services without selectors do not have pods, so the AuthorizationPolicy cannot target the external service itself. Instead, control access at the source side by restricting which pods can connect to the external service.

You can do this with a Sidecar resource that limits egress:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: backend-sidecar
  namespace: my-app
spec:
  workloadSelector:
    labels:
      app: backend
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
```

If `production-db` is in the same namespace, it is included in `./*`. If you want to be more restrictive:

```yaml
  egress:
  - hosts:
    - "./production-db.my-app.svc.cluster.local"
    - "./other-service.my-app.svc.cluster.local"
    - "istio-system/*"
```

## Comparing with ServiceEntry

Services without selectors overlap in functionality with Istio's ServiceEntry. Both let you route mesh traffic to external endpoints. Here is when to use each:

**Use Service + Endpoints when:**
- You want standard Kubernetes service discovery
- Other non-Istio tools need to discover the service
- You want the external service to look like a normal Kubernetes service

**Use ServiceEntry when:**
- You need to control DNS resolution behavior
- You want to route to external hostnames (not just IPs)
- You need the `MESH_EXTERNAL` location designation

```yaml
# ServiceEntry equivalent of the external database
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: production-db
  namespace: my-app
spec:
  hosts:
  - production-db.internal
  ports:
  - number: 5432
    name: tcp-postgres
    protocol: TCP
  resolution: STATIC
  location: MESH_EXTERNAL
  endpoints:
  - address: 192.168.10.100
  - address: 192.168.10.101
```

Both approaches work with Istio. The ServiceEntry approach gives you slightly more control over Istio-specific behavior, while the Service + Endpoints approach is more standard Kubernetes.

## Dynamic Endpoint Management

For services without selectors, you are responsible for keeping the Endpoints up to date. If an external service's IP changes and you do not update the Endpoints, traffic goes to the wrong place.

Automate this with a controller or a cron job:

```bash
#!/bin/bash
# Resolve the current IP of the external service
CURRENT_IP=$(dig +short mydb.internal.example.com | head -1)

# Update the Endpoints
kubectl apply -f - <<EOF
apiVersion: v1
kind: Endpoints
metadata:
  name: production-db
  namespace: my-app
subsets:
- addresses:
  - ip: $CURRENT_IP
  ports:
  - name: tcp-postgres
    port: 5432
EOF
```

Or better yet, use a ServiceEntry with `resolution: DNS` which handles DNS resolution automatically.

## Monitoring

Istio generates metrics for traffic to services without selectors just like any other service:

```promql
sum(rate(istio_requests_total{
  destination_service="legacy-auth.my-app.svc.cluster.local"
}[5m])) by (source_workload, response_code)
```

For TCP services:

```promql
sum(rate(istio_tcp_sent_bytes_total{
  destination_service="production-db.my-app.svc.cluster.local"
}[5m])) by (source_workload)
```

## Summary

Services without selectors are a straightforward way to bring external endpoints into the Kubernetes and Istio ecosystem. Manually define Endpoints (or EndpointSlices) to point at external IPs, then apply Istio traffic policies, TLS origination, and monitoring like you would for any other service. Keep endpoints up to date either manually or with automation. For more advanced use cases, consider using ServiceEntry instead, which gives you additional Istio-specific configuration options.
