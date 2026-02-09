# How to Migrate from Istio Sidecar Mode to Ambient Mesh Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Ambient Mesh, Migration, Kubernetes, Zero Downtime

Description: Learn how to safely migrate Istio deployments from traditional sidecar mode to Ambient Mesh without downtime, reducing resource overhead while maintaining security and observability.

---

Ambient Mesh eliminates per-pod sidecars in favor of shared node-level ztunnel proxies and optional waypoint proxies. Migrating existing sidecar deployments to ambient mode reduces resource consumption significantly while maintaining Istio's security and traffic management features. This guide shows you how to migrate safely with zero downtime.

## Understanding the Migration Path

Migration from sidecar to ambient mode involves removing istio-proxy sidecars and enabling ambient data plane on namespaces. The key challenge is maintaining connectivity during the transition. Istio supports mixed mode where some workloads use sidecars and others use ambient, allowing incremental migration.

The migration strategy is:

1. Install ambient components alongside existing sidecar mesh
2. Enable ambient for test workloads
3. Verify connectivity between sidecar and ambient workloads
4. Gradually migrate namespaces to ambient
5. Remove sidecar injection

This phased approach minimizes risk and allows rollback at any stage.

## Prerequisites

You need an existing Kubernetes cluster running Istio in sidecar mode:

```bash
istioctl version
kubectl get pods -n default -o jsonpath='{.items[*].spec.containers[*].name}' | grep istio-proxy
```

You should see istio-proxy containers in your pods. Verify Istio version is 1.18 or later (required for ambient mode).

## Installing Ambient Components

Install ambient components without disrupting existing sidecar deployments:

```yaml
# istio-ambient-install.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-ambient
  namespace: istio-system
spec:
  profile: ambient
  # Keep existing control plane
  components:
    pilot:
      enabled: false
  # Add ambient data plane
  values:
    ztunnel:
      enabled: true
```

```bash
istioctl install -f istio-ambient-install.yaml --skip-confirmation
```

Verify ztunnel is running:

```bash
kubectl get daemonset -n istio-system ztunnel
kubectl get pods -n istio-system -l app=ztunnel
```

At this point, sidecar workloads continue functioning normally while ambient components run alongside them.

## Creating a Test Migration Namespace

Create a new namespace to test ambient mode:

```bash
kubectl create namespace ambient-test
kubectl label namespace ambient-test istio.io/dataplane-mode=ambient
```

Deploy a test application:

```yaml
# test-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-service
  namespace: ambient-test
spec:
  replicas: 2
  selector:
    matchLabels:
      app: test-service
  template:
    metadata:
      labels:
        app: test-service
    spec:
      containers:
      - name: app
        image: your-registry/test-service:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: test-service
  namespace: ambient-test
spec:
  selector:
    app: test-service
  ports:
  - port: 8080
```

```bash
kubectl apply -f test-app.yaml
```

Verify pods have no sidecars:

```bash
kubectl get pods -n ambient-test -o jsonpath='{.items[*].spec.containers[*].name}'
```

You should see only the application container, no istio-proxy.

## Testing Cross-Mode Communication

Deploy a sidecar workload that calls the ambient workload:

```yaml
# sidecar-client.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sidecar-client
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sidecar-client
  template:
    metadata:
      labels:
        app: sidecar-client
      annotations:
        sidecar.istio.io/inject: "true"
    spec:
      containers:
      - name: client
        image: curlimages/curl:latest
        command: ["/bin/sleep", "infinity"]
```

```bash
kubectl apply -f sidecar-client.yaml
```

Test connectivity from sidecar to ambient:

```bash
kubectl exec -n default deploy/sidecar-client -- curl http://test-service.ambient-test:8080/health
```

The request should succeed with mTLS encryption. Check that it worked:

```bash
kubectl logs -n default deploy/sidecar-client -c istio-proxy | grep "test-service"
```

## Migrating a Production Namespace

Once testing succeeds, migrate production namespaces incrementally. Start with less critical services:

```bash
# List namespaces with sidecar injection
kubectl get namespace -L istio-injection

# Choose a namespace to migrate
NAMESPACE=staging

# Remove sidecar injection label
kubectl label namespace $NAMESPACE istio-injection-

# Add ambient label
kubectl label namespace $NAMESPACE istio.io/dataplane-mode=ambient
```

At this point, new pods will not get sidecars, but existing pods still have them. Roll pods to remove sidecars:

```bash
kubectl rollout restart deployment -n $NAMESPACE
```

Watch the rollout:

```bash
kubectl rollout status deployment -n $NAMESPACE
```

Monitor for issues during the rollout. If problems occur, roll back:

```bash
kubectl label namespace $NAMESPACE istio-injection=enabled istio.io/dataplane-mode-
kubectl rollout undo deployment -n $NAMESPACE
```

## Handling StatefulSets and DaemonSets

StatefulSets require careful migration to avoid downtime:

```bash
# Migrate StatefulSet one pod at a time
kubectl delete pod <statefulset-name>-0 -n $NAMESPACE
# Wait for pod to be ready
kubectl wait --for=condition=Ready pod/<statefulset-name>-0 -n $NAMESPACE --timeout=300s
# Repeat for remaining pods
```

For DaemonSets, coordinate with node maintenance windows:

```bash
# Cordon node to prevent new pods
kubectl cordon <node-name>

# Delete DaemonSet pod
kubectl delete pod <daemonset-pod-name> -n $NAMESPACE

# Wait for new pod without sidecar
kubectl wait --for=condition=Ready pod -l app=<daemonset-app> -n $NAMESPACE --field-selector spec.nodeName=<node-name>

# Uncordon node
kubectl uncordon <node-name>
```

## Migrating Services with External Traffic

For services receiving external traffic through ingress, migrate carefully:

```bash
# Deploy waypoint proxy for L7 features
kubectl apply -f - <<EOF
apiVersion: gateway.networking.k8s.io/v1beta1
kind: Gateway
metadata:
  name: waypoint
  namespace: $NAMESPACE
  annotations:
    istio.io/service-account: default
spec:
  gatewayClassName: istio-waypoint
  listeners:
  - name: http
    port: 80
    protocol: HTTP
EOF
```

Verify waypoint is running:

```bash
kubectl get pods -n $NAMESPACE -l gateway.networking.k8s.io/gateway-name=waypoint
```

Migrate the namespace:

```bash
kubectl label namespace $NAMESPACE istio-injection- istio.io/dataplane-mode=ambient
kubectl rollout restart deployment -n $NAMESPACE
```

External traffic continues flowing through the ingress gateway while internal traffic uses ambient mode.

## Validating mTLS After Migration

Verify mTLS is active in ambient mode:

```bash
# Check ztunnel is handling traffic
kubectl logs -n istio-system daemonset/ztunnel | grep "connection established"

# Verify workload identity
istioctl x ztunnel-config workload -n $NAMESPACE
```

Test that strict mTLS is enforced:

```yaml
# peerauthentication-strict.yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: $NAMESPACE
spec:
  mtls:
    mode: STRICT
```

```bash
kubectl apply -f peerauthentication-strict.yaml
```

Attempt plaintext connection (should fail):

```bash
kubectl run test --image=curlimages/curl --rm -it -- curl http://test-service.$NAMESPACE:8080
```

## Migrating Traffic Policies

Existing VirtualServices and DestinationRules continue working in ambient mode. For L7 features, add waypoint proxies:

```bash
# Create waypoint for service account
istioctl x waypoint apply --service-account default --namespace $NAMESPACE
```

Verify traffic policies work:

```yaml
# virtualservice-test.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: test-service
  namespace: $NAMESPACE
spec:
  hosts:
  - test-service
  http:
  - match:
    - headers:
        x-version:
          exact: v2
    route:
    - destination:
        host: test-service
        subset: v2
  - route:
    - destination:
        host: test-service
        subset: v1
```

```bash
kubectl apply -f virtualservice-test.yaml
```

## Monitoring Resource Savings

Compare resource usage before and after migration:

```bash
# Before migration (with sidecars)
kubectl top pods -n $NAMESPACE --containers | grep istio-proxy

# After migration (ambient mode)
kubectl top pods -n istio-system -l app=ztunnel
```

Calculate savings:

```promql
# Memory saved per namespace
sum(container_memory_usage_bytes{container="istio-proxy", namespace="$NAMESPACE"})

# After migration, only ztunnel per node
sum(container_memory_usage_bytes{container="ztunnel", namespace="istio-system"}) / count(node_cpu_seconds_total)
```

Typical savings are 50-70% reduction in proxy memory usage.

## Handling Migration Failures

If issues occur during migration, roll back immediately:

```bash
# Restore sidecar injection
kubectl label namespace $NAMESPACE istio-injection=enabled istio.io/dataplane-mode-

# Roll back deployments
kubectl rollout undo deployment -n $NAMESPACE

# Verify connectivity restored
kubectl exec -n default deploy/sidecar-client -- curl http://service.$NAMESPACE:8080
```

Common issues and solutions:

- Connectivity breaks: Check ztunnel is running on all nodes
- Authorization fails: Verify PeerAuthentication policies match new identities
- L7 features not working: Deploy waypoint proxies
- Performance degradation: Check ztunnel resource limits

## Completing the Migration

After migrating all namespaces, remove sidecar injection globally:

```bash
# Verify no namespaces use sidecar injection
kubectl get namespace -L istio-injection,istio.io/dataplane-mode

# Update default injection webhook if needed
kubectl delete mutatingwebhookconfiguration istio-sidecar-injector
```

Clean up unused sidecar configurations:

```bash
# Remove sidecar injection annotations from remaining resources
kubectl annotate pod --all sidecar.istio.io/inject- -n $NAMESPACE
```

## Conclusion

Migrating from Istio sidecar to ambient mode reduces resource consumption while maintaining security and observability. Install ambient components alongside existing sidecars, test with non-critical workloads, then incrementally migrate production namespaces.

Use rolling deployments to remove sidecars without downtime. Deploy waypoint proxies only where you need L7 traffic management. Monitor connectivity and be prepared to roll back if issues occur.

The migration provides immediate resource savings with typical reductions of 50-70% in proxy memory usage. Start with test environments, validate thoroughly, then gradually expand to production workloads for a safe transition.
