# How to Use ServiceEntry with Static IP Addresses

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, Static IP, Kubernetes, Service Mesh

Description: Configure Istio ServiceEntry with static IP addresses for external services that have fixed endpoints, including load balancing and failover.

---

Not every external service uses DNS-based discovery. Plenty of services - particularly legacy systems, on-premises databases, partner network endpoints, and certain cloud services - have fixed IP addresses that do not change. For these cases, Istio's ServiceEntry with STATIC resolution lets you register exact IP addresses as endpoints, giving you full control over routing and load balancing.

## When to Use Static IP Resolution

Static IPs come up in several real-world scenarios:

- On-premises databases or services that your Kubernetes cluster connects to over a VPN
- Partner API endpoints provided as specific IP addresses
- Cloud VMs with elastic IPs that do not change
- Network appliances or hardware load balancers
- Services behind IP whitelisting where DNS resolution might return unexpected IPs

In all these cases, you know exactly which IPs the traffic should go to, and you do not want Envoy performing DNS lookups.

## Basic Static IP ServiceEntry

Here is the fundamental pattern. You set `resolution: STATIC` and provide the IP addresses in the `endpoints` section:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: on-prem-api
spec:
  hosts:
    - api.legacy-system.internal
  location: MESH_EXTERNAL
  ports:
    - number: 8443
      name: https
      protocol: HTTPS
  resolution: STATIC
  endpoints:
    - address: 10.0.1.50
    - address: 10.0.1.51
```

With this configuration:
- Your application code references `api.legacy-system.internal`
- Envoy does not perform DNS lookups
- Traffic is load balanced across 10.0.1.50 and 10.0.1.51
- You get Istio metrics and access logs for this traffic

The hostname in `hosts` can be anything - it does not need to actually resolve in DNS. It serves as an identifier within the mesh.

## Specifying Ports Per Endpoint

If different endpoints listen on different ports, you can override the port per endpoint:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: multi-port-endpoints
spec:
  hosts:
    - backend.partner.com
  location: MESH_EXTERNAL
  ports:
    - number: 8080
      name: http
      protocol: HTTP
  resolution: STATIC
  endpoints:
    - address: 203.0.113.10
      ports:
        http: 8080
    - address: 203.0.113.11
      ports:
        http: 9090
```

The second endpoint listens on port 9090 instead of the default 8080. Envoy handles this mapping transparently.

## Adding Labels to Endpoints

Labels on static endpoints are useful for subset-based routing with DestinationRules. This lets you direct traffic to specific endpoints based on rules:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: labeled-endpoints
spec:
  hosts:
    - service.partner.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: STATIC
  endpoints:
    - address: 10.0.1.100
      labels:
        env: production
        region: east
    - address: 10.0.2.100
      labels:
        env: production
        region: west
    - address: 10.0.3.100
      labels:
        env: staging
        region: east
```

Now create a DestinationRule with subsets:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: partner-subsets
spec:
  host: service.partner.com
  subsets:
    - name: east
      labels:
        region: east
    - name: west
      labels:
        region: west
    - name: staging
      labels:
        env: staging
```

And a VirtualService to route traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: partner-routing
spec:
  hosts:
    - service.partner.com
  http:
    - match:
        - headers:
            x-env:
              exact: staging
      route:
        - destination:
            host: service.partner.com
            subset: staging
    - route:
        - destination:
            host: service.partner.com
            subset: east
          weight: 70
        - destination:
            host: service.partner.com
            subset: west
          weight: 30
```

This sends staging requests to the staging endpoint, and production traffic is split 70/30 between east and west.

## Locality-Aware Load Balancing

You can specify locality on static endpoints to enable locality-aware routing. Envoy prefers endpoints in the same locality as the calling workload:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: locality-aware-service
spec:
  hosts:
    - api.distributed-system.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: STATIC
  endpoints:
    - address: 10.1.0.50
      locality: us-east-1/us-east-1a
    - address: 10.1.0.51
      locality: us-east-1/us-east-1b
    - address: 10.2.0.50
      locality: us-west-2/us-west-2a
    - address: 10.2.0.51
      locality: us-west-2/us-west-2b
```

Enable locality load balancing in the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: locality-lb
spec:
  host: api.distributed-system.com
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

With outlier detection enabled, Envoy does locality-aware routing automatically. If you have pods in us-east-1, they prefer the 10.1.0.x endpoints. If those fail, Envoy falls over to us-west-2 endpoints.

## Network Field for Multi-Network Meshes

In multi-network Istio deployments, you can specify which network each endpoint belongs to:

```yaml
spec:
  resolution: STATIC
  endpoints:
    - address: 10.0.1.50
      network: network-1
    - address: 172.16.0.50
      network: network-2
```

This tells Istio which gateway to use when routing to endpoints on different networks.

## Failover with Static Endpoints

Set up failover between primary and backup static endpoints using priority levels in the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: failover-service
spec:
  hosts:
    - critical-api.company.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: STATIC
  endpoints:
    - address: 10.0.1.50
      labels:
        tier: primary
    - address: 10.0.2.50
      labels:
        tier: backup
```

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: failover-dr
spec:
  host: critical-api.company.com
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 2
      interval: 10s
      baseEjectionTime: 30s
```

When the primary endpoint starts failing, Envoy ejects it and routes to the backup.

## Verifying Static Endpoints

Check that your static endpoints are registered in Envoy:

```bash
# List endpoints
istioctl proxy-config endpoints deploy/my-app | grep legacy-system

# Check cluster configuration
istioctl proxy-config cluster deploy/my-app --fqdn "outbound|8443||api.legacy-system.internal" -o json
```

The endpoints output should show your static IPs with their health status.

## Updating Static IPs

When the IP addresses change, just update the ServiceEntry:

```bash
kubectl edit serviceentry on-prem-api
```

Or better yet, update the YAML file and reapply:

```bash
kubectl apply -f on-prem-api-se.yaml
```

Envoy picks up the changes within a few seconds. No pod restarts needed.

## Common Pitfalls

**Forgetting the endpoints block.** With STATIC resolution, the endpoints block is mandatory. Without it, Envoy has no idea where to send traffic and connections fail silently.

**Using STATIC when DNS would be better.** If the external service changes IPs regularly, STATIC resolution means you have to manually update the ServiceEntry every time. Use DNS instead unless you have a good reason.

**IP address typos.** Double-check your IP addresses. A single wrong digit means traffic goes to the wrong place or nowhere at all. Use automation to generate ServiceEntries from your infrastructure inventory when possible.

Static IP resolution gives you precise control over traffic routing for external services. It is especially powerful when combined with labels, subsets, and locality-aware load balancing to build resilient connections to services outside your mesh.
