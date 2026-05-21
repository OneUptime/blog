# How to Configure L4 Authorization in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mesh, Authorization, L4, Security, Kubernetes

Description: Configure L4 authorization policies in Istio ambient mode using ztunnel to control service-to-service access based on identity without needing waypoint proxies.

---

One of the biggest advantages of Istio ambient mode is that you get L4 authorization without deploying waypoint proxies. The ztunnel proxy on each node can enforce authorization policies based on source and destination identities (SPIFFE IDs), namespaces, and IP addresses. This gives you a solid security baseline with zero per-pod overhead.

L4 authorization operates at the connection level. It decides whether to allow or deny a TCP connection based on who is connecting and where they are connecting to. It does not inspect HTTP headers, paths, or methods. For that, you need L7 authorization with a waypoint proxy (covered in the next guide).

## What L4 Authorization Can Do

With ztunnel enforcing L4 policies, you can control:

- Which service accounts can connect to a service
- Which namespaces can send traffic to a service
- Which source IPs are allowed
- Which destination ports are accessible

What L4 authorization cannot do (you need L7/waypoint for these):

- Filter by HTTP method (GET, POST, etc.)
- Filter by URL path
- Filter by HTTP headers
- Filter by request content

## Default Behavior

Without any AuthorizationPolicy, all traffic is allowed. This is the same as the sidecar model. The first time you apply an AuthorizationPolicy to a workload, Istio switches to a default-deny model for that workload (for the ALLOW action).

## Basic L4 Authorization Policy

Here is a simple policy that only allows traffic from a specific service account:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: default
spec:
  selector:
    matchLabels:
      app: backend
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/default/sa/frontend"]
    to:
    - operation:
        ports: ["8080"]
```

This policy says: only allow connections from the `frontend` service account to the `backend` service on port 8080. Everything else is denied.

In ambient mode, the ztunnel enforces this policy at the node level. When a connection comes in through an HBONE tunnel, ztunnel checks the source SPIFFE identity against the policy before allowing the connection to reach the destination pod.

## Namespace-Based Authorization

Restrict access based on the source namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-same-namespace
  namespace: production
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["production"]
```

This allows any service in the `production` namespace to communicate with any other service in the `production` namespace. Traffic from other namespaces is denied.

## Deny Policies

Sometimes you want to block specific traffic while allowing everything else. Use the DENY action:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-untrusted
  namespace: default
spec:
  selector:
    matchLabels:
      app: database
  action: DENY
  rules:
  - from:
    - source:
        namespaces: ["staging", "development"]
```

This blocks all connections to the database from staging and development namespaces. Traffic from other namespaces is still allowed (assuming no ALLOW policy creates a default-deny).

## Combining ALLOW and DENY

When both ALLOW and DENY policies exist:

1. If a request matches a DENY policy, it is denied (DENY takes precedence)
2. If there are ALLOW policies, the request must match at least one ALLOW rule
3. If there are no ALLOW policies, the request is allowed (unless it matched a DENY)

Example: Allow production traffic but deny a specific compromised service:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-production
  namespace: default
spec:
  selector:
    matchLabels:
      app: payment-api
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["production"]
    to:
    - operation:
        ports: ["8080"]
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-compromised-service
  namespace: default
spec:
  selector:
    matchLabels:
      app: payment-api
  action: DENY
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/production/sa/compromised-svc"]
```

The DENY policy overrides the ALLOW, so the compromised service cannot reach the payment API even though it is in the production namespace.

## Port-Based Restrictions

Restrict which ports are accessible:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: restrict-database-ports
  namespace: default
spec:
  selector:
    matchLabels:
      app: postgresql
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/default/sa/api-server"]
    to:
    - operation:
        ports: ["5432"]
  - from:
    - source:
        principals: ["cluster.local/ns/monitoring/sa/prometheus"]
    to:
    - operation:
        ports: ["9187"]
```

This allows the api-server to connect to PostgreSQL on port 5432, and Prometheus to connect on port 9187 (the exporter port). No other connections are allowed.

## IP-Based Authorization

You can also use IP-based rules, which is useful for traffic from outside the mesh:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-specific-ips
  namespace: default
spec:
  selector:
    matchLabels:
      app: admin-api
  action: ALLOW
  rules:
  - from:
    - source:
        ipBlocks: ["10.0.0.0/8"]
    to:
    - operation:
        ports: ["8080"]
```

This allows connections only from the 10.0.0.0/8 CIDR range.

## Verifying L4 Authorization in Ambient Mode

Test that your policies are working:

```bash
# This should succeed (allowed)

kubectl exec deploy/frontend -- curl -s -o /dev/null -w "%{http_code}" http://backend:8080

# This should fail (denied)
kubectl exec deploy/another-service -- curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://backend:8080
```

Check the ztunnel logs for authorization decisions:

```bash
kubectl logs -n istio-system -l app=ztunnel --tail=30 | grep -E "access|denied|policy"
```

You should see ztunnel traffic log entries for the connections. Denied attempts may show policy-related log messages or terminate from the client side with a connection error.

## Using istioctl to Debug Policies

Check the policies configured on ztunnel:

```bash
istioctl ztunnel-config policies
```

This shows the authorization policies that ztunnel has received and can help identify why a connection is being allowed or denied.

## L4 Authorization Metrics

Track L4 connection activity in Prometheus. In ambient mode without a waypoint, ztunnel reports the standard Istio TCP metrics:

```promql
sum(rate(istio_tcp_connections_opened_total{app="ztunnel", reporter="destination"}[5m])) by (destination_workload)
```

```promql
sum(rate(istio_tcp_connections_closed_total{app="ztunnel", reporter="destination", response_flags!="-" }[5m])) by (destination_workload, source_workload, response_flags)
```

Set up an alert for unexpected flagged connections:

```yaml
- alert: UnexpectedFlaggedL4Connections
  expr: |
    sum(rate(istio_tcp_connections_closed_total{app="ztunnel", reporter="destination", response_flags!="-" }[5m])) by (destination_workload) > 0
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Flagged L4 connections detected for {{ $labels.destination_workload }}"
```

## Migration from Sidecar Authorization

If you are migrating from the sidecar model to ambient mode, your existing AuthorizationPolicies will work, but only the L4-compatible parts. Policies that use L7 fields (methods, paths, headers) will not be enforced by ztunnel.

To check if a policy uses L7 fields:

```bash
kubectl get authorizationpolicies -A -o yaml | grep -E 'methods:|paths:|request.headers\['
```

Any policy using these fields needs a waypoint proxy for L7 enforcement. Without a waypoint, a selector-targeted policy with L7 attributes is enforced by ztunnel and fails safe by denying the connection.

## Best Practices

**Start with coarse-grained policies**: Begin with namespace-level rules before adding service-account-level rules. This is easier to manage and debug.

**Use DENY sparingly**: DENY rules are powerful but can be confusing when combined with ALLOW rules. Prefer ALLOW rules for most use cases.

**Test in a non-production environment first**: Authorization policies take effect immediately. A mistake can cut off traffic to critical services.

**Label your policies clearly**: Use names that describe what the policy does, like `allow-frontend-to-backend` rather than `policy-1`.

**Monitor denials continuously**: Set up alerts for unexpected denials. They can indicate either a policy misconfiguration or a security incident.

L4 authorization in ambient mode gives you strong access control with minimal overhead. For most services, L4 authorization is sufficient. Reserve waypoint proxies and L7 authorization for services that genuinely need HTTP-level policy enforcement.
