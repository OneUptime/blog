# How to Migrate mTLS Policies During Istio Adoption

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MTLS, Security, Kubernetes, Migration

Description: A practical walkthrough for migrating to Istio mTLS policies safely, from permissive mode to strict enforcement without breaking service communication.

---

Mutual TLS is one of the biggest reasons teams adopt Istio. Getting automatic encryption and identity verification between all your services sounds amazing, and it is. But the migration path from no mTLS to full strict mTLS can be tricky if you do not plan it carefully. One wrong move and services stop talking to each other.

This guide covers how to migrate your mTLS policies step by step without breaking production.

## Understanding Istio mTLS Modes

Istio supports three mTLS modes through the PeerAuthentication resource:

- **DISABLE** - no mTLS, all traffic is plaintext
- **PERMISSIVE** - accept both mTLS and plaintext traffic (the default)
- **STRICT** - only accept mTLS traffic

The key to a safe migration is moving through these modes gradually: DISABLE to PERMISSIVE to STRICT.

## Step 1: Verify Current State

Before changing anything, understand your current mTLS configuration:

```bash
# Check mesh-wide PeerAuthentication
kubectl get peerauthentication --all-namespaces

# Check what mode is currently active
kubectl get peerauthentication -n istio-system -o yaml
```

If you have not set any PeerAuthentication, Istio defaults to PERMISSIVE mode. This means services with sidecars will use mTLS when talking to each other, but they will also accept plaintext traffic from services without sidecars.

Check the actual mTLS status between services:

```bash
# Check if a specific connection is using mTLS
istioctl proxy-config clusters <source-pod> -n <namespace> --fqdn <dest-service>.<namespace>.svc.cluster.local -o json | grep "transport_socket"
```

## Step 2: Ensure All Services Have Sidecars

Before you can go to strict mTLS, every service that needs to communicate within the mesh must have an Envoy sidecar. Check for pods without sidecars:

```bash
# Find pods without sidecars in labeled namespaces
for ns in $(kubectl get namespaces -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  echo "=== Namespace: $ns ==="
  kubectl get pods -n $ns -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.name}{","}{end}{"\n"}{end}' | grep -v istio-proxy
done
```

If any pods are missing sidecars, restart them:

```bash
kubectl rollout restart deployment <deployment-name> -n <namespace>
```

## Step 3: Set Permissive Mode Mesh-Wide

If you have not already, explicitly set permissive mode at the mesh level:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
```

```bash
kubectl apply -f mesh-permissive.yaml
```

This is the safe starting point. All services accept both plaintext and mTLS traffic. Services with sidecars automatically use mTLS between themselves.

## Step 4: Monitor mTLS Connections

Use Kiali or Prometheus to see which connections are using mTLS and which are not:

```bash
# Port-forward Kiali
kubectl port-forward svc/kiali -n istio-system 20001:20001
```

In Kiali, look at the traffic graph and check for connections shown as non-mTLS. These are the ones you need to fix before going strict.

You can also check using Prometheus:

```text
# Count mTLS vs plaintext connections
istio_requests_total{connection_security_policy="mutual_tls"}
istio_requests_total{connection_security_policy="none"}
```

## Step 5: Migrate Namespace by Namespace

Do not go straight to mesh-wide strict mTLS. Instead, enable strict mode one namespace at a time, starting with the least critical ones.

### Pick a Starting Namespace

Choose a namespace where all pods have sidecars and all incoming traffic comes from other meshed services:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: staging
spec:
  mtls:
    mode: STRICT
```

```bash
kubectl apply -f staging-strict.yaml
```

### Verify After Each Namespace

After enabling strict mode, immediately check for errors:

```bash
# Watch for connection errors
kubectl logs -n staging -l app=my-service -c istio-proxy --tail=100 | grep "503\|connection_failure\|upstream_reset"

# Check service mesh connectivity
istioctl proxy-config listeners <pod-name> -n staging
```

If you see 503 errors with "upstream_reset_before_response_started" flags, a client without a sidecar is trying to reach a service in this namespace. You need to either add a sidecar to the client or create an exception.

### Create Exceptions for Specific Workloads

If a specific port on a service needs to accept plaintext traffic (like from a non-meshed service or a health check endpoint), you can create a port-level exception:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: with-exceptions
  namespace: staging
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8081:
      mode: PERMISSIVE
```

This makes port 8081 accept plaintext while all other ports require mTLS.

## Step 6: Handle Cross-Namespace Communication

One of the trickiest parts is handling traffic between namespaces where one namespace is strict and the other is not yet migrated.

The rule is simple: if the destination is in strict mode, the source must have a sidecar. If the source has a sidecar, it will automatically use mTLS. The issue arises when:

1. A pod without a sidecar tries to reach a strict namespace
2. A job or cronjob that runs without injection tries to call a strict service

For jobs and cronjobs, you can enable sidecar injection:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-migration
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "true"
    spec:
      containers:
      - name: migration
        image: my-migration:latest
      restartPolicy: Never
```

But be aware that jobs with sidecars need special handling because the sidecar does not terminate when the job container finishes. You can handle this with a preStop hook or by using Istio's native job handling (available in newer versions).

## Step 7: Enable Strict Mode Mesh-Wide

Once every namespace has been individually tested with strict mode, enable it at the mesh level:

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

```bash
kubectl apply -f mesh-strict.yaml
```

At this point, you can remove the individual namespace PeerAuthentication resources since the mesh-wide policy covers everything:

```bash
kubectl delete peerauthentication strict-mtls -n staging
kubectl delete peerauthentication strict-mtls -n production
# ... repeat for all namespaces
```

## Step 8: Add Authorization Policies

With strict mTLS in place, every service now has a cryptographic identity (a SPIFFE ID). You can use these identities to create fine-grained authorization policies:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payment-access
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/production/sa/checkout-service"
        - "cluster.local/ns/production/sa/refund-service"
    to:
    - operation:
        methods: ["POST", "GET"]
        paths: ["/api/v1/payments/*"]
```

## Rollback Procedure

If something goes wrong at any point, the rollback is simple. Switch back to permissive mode:

```bash
# Quick rollback for a namespace
kubectl patch peerauthentication strict-mtls -n staging --type merge -p '{"spec":{"mtls":{"mode":"PERMISSIVE"}}}'

# Quick rollback mesh-wide
kubectl patch peerauthentication default -n istio-system --type merge -p '{"spec":{"mtls":{"mode":"PERMISSIVE"}}}'
```

This takes effect within seconds. All services immediately start accepting both plaintext and mTLS traffic again.

## Migration Timeline

A realistic timeline for mTLS migration:

- **Week 1-2**: Audit current state, ensure all services have sidecars, set up monitoring
- **Week 3-4**: Enable strict in staging/dev namespaces
- **Week 5-6**: Enable strict in non-critical production namespaces
- **Week 7-8**: Enable strict in critical production namespaces
- **Week 9-10**: Enable strict mesh-wide, add authorization policies

Do not rush this. Each step should be stable for at least a few days before moving to the next. The whole point of the phased approach is to catch issues early when the blast radius is small.
