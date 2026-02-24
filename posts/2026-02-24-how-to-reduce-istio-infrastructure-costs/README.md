# How to Reduce Istio Infrastructure Costs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Infrastructure, Cost Reduction, Kubernetes, Service Mesh

Description: Actionable techniques to lower the infrastructure costs of running Istio, from node sizing and gateway consolidation to ambient mode migration.

---

Running Istio adds infrastructure overhead that shows up directly on your cloud bill. Sidecar proxies consume CPU and memory on every node, gateways need their own compute resources, and the control plane requires dedicated capacity. If you are running a moderate-size cluster with 200-500 pods, the Istio tax can be $1,000-3,000/month in extra compute costs.

Most teams accept this as the price of having a service mesh. But a lot of that cost comes from over-provisioned defaults and architectural choices that can be changed.

## Audit Your Current Spend

Start by measuring what Istio actually costs you today. Collect these numbers:

```promql
# Total CPU reserved by sidecars (in cores)
sum(kube_pod_container_resource_requests{container="istio-proxy", resource="cpu"})

# Total memory reserved by sidecars (in GB)
sum(kube_pod_container_resource_requests{container="istio-proxy", resource="memory"}) / 1024 / 1024 / 1024

# Control plane CPU reservation
sum(kube_pod_container_resource_requests{namespace="istio-system", resource="cpu"})

# Control plane memory reservation
sum(kube_pod_container_resource_requests{namespace="istio-system", resource="memory"}) / 1024 / 1024 / 1024
```

Convert the CPU and memory numbers to your cloud provider's pricing. For example, on AWS with m5.xlarge instances ($0.192/hour), each core of reserved CPU costs roughly $140/month.

## Consolidate Ingress Gateways

Many teams deploy multiple ingress gateways for different environments or teams. Each gateway is a separate Envoy deployment with its own pods and load balancer.

Consolidate where possible:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: shared-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https-team-a
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: team-a-cert
    hosts:
    - "team-a.example.com"
  - port:
      number: 443
      name: https-team-b
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: team-b-cert
    hosts:
    - "team-b.example.com"
```

A single gateway can handle multiple hosts with different TLS certificates. You save one entire deployment and one cloud load balancer ($15-20/month on most providers) for each gateway you eliminate.

## Right-Size Gateway Pods

Gateways are often over-provisioned. Check actual usage:

```bash
kubectl top pods -n istio-system -l app=istio-ingressgateway --containers
```

Then adjust resources to match:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      k8s:
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: "1"
            memory: 512Mi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
          metrics:
          - type: Resource
            resource:
              name: cpu
              target:
                type: Utilization
                averageUtilization: 70
```

Use HPA to scale gateways based on actual load rather than provisioning for peak capacity all the time.

## Remove the Egress Gateway if You Do Not Need It

Egress gateways are required for strict outbound traffic control. If you do not have compliance requirements mandating egress control, you can remove it:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    egressGateways:
    - name: istio-egressgateway
      enabled: false
```

That saves the resources of 1-2 pods plus a service. If you later need egress control, you can add it back.

## Use Discovery Selectors

By default, istiod watches every namespace in the cluster and processes every service. If you only use Istio in a subset of namespaces, use discovery selectors to reduce the control plane's workload:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    discoverySelectors:
    - matchLabels:
        istio-injection: enabled
```

This means istiod only watches namespaces labeled with `istio-injection=enabled`. It stops processing resources in monitoring, logging, CI/CD, and other namespaces that do not participate in the mesh.

The result is lower CPU and memory usage for istiod, and smaller xDS configuration pushes to sidecars.

## Optimize Node Sizing

Sidecars add a fixed CPU and memory overhead to every pod. This changes the optimal node size for your cluster.

Consider a pod that requests 500m CPU and 512Mi memory. With a sidecar requesting 100m CPU and 128Mi memory, the total is 600m and 640Mi. That is a 20% increase in resources per pod.

If your nodes are small (4 CPU, 16 GB), the sidecar overhead is more noticeable because you fit fewer pods per node. Larger nodes (8 CPU, 32 GB) amortize the per-node overhead better.

Run the numbers for your workload. Sometimes switching to larger instance types and running fewer nodes saves money because you waste less capacity on fragmentation.

## Turn Off Features You Do Not Use

Every Istio feature has a cost. Access logging consumes CPU for serialization and I/O. Tracing adds headers and sends spans to collectors. Protocol detection on every connection costs CPU cycles.

Be aggressive about disabling unused features:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: ""
    enableTracing: false
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "false"
```

If you need tracing, keep sampling low:

```yaml
meshConfig:
  enableTracing: true
  defaultConfig:
    tracing:
      sampling: 1.0
```

## Use Spot/Preemptible Instances for Non-Critical Workloads

If your mesh includes development and staging environments, run those on spot instances. Istio handles pod restarts gracefully since sidecars reconnect to the control plane automatically.

Configure node affinity to run Istio system components on on-demand instances while allowing application workloads (with sidecars) on spot:

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
                - key: node-lifecycle
                  operator: In
                  values:
                  - on-demand
```

## Consider Ambient Mode for L4 Workloads

Ambient mode replaces per-pod sidecars with per-node ztunnel proxies. For workloads that only need mTLS and basic L4 traffic management, this eliminates sidecar overhead entirely:

```bash
kubectl label namespace low-traffic-services istio.io/dataplane-mode=ambient
```

The ztunnel runs as a DaemonSet, so you pay a fixed cost per node instead of a per-pod cost. For namespaces with many small pods, the savings can be 70-80%.

For workloads that need L7 features (header-based routing, retries, circuit breakers), deploy waypoint proxies only where needed:

```bash
istioctl waypoint apply -n high-traffic-services --enroll-namespace
```

This gives you L7 processing only for namespaces that need it, and pure L4 mTLS for everything else.

## Batch Control Plane Configuration Updates

If you frequently deploy services (multiple times per hour), istiod processes configuration updates for every change. This consumes CPU and triggers xDS pushes to all sidecars.

Tune the debounce settings to batch updates:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        env:
        - name: PILOT_DEBOUNCE_AFTER
          value: "500ms"
        - name: PILOT_DEBOUNCE_MAX
          value: "5s"
```

This batches rapid configuration changes into fewer, larger pushes, reducing control plane CPU usage during active deployment periods.

## Summary

Reducing Istio infrastructure costs is a systematic process. Audit what you are spending, right-size resources based on measurements, eliminate unused components and features, and consider ambient mode for workloads that do not need L7 processing. Most teams can cut their Istio infrastructure costs by 40-60% without losing any functionality they actually use.
