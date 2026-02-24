# How to Use Wildcard Hosts for Egress Traffic in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Egress, Wildcard, ServiceEntry, DNS

Description: How to configure wildcard host entries for egress traffic in Istio to allow access to multiple subdomains of external services without listing each one.

---

When your applications need to reach many subdomains under the same domain, creating individual ServiceEntry resources for each one is tedious and hard to maintain. Istio supports wildcard hosts in ServiceEntry resources, letting you allow access to `*.example.com` with a single configuration. But wildcards have some quirks that are worth understanding before you use them.

This guide covers how to set up wildcard ServiceEntries, the limitations you will run into, and how to work around them.

## When You Need Wildcard Hosts

Wildcard hosts are useful when:

- You need to access many subdomains under the same domain (like `*.s3.amazonaws.com` or `*.blob.core.windows.net`)
- The subdomains are dynamic or unpredictable (like customer-specific subdomains)
- You want to allow access to all of a provider's endpoints without maintaining a list
- You are using SaaS services that spread their API across multiple subdomains

## Basic Wildcard ServiceEntry

Here is a wildcard ServiceEntry that allows access to all subdomains of `example.com`:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: wildcard-example
  namespace: default
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

A few important things about this configuration:

- The `resolution: NONE` setting is required for wildcard hosts. You cannot use `resolution: DNS` with wildcards because Istio cannot resolve `*.example.com` to IP addresses.
- The `*` only matches one level of subdomain. `*.example.com` matches `api.example.com` but does not match `us-east-1.api.example.com`.
- You cannot use just `*` as a host. The wildcard must be in the format `*.domain.tld`.

## Testing Wildcard Access

After applying the ServiceEntry, test access from a pod:

```bash
# This should work
kubectl exec deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" https://api.example.com

# This should also work
kubectl exec deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" https://www.example.com

# This will NOT work (two levels deep)
kubectl exec deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" https://sub.api.example.com
```

## Common Wildcard Patterns for Cloud Services

### AWS Services

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-services
spec:
  hosts:
  - "*.amazonaws.com"
  - "*.aws.amazon.com"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: NONE
  location: MESH_EXTERNAL
```

Note that some AWS services use nested subdomains like `my-bucket.s3.us-east-1.amazonaws.com`. Since `*.amazonaws.com` only matches one level, this won't work. You need to either list the specific hosts or use a different approach (covered later).

### Google Cloud Services

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: google-cloud
spec:
  hosts:
  - "*.googleapis.com"
  - "*.google.com"
  - "*.storage.googleapis.com"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: NONE
  location: MESH_EXTERNAL
```

### Azure Services

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: azure-services
spec:
  hosts:
  - "*.azure.com"
  - "*.microsoft.com"
  - "*.windows.net"
  - "*.blob.core.windows.net"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: NONE
  location: MESH_EXTERNAL
```

## Handling Multi-Level Subdomains

The single-level wildcard limitation is the biggest challenge. For services like S3 that use multi-level subdomains, you have a few options:

### Option 1: List Known Patterns

If you know the specific patterns your apps use, list them:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: s3-buckets
spec:
  hosts:
  - "*.s3.amazonaws.com"
  - "*.s3.us-east-1.amazonaws.com"
  - "*.s3.us-west-2.amazonaws.com"
  - "*.s3.eu-west-1.amazonaws.com"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: NONE
  location: MESH_EXTERNAL
```

### Option 2: Use an Egress Gateway with SNI Forwarding

Route all traffic to the domain through an egress gateway that passes through TLS connections:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: amazonaws
spec:
  hosts:
  - "*.amazonaws.com"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: NONE
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: aws-egress
  namespace: istio-system
spec:
  selector:
    istio: egressgateway
  servers:
  - port:
      number: 443
      name: tls
      protocol: TLS
    hosts:
    - "*.amazonaws.com"
    tls:
      mode: PASSTHROUGH
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: aws-egress-vs
spec:
  hosts:
  - "*.amazonaws.com"
  gateways:
  - mesh
  - istio-system/aws-egress
  tls:
  - match:
    - gateways:
      - mesh
      port: 443
      sniHosts:
      - "*.amazonaws.com"
    route:
    - destination:
        host: istio-egressgateway.istio-system.svc.cluster.local
        port:
          number: 443
  - match:
    - gateways:
      - istio-system/aws-egress
      port: 443
      sniHosts:
      - "*.amazonaws.com"
    route:
    - destination:
        host: "*.amazonaws.com"
        port:
          number: 443
```

### Option 3: Use Sidecar Configuration

The Sidecar resource can control what each pod's proxy knows about. For specific workloads, you can configure outbound access:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: s3-access
  namespace: data-pipeline
spec:
  outboundTrafficPolicy:
    mode: ALLOW_ANY
  egress:
  - hosts:
    - "istio-system/*"
    - "./*"
```

This gives pods in the `data-pipeline` namespace unrestricted outbound access. It is a broader permission, so use it only when you cannot enumerate the specific hosts.

## Wildcard Hosts with REGISTRY_ONLY Mode

Wildcard ServiceEntries work with `REGISTRY_ONLY` mode. When a pod tries to reach `api.example.com`, the sidecar checks the registry and finds `*.example.com` as a match. The traffic is allowed through.

However, since `resolution: NONE` is required for wildcards, Istio does not track individual endpoints. This means you lose some visibility compared to non-wildcard entries with `resolution: DNS`.

## Monitoring Wildcard Egress Traffic

With wildcard entries, monitoring becomes more important since you are allowing broader access. Use access logs to see which specific subdomains are being accessed:

```bash
kubectl logs deploy/my-app -c istio-proxy | grep "outbound" | grep "example.com"
```

Use Prometheus queries to track traffic:

```promql
sum(rate(istio_requests_total{destination_service=~".*example.com.*"}[5m])) by (destination_service_name)
```

## Security Considerations

Wildcard hosts are convenient but they widen the attack surface. A few things to keep in mind:

- `*.example.com` allows access to any subdomain, including ones that might not exist yet
- If an attacker compromises a pod, they can reach any subdomain, not just the ones your app legitimately uses
- Consider combining wildcard ServiceEntries with AuthorizationPolicies to restrict which workloads can access them
- Use an egress gateway with logging to audit all outbound traffic

## Restricting Wildcard Access to Specific Workloads

Use AuthorizationPolicy to limit which pods can access wildcard destinations:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: restrict-aws-access
  namespace: default
spec:
  selector:
    matchLabels:
      app: data-processor
  action: ALLOW
  rules:
  - to:
    - operation:
        hosts:
        - "*.amazonaws.com"
```

This only allows the `data-processor` workload to access AWS services. Other pods in the namespace will be denied.

## Summary

Wildcard hosts in Istio ServiceEntry resources let you allow access to entire domain families without listing every subdomain. Use `resolution: NONE` with wildcards and remember that `*` only matches a single subdomain level. For multi-level subdomains, list specific patterns or use an egress gateway with SNI passthrough. Always combine wildcard access with monitoring and authorization policies to maintain security visibility.
