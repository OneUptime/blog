# How to Configure Traffic Policies for VM Workloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Management, Virtual Machine, Service Mesh, Networking

Description: Step-by-step guide to setting up traffic routing, load balancing, and failover policies for VM workloads in Istio.

---

Traffic policies in Istio work the same way for VM workloads as they do for Kubernetes pods, with a few extra configuration steps. Once your VMs are part of the mesh through WorkloadEntry and WorkloadGroup resources, you can apply DestinationRules, VirtualServices, and other traffic management configurations just like you would for any other service. The key is making sure the labels and service definitions line up correctly.

## Setting Up the Foundation

Before applying traffic policies, your VM workloads need to be properly registered in the mesh. You need a WorkloadEntry for each VM and a Kubernetes Service that selects those entries.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: WorkloadEntry
metadata:
  name: vm-instance-1
  namespace: production
spec:
  address: 10.0.1.10
  labels:
    app: payment-service
    version: v1
  serviceAccount: payment-sa
  network: vm-network
---
apiVersion: networking.istio.io/v1beta1
kind: WorkloadEntry
metadata:
  name: vm-instance-2
  namespace: production
spec:
  address: 10.0.1.11
  labels:
    app: payment-service
    version: v2
  serviceAccount: payment-sa
  network: vm-network
---
apiVersion: v1
kind: Service
metadata:
  name: payment-service
  namespace: production
spec:
  ports:
  - port: 8080
    name: http
    targetPort: 8080
  selector:
    app: payment-service
```

The Service selector matches the labels on the WorkloadEntry resources. This is how Istio knows that traffic for `payment-service` should go to those VMs.

## Applying Load Balancing Policies

By default, Istio uses round-robin load balancing. For VM workloads, you might want something different, especially if your VMs have varying capacity.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service-dr
  namespace: production
spec:
  host: payment-service.production.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
```

The `LEAST_REQUEST` algorithm works well for heterogeneous environments where some VMs might be busier than others. Other options include `ROUND_ROBIN`, `RANDOM`, and `PASSTHROUGH`.

For more granular control, you can use consistent hashing to ensure that requests from the same client always go to the same VM:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-sticky-dr
  namespace: production
spec:
  host: payment-service.production.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: x-user-id
```

## Traffic Splitting Between VM Versions

One of the most useful traffic patterns is canary deployments. If you have two versions of your service running on different VMs, you can gradually shift traffic between them.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service-vs
  namespace: production
spec:
  hosts:
  - payment-service
  http:
  - route:
    - destination:
        host: payment-service
        subset: v1
      weight: 90
    - destination:
        host: payment-service
        subset: v2
      weight: 10
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service-subsets
  namespace: production
spec:
  host: payment-service.production.svc.cluster.local
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

This sends 90% of traffic to VMs labeled `version: v1` and 10% to `version: v2`. The subset labels must match the labels on your WorkloadEntry resources.

## Circuit Breaking for VM Workloads

VMs can be less predictable than pods when it comes to availability. They might go through maintenance windows, have network blips, or experience hardware issues. Circuit breaking helps protect the rest of your mesh from cascading failures.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-circuit-breaker
  namespace: production
spec:
  host: payment-service.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 25
        http2MaxRequests: 100
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
      maxEjectionPercent: 50
```

The outlier detection configuration ejects a VM from the load balancing pool if it returns 5 consecutive 5xx errors. It stays ejected for at least 60 seconds before being reconsidered. The `maxEjectionPercent` makes sure you never eject more than half your backends at once.

## Retry Policies

Network issues between Kubernetes and VMs are more common than within a cluster. Setting up retries helps absorb transient failures:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-retries
  namespace: production
spec:
  hosts:
  - payment-service
  http:
  - route:
    - destination:
        host: payment-service
    retries:
      attempts: 3
      perTryTimeout: 5s
      retryOn: connect-failure,refused-stream,unavailable,cancelled,retriable-status-codes
      retryRemoteLocalities: true
```

The `retryRemoteLocalities` flag is particularly important for VM workloads. It tells Istio to retry on a different locality if the first attempt fails, which is useful when VMs are in different data centers.

## Timeout Policies

VMs might have different response time characteristics than pod-based services. Set appropriate timeouts:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-timeouts
  namespace: production
spec:
  hosts:
  - payment-service
  http:
  - route:
    - destination:
        host: payment-service
    timeout: 10s
```

## Locality-Aware Routing

If your VMs are spread across regions or zones, locality-aware routing can reduce latency by preferring nearby instances:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: WorkloadEntry
metadata:
  name: vm-us-east
  namespace: production
spec:
  address: 10.0.1.10
  labels:
    app: payment-service
    version: v1
  serviceAccount: payment-sa
  network: vm-network
  locality: us-east1/us-east1-b
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-locality
  namespace: production
spec:
  host: payment-service.production.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
        failover:
        - from: us-east1
          to: us-west2
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

The locality field on the WorkloadEntry follows the `region/zone/subzone` format. Istio will prefer routing to VMs in the same locality as the caller.

## Fault Injection for Testing

You can inject faults into traffic going to VM workloads to test resilience:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-fault-test
  namespace: production
spec:
  hosts:
  - payment-service
  http:
  - fault:
      delay:
        percentage:
          value: 10
        fixedDelay: 3s
      abort:
        percentage:
          value: 5
        httpStatus: 503
    route:
    - destination:
        host: payment-service
```

This injects a 3-second delay in 10% of requests and returns a 503 error for 5% of requests. It is a good way to verify that your retry and circuit breaking policies work correctly.

## Verifying Traffic Policies

After applying your policies, verify they are actually in effect:

```bash
# Check the DestinationRule is applied
kubectl get destinationrules -n production

# Verify Envoy has the correct configuration
istioctl proxy-config cluster <pod-or-vm-name> -n production | grep payment-service

# Check endpoints
istioctl proxy-config endpoint <pod-or-vm-name> -n production | grep payment-service

# Watch traffic flow in real time
istioctl dashboard kiali
```

Traffic policies for VM workloads follow the same patterns as pod-based services. The main differences are in the setup - making sure WorkloadEntry labels match your subset definitions, setting appropriate timeouts for cross-network communication, and using locality-aware routing when VMs are distributed across locations. Once the foundations are solid, all of Istio's traffic management features work exactly as expected.
