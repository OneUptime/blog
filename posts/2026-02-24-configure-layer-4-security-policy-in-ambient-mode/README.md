# How to Configure Layer 4 Security Policy in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Security, AuthorizationPolicy, Kubernetes

Description: How to write and apply Layer 4 authorization policies in Istio ambient mode using ztunnel for TCP-level access control without waypoint proxies.

---

One of the biggest advantages of Istio ambient mode is that you get meaningful security policies without deploying waypoint proxies. The ztunnel component enforces L4 (Layer 4) authorization policies directly, which means you can control access based on source identity, destination port, and namespace - all without any L7 proxy overhead.

This guide walks through creating and applying L4 policies in ambient mode.

## What L4 Policies Can Do

L4 authorization policies work at the TCP level. They can match on:

- **Source identity** (SPIFFE principal from mTLS)
- **Source namespace**
- **Source IP blocks**
- **Destination port**

They cannot match on:
- HTTP methods (GET, POST, etc.)
- HTTP paths (/api/users)
- HTTP headers
- Request body content

For HTTP-aware policies, you need a waypoint proxy. But for many use cases, L4 policies are sufficient.

## Basic L4 Policy: Allow by Source Identity

Allow only specific service accounts to communicate with a service:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: bookinfo
spec:
  targetRefs:
    - kind: Service
      group: ""
      name: reviews
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/bookinfo/sa/bookinfo-productpage"
```

This policy says: only the productpage service (identified by its ServiceAccount) can connect to the reviews service. All other sources are denied.

Apply it:

```bash
kubectl apply -f allow-frontend-to-backend.yaml
```

Test it:

```bash
# This should succeed (productpage -> reviews)
kubectl exec deploy/productpage-v1 -n bookinfo -- curl -s -o /dev/null -w "%{http_code}" http://reviews:9080/reviews/1

# This should fail (ratings -> reviews, different SA)
kubectl exec deploy/ratings-v1 -n bookinfo -- curl -s -o /dev/null -w "%{http_code}" http://reviews:9080/reviews/1 --max-time 5
```

## Policy: Allow by Namespace

Allow all services from a specific namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-from-monitoring
  namespace: bookinfo
spec:
  targetRefs:
    - kind: Service
      group: ""
      name: productpage
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces:
              - "monitoring"
              - "bookinfo"
```

This allows traffic from any workload in the `monitoring` or `bookinfo` namespaces.

## Policy: Restrict by Port

Allow connections only to specific ports:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: restrict-ports
  namespace: bookinfo
spec:
  targetRefs:
    - kind: Service
      group: ""
      name: reviews
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/bookinfo/sa/bookinfo-productpage"
      to:
        - operation:
            ports:
              - "9080"
```

This allows productpage to connect to reviews only on port 9080. Attempts to connect on other ports will be denied.

## Policy: Deny Specific Sources

Use DENY action to block specific sources while allowing everything else:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-external
  namespace: bookinfo
spec:
  targetRefs:
    - kind: Service
      group: ""
      name: ratings
  action: DENY
  rules:
    - from:
        - source:
            namespaces:
              - "untrusted-namespace"
```

DENY policies are evaluated before ALLOW policies. If a request matches a DENY rule, it is rejected regardless of any ALLOW rules.

## Policy: IP-Based Access Control

For traffic from outside the mesh or from non-mesh workloads, use IP blocks:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-internal-ips
  namespace: bookinfo
spec:
  targetRefs:
    - kind: Service
      group: ""
      name: productpage
  action: ALLOW
  rules:
    - from:
        - source:
            ipBlocks:
              - "10.0.0.0/8"
              - "172.16.0.0/12"
```

This allows connections from RFC 1918 private IP ranges. Useful for allowing traffic from non-meshed services that do not have SPIFFE identities.

## Default Deny All

A common security pattern is to deny all traffic by default and only allow explicitly permitted communications:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: bookinfo
spec:
  {}
```

An empty spec with no rules creates a deny-all policy. After applying this, no traffic is allowed to any service in the namespace unless there is a matching ALLOW policy.

Then add specific ALLOW policies for each permitted communication path:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-productpage-ingress
  namespace: bookinfo
spec:
  targetRefs:
    - kind: Service
      group: ""
      name: productpage
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/istio-system/sa/istio-ingressgateway-service-account"
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-productpage-to-reviews
  namespace: bookinfo
spec:
  targetRefs:
    - kind: Service
      group: ""
      name: reviews
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/bookinfo/sa/bookinfo-productpage"
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-reviews-to-ratings
  namespace: bookinfo
spec:
  targetRefs:
    - kind: Service
      group: ""
      name: ratings
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/bookinfo/sa/bookinfo-reviews"
```

This creates a strict allow-list where only the intended service-to-service communication paths are permitted.

## Verifying Policies in ztunnel

Check which policies ztunnel has loaded:

```bash
istioctl ztunnel-config policies
```

Output:

```text
NAMESPACE    POLICY NAME                      ACTION    SCOPE
bookinfo     deny-all                         ALLOW     Namespace
bookinfo     allow-productpage-ingress        ALLOW     Namespace
bookinfo     allow-productpage-to-reviews     ALLOW     Namespace
bookinfo     allow-reviews-to-ratings         ALLOW     Namespace
```

If a policy is not showing up, check that the namespace is enrolled in ambient mode and that the policy's targetRefs match actual services.

## Debugging Policy Denials

When a connection is denied, ztunnel logs the denial. Check the logs:

```bash
kubectl logs -l app=ztunnel -n istio-system --tail=50 | grep "RBAC"
```

You should see entries like:

```text
info    access  connection complete src.addr=10.0.1.5:34567
  src.identity="spiffe://cluster.local/ns/bookinfo/sa/ratings"
  dst.addr=10.0.1.6:9080 dst.service="reviews.bookinfo.svc.cluster.local"
  connection_security_policy="mutual_tls" direction="inbound"
  bytes_sent=0 bytes_recv=0 connection_termination_details="RBAC: access denied"
```

The `connection_termination_details="RBAC: access denied"` tells you a policy blocked the connection. The `src.identity` shows who was trying to connect.

## Policy Evaluation Order

Understanding the evaluation order is important:

1. If there are any CUSTOM policies (ext_authz), they are evaluated first
2. DENY policies are evaluated next - if any match, the request is denied
3. ALLOW policies are evaluated last - if any exist, at least one must match
4. If no policies exist, traffic is allowed (default allow)

This means:
- A DENY rule always wins over an ALLOW rule
- If you have any ALLOW policies in a namespace, traffic that does not match any ALLOW rule is implicitly denied
- If you have no policies at all, everything is allowed

## Performance Considerations

L4 policy evaluation in ztunnel is fast because it only checks connection metadata (source identity, destination port), not packet content. The performance impact is negligible compared to the TLS encryption overhead, which is already happening.

You can have dozens of policies per namespace without noticeable latency impact. The policies are compiled into an efficient lookup structure in ztunnel's memory.

L4 policies in ambient mode give you a solid security foundation without the overhead of L7 proxies. For many microservice architectures, controlling which services can talk to which other services at the identity level is sufficient. When you need HTTP-aware policies, add waypoint proxies to specific namespaces.
