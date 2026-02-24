# How to Gradually Adopt Istio in an Existing Kubernetes Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Adoption, Service Mesh, Migration

Description: A phased approach to adopting Istio in an existing Kubernetes cluster without disrupting running services, starting with observability and gradually adding security and traffic management.

---

Adopting Istio in a production Kubernetes cluster that already runs workloads is nerve-wracking. You've got services handling real traffic, and the last thing you want is a service mesh rollout breaking something. The good news is that you don't have to go all-in on day one. Istio supports a gradual adoption strategy where you enable features incrementally and onboard services at your own pace.

The worst approach is to enable Istio mesh-wide and hope nothing breaks. The best approach is a phased rollout: start with observability, then add security, then traffic management. This guide walks through the full process.

## Phase 0: Install Istio Without Affecting Anything

Install Istio but don't enable automatic sidecar injection:

```bash
istioctl install --set profile=default
```

Verify the installation:

```bash
istioctl verify-install
kubectl get pods -n istio-system
```

At this point, Istio's control plane is running, but no application pods have sidecars. Your workloads are completely unaffected.

## Phase 1: Onboard a Non-Critical Service

Pick a low-risk, non-critical service to start with. A staging namespace or an internal tool is perfect:

```bash
# Label the namespace for auto-injection
kubectl label namespace staging istio-injection=enabled

# Restart deployments to inject sidecars
kubectl rollout restart deployment -n staging
```

Verify the sidecar is running:

```bash
kubectl get pods -n staging
# Look for 2/2 in the READY column
```

Check that the service still works:

```bash
kubectl exec -it deploy/test-client -n staging -- curl http://my-service:8080/health
```

If something breaks, you can quickly revert:

```bash
kubectl label namespace staging istio-injection-
kubectl rollout restart deployment -n staging
```

## Phase 2: Enable Observability

The first real value you get from Istio is observability. Even with just a few services onboarded, you get automatic metrics, distributed tracing support, and service graphs.

Install the observability addons:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/jaeger.yaml
```

Access Kiali to see the service graph:

```bash
istioctl dashboard kiali
```

Check Istio metrics in Prometheus:

```bash
istioctl dashboard prometheus
```

At this phase, you're running PERMISSIVE mTLS (the default). Services with sidecars can talk to services without sidecars. No AuthorizationPolicies are applied. You're just collecting data.

## Phase 3: Onboard More Services

Now that you're comfortable with how sidecars work, expand to more namespaces. Start with namespaces that have the most inter-service communication - the observability data will be the most valuable there.

```bash
kubectl label namespace backend istio-injection=enabled
kubectl rollout restart deployment -n backend
```

Before restarting, check for known compatibility issues:

```bash
# Check if any services use non-standard ports that Istio might not detect
kubectl get svc -n backend -o yaml | grep -A5 ports
```

Make sure Service port names follow Istio's naming convention:

```yaml
ports:
- name: http-web    # Istio detects HTTP protocol
  port: 8080
- name: grpc-api    # Istio detects gRPC protocol
  port: 9090
- name: tcp-custom  # Istio treats as TCP
  port: 5000
```

If port names don't have the protocol prefix, Istio treats traffic as TCP and you lose HTTP-level features (retries, header-based routing, HTTP metrics).

## Phase 4: Verify mTLS Behavior

Before tightening security, verify that mTLS is working between meshed services:

```bash
# Check mTLS status
istioctl proxy-status

# Verify mTLS between specific services
istioctl x describe pod <pod-name> -n <namespace>
```

Check Kiali to see which connections are using mTLS (they show a lock icon in the service graph).

At this point, services with sidecars use mTLS automatically when talking to each other. Services without sidecars use plaintext. Both work because of PERMISSIVE mode.

## Phase 5: Gradually Enable Strict mTLS

Don't jump to mesh-wide strict mTLS. Enable it namespace by namespace:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: backend
spec:
  mtls:
    mode: STRICT
```

Before applying, make sure all services in the namespace have sidecars and all services that call into this namespace also have sidecars. If a service without a sidecar tries to call a strict mTLS service, the connection fails.

Test cross-namespace communication:

```bash
# From a meshed pod, call a service in the strict namespace
kubectl exec -it deploy/frontend -n frontend-ns -- \
  curl http://order-service.backend:8080/health
```

## Phase 6: Add Authorization Policies

Start with monitoring mode before enforcing policies. Use AUDIT mode to log policy decisions without blocking traffic:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: order-service-audit
  namespace: backend
spec:
  selector:
    matchLabels:
      app: order-service
  action: AUDIT
  rules:
  - from:
    - source:
        notPrincipals:
        - cluster.local/ns/frontend/sa/frontend-sa
        - cluster.local/ns/backend/sa/checkout-sa
```

This logs when services other than frontend and checkout access the order service, without blocking the traffic. Check the Envoy logs for audit entries:

```bash
kubectl logs deploy/order-service -c istio-proxy -n backend | grep "AUDIT"
```

After verifying the audit logs match your expectations, switch to enforcement:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: order-service-deny-all
  namespace: backend
spec:
  selector:
    matchLabels:
      app: order-service
  {}
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: order-service-allow
  namespace: backend
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - cluster.local/ns/frontend/sa/frontend-sa
        - cluster.local/ns/backend/sa/checkout-sa
```

## Phase 7: Add Traffic Management

With observability and security in place, start using traffic management features.

Start with retries and timeouts for your most important services:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service-vs
  namespace: backend
spec:
  hosts:
  - payment-service
  http:
  - route:
    - destination:
        host: payment-service
    timeout: 10s
    retries:
      attempts: 2
      perTryTimeout: 3s
      retryOn: 5xx,reset,connect-failure
```

Add circuit breaking:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service-dr
  namespace: backend
spec:
  host: payment-service
  trafficPolicy:
    connectionPool:
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 500
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
```

## Phase 8: Migrate Ingress

If you're using a separate ingress controller (NGINX, Traefik), consider migrating to Istio's ingress gateway. This is optional but reduces operational complexity.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: main-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "*.example.com"
    tls:
      mode: SIMPLE
      credentialName: wildcard-tls
```

Run both ingress solutions during the transition and migrate services one at a time.

## Handling Services That Can't Have Sidecars

Some workloads can't run with Istio sidecars (DaemonSets that need host networking, certain operators, services that conflict with iptables rules). Exclude them:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: problem-service
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"
```

Or exclude specific pods at the namespace level using the Sidecar resource.

## Monitoring the Adoption Progress

Track how much of your cluster is meshed:

```bash
# Count pods with sidecars vs total
MESHED=$(kubectl get pods --all-namespaces -o json | \
  jq '[.items[] | select(.spec.containers[].name == "istio-proxy")] | length')
TOTAL=$(kubectl get pods --all-namespaces --no-headers | wc -l)
echo "Meshed: $MESHED / $TOTAL"
```

Use Kiali's overview page to see mesh coverage per namespace.

## Rollback Strategy

At every phase, you can roll back:

- **Remove sidecar**: Remove the istio-injection label and restart pods
- **Remove policies**: Delete AuthorizationPolicy and PeerAuthentication resources
- **Remove traffic rules**: Delete VirtualService and DestinationRule resources
- **Remove Istio entirely**: `istioctl uninstall --purge`

The gradual approach means you never have to roll back everything at once. If strict mTLS breaks something in one namespace, you can set that namespace back to PERMISSIVE while keeping other namespaces on STRICT.

## Timeline

A realistic adoption timeline for a medium-sized cluster:

- **Week 1-2**: Install Istio, onboard 1-2 non-critical services, set up observability
- **Week 3-4**: Onboard remaining services, verify mTLS is working in PERMISSIVE mode
- **Week 5-6**: Enable STRICT mTLS namespace by namespace
- **Week 7-8**: Add authorization policies in AUDIT mode
- **Week 9-10**: Enforce authorization policies, add traffic management
- **Ongoing**: Migrate ingress, optimize configurations, expand to more namespaces

The key to successful Istio adoption is patience. Take it one phase at a time, validate at each step, and don't rush to enable features you don't need yet. Start with observability because it provides value immediately and helps you understand your service communication patterns before you start adding policies that might block traffic.
