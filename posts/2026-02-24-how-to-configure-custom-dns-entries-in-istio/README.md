# How to Configure Custom DNS Entries in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DNS, ServiceEntry, Kubernetes, Networking

Description: How to create custom DNS entries in Istio using ServiceEntry and DNS proxy to resolve hostnames that are not part of your Kubernetes cluster.

---

There are plenty of scenarios where you need your Istio mesh to resolve custom hostnames that don't exist in your Kubernetes DNS. Maybe you're migrating from VMs and need to keep old hostnames working, or you want to give a friendly name to an external API endpoint. Istio provides several ways to create custom DNS entries, and picking the right approach depends on your specific situation.

## Using ServiceEntry for Custom DNS

The most common way to add custom DNS entries in Istio is through ServiceEntry. This resource tells Istio about services that live outside the mesh (or outside the cluster entirely) and makes them part of the mesh's service registry.

Here's a basic example that maps a custom hostname to a specific IP:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: legacy-database
  namespace: default
spec:
  hosts:
  - legacy-db.internal.company.com
  ports:
  - number: 5432
    name: tcp-postgres
    protocol: TCP
  resolution: STATIC
  endpoints:
  - address: 192.168.1.100
    ports:
      tcp-postgres: 5432
```

This tells Istio that `legacy-db.internal.company.com` should resolve to `192.168.1.100`. But there's a catch. This only works at the Envoy routing level. Unless you have DNS proxy enabled, the application container still needs to be able to resolve the hostname through regular DNS.

## Making It Work with DNS Proxy

To have the custom entry actually work as a DNS record (so your application's DNS queries get answered), you need DNS proxy enabled:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          proxyMetadata:
            ISTIO_META_DNS_CAPTURE: "true"
            ISTIO_META_DNS_AUTO_ALLOCATE: "true"
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

With DNS capture enabled, when your app tries to resolve `legacy-db.internal.company.com`, the sidecar intercepts the query and returns the address from the ServiceEntry configuration.

## Multiple Endpoints

You can define multiple endpoints for load balancing:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: redis-cluster
  namespace: default
spec:
  hosts:
  - redis.internal.company.com
  ports:
  - number: 6379
    name: tcp-redis
    protocol: TCP
  resolution: STATIC
  endpoints:
  - address: 10.0.1.10
    ports:
      tcp-redis: 6379
  - address: 10.0.1.11
    ports:
      tcp-redis: 6379
  - address: 10.0.1.12
    ports:
      tcp-redis: 6379
```

## DNS-Based Resolution

Instead of hardcoding IPs, you can tell Istio to resolve the actual hostname through DNS and use whatever the DNS server returns:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: external-api
  namespace: default
spec:
  hosts:
  - api.partner-company.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
```

With `resolution: DNS`, the sidecar performs DNS resolution when it needs to connect to the service. This is the right choice when the target service's IP might change (like most cloud services behind a load balancer).

## Creating Aliases with ServiceEntry

You can use ServiceEntry to create DNS aliases, mapping one hostname to another service. For example, if you want `database` to resolve to your RDS instance:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: database-alias
  namespace: default
spec:
  hosts:
  - database
  ports:
  - number: 3306
    name: tcp-mysql
    protocol: TCP
  resolution: DNS
  endpoints:
  - address: mydb.us-east-1.rds.amazonaws.com
    ports:
      tcp-mysql: 3306
```

With DNS proxy enabled, resolving `database` from within the mesh will route to your RDS instance. This is especially useful during migrations when you want to swap backends without changing application code.

## Wildcard DNS Entries

You can create wildcard entries that match any subdomain:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: wildcard-partner
  namespace: default
spec:
  hosts:
  - "*.partner-api.com"
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  resolution: NONE
  location: MESH_EXTERNAL
```

Note that `resolution: NONE` is typically used with wildcards because Istio can't pre-resolve a wildcard hostname. The sidecar will let the application's DNS resolution determine the actual IP.

## Scoping Custom DNS to Specific Namespaces

By default, a ServiceEntry is visible to all sidecars in its namespace (or the whole mesh if it's in the root namespace). You can use the `exportTo` field to control visibility:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: team-database
  namespace: team-a
spec:
  hosts:
  - team-a-db.internal.company.com
  exportTo:
  - "."
  ports:
  - number: 5432
    name: tcp-postgres
    protocol: TCP
  resolution: STATIC
  endpoints:
  - address: 10.0.5.20
```

The `exportTo: ["."]` means this entry is only visible to sidecars in the `team-a` namespace.

## Combining with Traffic Policies

Custom DNS entries through ServiceEntry can be combined with DestinationRule for traffic policies:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: legacy-db-policy
  namespace: default
spec:
  host: legacy-db.internal.company.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        h2UpgradePolicy: DO_NOT_UPGRADE
    tls:
      mode: SIMPLE
```

And with VirtualService for routing:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: legacy-db-routing
  namespace: default
spec:
  hosts:
  - legacy-db.internal.company.com
  tcp:
  - route:
    - destination:
        host: legacy-db.internal.company.com
        port:
          number: 5432
    match:
    - port: 5432
```

## Verifying Custom DNS Entries

Check that your ServiceEntry is recognized by the sidecar:

```bash
istioctl proxy-config cluster deploy/my-app | grep legacy-db
```

Check the endpoints:

```bash
istioctl proxy-config endpoint deploy/my-app | grep legacy-db
```

If DNS proxy is enabled, test DNS resolution directly:

```bash
kubectl exec -it deploy/my-app -c my-app -- nslookup legacy-db.internal.company.com
```

## Common Issues

1. **Entry not resolving**: Most commonly this means DNS proxy isn't enabled. Without it, ServiceEntry only affects Envoy routing, not DNS resolution.

2. **Wrong port protocol**: Make sure the protocol in your ServiceEntry matches what the application actually uses. A mismatch can cause the sidecar to mishandle the traffic.

3. **Auto-allocation conflicts**: If `ISTIO_META_DNS_AUTO_ALLOCATE` is enabled, Istio assigns virtual IPs to ServiceEntry hosts. These IPs are from the `240.240.0.0/16` range and are purely internal. If your app tries to use these IPs outside the mesh, it won't work.

Custom DNS entries in Istio give you a powerful way to control name resolution across your mesh. Combined with DNS proxy, they provide a complete solution for integrating external services, creating aliases, and managing DNS during migrations.
