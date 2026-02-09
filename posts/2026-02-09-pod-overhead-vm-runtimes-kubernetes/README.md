# How to Use Pod Overhead for Virtual Machine-Based Runtimes in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Virtualization, Resources

Description: Learn how to configure Pod Overhead in Kubernetes for VM-based container runtimes like Kata Containers and gVisor to accurately account for additional resource consumption beyond application containers.

---

Virtual machine-based container runtimes provide stronger isolation than standard containers by running each pod in a lightweight VM. This additional security comes with overhead, consuming memory and CPU beyond what your application containers use. Pod Overhead lets Kubernetes account for this extra resource consumption.

Without Pod Overhead configuration, the scheduler might place too many VM-based pods on a node, leading to resource exhaustion. Understanding and configuring Pod Overhead ensures accurate resource accounting and stable cluster operations when using secure container runtimes.

## Understanding Pod Overhead

When you run containers with standard runtimes like containerd or CRI-O, the only significant resource consumption comes from your application containers. But VM-based runtimes like Kata Containers, gVisor, or Firecracker create additional processes that consume resources.

These runtimes might start a QEMU process, a VM kernel, or security sandbox processes. Each consumes memory and CPU. Pod Overhead tells Kubernetes about these additional resources so it can make better scheduling decisions.

Without Pod Overhead, Kubernetes only considers container requests when scheduling. With Pod Overhead, it adds the overhead to the container requests, giving a more accurate picture of total pod resource needs.

## How Pod Overhead Works

Pod Overhead is defined in RuntimeClass resources. When you create a pod using a RuntimeClass with defined overhead, Kubernetes automatically adds the overhead values to the pod's resource requirements.

The scheduler uses the combined value (container requests plus overhead) when deciding which node can run the pod. The kubelet uses it when determining if the node has enough resources to admit the pod. Resource quotas and limits apply to the combined value as well.

This happens transparently. You specify overhead once in the RuntimeClass, and every pod using that RuntimeClass gets the overhead automatically.

## Configuring RuntimeClass with Overhead

Define a RuntimeClass with Pod Overhead for Kata Containers:

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: kata-containers
handler: kata
overhead:
  podFixed:
    memory: "130Mi"
    cpu: "250m"
```

This tells Kubernetes that every pod using the Kata Containers runtime needs an additional 130Mi memory and 0.25 CPU for the VM overhead.

For gVisor:

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor
handler: runsc
overhead:
  podFixed:
    memory: "50Mi"
    cpu: "100m"
```

gVisor typically has lower overhead than full VM runtimes.

Apply the RuntimeClass:

```bash
kubectl apply -f runtimeclass.yaml
```

## Using Pods with Overhead

Create a pod that uses the RuntimeClass with overhead:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  runtimeClassName: kata-containers
  containers:
  - name: app
    image: nginx
    resources:
      requests:
        memory: "512Mi"
        cpu: "500m"
      limits:
        memory: "1Gi"
        cpu: "1000m"
```

Kubernetes will schedule this pod considering a total requirement of:
- Memory: 512Mi (container) + 130Mi (overhead) = 642Mi
- CPU: 500m (container) + 250m (overhead) = 750m

Check the pod's effective resource requirements:

```bash
kubectl get pod secure-pod -o jsonpath='{.spec.overhead}'
```

Output:
```json
{"cpu":"250m","memory":"130Mi"}
```

View the combined resource requirements:

```bash
kubectl describe pod secure-pod
```

Look for the "Overhead" section in the output.

## Calculating Appropriate Overhead Values

Determining the right overhead values requires testing your specific runtime and workload patterns.

Run a pod with your runtime and measure its baseline resource consumption:

```bash
# Create a minimal pod
kubectl run test-overhead --image=nginx --restart=Never --overrides='
{
  "spec": {
    "runtimeClassName": "kata-containers"
  }
}'

# Wait for it to start
kubectl wait --for=condition=Ready pod/test-overhead

# Check resource usage
kubectl top pod test-overhead
```

Note the total memory and CPU usage. Subtract your application's known consumption to estimate overhead.

For more accurate measurements, use node metrics:

```bash
# Before creating pod
kubectl top node worker-node-1

# Create pod on specific node
kubectl run test-overhead --image=nginx --overrides='
{
  "spec": {
    "runtimeClassName": "kata-containers",
    "nodeName": "worker-node-1"
  }
}'

# After pod is running
kubectl top node worker-node-1
```

The difference in node resource consumption minus container requests approximates the overhead.

Repeat this with different workloads to find average overhead values. Use conservative (higher) estimates to avoid scheduling failures.

## Real-World RuntimeClass Configurations

Kata Containers configuration for production:

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: kata-production
handler: kata
overhead:
  podFixed:
    memory: "130Mi"
    cpu: "250m"
scheduling:
  nodeSelector:
    runtime: kata
  tolerations:
  - key: "kata-runtime"
    operator: "Exists"
```

This configuration includes node selection to ensure pods only run on nodes with Kata installed.

gVisor configuration with minimal overhead:

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor-secure
handler: runsc
overhead:
  podFixed:
    memory: "50Mi"
    cpu: "100m"
scheduling:
  nodeSelector:
    gvisor: enabled
```

Firecracker microVM configuration:

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: firecracker
handler: firecracker-containerd
overhead:
  podFixed:
    memory: "200Mi"
    cpu: "300m"
```

## Impact on Scheduling

Pod Overhead affects scheduler decisions. Consider this scenario:

A node has 4Gi memory available. Without overhead:

```yaml
# Pod 1: 2Gi request
# Pod 2: 2Gi request
# Total: 4Gi - Both pods can fit
```

With 130Mi overhead per pod:

```yaml
# Pod 1: 2Gi request + 130Mi overhead = 2.13Gi
# Pod 2: 2Gi request + 130Mi overhead = 2.13Gi
# Total: 4.26Gi - Cannot fit both pods
```

The scheduler will only place one pod on this node.

View scheduler decisions:

```bash
kubectl get events --field-selector reason=FailedScheduling
```

You might see messages about insufficient resources due to overhead.

## Overhead and Resource Quotas

ResourceQuotas include Pod Overhead in their calculations:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: namespace-quota
  namespace: production
spec:
  hard:
    requests.memory: "10Gi"
    requests.cpu: "5000m"
    limits.memory: "20Gi"
    limits.cpu: "10000m"
```

If you create pods with overhead in this namespace, the quota counts container requests plus overhead.

Example:
```yaml
# Container requests: 1Gi memory
# Pod overhead: 130Mi
# Quota consumption: 1.13Gi
```

This prevents users from accidentally exceeding quotas by using high-overhead runtimes.

## Multi-Container Pods with Overhead

Overhead is applied once per pod, not per container:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-container-secure
spec:
  runtimeClassName: kata-containers
  containers:
  - name: app
    image: nginx
    resources:
      requests:
        memory: "256Mi"
        cpu: "250m"
  - name: sidecar
    image: sidecar
    resources:
      requests:
        memory: "128Mi"
        cpu: "100m"
```

Total resource requirements:
- Memory: 256Mi + 128Mi (containers) + 130Mi (overhead) = 514Mi
- CPU: 250m + 100m (containers) + 250m (overhead) = 600m

The overhead is added once, not twice.

## Monitoring Overhead Impact

Track overhead impact on cluster capacity:

```bash
# See all pods with overhead
kubectl get pods -A -o json | jq -r '.items[] | select(.spec.overhead != null) | {name: .metadata.name, overhead: .spec.overhead}'
```

Calculate total overhead across namespace:

```bash
kubectl get pods -n production -o json | jq '[.items[] | select(.spec.overhead.memory != null) | .spec.overhead.memory | rtrimstr("Mi") | tonumber] | add'
```

Create alerts for high overhead consumption:

```yaml
# PrometheusRule
groups:
- name: overhead-alerts
  rules:
  - alert: HighOverheadUsage
    expr: |
      sum(kube_pod_overhead{resource="memory"}) by (node) > 4000000000
    annotations:
      summary: "Node {{ $labels.node }} has high Pod Overhead"
```

## Troubleshooting Overhead Issues

If pods fail to schedule with overhead configured, check node capacity:

```bash
kubectl describe node worker-node-1
```

Look at "Allocated resources" to see if overhead is pushing the node over capacity.

Verify RuntimeClass exists and is correct:

```bash
kubectl get runtimeclass kata-containers -o yaml
```

Check that the overhead values are appropriate.

Test without overhead to confirm it is the cause:

```bash
# Temporarily remove overhead
kubectl edit runtimeclass kata-containers
# Delete the overhead section

# Try scheduling the pod again
kubectl apply -f pod.yaml
```

If the pod schedules successfully, the overhead values might be too high.

## Best Practices

Measure overhead empirically for your specific runtime and workload patterns. Do not rely on default values.

Set conservative overhead estimates. Slightly overestimating is better than underestimating and causing node resource exhaustion.

Use separate RuntimeClasses for different workload types if overhead varies:

```yaml
# Low-overhead for web apps
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: kata-web
handler: kata
overhead:
  podFixed:
    memory: "100Mi"
    cpu: "200m"

---
# Higher overhead for batch jobs with more VM resources
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: kata-batch
handler: kata
overhead:
  podFixed:
    memory: "200Mi"
    cpu: "400m"
```

Document your overhead calculations and review them periodically. Runtime versions and configurations change, affecting overhead.

Test Pod Overhead changes in development before applying to production. Changing overhead can affect scheduling for existing pods.

## Combining with Other Features

Pod Overhead works with other Kubernetes features:

Vertical Pod Autoscaler considers overhead:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: secure-app
  updatePolicy:
    updateMode: "Auto"
```

VPA recommendations include overhead in its calculations.

Horizontal Pod Autoscaler uses metrics that reflect total resource usage (container plus overhead):

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: secure-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Performance Considerations

Pod Overhead impacts cluster efficiency. Higher overhead means fewer pods per node.

Calculate maximum pod density with overhead:

```bash
# Node capacity: 16Gi memory
# Pod request: 1Gi
# Pod overhead: 130Mi

# Without overhead: 16 pods per node
# With overhead: ~14 pods per node (16000 / 1130 ≈ 14.15)
```

This reduction in density is the cost of improved isolation and security.

Consider this trade-off when choosing runtimes. Standard containers offer higher density. VM-based runtimes offer better security with lower density.

For cost-sensitive workloads, standard runtimes might be more economical. For security-sensitive workloads, the overhead cost is justified.

## Conclusion

Pod Overhead ensures accurate resource accounting when using VM-based container runtimes. Configure overhead values in RuntimeClasses based on empirical measurements of your specific runtime and workloads.

Use Pod Overhead to prevent resource exhaustion and scheduling failures in clusters running secure container runtimes. Monitor overhead impact on cluster capacity and adjust as needed.

Combine Pod Overhead with resource quotas, autoscaling, and monitoring for comprehensive resource management. Balance the security benefits of VM-based runtimes against their overhead costs.

Master Pod Overhead configuration to run secure, isolated workloads efficiently in Kubernetes.
