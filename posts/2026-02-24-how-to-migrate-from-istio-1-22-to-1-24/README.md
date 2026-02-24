# How to Migrate from Istio 1.22 to 1.24

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Migration, Upgrade, Ambient Mesh, Kubernetes

Description: Complete migration guide from Istio 1.22 to 1.24 covering ambient mesh GA transition, Helm upgrades, breaking changes, and production validation.

---

The migration from Istio 1.22 to 1.24 is particularly interesting because 1.24 marks the ambient mesh mode as generally available. If you have been running sidecar mode on 1.22, this upgrade gives you the option to start adopting ambient mode for new workloads. If you were already experimenting with ambient beta, the APIs changed enough that you need to update your configuration.

This guide covers the complete migration path, including changes from both 1.23 and 1.24.

## Key Changes to Know

### Istio 1.23 Changes

- **Kubernetes 1.27+ required**: The minimum supported Kubernetes version was bumped.
- **Gateway API v1 support**: Full support for Gateway API v1 (graduated from v1beta1).
- **Waypoint proxy improvements**: The waypoint proxy configuration for ambient mode was refined.
- **Helm chart restructuring**: Some Helm values were reorganized.

### Istio 1.24 Changes

- **Ambient mesh GA**: The ztunnel and ambient mode are production-ready.
- **istioctl install deprecated**: Helm is now the official installation method. istioctl install is in maintenance mode.
- **Enhanced ztunnel**: Better performance and more features in the per-node proxy.
- **HBONE protocol**: The HTTP-Based Overlay Network Encapsulation protocol is fully supported.
- **Minimum Kubernetes version 1.28**: Another bump in the required Kubernetes version.

## Pre-Migration Assessment

```bash
# Current state
istioctl version
istioctl proxy-status
istioctl analyze --all-namespaces

# Check Kubernetes version (need 1.28+)
kubectl version

# Export current Helm values
helm get values istiod -n istio-system -o yaml > current-istiod-values.yaml
helm get values istio-base -n istio-system -o yaml > current-base-values.yaml
helm list -n istio-system

# Document all custom resources
kubectl get virtualservices,destinationrules,gateways,envoyfilters,authorizationpolicies,peerauthentications --all-namespaces -o wide
```

## Kubernetes Version Check

This is critical. Istio 1.24 requires Kubernetes 1.28 at minimum:

```bash
kubectl version --short
```

If you are on 1.27, upgrade Kubernetes before proceeding. Running Istio 1.24 on unsupported Kubernetes versions can cause subtle issues that are hard to debug.

## Backup

```bash
# Comprehensive backup
mkdir -p istio-migration-backup

# All Istio CRDs
for crd in $(kubectl get crds | grep istio | awk '{print $1}'); do
  kubectl get $crd --all-namespaces -o yaml > "istio-migration-backup/$crd.yaml" 2>/dev/null
done

# Helm values
helm get values istiod -n istio-system -o yaml > istio-migration-backup/istiod-values.yaml
helm get values istio-base -n istio-system -o yaml > istio-migration-backup/base-values.yaml

# Secrets (cert rotation data)
kubectl get secrets -n istio-system -o yaml > istio-migration-backup/secrets.yaml

# Namespace labels
kubectl get namespaces --show-labels > istio-migration-backup/namespace-labels.txt
```

## Download Istio 1.24

```bash
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.24.0 sh -
cd istio-1.24.0
export PATH=$PWD/bin:$PATH
istioctl version --remote=false
```

Run pre-check:

```bash
istioctl x precheck
```

## Update Helm Repository

```bash
helm repo update
```

## Step 1: Update Base CRDs

```bash
helm upgrade istio-base istio/base \
  --namespace istio-system \
  --version 1.24.0
```

Verify CRDs:

```bash
kubectl get crds | grep istio | wc -l
```

## Step 2: Install Canary Istiod

Prepare the values for 1.24:

```yaml
# istiod-1-24-values.yaml
revision: "1-24"

pilot:
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 4Gi
  autoscaleMin: 2
  autoscaleMax: 5
  env:
    PILOT_ENABLE_AMBIENT: "true"

meshConfig:
  accessLogFile: /dev/stdout
  accessLogEncoding: JSON
  enableTracing: true

  outboundTrafficPolicy:
    mode: REGISTRY_ONLY

  defaultConfig:
    holdApplicationUntilProxyStarts: true
    terminationDrainDuration: 20s
    tracing:
      sampling: 1.0
    proxyMetadata:
      ISTIO_META_DNS_CAPTURE: "true"
      ISTIO_META_DNS_AUTO_ALLOCATE: "true"

global:
  proxy:
    resources:
      requests:
        cpu: 50m
        memory: 64Mi
      limits:
        cpu: 300m
        memory: 512Mi
  logAsJson: true
```

```bash
helm install istiod-1-24 istio/istiod \
  --namespace istio-system \
  --version 1.24.0 \
  -f istiod-1-24-values.yaml \
  --wait
```

Verify both versions:

```bash
kubectl get pods -n istio-system -l app=istiod
```

## Step 3: Update Configuration for 1.24

### API Version Updates

Make sure all your resources use the latest API versions:

```yaml
# Use v1 for security APIs
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy

# Use v1beta1 for networking APIs
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
```

### EnvoyFilter Compatibility

Check your EnvoyFilters against the new Envoy version:

```bash
kubectl get envoyfilter --all-namespaces -o name
```

Test each one. The Envoy version in 1.24 is newer than 1.22, and filter configurations may need updates.

### Gateway API Updates

Update Gateway API CRDs to v1.1:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.1.0/standard-install.yaml
```

If you are using Gateway API resources, update them to v1:

```yaml
# Old
apiVersion: gateway.networking.k8s.io/v1beta1
kind: HTTPRoute

# New
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
```

## Step 4: Migrate Workloads

Start with a test namespace:

```bash
kubectl label namespace test istio-injection- --overwrite 2>/dev/null
kubectl label namespace test istio.io/rev=1-24
kubectl rollout restart deployment -n test
```

Verify:

```bash
istioctl proxy-status | grep test
kubectl logs deploy/test-app -n test -c istio-proxy --tail=10
istioctl analyze -n test
```

Migrate remaining namespaces:

```bash
for ns in staging default production; do
  echo "=== Migrating $ns ==="
  kubectl label namespace $ns istio-injection- --overwrite 2>/dev/null
  kubectl label namespace $ns istio.io/rev=1-24
  kubectl rollout restart deployment -n $ns
  sleep 60

  ERRORS=$(istioctl analyze -n $ns 2>&1 | grep -c "Error")
  if [ "$ERRORS" -gt 0 ]; then
    echo "WARNING: Errors found in $ns, review before continuing"
    istioctl analyze -n $ns
  else
    echo "$ns migration OK"
  fi
done
```

## Step 5: Upgrade the Gateway

```bash
helm upgrade istio-gateway istio/gateway \
  --namespace istio-ingress \
  --version 1.24.0
```

Or install a new gateway alongside the old one for zero-downtime migration:

```bash
helm install istio-gateway-1-24 istio/gateway \
  --namespace istio-ingress \
  --version 1.24.0 \
  --set service.type=LoadBalancer
```

Then update your DNS or load balancer to point to the new gateway before removing the old one.

## Step 6: Optional - Install Ambient Components

If you want to start using ambient mode (now GA in 1.24):

```bash
helm install istio-cni istio/cni \
  --namespace istio-system \
  --version 1.24.0 \
  --set profile=ambient \
  --wait

helm install ztunnel istio/ztunnel \
  --namespace istio-system \
  --version 1.24.0 \
  --wait
```

You can then label specific namespaces for ambient mode:

```bash
kubectl label namespace ambient-test istio.io/dataplane-mode=ambient
```

Sidecar and ambient namespaces can coexist in the same mesh.

## Step 7: Remove Old Version

Once all workloads are verified on 1.24:

```bash
# Remove old istiod
helm uninstall istiod -n istio-system

# Set default tag
istioctl tag set default --revision 1-24 --overwrite

# Clean up revision labels
for ns in test staging default production; do
  kubectl label namespace $ns istio.io/rev-
  kubectl label namespace $ns istio-injection=enabled
done

# Final restart
for ns in default staging production; do
  kubectl rollout restart deployment -n $ns
done
```

## Post-Migration Validation

```bash
# Version check
istioctl version

# Proxy sync
istioctl proxy-status

# Configuration analysis
istioctl analyze --all-namespaces

# Verify metrics
kubectl port-forward -n istio-system svc/prometheus 9090:9090 &
curl -s "localhost:9090/api/v1/query?query=up{job='kubernetes-pods'}" | jq '.data.result | length'

# Test mTLS
istioctl proxy-config secret deploy/my-app -n default | head
```

## Rollback Plan

```bash
# Switch back to old revision
kubectl label namespace default istio.io/rev- --overwrite
kubectl label namespace default istio-injection=enabled
kubectl rollout restart deployment -n default

# Remove new version
helm uninstall istiod-1-24 -n istio-system
helm uninstall istio-cni -n istio-system 2>/dev/null
helm uninstall ztunnel -n istio-system 2>/dev/null
```

## Things to Watch After Migration

Monitor these metrics for the first 48 hours after migration:

1. **istiod memory and CPU**: The new version may have different resource characteristics
2. **Proxy connection errors**: Check for `upstream_cx_connect_fail` in Envoy stats
3. **Certificate rotation**: Verify that mTLS certificates are rotating properly
4. **Request success rate**: Compare before/after deployment success rates

The 1.22 to 1.24 migration is significant because of the ambient mesh GA. Take advantage of this to evaluate whether ambient mode fits your workloads, but do not feel pressured to switch everything at once. The sidecar model remains fully supported and is not going anywhere.
