# How to Implement Network Segmentation with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Network Segmentation, Kubernetes, Service Mesh, Security

Description: A practical guide to implementing network segmentation in Kubernetes clusters using Istio authorization policies and traffic management.

---

Network segmentation is one of those things that sounds straightforward until you try to do it in a Kubernetes environment. Traditional approaches like VLANs and firewall rules don't translate well to a world where pods come and go, IP addresses are ephemeral, and services talk to each other over a flat network. Istio gives you a much better way to handle this by operating at the application layer and using service identity instead of IP addresses.

## Why Network Segmentation Matters in Kubernetes

By default, every pod in a Kubernetes cluster can talk to every other pod. That's great for getting started, but it's a security nightmare in production. If an attacker compromises one service, they can move laterally across your entire cluster without any barriers. Network segmentation creates boundaries between different parts of your infrastructure so that a breach in one area doesn't automatically give access to everything else.

## Istio's Approach to Segmentation

Istio uses the Envoy sidecar proxy to intercept all network traffic between services. This means you can enforce segmentation rules at the proxy level without modifying your application code. The key resources you'll work with are `AuthorizationPolicy` and `PeerAuthentication`.

First, make sure you have strict mTLS enabled across your mesh:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

This ensures all traffic between services is encrypted and authenticated using mutual TLS. Every service gets a cryptographic identity through SPIFFE certificates, which is the foundation for identity-based segmentation.

## Creating Segmentation Zones

Think of your cluster as having different security zones. For example, you might have a frontend zone, a backend zone, and a data zone. Services within a zone can communicate freely, but cross-zone traffic needs explicit permission.

Start by creating a default-deny policy for each zone:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: backend
spec:
  {}
```

An empty spec with no rules means "deny everything." Apply this to each namespace that represents a zone:

```bash
kubectl apply -f deny-all-policy.yaml -n backend
kubectl apply -f deny-all-policy.yaml -n data
kubectl apply -f deny-all-policy.yaml -n frontend
```

Now nothing can talk to anything within those namespaces. You'll build up access rules from here.

## Allowing Intra-Zone Communication

To let services within the same zone communicate with each other, create an allow policy scoped to that namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-same-zone
  namespace: backend
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["backend"]
```

This says "allow any traffic that originates from the backend namespace." Apply similar policies for your other zones.

## Defining Cross-Zone Rules

The real power of segmentation comes from controlling what crosses zone boundaries. Say your frontend needs to call the `order-service` in the backend zone, but nothing else:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-orders
  namespace: backend
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["frontend"]
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/orders*"]
```

This is much more granular than traditional network segmentation. You're not just controlling which services can connect; you're controlling which HTTP methods and paths are allowed.

## Segmenting by Service Account

Sometimes namespace-level segmentation isn't granular enough. You want specific services, not entire namespaces, to have access. Use service account-based rules for this:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-payment-processor
  namespace: data
spec:
  selector:
    matchLabels:
      app: payment-db
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/backend/sa/payment-service"]
```

The `principals` field uses the SPIFFE identity format. Only the `payment-service` running under its specific service account can reach the payment database. Even if another service in the backend namespace is compromised, it can't access payment data.

## Handling Segmentation for TCP Services

Not everything runs over HTTP. For TCP-based services like databases and message brokers, you can segment by port:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-db-access
  namespace: data
spec:
  selector:
    matchLabels:
      app: postgres
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/backend/sa/api-service"]
    to:
    - operation:
        ports: ["5432"]
```

## Visualizing Your Segments

Once you have segmentation in place, you need to verify it's working. Kiali, which ships with many Istio installations, gives you a visual graph of service-to-service traffic. You can see which connections are active and which are being blocked.

You can also check denied requests through Envoy access logs:

```bash
kubectl logs -l app=order-service -c istio-proxy -n backend | grep "403"
```

Or use Istio's telemetry to track authorization decisions:

```bash
istioctl dashboard prometheus
```

Then query for `istio_requests_total{response_code="403"}` to see denied requests across your mesh.

## Practical Tips for Rolling Out Segmentation

Don't try to segment everything at once. Start with a single namespace, put it in audit mode first, and watch what breaks. Istio supports a `CUSTOM` action with external authorization, but for most teams, the built-in `ALLOW` and `DENY` actions are enough.

A good rollout strategy looks like this:

1. Enable strict mTLS mesh-wide
2. Deploy `AuthorizationPolicy` resources with `action: ALLOW` in a test namespace
3. Monitor for 403 errors and adjust rules
4. Expand to additional namespaces one at a time
5. Add default-deny policies last, after all allow rules are in place

One common mistake is forgetting about health checks. Kubernetes liveness and readiness probes come from the kubelet, which doesn't go through the Envoy proxy. So they won't be affected by your authorization policies. But if you're using gRPC health checks through the mesh, make sure to account for those in your policies.

## Combining with Network Policies

Istio segmentation works at Layer 7, but you can add Kubernetes NetworkPolicy resources for Layer 3/4 defense in depth. The two complement each other well. NetworkPolicy blocks traffic at the network level before it even reaches the Envoy proxy, while Istio authorization policies provide fine-grained application-level control.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-isolation
  namespace: backend
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          zone: frontend
    - namespaceSelector:
        matchLabels:
          zone: backend
```

This gives you two layers of segmentation. Even if someone bypasses the Istio proxy (which is hard but not impossible), the network policy is still there.

Network segmentation with Istio is not something you configure once and forget. As your services evolve, your segmentation rules need to evolve with them. Build it into your CI/CD pipeline, review authorization policies during code reviews, and regularly audit your mesh traffic to make sure the boundaries you've defined are actually being respected.
