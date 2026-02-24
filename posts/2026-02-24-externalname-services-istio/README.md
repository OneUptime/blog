# How to Handle ExternalName Services with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ExternalName, Kubernetes, External Services, DNS

Description: Configure Istio to work with Kubernetes ExternalName services including DNS resolution, TLS origination, and traffic policy for external dependencies.

---

ExternalName services in Kubernetes are a way to create an alias for an external DNS name. Instead of selecting pods, they return a CNAME record that points to an external host. They are commonly used to reference databases, APIs, or other services that live outside the cluster. But when Istio is in the mesh, ExternalName services behave differently than you might expect.

## What an ExternalName Service Does

A basic ExternalName service looks like this:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-database
  namespace: my-app
spec:
  type: ExternalName
  externalName: mydb.us-east-1.rds.amazonaws.com
```

Without Istio, when a pod resolves `external-database.my-app.svc.cluster.local`, Kubernetes DNS returns a CNAME record pointing to `mydb.us-east-1.rds.amazonaws.com`. The pod then resolves that hostname and connects to the actual IP.

## How Istio Handles ExternalName Services

Istio intercepts DNS resolution and traffic routing. When a pod in the mesh tries to connect to an ExternalName service, the Envoy sidecar needs to know how to handle it.

In older versions of Istio, ExternalName services were not well supported and often caused confusing behavior. In recent versions, Istio handles them better, but there are still gotchas.

The key thing to understand is that Istio treats ExternalName services differently depending on the outbound traffic policy:

- **ALLOW_ANY** (default): Traffic to the external host passes through the sidecar but is not subject to mesh policies.
- **REGISTRY_ONLY**: Traffic to external hosts is blocked unless you explicitly register them.

Check your mesh's outbound policy:

```bash
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep outboundTrafficPolicy
```

## The Problem with ExternalName and mTLS

One common issue: when you have an ExternalName service and strict mTLS, Istio might try to use mTLS to connect to the external service. Obviously, the external service does not have an Istio sidecar and cannot do mTLS.

You need to disable mTLS for external destinations:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-database-tls
  namespace: my-app
spec:
  host: mydb.us-east-1.rds.amazonaws.com
  trafficPolicy:
    tls:
      mode: SIMPLE
```

`SIMPLE` means Istio originates TLS (like a regular HTTPS client) rather than mTLS. If the external service does not use TLS at all, set it to `DISABLE`.

## Replacing ExternalName with ServiceEntry

For better control and reliability, consider replacing ExternalName services with Istio's ServiceEntry. ServiceEntry gives you full traffic management capabilities:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-database
  namespace: my-app
spec:
  hosts:
  - mydb.us-east-1.rds.amazonaws.com
  ports:
  - number: 5432
    name: tcp-postgres
    protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

Now you can apply traffic policies, set timeouts, and configure connection pools:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-database-policy
  namespace: my-app
spec:
  host: mydb.us-east-1.rds.amazonaws.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 20
        connectTimeout: 5s
        tcpKeepalive:
          time: 7200s
          interval: 75s
    tls:
      mode: SIMPLE
    outlierDetection:
      consecutiveGatewayErrors: 3
      interval: 30s
      baseEjectionTime: 60s
```

If you still want pods to use the friendly name `external-database` instead of the full AWS hostname, create an internal Service that routes to the ServiceEntry:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-database
  namespace: my-app
spec:
  type: ExternalName
  externalName: mydb.us-east-1.rds.amazonaws.com
```

The ServiceEntry handles the Istio-level configuration, and the ExternalName service provides the DNS alias for application convenience.

## TLS Origination for External Services

When connecting to external HTTPS APIs, you want Istio to handle TLS origination. This means your application sends plain HTTP, and the sidecar upgrades it to HTTPS:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: my-app
spec:
  hosts:
  - api.stripe.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  - number: 80
    name: http
    protocol: HTTP
    targetPort: 443
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-api-tls
  namespace: my-app
spec:
  host: api.stripe.com
  trafficPolicy:
    portLevelSettings:
    - port:
        number: 80
      tls:
        mode: SIMPLE
        sni: api.stripe.com
```

With this setup, your application calls `http://api.stripe.com:80` and Istio upgrades it to `https://api.stripe.com:443`. The benefit is that you can now apply HTTP-level routing and metrics to the traffic.

## Authorization for External Services

Control which workloads can access external services:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: restrict-external-access
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-backend
  action: ALLOW
  rules:
  - to:
    - operation:
        hosts:
        - "mydb.us-east-1.rds.amazonaws.com"
        - "api.stripe.com"
  - from:
    - source:
        namespaces:
        - my-app
```

## Handling DNS Resolution

ExternalName services rely on DNS resolution. If the external hostname changes IP frequently (which is common with cloud services), Istio's DNS resolution behavior matters.

With `resolution: DNS` in a ServiceEntry, Istio resolves the hostname and caches the result. The cache TTL depends on the DNS response TTL. For services with short TTLs (like AWS ALBs), this works fine. For services with long TTLs, the proxy might hold onto stale IPs.

You can force more frequent resolution by using DNS proxy:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
  - api.example.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
```

Check how the proxy resolves the host:

```bash
istioctl proxy-config endpoint deploy/my-backend -n my-app | grep api.example.com
```

## Multiple External Dependencies

For applications with many external dependencies, organize your ServiceEntries:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-apis
  namespace: my-app
spec:
  hosts:
  - api.stripe.com
  - api.twilio.com
  - api.sendgrid.com
  - hooks.slack.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
```

You can group related external services into a single ServiceEntry. Each host gets its own cluster in Envoy, so they are tracked independently for metrics and outlier detection.

## Monitoring External Service Traffic

Track traffic to external services:

```promql
sum(rate(istio_requests_total{
  reporter="source",
  destination_service_name="api.stripe.com"
}[5m])) by (source_workload, response_code)
```

For TCP services like databases:

```promql
sum(rate(istio_tcp_sent_bytes_total{
  reporter="source",
  destination_service_name="mydb.us-east-1.rds.amazonaws.com"
}[5m])) by (source_workload)
```

These metrics help you understand your application's external dependency patterns and spot issues like increased error rates or latency to external services.

## Debugging ExternalName Issues

If traffic to an ExternalName service is not working:

1. Check DNS resolution from inside a pod:

```bash
kubectl exec deploy/my-backend -c istio-proxy -- nslookup external-database.my-app.svc.cluster.local
```

2. Check the proxy configuration:

```bash
istioctl proxy-config cluster deploy/my-backend -n my-app | grep external
```

3. Check if the outbound traffic policy is blocking the connection:

```bash
kubectl exec deploy/my-backend -c istio-proxy -- curl -v http://external-database:5432
```

4. Look at the proxy logs for connection errors:

```bash
kubectl logs deploy/my-backend -c istio-proxy | grep "external-database\|mydb"
```

## Summary

ExternalName services work with Istio but need extra configuration for TLS, traffic policies, and authorization. For production use, combine ExternalName services with ServiceEntry and DestinationRule resources to get full traffic management. Disable mTLS for external destinations, configure proper TLS origination, and set up connection pool limits. ServiceEntry is generally a better tool than ExternalName for managing external dependencies in an Istio mesh because it gives you more control over routing, security, and observability.
