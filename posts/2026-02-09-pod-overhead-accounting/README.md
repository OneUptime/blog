# How to Configure Pod Overhead for Accurate Resource Accounting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Resource Management, Runtime

Description: Learn how to configure pod overhead in Kubernetes to account for runtime resource consumption and ensure accurate resource allocation for containers using alternative runtimes.

---

Container runtimes consume resources beyond what your application uses. A pod requesting 1 CPU and 1Gi memory actually requires additional overhead for the runtime itself. Without accounting for this overhead, nodes become overcommitted, leading to performance degradation and scheduling failures. Pod overhead configuration ensures accurate resource accounting.

Standard container runtimes like containerd or CRI-O have minimal overhead, but alternative runtimes like gVisor, Kata Containers, or Firecracker add significant resource requirements for enhanced isolation. Pod overhead explicitly declares these costs so the scheduler accounts for them.

## Understanding Pod Overhead

Pod overhead represents resources consumed by the pod sandbox and runtime infrastructure, separate from container resource requests. This includes:

- Runtime processes (like gVisor's runsc or Kata's containerd-shim-kata-v2)
- VM overhead for VM-based runtimes (Kata Containers, Firecracker)
- Network proxy processes
- Storage drivers

Without overhead configuration, a pod requesting 512Mi memory might actually consume 712Mi when you include runtime overhead. The scheduler sees only the 512Mi request, leading to node overcommitment.

## Defining RuntimeClass with Overhead

RuntimeClass lets you specify different container runtimes and their associated overhead:

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor
handler: runsc
overhead:
  podFixed:
    cpu: "250m"
    memory: "128Mi"
---
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: kata-containers
handler: kata
overhead:
  podFixed:
    cpu: "500m"
    memory: "256Mi"
---
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: firecracker
handler: fc
overhead:
  podFixed:
    cpu: "100m"
    memory: "64Mi"
```

The `podFixed` overhead is added once per pod, not per container. A pod with three containers and 250m overhead still only incurs 250m total overhead.

## Using RuntimeClass in Pods

Reference the RuntimeClass in pod specs:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
spec:
  runtimeClassName: gvisor
  containers:
  - name: app
    image: secure-app:latest
    resources:
      requests:
        cpu: "500m"
        memory: "512Mi"
      limits:
        cpu: "1000m"
        memory: "1Gi"
```

The scheduler sees this pod requires:
- Container requests: 500m CPU, 512Mi memory
- Runtime overhead: 250m CPU, 128Mi memory
- Total scheduling requirement: 750m CPU, 640Mi memory

The kubelet allocates the full 750m and 640Mi on the node, preventing overcommitment.

## Measuring Actual Runtime Overhead

Determine appropriate overhead values by measuring actual runtime consumption:

```bash
# Deploy a test pod with the runtime
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: overhead-test
  labels:
    app: overhead-test
spec:
  runtimeClassName: gvisor
  containers:
  - name: stress
    image: polinux/stress
    command: ["sleep", "3600"]
    resources:
      requests:
        cpu: "1000m"
        memory: "1Gi"
EOF

# Wait for pod to start
kubectl wait --for=condition=Ready pod/overhead-test

# Measure actual memory usage on the node
NODE=$(kubectl get pod overhead-test -o jsonpath='{.spec.nodeName}')
kubectl debug node/$NODE -it --image=ubuntu -- bash -c "
  apt-get update && apt-get install -y sysstat
  # Find processes related to the pod
  ps aux | grep overhead-test
  # Measure memory of runtime processes
  pmap -x \$(pgrep -f overhead-test | head -1) | tail -1
"

# Query Prometheus for container overhead
kubectl exec -n monitoring prometheus-0 -- promtool query instant \
  'container_memory_working_set_bytes{pod="overhead-test",container=""}'
```

The container with an empty name ("") in Prometheus metrics represents the pod sandbox overhead.

## Configuring Overhead for Different Workload Types

Different workload patterns have different overhead characteristics:

```yaml
# Lightweight runtime for trusted workloads
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: standard
handler: runc
overhead:
  podFixed:
    cpu: "10m"
    memory: "16Mi"
---
# Medium security for multi-tenant workloads
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor
handler: runsc
overhead:
  podFixed:
    cpu: "250m"
    memory: "128Mi"
scheduling:
  nodeSelector:
    runtime: gvisor
---
# High security for untrusted workloads
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: kata-fc
handler: kata-fc
overhead:
  podFixed:
    cpu: "750m"
    memory: "512Mi"
scheduling:
  nodeSelector:
    runtime: kata
  tolerations:
  - key: kata-runtime
    operator: Exists
```

The `scheduling` section ensures pods using specific runtimes land on appropriately configured nodes.

## Impact on Resource Requests and Limits

Pod overhead affects scheduling but not cgroup limits:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
spec:
  runtimeClassName: gvisor  # 250m CPU, 128Mi memory overhead
  containers:
  - name: app
    image: app:latest
    resources:
      requests:
        cpu: "500m"      # Scheduler sees 750m (500m + 250m)
        memory: "512Mi"  # Scheduler sees 640Mi (512Mi + 128Mi)
      limits:
        cpu: "1000m"     # Container still gets 1000m limit
        memory: "1Gi"    # Container still gets 1Gi limit
```

The overhead is reserved on the node but doesn't reduce container limits. The container can still use its full limit allocation.

## Monitoring Overhead Accuracy

Create alerts when actual overhead deviates from configured values:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: overhead-alerts
  namespace: monitoring
spec:
  groups:
  - name: pod-overhead
    rules:
    - alert: ActualOverheadExceedsConfigured
      expr: |
        (
          container_memory_working_set_bytes{container=""}
          >
          kube_pod_overhead{resource="memory"} * 1.2
        )
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} overhead exceeds configured value"
        description: "Actual: {{ $value }}, configured overhead may be too low"

    - alert: NodeOvercommittedDueToOverhead
      expr: |
        sum(kube_pod_overhead{resource="memory"}) by (node)
        /
        sum(kube_node_status_allocatable{resource="memory"}) by (node)
        > 0.2
      for: 5m
      labels:
        severity: info
      annotations:
        summary: "Node {{ $labels.node }} has >20% capacity consumed by pod overhead"
```

## Accounting for Overhead in Capacity Planning

Include overhead in capacity calculations:

```bash
# Calculate total overhead per namespace
kubectl get pods --all-namespaces -o json | jq -r '
  .items[] |
  select(.spec.overhead != null) |
  {
    namespace: .metadata.namespace,
    pod: .metadata.name,
    cpu_overhead: .spec.overhead.cpu,
    memory_overhead: .spec.overhead.memory
  }
' | jq -s 'group_by(.namespace) | map({
  namespace: .[0].namespace,
  total_pods: length,
  total_cpu_overhead: map(.cpu_overhead | gsub("m";"") | tonumber) | add,
  total_memory_overhead: map(.memory_overhead | gsub("Mi";"") | tonumber) | add
})'
```

This shows how much cluster capacity is consumed by runtime overhead rather than application workloads.

## Overhead with Multiple Containers

Pod overhead is per-pod, not per-container:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-container
spec:
  runtimeClassName: gvisor  # 250m CPU, 128Mi memory overhead
  containers:
  - name: app
    image: app:latest
    resources:
      requests:
        cpu: "500m"
        memory: "512Mi"
  - name: sidecar
    image: sidecar:latest
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
  # Total scheduler sees:
  # CPU: 500m + 100m + 250m = 850m
  # Memory: 512Mi + 128Mi + 128Mi = 768Mi
```

The 250m/128Mi overhead is added once, regardless of container count. This makes multi-container pods more efficient from an overhead perspective.

## RuntimeClass Scheduling Constraints

Use scheduling constraints to ensure runtime-capable nodes:

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: kata-containers
handler: kata
overhead:
  podFixed:
    cpu: "500m"
    memory: "256Mi"
scheduling:
  nodeSelector:
    kata-runtime: "true"
  tolerations:
  - key: kata
    operator: Exists
    effect: NoSchedule
```

Label and taint nodes appropriately:

```bash
# Label nodes with kata runtime support
kubectl label nodes node-1 node-2 kata-runtime=true

# Taint nodes to prevent non-kata pods
kubectl taint nodes node-1 node-2 kata=true:NoSchedule
```

Pods using the kata-containers RuntimeClass automatically get the node selector and toleration, ensuring they land on compatible nodes.

## Overhead with Service Meshes

Service mesh sidecars add their own overhead:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mesh-app
  annotations:
    sidecar.istio.io/proxyCPU: "100m"
    sidecar.istio.io/proxyMemory: "128Mi"
spec:
  runtimeClassName: gvisor  # 250m CPU, 128Mi memory overhead
  containers:
  - name: app
    image: app:latest
    resources:
      requests:
        cpu: "500m"
        memory: "512Mi"
  # Istio automatically injects:
  # - envoy sidecar: ~100m CPU, ~128Mi memory
  # - init container overhead
  # Total overhead: runtime (250m/128Mi) + sidecar (100m/128Mi) = 350m/256Mi
```

RuntimeClass overhead and sidecar overhead compound. Account for both in resource planning.

## Default RuntimeClass

Set a default RuntimeClass for all pods without explicit runtimeClassName:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubelet-config
  namespace: kube-system
data:
  kubelet: |
    apiVersion: kubelet.config.k8s.io/v1beta1
    kind: KubeletConfiguration
    runtimeClass:
      default: standard
```

This ensures even pods without explicit RuntimeClass configuration get proper overhead accounting.

## Validating Overhead Configuration

Create a validation script to test overhead accuracy:

```bash
#!/bin/bash

RUNTIME_CLASS="gvisor"
TEST_POD="overhead-validation"

# Deploy test pod
kubectl run $TEST_POD --image=nginx --overrides="
{
  \"spec\": {
    \"runtimeClassName\": \"$RUNTIME_CLASS\",
    \"containers\": [{
      \"name\": \"nginx\",
      \"image\": \"nginx\",
      \"resources\": {
        \"requests\": {\"cpu\": \"100m\", \"memory\": \"128Mi\"}
      }
    }]
  }
}
"

# Wait for ready
kubectl wait --for=condition=Ready pod/$TEST_POD --timeout=60s

# Get configured overhead
CONFIGURED_MEMORY=$(kubectl get runtimeclass $RUNTIME_CLASS -o jsonpath='{.overhead.podFixed.memory}')

# Get actual overhead from metrics
ACTUAL_MEMORY=$(kubectl exec -n monitoring prometheus-0 -- promtool query instant \
  "container_memory_working_set_bytes{pod=\"$TEST_POD\",container=\"\"}" | \
  grep -oP '\d+' | tail -1)

echo "Configured overhead: $CONFIGURED_MEMORY"
echo "Actual overhead: $((ACTUAL_MEMORY / 1024 / 1024))Mi"

# Cleanup
kubectl delete pod $TEST_POD
```

Run this periodically to ensure overhead values remain accurate as runtimes evolve.

## Conclusion

Pod overhead configuration provides accurate resource accounting for alternative container runtimes. By defining RuntimeClasses with appropriate overhead values, implementing scheduling constraints, and monitoring actual overhead consumption, you ensure the scheduler makes informed placement decisions that account for total resource requirements, not just application requests. This prevents node overcommitment and maintains cluster stability when using enhanced security runtimes like gVisor or Kata Containers.
