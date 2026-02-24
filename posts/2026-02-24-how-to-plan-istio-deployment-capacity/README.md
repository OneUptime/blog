# How to Plan Istio Deployment Capacity

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Capacity Planning, Service Mesh, Infrastructure

Description: A practical guide to planning Istio deployment capacity including resource estimation, cluster sizing, and workload analysis for production environments.

---

Deploying Istio into a production Kubernetes cluster without proper capacity planning is a recipe for headaches. The service mesh adds overhead to every pod, every request, and every node in your cluster. If you skip the planning step, you will end up with resource contention, throttled services, and possibly outages that are harder to debug than the ones Istio was supposed to help you prevent.

This guide walks through the key areas you need to think about when sizing your infrastructure for Istio.

## Understanding What Istio Adds to Your Cluster

Before you can plan capacity, you need to understand the components that Istio introduces:

- **istiod (control plane)**: Handles configuration distribution, certificate management, and service discovery.
- **Envoy sidecar proxies**: Injected into every pod that is part of the mesh. Each sidecar consumes CPU and memory.
- **Ingress/Egress gateways**: Handle traffic entering and leaving the mesh.
- **Telemetry pipeline**: Metrics, traces, and access logs all add processing and storage overhead.

Each of these components needs resources, and the total depends on your workload size, traffic volume, and configuration choices.

## Step 1: Inventory Your Current Workloads

Start by getting a clear picture of what you are running today. You need to know:

```bash
# Count total pods across all namespaces
kubectl get pods --all-namespaces --no-headers | wc -l

# Count deployments
kubectl get deployments --all-namespaces --no-headers | wc -l

# Get current resource requests and limits
kubectl describe nodes | grep -A 5 "Allocated resources"
```

Write down these numbers:

- Total number of pods
- Total number of services
- Average requests per second across your services
- Current CPU and memory utilization per node

## Step 2: Estimate Sidecar Overhead

Every pod in the mesh gets an Envoy sidecar. The baseline resource consumption for each sidecar is roughly:

- **Memory**: 50-100 MB at idle, scaling up with the number of endpoints and active connections
- **CPU**: 5-10 millicores at idle, scaling with request throughput

For a cluster with 200 pods, that means you need to budget an additional:

- Memory: 200 pods x 100 MB = 20 GB
- CPU: 200 pods x 10m = 2000m (2 full cores)

You can set these as resource requests in the sidecar injection template:

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
            cpu: 10m
            memory: 64Mi
          limits:
            cpu: 500m
            memory: 256Mi
```

These are starting points. You will need to adjust based on actual traffic patterns once the mesh is running.

## Step 3: Size the Control Plane

The istiod deployment handles configuration push to all sidecars, issues certificates, and runs the webhook for sidecar injection. Its resource needs scale primarily with:

- Number of pods in the mesh
- Number of services and endpoints
- Frequency of configuration changes

Here are rough sizing guidelines:

| Cluster Size | istiod CPU Request | istiod Memory Request | Replicas |
|---|---|---|---|
| < 100 pods | 500m | 512Mi | 1 |
| 100-500 pods | 1000m | 1Gi | 2 |
| 500-2000 pods | 2000m | 2Gi | 3 |
| 2000+ pods | 4000m | 4Gi | 3+ |

Configure these in your IstioOperator resource:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: "1000m"
            memory: "1Gi"
          limits:
            cpu: "2000m"
            memory: "2Gi"
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
          metrics:
            - type: Resource
              resource:
                name: cpu
                targetAverageUtilization: 80
```

## Step 4: Plan for Ingress Gateway Capacity

Ingress gateways handle all external traffic coming into your mesh. They need to be sized based on:

- Peak requests per second
- Connection concurrency
- TLS termination overhead (if applicable)

A single Envoy-based ingress gateway pod can typically handle 10,000-30,000 requests per second depending on payload size and TLS configuration. For production, always run at least 2 replicas:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          resources:
            requests:
              cpu: "500m"
              memory: "256Mi"
            limits:
              cpu: "2000m"
              memory: "1Gi"
          hpaSpec:
            minReplicas: 2
            maxReplicas: 10
            metrics:
              - type: Resource
                resource:
                  name: cpu
                  targetAverageUtilization: 70
```

## Step 5: Account for Telemetry Overhead

Istio generates metrics, distributed traces, and access logs. Each of these adds overhead:

- **Metrics**: Envoy exports metrics to Prometheus. Expect roughly 500 bytes per metric series per scrape interval. With 200 pods and default metrics, that is around 100,000 time series.
- **Traces**: If you enable distributed tracing with a 1% sampling rate, the storage impact is manageable. At 100% sampling, storage needs grow fast.
- **Access logs**: When enabled, each request generates a log entry. At 10,000 RPS, that is 864 million log entries per day.

Factor in the storage and compute needed for your observability stack (Prometheus, Jaeger, Loki, etc.) when planning capacity.

## Step 6: Calculate Total Additional Resources

Here is a worksheet approach for a cluster with 500 pods and 5,000 RPS:

```
Sidecar overhead:
  CPU: 500 pods x 50m average = 25,000m = 25 cores
  Memory: 500 pods x 128Mi average = 64 Gi

Control plane (istiod x 2 replicas):
  CPU: 2 x 1000m = 2 cores
  Memory: 2 x 1Gi = 2 Gi

Ingress gateway (3 replicas):
  CPU: 3 x 500m = 1.5 cores
  Memory: 3 x 256Mi = 768 Mi

Total additional resources needed:
  CPU: ~28.5 cores
  Memory: ~67 Gi
```

This means you need roughly 4-6 additional nodes (assuming 8-core, 32GB nodes) beyond what your workloads currently require.

## Step 7: Plan Node Pool Strategy

Consider creating dedicated node pools for Istio components:

```bash
# Example for GKE - create a node pool for system components
gcloud container node-pools create istio-system-pool \
  --cluster=my-cluster \
  --machine-type=e2-standard-4 \
  --num-nodes=3 \
  --node-labels=dedicated=istio-system \
  --node-taints=dedicated=istio-system:NoSchedule
```

Then use node affinity to schedule istiod and gateways on those nodes:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        affinity:
          nodeAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              nodeSelectorTerms:
                - matchExpressions:
                    - key: dedicated
                      operator: In
                      values:
                        - istio-system
        tolerations:
          - key: dedicated
            operator: Equal
            value: istio-system
            effect: NoSchedule
```

## Step 8: Build in Headroom

Never plan for exactly the resources you need. Kubernetes scheduling gets flaky when nodes are above 80% utilization, and Istio's resource usage can spike during configuration pushes or certificate rotations. Aim for 20-30% headroom on both CPU and memory across the cluster.

Also factor in rolling update scenarios where you temporarily have double the pods during a deployment. Your capacity plan should handle the peak, not just the steady state.

## Putting It All Together

Create a capacity planning document that includes:

1. Current workload inventory (pods, services, RPS)
2. Estimated sidecar resource overhead
3. Control plane sizing
4. Gateway sizing
5. Telemetry infrastructure requirements
6. Total additional resources needed
7. Node pool configuration
8. Growth projections for 6-12 months

Review and update this plan quarterly, or whenever you add significant new workloads to the mesh. Capacity planning is not a one-time exercise. As your mesh grows, your infrastructure needs to grow with it.
