# How to Migrate from Istio Sidecar Mode to Ambient Mesh Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Ambient Mesh, Migration, Kubernetes, Zero Downtime

Description: Learn how to safely migrate Istio deployments from traditional sidecar mode to Ambient Mesh without downtime, reducing resource overhead while maintaining security and observability.

---

Ambient Mesh eliminates per-pod sidecars in favor of shared node-level ztunnel proxies and optional waypoint proxies. Migrating existing sidecar deployments to ambient mode reduces resource consumption significantly while maintaining Istio's security and traffic management features. This guide shows you how to migrate safely with minimal downtime risk.

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

You should see istio-proxy containers in your pods. Use a supported Istio release with ambient mode enabled; ambient mode became production-ready for single-cluster use cases in Istio 1.22, and current migration guidance assumes a supported release.

## Installing Ambient Components

Install ambient components without disrupting existing sidecar deployments. If you use waypoints, make sure the Kubernetes Gateway API CRDs are installed:

```bash
kubectl get crd gateways.gateway.networking.k8s.io &> /dev/null || \
  kubectl apply --server-side -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.5.1/experimental-install.yaml
istioctl upgrade --set profile=ambient
```

Verify ztunnel is running:

```bash
kubectl get daemonset -n istio-system ztunnel
kubectl get pods -n istio-system -l app=ztunnel
```

Restart existing sidecar workloads so they pick up HBONE support for sidecar-to-ambient interoperability:

```bash
kubectl rollout restart deployment -n default
kubectl rollout status deployment/<deployment-name> -n default
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

The request should succeed with mTLS encryption. Check that ztunnel knows about the ambient workload:

```bash
istioctl ztunnel-config workloads | grep ambient-test
```

## Migrating a Production Namespace

Once testing succeeds, migrate production namespaces incrementally. Start with less critical services:

```bash
# List namespaces with sidecar injection
kubectl get namespace -L istio-injection

# Choose a namespace to migrate
NAMESPACE=staging

# Add ambient label
kubectl label namespace $NAMESPACE istio.io/dataplane-mode=ambient

# Remove sidecar injection label
kubectl label namespace $NAMESPACE istio-injection-
```

At this point, new pods will not get sidecars, but existing pods still have them. Roll pods to remove sidecars:

```bash
kubectl rollout restart deployment -n $NAMESPACE
```

Watch the rollout:

```bash
kubectl rollout status deployment/<deployment-name> -n $NAMESPACE
```

Monitor for issues during the rollout. If problems occur, roll back:

```bash
kubectl label namespace $NAMESPACE istio-injection=enabled istio.io/dataplane-mode-
kubectl rollout restart deployment -n $NAMESPACE
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
# Deploy a waypoint proxy for L7 features
istioctl waypoint apply -n $NAMESPACE
```

Verify waypoint is running:

```bash
kubectl get gateway waypoint -n $NAMESPACE
kubectl get pods -n $NAMESPACE -l gateway.istio.io/managed=istio.io-mesh-controller
```

Migrate the namespace:

```bash
kubectl label namespace $NAMESPACE istio-injection- istio.io/dataplane-mode=ambient
kubectl rollout restart deployment -n $NAMESPACE
kubectl label namespace $NAMESPACE istio.io/use-waypoint=waypoint
```

External traffic continues flowing through the ingress gateway while internal traffic uses ambient mode. If ingress traffic must also pass through the destination waypoint, enable ingress waypoint routing in istiod and label the service or namespace:

```bash
kubectl label service <service-name> -n $NAMESPACE istio.io/ingress-use-waypoint=true
```

## Validating mTLS After Migration

Verify mTLS is active in ambient mode:

```bash
# Verify ztunnel is handling the workload with HBONE
istioctl ztunnel-config workloads | grep $NAMESPACE
```

Test that strict mTLS is enforced:

```yaml
# peerauthentication-strict.yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: staging
spec:
  mtls:
    mode: STRICT
```

```bash
kubectl apply -f peerauthentication-strict.yaml
```

Attempt plaintext connection (should fail):

```bash
kubectl create namespace plain-test
kubectl run test -n plain-test --image=curlimages/curl --restart=Never --rm -it -- \
  curl http://test-service.$NAMESPACE:8080
```

## Migrating Traffic Policies

L4 authorization policies continue working in ambient mode. DestinationRule traffic policies are supported by waypoints, but stable L7 traffic routing should use Gateway API HTTPRoute instead of VirtualService. For L7 features, add waypoint proxies and enroll the namespace after sidecars are removed:

```bash
istioctl waypoint apply --namespace $NAMESPACE
kubectl label namespace $NAMESPACE istio.io/use-waypoint=waypoint
```

Verify traffic policies work. If you previously used DestinationRule subsets, create version-specific Services and reference those Services from HTTPRoute:

```yaml
# httproute-test.yaml
apiVersion: v1
kind: Service
metadata:
  name: test-service-v1
  namespace: staging
spec:
  selector:
    app: test-service
    version: v1
  ports:
  - port: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: test-service-v2
  namespace: staging
spec:
  selector:
    app: test-service
    version: v2
  ports:
  - port: 8080
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: test-service
  namespace: staging
spec:
  parentRefs:
  - group: ""
    kind: Service
    name: test-service
    port: 8080
  rules:
  - matches:
    - headers:
      - name: x-version
        value: v2
    backendRefs:
    - name: test-service-v2
      port: 8080
  - backendRefs:
    - name: test-service-v1
      port: 8080
```

```bash
kubectl apply -f httproute-test.yaml
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
sum(container_memory_usage_bytes{container="istio-proxy", namespace="staging"})

# After migration, shared ztunnel memory
sum(container_memory_usage_bytes{container="ztunnel", namespace="istio-system"})
```

Typical proxy memory savings can be significant, but the exact reduction depends on workload count, node count, waypoint usage, and traffic patterns.

## Handling Migration Failures

If issues occur during migration, roll back immediately:

```bash
# Restore sidecar injection
kubectl label namespace $NAMESPACE istio-injection=enabled istio.io/dataplane-mode-

# Roll back deployments
kubectl rollout restart deployment -n $NAMESPACE

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

# Uninstall or disable the old sidecar injection revision only after verifying
# that no workloads still depend on it.
```

Clean up unused sidecar configurations:

```bash
# Remove sidecar injection annotations from remaining resources
kubectl annotate pod --all sidecar.istio.io/inject- -n $NAMESPACE
```

## Conclusion

Migrating from Istio sidecar to ambient mode reduces resource consumption while maintaining security and observability. Install ambient components alongside existing sidecars, test with non-critical workloads, then incrementally migrate production namespaces.

Use rolling deployments to remove sidecars with minimal downtime risk. Deploy waypoint proxies only where you need L7 traffic management, and plan a maintenance window if continuous L7 policy enforcement is required during migration. Monitor connectivity and be prepared to roll back if issues occur.

The migration can provide immediate resource savings by replacing per-pod sidecars with shared ztunnel and waypoint infrastructure. Start with test environments, validate thoroughly, then gradually expand to production workloads for a safe transition.
