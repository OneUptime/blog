# How to Configure Service Resolution Strategies in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Resolution, ServiceEntry, DNS, Kubernetes

Description: How to configure different service resolution strategies in Istio including DNS, STATIC, and NONE modes for internal and external services.

---

When Envoy needs to forward a request to a service, it has to figure out which IP address and port to send the traffic to. This process is called service resolution, and Istio provides several strategies for it. Choosing the right resolution strategy affects reliability, performance, and correctness of your routing.

For Kubernetes services within the mesh, resolution is mostly automatic. But for external services, multi-cluster setups, and VM-based workloads, you need to explicitly configure how Envoy resolves service endpoints.

## Resolution Strategies Overview

Istio supports three resolution strategies, configured through the `resolution` field on `ServiceEntry` resources:

- **NONE** - No resolution. Traffic is forwarded to the IP address specified by the caller.
- **STATIC** - Endpoints are explicitly defined. No DNS lookup.
- **DNS** - Endpoints are resolved via DNS. Envoy performs DNS queries and caches the results.
- **DNS_ROUND_ROBIN** - Similar to DNS but uses all returned A records for round-robin load balancing.

For regular Kubernetes services, Istio uses EDS (Endpoint Discovery Service) automatically and you don't need to set a resolution strategy. The strategies above apply to `ServiceEntry` resources.

## NONE Resolution

Use `NONE` when the application itself resolves the IP address and you want Envoy to forward to whatever IP the application connected to:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: wildcard-external
spec:
  hosts:
    - "*.example.com"
  ports:
    - number: 443
      name: tls
      protocol: TLS
  resolution: NONE
  location: MESH_EXTERNAL
```

With `NONE` resolution:
- The application resolves `api.example.com` to an IP via DNS
- Envoy sees the original destination IP (from iptables) and forwards to it directly
- Load balancing is handled by DNS, not by Envoy

This is the simplest strategy and is useful for wildcard hosts where you can't enumerate all possible hostnames.

## STATIC Resolution

Use `STATIC` when you know the exact IP addresses of your endpoints:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: legacy-database
spec:
  hosts:
    - legacy-db.internal
  ports:
    - number: 3306
      name: mysql
      protocol: TCP
  resolution: STATIC
  location: MESH_EXTERNAL
  endpoints:
    - address: 10.0.5.100
      ports:
        mysql: 3306
    - address: 10.0.5.101
      ports:
        mysql: 3306
```

With `STATIC` resolution:
- No DNS lookups happen
- Envoy load balances across the provided endpoints
- You can assign weights to endpoints
- Health checking works against the specified IPs

Adding weights and labels:

```yaml
endpoints:
  - address: 10.0.5.100
    weight: 80
    labels:
      az: us-east-1a
  - address: 10.0.5.101
    weight: 20
    labels:
      az: us-east-1b
```

STATIC is the most predictable strategy. It never fails due to DNS issues, and you have full control over the endpoint list. The downside is that you need to update the ServiceEntry when IPs change.

## DNS Resolution

Use `DNS` when the service's endpoints can change and are discovered through DNS:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
    - api.stripe.com
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

With `DNS` resolution:
- Envoy performs DNS lookups for the hostname
- Results are cached based on the DNS TTL
- When multiple A records are returned, Envoy picks one (not all)
- DNS failures result in the endpoint being removed

You can specify the addresses to resolve separately from the hostname:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api-with-endpoint
spec:
  hosts:
    - api.stripe.com
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
  endpoints:
    - address: api-us.stripe.com
    - address: api-eu.stripe.com
```

Here, Envoy resolves `api-us.stripe.com` and `api-eu.stripe.com` separately and load balances across all resulting IPs.

## DNS_ROUND_ROBIN Resolution

`DNS_ROUND_ROBIN` is similar to `DNS` but uses all returned DNS A records for load balancing:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: multi-ip-service
spec:
  hosts:
    - backend.external.example.com
  ports:
    - number: 8080
      name: http
      protocol: HTTP
  resolution: DNS_ROUND_ROBIN
  location: MESH_EXTERNAL
```

If `backend.external.example.com` resolves to 3 IPs, all three are used as endpoints. With plain `DNS` mode, Envoy would pick the first IP from the DNS response. With `DNS_ROUND_ROBIN`, it distributes across all of them.

This is particularly useful when an external service uses DNS for load balancing (returning multiple A records).

## Combining with DestinationRule

Resolution strategies work together with DestinationRules for traffic policy:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-service
spec:
  hosts:
    - external-service.example.com
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-service-dr
spec:
  host: external-service.example.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
      http:
        h2UpgradePolicy: UPGRADE
    tls:
      mode: SIMPLE
    loadBalancer:
      simple: ROUND_ROBIN
```

## Resolution for VM Workloads

When integrating VMs into the mesh using WorkloadEntry, you typically use STATIC resolution:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: vm-service
spec:
  hosts:
    - vm-service.default.svc.cluster.local
  ports:
    - number: 8080
      name: http
      protocol: HTTP
  resolution: STATIC
  workloadSelector:
    labels:
      app: vm-service
---
apiVersion: networking.istio.io/v1
kind: WorkloadEntry
metadata:
  name: vm-instance-1
spec:
  address: 192.168.1.100
  labels:
    app: vm-service
  serviceAccount: vm-service
```

The `workloadSelector` links the ServiceEntry to WorkloadEntry resources. Envoy discovers the endpoints through the WorkloadEntry addresses.

## Resolution for Multi-Cluster

In multi-cluster Istio setups, resolution strategies interact with cross-cluster service discovery. Services discovered from remote clusters use EDS, just like local services. But if you need to route to services in clusters that aren't part of the mesh, you'd use ServiceEntry with DNS or STATIC resolution:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: remote-cluster-service
spec:
  hosts:
    - remote-service.other-cluster.example.com
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
  endpoints:
    - address: remote-gateway.other-cluster.example.com
      ports:
        https: 15443
```

## Debugging Resolution

When services aren't resolving correctly:

```bash
# Check what endpoints Envoy has for a service
istioctl proxy-config endpoint my-pod --cluster "outbound|443||api.stripe.com"

# Check the cluster configuration
istioctl proxy-config cluster my-pod --fqdn "api.stripe.com" -o json

# Look for DNS resolution errors in Envoy logs
kubectl logs my-pod -c istio-proxy | grep -i dns

# Verify the ServiceEntry is applied
kubectl get serviceentry -A
istioctl analyze -n default
```

Common issues:
- DNS resolution returning no results: Check that CoreDNS can resolve the hostname
- STATIC endpoints not reachable: Check network connectivity to the specified IPs
- NONE resolution with wrong IP: Check that the application's DNS resolver is working

Choosing the right resolution strategy comes down to: use STATIC when you know the IPs, DNS when the IPs are dynamic, DNS_ROUND_ROBIN when you need to load balance across all DNS results, and NONE for wildcards or when the application handles resolution.
