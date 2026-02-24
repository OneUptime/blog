# How to Fix Service Discovery Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Discovery, Troubleshooting, Kubernetes, Envoy

Description: Diagnose and fix service discovery problems in Istio including missing endpoints, stale service registrations, and cross-cluster discovery failures.

---

Service discovery in Istio builds on top of Kubernetes service discovery but adds its own layer of complexity. Istio's control plane (istiod) watches the Kubernetes API for Services and Endpoints, then pushes that information to every Envoy sidecar in the mesh. When this pipeline breaks, the sidecar might not know about a service, might have stale endpoints, or might route to the wrong destination entirely.

This guide walks through how to diagnose and fix service discovery problems at every level.

## Understanding the Discovery Pipeline

Service discovery flows through these steps:

1. Kubernetes registers Services and Endpoints
2. istiod watches the Kubernetes API and builds an internal registry
3. istiod pushes configuration (EDS - Endpoint Discovery Service) to Envoy sidecars
4. Each Envoy sidecar maintains its own list of endpoints for each service

A problem at any step causes discovery issues. The debugging approach is to check each step.

## Step 1: Check Kubernetes Service and Endpoints

Start at the source:

```bash
# Check the service exists
kubectl get svc orders-service -n production

# Check if the service has endpoints
kubectl get endpoints orders-service -n production

# Check endpoint details
kubectl describe endpoints orders-service -n production
```

If the endpoints list is empty, the service selector does not match any running pods:

```bash
# Check the service selector
kubectl get svc orders-service -n production -o jsonpath='{.spec.selector}'

# Check if pods match the selector
kubectl get pods -n production -l app=orders-service
```

Common issues:
- Pod labels do not match service selector
- Pods are not ready (readiness probe failing)
- Pods are in a different namespace

## Step 2: Check istiod's View

Verify that istiod has picked up the service:

```bash
# Check istiod's internal registry
kubectl exec -n istio-system deployment/istiod -- curl -s localhost:15014/debug/registryz | jq '.[] | select(.hostname | contains("orders-service"))'

# Check the endpoints istiod knows about
kubectl exec -n istio-system deployment/istiod -- curl -s localhost:15014/debug/endpointz | jq '.[] | select(.[] | .service | contains("orders-service"))'
```

If istiod does not have the service or endpoints, there might be a problem with its Kubernetes API watch:

```bash
# Check istiod logs for watch errors
kubectl logs -n istio-system deployment/istiod | grep "error\|failed\|watch"

# Check if istiod has RBAC to read services and endpoints
kubectl auth can-i list services --as=system:serviceaccount:istio-system:istiod -n production
kubectl auth can-i list endpoints --as=system:serviceaccount:istio-system:istiod -n production
```

## Step 3: Check the Sidecar's View

Even if istiod has the correct information, the sidecar might not:

```bash
# Check what endpoints the sidecar knows about
istioctl proxy-config endpoints <client-pod> -n production | grep orders-service

# Get detailed endpoint info
istioctl proxy-config endpoints <client-pod> -n production \
  --cluster "outbound|8080||orders-service.production.svc.cluster.local" -o json
```

Check if the endpoints are healthy:

```bash
istioctl proxy-config endpoints <client-pod> -n production \
  --cluster "outbound|8080||orders-service.production.svc.cluster.local" -o json | \
  jq '.[].hostStatuses[] | {address: .address, health: .healthStatus}'
```

If endpoints show as UNHEALTHY, either the pods are failing health checks or the Envoy outlier detection has ejected them.

## Step 4: Check Configuration Sync

Verify the proxy is synchronized with istiod:

```bash
# Check sync status
istioctl proxy-status

# Look for STALE proxies
istioctl proxy-status | grep -v SYNCED
```

If a proxy shows as STALE, it means istiod pushed new configuration but the proxy has not acknowledged it. Possible causes:

- Network issues between the proxy and istiod
- Proxy is overloaded and cannot process updates
- Configuration is too large to push

Check the connection between proxy and istiod:

```bash
# Check proxy logs for xDS connection issues
kubectl logs <pod-name> -c istio-proxy -n production | grep "xds\|istiod\|connection"
```

## Missing Services After Adding Sidecar Resource

If you added a Sidecar resource to limit visibility, some services might disappear from discovery:

```bash
# Check Sidecar resources in the namespace
kubectl get sidecar -n production -o yaml
```

If the Sidecar limits egress hosts, only listed services are visible:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: production
spec:
  egress:
    - hosts:
        - "./*"           # Same namespace services
        - "istio-system/*" # Istio services
```

If orders-service is in a different namespace and not listed, add it:

```yaml
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "orders-namespace/orders-service"
```

## Stale Endpoints

If the proxy has stale endpoints (pointing to pods that no longer exist):

```bash
# Compare Kubernetes endpoints with Envoy endpoints
kubectl get endpoints orders-service -n production -o jsonpath='{.subsets[0].addresses[*].ip}'

istioctl proxy-config endpoints <client-pod> -n production \
  --cluster "outbound|8080||orders-service.production.svc.cluster.local" -o json | \
  jq '.[].hostStatuses[].address.socketAddress.address'
```

If Envoy has IPs that are not in the Kubernetes endpoints, the configuration has not been updated. This usually resolves itself within a few seconds. If it persists:

```bash
# Check istiod push status
kubectl logs -n istio-system deployment/istiod | grep "push\|eds\|error" | tail -20

# Force a proxy config push by restarting the pod
kubectl delete pod <client-pod> -n production
```

## External Service Discovery

For services outside the mesh (external APIs, databases, etc.), Istio needs ServiceEntries:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-database
  namespace: production
spec:
  hosts:
    - db.external-provider.com
  location: MESH_EXTERNAL
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  resolution: DNS
  endpoints:
    - address: db.external-provider.com
```

Check if the ServiceEntry is working:

```bash
# Verify the proxy has the external service
istioctl proxy-config clusters <pod-name> -n production | grep external-provider

# Check the endpoints
istioctl proxy-config endpoints <pod-name> -n production | grep external-provider
```

If the outbound traffic policy is REGISTRY_ONLY, any external service without a ServiceEntry will be blocked:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep outboundTrafficPolicy
```

## WorkloadEntry for Non-Kubernetes Services

For services running outside Kubernetes (VMs, bare metal), use WorkloadEntry:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: WorkloadEntry
metadata:
  name: legacy-service-vm1
  namespace: production
spec:
  address: 10.0.0.50
  labels:
    app: legacy-service
    version: v1
  serviceAccount: legacy-service
---
apiVersion: v1
kind: Service
metadata:
  name: legacy-service
  namespace: production
spec:
  ports:
    - name: http
      port: 8080
```

Verify the WorkloadEntry is being discovered:

```bash
kubectl get workloadentry -n production
istioctl proxy-config endpoints <client-pod> -n production | grep legacy-service
```

## Multi-Cluster Discovery

In multi-cluster setups, service discovery issues are common. Check that the remote cluster secrets are configured:

```bash
# List remote cluster secrets
kubectl get secrets -n istio-system -l istio/multiCluster=true
```

Verify cross-cluster discovery:

```bash
# Check if istiod sees remote cluster services
kubectl exec -n istio-system deployment/istiod -- curl -s localhost:15014/debug/registryz | \
  jq '.[] | select(.clusterVIPs | length > 1)'
```

## Health Check Interference

If Istio's health checking marks endpoints as unhealthy when they are actually healthy:

```bash
# Check outlier detection settings
kubectl get destinationrule orders-service -n production -o yaml | grep -A 10 outlierDetection
```

Aggressive outlier detection can remove healthy endpoints:

```yaml
# Relax outlier detection
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: orders-service
spec:
  host: orders-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 10
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 30
```

## Debugging Summary

```bash
# 1. Kubernetes endpoints exist?
kubectl get endpoints <service> -n production

# 2. istiod has the service?
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/debug/registryz | jq '. | length'

# 3. Proxy has the endpoints?
istioctl proxy-config endpoints <pod> -n production | grep <service>

# 4. Proxy in sync?
istioctl proxy-status | grep <pod>

# 5. Sidecar resource blocking?
kubectl get sidecar -n production

# 6. Run analyzer
istioctl analyze -n production
```

Service discovery issues in Istio usually trace back to one of three things: Kubernetes endpoints not being registered (pod labels or readiness), Sidecar resources limiting visibility, or stale proxy configuration. Check each step of the pipeline from Kubernetes to istiod to the sidecar proxy, and you will find where the chain breaks.
