# How to Set Up Tenant Resource Quotas with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Resource Quotas, Multi-Tenancy, Kubernetes, Capacity Planning

Description: Configure resource quotas and limits for tenants in an Istio service mesh, covering sidecar resources, connection limits, and bandwidth control.

---

Resource quotas in a multi-tenant system are about fairness. You need to make sure one tenant cannot consume all the CPU, memory, network bandwidth, or connections and leave nothing for everyone else. Kubernetes has built-in resource quotas, but when you add Istio to the mix, you also need to account for sidecar proxy resources, connection pools, and traffic limits.

## Kubernetes Resource Quotas Per Namespace

Start with standard Kubernetes ResourceQuotas. These limit the total compute resources a tenant namespace can consume:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-a-quota
  namespace: tenant-a
spec:
  hard:
    requests.cpu: "8"
    requests.memory: 16Gi
    limits.cpu: "16"
    limits.memory: 32Gi
    pods: "50"
    services: "20"
    persistentvolumeclaims: "10"
    configmaps: "30"
    secrets: "30"
```

This caps tenant-a at 8 CPU cores requested, 16Gi memory requested, 50 pods, and so on. Adjust the numbers based on the tenant's plan or SLA.

Apply similar quotas for each tenant:

```bash
for tenant in tenant-a tenant-b tenant-c; do
  kubectl apply -f - <<EOF
apiVersion: v1
kind: ResourceQuota
metadata:
  name: ${tenant}-quota
  namespace: ${tenant}
spec:
  hard:
    requests.cpu: "8"
    requests.memory: 16Gi
    limits.cpu: "16"
    limits.memory: 32Gi
    pods: "50"
EOF
done
```

## Accounting for Sidecar Resources

Here is something people often forget: every pod in an Istio mesh runs a sidecar proxy, and that sidecar consumes CPU and memory. If you set a resource quota of 50 pods with tight CPU limits, the sidecar resource usage can push you over the quota unexpectedly.

By default, Istio injects a sidecar with these resource settings (which vary by Istio version, but typically):

- CPU request: 100m
- Memory request: 128Mi
- CPU limit: 2000m
- Memory limit: 1Gi

For 50 pods, that is an additional 5 CPU cores and 6.4Gi of memory just for the sidecars. Factor this into your quota calculations.

You can customize sidecar resource limits per namespace using annotations on the namespace or through the Istio configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata: {}
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 500m
            memory: 256Mi
```

Or set sidecar resources per namespace using pod annotations in a mutating webhook or in the deployment template:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: tenant-a
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "50m"
        sidecar.istio.io/proxyMemory: "64Mi"
        sidecar.istio.io/proxyCPULimit: "500m"
        sidecar.istio.io/proxyMemoryLimit: "256Mi"
    spec:
      containers:
      - name: my-service
        image: my-service:latest
```

## LimitRange for Default Pod Limits

Combine ResourceQuotas with LimitRanges to set default resource limits for pods that do not specify them:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: tenant-a-limits
  namespace: tenant-a
spec:
  limits:
  - default:
      cpu: 500m
      memory: 512Mi
    defaultRequest:
      cpu: 100m
      memory: 128Mi
    max:
      cpu: "2"
      memory: 2Gi
    min:
      cpu: 50m
      memory: 64Mi
    type: Container
```

This ensures that every container in tenant-a has reasonable resource limits, even if the tenant forgets to set them. The `max` field prevents any single container from requesting too many resources.

## Connection Pool Limits Per Tenant

Istio's DestinationRule lets you limit the number of connections a tenant can open to any service. This is important for shared services where you want to prevent one tenant from exhausting the connection pool:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: connection-limits
  namespace: tenant-a
spec:
  host: "*.shared-services.svc.cluster.local"
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
        connectTimeout: 5s
      http:
        http1MaxPendingRequests: 25
        http2MaxRequests: 50
        maxRequestsPerConnection: 100
        maxRetries: 3
```

With these limits, tenant-a can open at most 50 TCP connections and have at most 50 concurrent HTTP/2 requests to any service in the shared-services namespace.

## Bandwidth Limiting

Istio does not have native bandwidth limiting, but you can use Kubernetes bandwidth annotations on pods. These use the traffic control (tc) mechanism on the node:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-service
  namespace: tenant-a
  annotations:
    kubernetes.io/ingress-bandwidth: "10M"
    kubernetes.io/egress-bandwidth: "10M"
spec:
  containers:
  - name: my-service
    image: my-service:latest
```

This limits the pod to 10 Mbps for both ingress and egress. Note that this requires the bandwidth CNI plugin to be installed on your cluster.

For more control, you can use Envoy's bandwidth limiting through an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: bandwidth-limit
  namespace: tenant-a
spec:
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
            subFilter:
              name: envoy.filters.http.router
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.bandwidth_limit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.bandwidth_limit.v3.BandwidthLimit
          stat_prefix: bandwidth_limiter
          enable_mode: REQUEST_AND_RESPONSE
          limit_kbps: 10240
          fill_interval: 1s
```

## Enforcing Quotas Through Admission Control

Resource quotas are enforced by the Kubernetes API server, which means they only block pods from being created if the quota would be exceeded. But they do not prevent tenants from creating lots of small Istio custom resources like VirtualServices, DestinationRules, or AuthorizationPolicies.

Use ResourceQuotas for count limits on custom resources:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: istio-resource-limits
  namespace: tenant-a
spec:
  hard:
    count/virtualservices.networking.istio.io: "10"
    count/destinationrules.networking.istio.io: "10"
    count/authorizationpolicies.security.istio.io: "20"
    count/serviceentries.networking.istio.io: "5"
```

This prevents a tenant from creating excessive Istio configuration objects, which could impact the control plane performance.

## Monitoring Quota Usage

Track quota usage per tenant to spot tenants approaching their limits:

```bash
kubectl get resourcequota -n tenant-a -o yaml
```

The output shows both the hard limits and current usage:

```yaml
status:
  hard:
    limits.cpu: "16"
    limits.memory: 32Gi
    pods: "50"
    requests.cpu: "8"
    requests.memory: 16Gi
  used:
    limits.cpu: "6"
    limits.memory: 12Gi
    pods: "23"
    requests.cpu: "3200m"
    requests.memory: "6656Mi"
```

Set up Prometheus alerts for quota utilization:

```promql
kube_resourcequota{type="used"} / kube_resourcequota{type="hard"} > 0.8
```

This fires when any quota is more than 80% utilized, giving you time to either increase the quota or work with the tenant to optimize their resource usage.

## Tiered Resource Plans

Structure your quotas into tiers that map to your pricing plans:

```bash
# Free tier
kubectl apply -f quotas/free-tier.yaml -n tenant-free

# Standard tier
kubectl apply -f quotas/standard-tier.yaml -n tenant-standard

# Enterprise tier
kubectl apply -f quotas/enterprise-tier.yaml -n tenant-enterprise
```

Where each tier file has progressively higher limits:

```yaml
# standard-tier.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: standard-quota
spec:
  hard:
    requests.cpu: "16"
    requests.memory: 32Gi
    limits.cpu: "32"
    limits.memory: 64Gi
    pods: "100"
    services: "40"
    persistentvolumeclaims: "20"
```

When a tenant upgrades their plan, you just swap out the ResourceQuota object in their namespace.

## Summary

Resource quotas in a multi-tenant Istio mesh span multiple layers: Kubernetes compute quotas, Istio sidecar resource limits, connection pool limits, bandwidth controls, and Istio resource count limits. Factor in sidecar overhead when planning quotas, use LimitRanges for sensible defaults, and monitor quota utilization proactively. The goal is preventing any single tenant from degrading the experience for others while still giving each tenant enough room to run their workloads effectively.
