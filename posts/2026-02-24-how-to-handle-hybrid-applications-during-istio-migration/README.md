# How to Handle Hybrid Applications During Istio Migration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Migration, Hybrid, Service Mesh, Kubernetes

Description: Manage the transitional state where some services are in the Istio mesh and others are not, handling mTLS compatibility, routing, and observability gaps.

---

During an Istio migration, you will inevitably have a period where some services are in the mesh and some are not. This hybrid state is tricky because meshed and non-meshed services need to communicate, mTLS settings have to accommodate both, and your observability setup needs to work across both worlds.

The hybrid phase can last weeks or even months for large organizations. Here is how to manage it properly so that nothing breaks while you are migrating.

## The Hybrid State

In a hybrid setup, you have:

- **Meshed services**: Pods with Istio sidecars injected, participating in the mesh
- **Non-meshed services**: Pods without sidecars, operating as plain Kubernetes workloads
- **External services**: Services outside the cluster (databases, SaaS APIs)

These three categories need to communicate with each other, and each combination has different requirements.

## mTLS in Hybrid Mode

The most critical setting during hybrid migration is PeerAuthentication. You need PERMISSIVE mode:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
```

PERMISSIVE mode means:

- Meshed-to-meshed: Uses mTLS automatically
- Non-meshed-to-meshed: Accepts plaintext traffic
- Meshed-to-non-meshed: Sends plaintext (no sidecar on the other end to do mTLS)

This is safe but not ideal for security. The goal is to stay in PERMISSIVE only as long as needed and switch to STRICT once all services are meshed.

### Tracking mTLS Coverage

Monitor which services are using mTLS and which are not:

```bash
# Check which pods have sidecars
kubectl get pods --all-namespaces -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{range .spec.containers[*]}{.name}{","}{end}{"\n"}{end}' | grep "istio-proxy"
```

Use Kiali if available:

```bash
kubectl port-forward svc/kiali -n istio-system 20001:20001
```

Kiali shows a graph of your services with mTLS status indicators, making it easy to see which connections are encrypted and which are not.

## Routing Between Meshed and Non-Meshed Services

### Meshed Service Calling Non-Meshed Service

This works out of the box in PERMISSIVE mode. The meshed service's sidecar detects that the destination does not support mTLS and falls back to plaintext.

Check that the destination service has a properly named port:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: legacy-service
spec:
  ports:
    - name: http  # Port naming matters for Istio protocol detection
      port: 8080
```

If the port is not named, Istio treats it as TCP and may not apply HTTP-level features.

### Non-Meshed Service Calling Meshed Service

In PERMISSIVE mode, the meshed service's sidecar accepts both mTLS and plaintext. No special configuration needed.

However, the non-meshed service will not have Envoy access logs or metrics for this traffic. If you need observability on the non-meshed side, consider adding an Istio sidecar even if you are not ready to fully migrate that service.

### VirtualService Routing

VirtualServices work for meshed services. They do not affect non-meshed services because non-meshed services do not have a sidecar to enforce the routing rules.

If you need traffic management for non-meshed services, you can use the Istio ingress gateway or set up the non-meshed service to call through a meshed proxy.

## AuthorizationPolicy Considerations

AuthorizationPolicies only apply to meshed services (because they are enforced by the sidecar). During hybrid migration, be careful with policies that reference source identities:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-specific-sources
  namespace: default
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/default/sa/order-service"]
```

This policy requires the caller to present a valid Istio identity. Non-meshed callers do not have one, so they will be denied.

To allow both meshed and non-meshed callers during migration:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-hybrid
  namespace: default
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
    # Allow meshed services with specific identity
    - from:
        - source:
            principals: ["cluster.local/ns/default/sa/order-service"]
    # Allow non-meshed services (no principal)
    - from:
        - source:
            notPrincipals: ["*"]
          source:
            namespaces: ["default"]
```

Or simply do not apply restrictive AuthorizationPolicies until all callers are meshed.

## Observability Gaps

During hybrid migration, you will have gaps in your observability:

- **Metrics**: Only meshed services generate Istio metrics. Non-meshed services need their own metrics (Prometheus client libraries, etc.)
- **Tracing**: Distributed traces will have gaps when traffic passes through non-meshed services
- **Access logs**: Only meshed services have Envoy access logs

### Handling Tracing Gaps

If service A (meshed) calls service B (non-meshed) which calls service C (meshed), the trace will show two separate traces instead of one connected trace.

To minimize gaps, prioritize migrating services that are in the middle of critical request paths. Migrate in dependency order:

1. Start with leaf services (services that do not call other services)
2. Then migrate services one level up
3. Continue until all services in the critical path are meshed

### Unified Metrics

Create a Grafana dashboard that combines Istio metrics and application metrics:

```yaml
# Istio metrics for meshed services
istio_requests_total{destination_service="payment-service.default.svc.cluster.local"}

# Application metrics for non-meshed services (if they expose Prometheus metrics)
http_requests_total{service="legacy-service"}
```

## Managing the Migration Order

### Priority-Based Migration

Not all services need to be migrated at the same time. Prioritize based on:

1. **Security requirements**: Services handling sensitive data should get mTLS first
2. **Observability needs**: Services that are hard to debug benefit most from Istio metrics
3. **Traffic management needs**: Services that need canary deployments or traffic splitting
4. **Dependencies**: Migrate leaves first, then work up the dependency tree

### Namespace-Based Migration

Migrate entire namespaces at once instead of individual services:

```bash
# Enable injection for a namespace
kubectl label namespace payments istio-injection=enabled

# Restart all deployments in the namespace
kubectl rollout restart deployment -n payments
```

This ensures all services within a namespace are meshed together, reducing the hybrid surface area.

### Canary Migration

For critical services, do a canary migration:

1. Create a parallel deployment with the sidecar
2. Use traffic splitting to send a small percentage of traffic to the meshed version
3. Monitor for issues
4. Gradually increase traffic to the meshed version
5. Remove the non-meshed deployment

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service
spec:
  hosts:
    - payment-service
  http:
    - route:
        - destination:
            host: payment-service
            subset: meshed
          weight: 10
        - destination:
            host: payment-service
            subset: non-meshed
          weight: 90
```

## Handling Stateful Services

Stateful services (databases, message queues) need special care:

- **Databases**: Usually run outside the mesh. Use ServiceEntries to represent them.
- **Redis/Memcached**: Can be meshed, but test performance (the sidecar adds latency)
- **Kafka**: Can be meshed with TCP protocol support, but test thoroughly

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-postgres
spec:
  hosts:
    - postgres.internal.company.com
  ports:
    - number: 5432
      name: tcp
      protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

## Monitoring Migration Progress

Create a simple dashboard or script to track migration progress:

```bash
#!/bin/bash
echo "=== Migration Progress ==="
TOTAL=$(kubectl get pods --all-namespaces --no-headers | wc -l)
MESHED=$(kubectl get pods --all-namespaces -o json | jq '[.items[] | select(.spec.containers[].name == "istio-proxy")] | length')
echo "Total pods: $TOTAL"
echo "Meshed pods: $MESHED"
echo "Progress: $(( MESHED * 100 / TOTAL ))%"
echo ""
echo "=== Namespaces with injection ==="
kubectl get namespaces -l istio-injection=enabled
echo ""
echo "=== Non-meshed pods ==="
kubectl get pods --all-namespaces -o json | jq -r '.items[] | select(.spec.containers | map(.name) | index("istio-proxy") | not) | "\(.metadata.namespace)/\(.metadata.name)"'
```

## When to Switch to STRICT

Switch to STRICT mTLS only when:

1. All services in the namespace (or mesh) have sidecars
2. All external dependencies are handled with ServiceEntries
3. All AuthorizationPolicies account for meshed identities
4. You have tested in a staging environment
5. You have a rollback plan (switching back to PERMISSIVE)

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: strict
  namespace: default
spec:
  mtls:
    mode: STRICT
```

You can switch one namespace at a time instead of the entire mesh.

The hybrid phase is the riskiest part of an Istio migration, but it is manageable with PERMISSIVE mTLS, careful migration ordering, and good observability. The key is to make the hybrid period as short as possible for each service while making sure nothing breaks along the way.
