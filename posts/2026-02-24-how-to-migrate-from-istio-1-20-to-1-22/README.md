# How to Migrate from Istio 1.20 to 1.22

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Migration, Upgrade, Kubernetes, Service Mesh

Description: Practical migration guide from Istio 1.20 to 1.22 covering breaking changes, revision-based canary upgrades, ambient mesh considerations, and validation.

---

Upgrading from Istio 1.20 to 1.22 is a two-version jump that stays within the supported upgrade path (Istio supports skipping one minor version). The 1.21 and 1.22 releases brought important changes including ambient mesh beta, stronger Gateway API integration, and shifts in how installations are managed. This guide covers everything you need to know to make this migration smooth.

## Pre-Migration Checklist

Before starting the migration, gather information about your current setup:

```bash
# Current version details
istioctl version

# All proxy versions
istioctl proxy-status

# Current configuration
istioctl analyze --all-namespaces

# Current Helm values (if using Helm)
helm get values istiod -n istio-system > current-values.yaml
helm get values istio-base -n istio-system > current-base-values.yaml

# List all Istio custom resources
kubectl get virtualservices,destinationrules,gateways,serviceentries,envoyfilters --all-namespaces
```

## Breaking Changes: 1.20 to 1.21

**Helm became the primary installation method.** While istioctl install still works, Helm is now recommended. If you are switching from istioctl to Helm during this migration, plan for that transition.

**Gateway deployment model changed.** The recommended practice moved to deploying gateways in their own namespace rather than in istio-system. If your gateways are in istio-system, consider moving them.

**Minimum Kubernetes version bumped to 1.26.** Make sure your cluster meets this requirement.

**API version changes.** Several Istio APIs shifted from v1alpha3 to v1beta1. While v1alpha3 still works, you should update your manifests.

## Breaking Changes: 1.21 to 1.22

**Ambient mesh reached beta.** The ambient APIs stabilized, but if you were using the alpha ambient mode from 1.20, the configuration changed significantly.

**Gateway API became more integrated.** Istio 1.22 works better with Gateway API v1 (not just v1beta1). Update your Gateway API CRDs.

**Telemetry filter expression support.** The Telemetry API gained filter expressions for access logging, which changes how some existing configurations behave.

**ProxyConfig API updates.** Some proxyConfig fields were restructured.

## Verify Kubernetes Version

```bash
kubectl version --short
```

You need Kubernetes 1.27 or newer for Istio 1.22. If you are on 1.26, it might still work but is not officially supported. Upgrade Kubernetes first if needed.

## Backup

```bash
# Full CRD backup
for crd in $(kubectl get crds | grep 'istio\|networking.x-k8s.io' | awk '{print $1}'); do
  kubectl get $crd --all-namespaces -o yaml > "backup-$(echo $crd | tr '.' '-').yaml"
done

# Helm values backup
helm get values istiod -n istio-system -o yaml > backup-istiod-values.yaml

# Secrets backup
kubectl get secrets -n istio-system -o yaml > backup-istio-secrets.yaml
```

## Download Istio 1.22

```bash
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.22.0 sh -
cd istio-1.22.0
export PATH=$PWD/bin:$PATH
istioctl version --remote=false
```

## Canary Upgrade with Helm

### Update Base CRDs

The base chart needs to be updated first since it contains CRDs:

```bash
helm repo update
helm upgrade istio-base istio/base \
  --namespace istio-system \
  --version 1.22.0
```

Verify CRDs are updated:

```bash
kubectl get crds | grep istio | head -5
```

### Install New Istiod as Canary

```yaml
# istiod-1-22-values.yaml
revision: "1-22"

pilot:
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 2Gi
  autoscaleMin: 2
  autoscaleMax: 5

meshConfig:
  accessLogFile: /dev/stdout
  accessLogEncoding: JSON
  enableTracing: true
  outboundTrafficPolicy:
    mode: REGISTRY_ONLY
  defaultConfig:
    holdApplicationUntilProxyStarts: true
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
        cpu: 200m
        memory: 256Mi
```

```bash
helm install istiod-1-22 istio/istiod \
  --namespace istio-system \
  --version 1.22.0 \
  -f istiod-1-22-values.yaml \
  --wait
```

Verify both versions are running:

```bash
kubectl get pods -n istio-system -l app=istiod
```

### Update Configuration

Update API versions in your Istio resources:

```bash
# Find resources using old API versions
kubectl get virtualservices --all-namespaces -o jsonpath='{range .items[*]}{.apiVersion}{"\t"}{.metadata.namespace}/{.metadata.name}{"\n"}{end}'
```

Update from v1alpha3 to v1beta1:

```yaml
# Old
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService

# New
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
```

If you have EnvoyFilter resources, test them against the new Envoy version:

```bash
kubectl get envoyfilter --all-namespaces
```

The Envoy version shipped with Istio 1.22 may have changes in filter names or configuration structures. Check each EnvoyFilter for compatibility.

### Migrate Namespaces Gradually

Start with a non-critical namespace:

```bash
# Switch to new revision
kubectl label namespace staging istio-injection- --overwrite
kubectl label namespace staging istio.io/rev=1-22

# Restart workloads
kubectl rollout restart deployment -n staging

# Verify
kubectl get pods -n staging -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].image}{"\n"}{end}' | grep istio
istioctl proxy-status | grep staging
```

Check for issues:

```bash
istioctl analyze -n staging
kubectl logs deploy/my-app -n staging -c istio-proxy --tail=20
```

If everything looks good, migrate the next namespace:

```bash
NAMESPACES="default production api-services"
for ns in $NAMESPACES; do
  echo "Migrating namespace: $ns"
  kubectl label namespace $ns istio-injection- --overwrite 2>/dev/null
  kubectl label namespace $ns istio.io/rev=1-22
  kubectl rollout restart deployment -n $ns
  echo "Waiting 60 seconds for stabilization..."
  sleep 60
  istioctl proxy-status | grep $ns
  echo "---"
done
```

### Migrate the Gateway

```bash
helm upgrade istio-ingressgateway istio/gateway \
  --namespace istio-system \
  --version 1.22.0 \
  --set revision=1-22
```

Or if you are deploying the gateway to its own namespace (recommended for 1.22):

```bash
helm install istio-gateway-1-22 istio/gateway \
  --namespace istio-ingress \
  --create-namespace \
  --version 1.22.0
```

Update your Gateway resources to point to the new gateway if you created a new one.

### Remove the Old Version

After all workloads are migrated and verified:

```bash
# Remove old istiod
helm uninstall istiod -n istio-system

# Set default revision tag
istioctl tag set default --revision 1-22 --overwrite

# Switch namespaces to default label
for ns in default staging production; do
  kubectl label namespace $ns istio.io/rev-
  kubectl label namespace $ns istio-injection=enabled
done

# Restart one more time to use default revision
kubectl rollout restart deployment -n default
```

## Post-Migration Tasks

### Update Gateway API CRDs

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml
```

### Verify Everything

```bash
# Single version running
istioctl version

# All proxies on new version
istioctl proxy-status

# No configuration issues
istioctl analyze --all-namespaces

# Metrics flowing
kubectl port-forward -n istio-system svc/prometheus 9090:9090 &
curl -s "localhost:9090/api/v1/query?query=istio_requests_total" | jq '.data.result | length'
```

## Rollback

If you need to roll back, reverse the namespace labels:

```bash
kubectl label namespace default istio.io/rev-
kubectl label namespace default istio-injection=enabled
kubectl rollout restart deployment -n default
```

The old istiod (still running during canary) will take over. Then uninstall the new version:

```bash
helm uninstall istiod-1-22 -n istio-system
```

## Common Post-Migration Issues

**High memory usage in new istiod**: Istio 1.22 may use more memory during initial configuration push. Make sure your resource limits account for this.

**Sidecar readiness delays**: If pods take longer to start, check that `holdApplicationUntilProxyStarts` is configured and that readiness probes are appropriately timed.

**EnvoyFilter failures**: The most common migration breakage. Test every EnvoyFilter in a staging environment before migrating production.

Take a measured approach to this migration. The canary upgrade strategy lets you verify at each step and roll back quickly if something is wrong.
