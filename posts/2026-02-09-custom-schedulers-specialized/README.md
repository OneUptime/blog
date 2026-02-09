# How to Implement Custom Schedulers for Specialized Placement Logic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, Go, Advanced

Description: Learn how to build custom Kubernetes schedulers in Go for specialized pod placement logic including GPU-aware scheduling, cost optimization, and application-specific constraints.

---

The default Kubernetes scheduler handles most pod placement scenarios effectively. However, some workloads have unique requirements that need specialized scheduling logic. Building a custom scheduler lets you implement placement strategies tailored to your specific needs.

Custom schedulers are separate processes that watch for unscheduled pods and make placement decisions based on custom algorithms. They run alongside the default scheduler, allowing you to use different scheduling logic for different workloads without modifying core Kubernetes components.

This guide shows you how to build custom schedulers using the Kubernetes scheduling framework. We'll cover the architecture, implement practical examples, and discuss best practices for production deployments.

## Understanding the Scheduling Framework

The Kubernetes scheduling framework provides extension points where you can inject custom logic. These extension points are called plugins, and they run at different stages of the scheduling cycle.

The scheduling cycle has several phases. The queue sort phase orders pods waiting to be scheduled. The pre-filter phase performs preliminary checks. The filter phase eliminates unsuitable nodes. The score phase ranks remaining nodes. Finally, the bind phase assigns the pod to the selected node.

Each phase has a corresponding plugin interface. Your custom scheduler implements these interfaces to inject specialized logic. The framework handles the infrastructure concerns like watching for new pods, caching node information, and updating the API server.

## Setting Up the Custom Scheduler Project

Start by creating a Go project with the necessary Kubernetes dependencies:

```go
// go.mod
module github.com/yourorg/custom-scheduler

go 1.21

require (
    k8s.io/api v0.29.0
    k8s.io/apimachinery v0.29.0
    k8s.io/client-go v0.29.0
    k8s.io/component-base v0.29.0
    k8s.io/kube-scheduler v0.29.0
    k8s.io/kubernetes v1.29.0
)
```

The main scheduler entry point initializes the framework and registers your plugins:

```go
// main.go
package main

import (
    "os"

    "k8s.io/component-base/cli"
    "k8s.io/kubernetes/cmd/kube-scheduler/app"

    // Import your custom plugins
    "github.com/yourorg/custom-scheduler/plugins"
)

func main() {
    // Register custom plugins with the scheduler framework
    command := app.NewSchedulerCommand(
        app.WithPlugin(plugins.GPUAwareName, plugins.NewGPUAwarePlugin),
        app.WithPlugin(plugins.CostOptimizedName, plugins.NewCostOptimizedPlugin),
    )

    code := cli.Run(command)
    os.Exit(code)
}
```

## Implementing a GPU-Aware Scheduling Plugin

Machine learning workloads often need specialized GPU placement. This custom plugin considers GPU memory, GPU-to-GPU bandwidth, and GPU utilization when scoring nodes:

```go
// plugins/gpuaware.go
package plugins

import (
    "context"
    "fmt"

    v1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/kube-scheduler/framework"
)

const (
    GPUAwareName = "GPUAware"
    // Minimum GPU memory required (in GB)
    MinGPUMemory = 8
)

type GPUAwarePlugin struct {
    handle framework.Handle
}

func NewGPUAwarePlugin(obj runtime.Object, handle framework.Handle) (framework.Plugin, error) {
    return &GPUAwarePlugin{
        handle: handle,
    }, nil
}

func (g *GPUAwarePlugin) Name() string {
    return GPUAwareName
}

// Filter eliminates nodes that don't meet GPU requirements
func (g *GPUAwarePlugin) Filter(
    ctx context.Context,
    state *framework.CycleState,
    pod *v1.Pod,
    nodeInfo *framework.NodeInfo,
) *framework.Status {
    // Check if pod requests GPU
    gpuRequest := getGPURequest(pod)
    if gpuRequest == 0 {
        return framework.NewStatus(framework.Success)
    }

    node := nodeInfo.Node()
    if node == nil {
        return framework.NewStatus(framework.Error, "node not found")
    }

    // Get GPU capacity from node
    gpuCapacity := getGPUCapacity(node)
    gpuAllocated := getGPUAllocated(nodeInfo)
    gpuAvailable := gpuCapacity - gpuAllocated

    if gpuAvailable < gpuRequest {
        return framework.NewStatus(
            framework.Unschedulable,
            fmt.Sprintf("insufficient GPU: need %d, available %d", gpuRequest, gpuAvailable),
        )
    }

    // Check GPU memory availability
    gpuMemory := getGPUMemory(node)
    if gpuMemory < MinGPUMemory {
        return framework.NewStatus(
            framework.Unschedulable,
            fmt.Sprintf("insufficient GPU memory: need %dGB, available %dGB", MinGPUMemory, gpuMemory),
        )
    }

    return framework.NewStatus(framework.Success)
}

// Score ranks nodes based on GPU characteristics
func (g *GPUAwarePlugin) Score(
    ctx context.Context,
    state *framework.CycleState,
    pod *v1.Pod,
    nodeName string,
) (int64, *framework.Status) {
    nodeInfo, err := g.handle.SnapshotSharedLister().NodeInfos().Get(nodeName)
    if err != nil {
        return 0, framework.NewStatus(framework.Error, err.Error())
    }

    node := nodeInfo.Node()
    score := int64(0)

    // Factor 1: GPU utilization (prefer less utilized nodes)
    gpuCapacity := getGPUCapacity(node)
    gpuAllocated := getGPUAllocated(nodeInfo)
    if gpuCapacity > 0 {
        utilizationPct := (gpuAllocated * 100) / gpuCapacity
        score += (100 - utilizationPct) * 2 // Weight: 2x
    }

    // Factor 2: GPU memory (prefer more memory)
    gpuMemory := getGPUMemory(node)
    score += gpuMemory * 3 // Weight: 3x

    // Factor 3: GPU interconnect (prefer NVLink topology)
    if hasNVLink(node) {
        score += 100 // Bonus for NVLink
    }

    // Factor 4: GPU generation (prefer newer GPUs)
    gpuGen := getGPUGeneration(node)
    score += gpuGen * 10

    return score, framework.NewStatus(framework.Success)
}

// Helper functions to extract GPU information from nodes
func getGPURequest(pod *v1.Pod) int64 {
    var total int64
    for _, container := range pod.Spec.Containers {
        if val, ok := container.Resources.Requests["nvidia.com/gpu"]; ok {
            total += val.Value()
        }
    }
    return total
}

func getGPUCapacity(node *v1.Node) int64 {
    if val, ok := node.Status.Capacity["nvidia.com/gpu"]; ok {
        return val.Value()
    }
    return 0
}

func getGPUAllocated(nodeInfo *framework.NodeInfo) int64 {
    var allocated int64
    for _, podInfo := range nodeInfo.Pods {
        pod := podInfo.Pod
        for _, container := range pod.Spec.Containers {
            if val, ok := container.Resources.Requests["nvidia.com/gpu"]; ok {
                allocated += val.Value()
            }
        }
    }
    return allocated
}

func getGPUMemory(node *v1.Node) int64 {
    // Read from node labels or annotations
    if val, ok := node.Labels["gpu-memory-gb"]; ok {
        // Parse the value and return
        // Implementation depends on your labeling scheme
        return parseMemoryValue(val)
    }
    return 0
}

func hasNVLink(node *v1.Node) bool {
    val, ok := node.Labels["gpu-interconnect"]
    return ok && val == "nvlink"
}

func getGPUGeneration(node *v1.Node) int64 {
    if val, ok := node.Labels["gpu-generation"]; ok {
        // Extract generation number (e.g., "a100" -> 8, "h100" -> 9)
        return parseGPUGeneration(val)
    }
    return 0
}

func parseMemoryValue(val string) int64 {
    // Simplified parsing - implement proper parsing
    return 16 // Default to 16GB
}

func parseGPUGeneration(val string) int64 {
    genMap := map[string]int64{
        "v100": 7,
        "a100": 8,
        "h100": 9,
    }
    if gen, ok := genMap[val]; ok {
        return gen
    }
    return 0
}
```

## Implementing a Cost-Optimized Scheduling Plugin

For workloads that can tolerate variable performance, cost-optimized scheduling can significantly reduce cloud expenses. This plugin prefers spot instances and cheaper instance types:

```go
// plugins/costoptimized.go
package plugins

import (
    "context"
    "strconv"

    v1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/kube-scheduler/framework"
)

const CostOptimizedName = "CostOptimized"

type CostOptimizedPlugin struct {
    handle framework.Handle
}

func NewCostOptimizedPlugin(obj runtime.Object, handle framework.Handle) (framework.Plugin, error) {
    return &CostOptimizedPlugin{
        handle: handle,
    }, nil
}

func (c *CostOptimizedPlugin) Name() string {
    return CostOptimizedName
}

func (c *CostOptimizedPlugin) Score(
    ctx context.Context,
    state *framework.CycleState,
    pod *v1.Pod,
    nodeName string,
) (int64, *framework.Status) {
    nodeInfo, err := c.handle.SnapshotSharedLister().NodeInfos().Get(nodeName)
    if err != nil {
        return 0, framework.NewStatus(framework.Error, err.Error())
    }

    node := nodeInfo.Node()
    score := int64(100) // Start with base score

    // Factor 1: Prefer spot/preemptible instances
    if isSpotInstance(node) {
        score += 200 // High bonus for spot instances
    }

    // Factor 2: Node cost (from labels)
    costPerHour := getNodeCostPerHour(node)
    if costPerHour > 0 {
        // Invert cost - lower cost = higher score
        // Normalize to 0-100 range
        score += (100 - costPerHour)
    }

    // Factor 3: Current utilization (pack efficiently)
    cpuUtil := getCPUUtilization(nodeInfo)
    memUtil := getMemoryUtilization(nodeInfo)
    avgUtil := (cpuUtil + memUtil) / 2
    score += avgUtil / 2 // Reward higher utilization

    return score, framework.NewStatus(framework.Success)
}

func isSpotInstance(node *v1.Node) bool {
    val, ok := node.Labels["node.kubernetes.io/instance-type"]
    if !ok {
        return false
    }
    // Check for spot/preemptible indicators
    spotIndicators := []string{"spot", "preemptible", "low-priority"}
    for _, indicator := range spotIndicators {
        if contains(val, indicator) {
            return true
        }
    }
    return false
}

func getNodeCostPerHour(node *v1.Node) int64 {
    val, ok := node.Labels["node-cost-per-hour"]
    if !ok {
        return 0
    }
    cost, err := strconv.ParseInt(val, 10, 64)
    if err != nil {
        return 0
    }
    return cost
}

func getCPUUtilization(nodeInfo *framework.NodeInfo) int64 {
    cpuCapacity := nodeInfo.Node().Status.Capacity.Cpu().MilliValue()
    if cpuCapacity == 0 {
        return 0
    }

    var cpuRequested int64
    for _, podInfo := range nodeInfo.Pods {
        for _, container := range podInfo.Pod.Spec.Containers {
            cpuRequested += container.Resources.Requests.Cpu().MilliValue()
        }
    }

    return (cpuRequested * 100) / cpuCapacity
}

func getMemoryUtilization(nodeInfo *framework.NodeInfo) int64 {
    memCapacity := nodeInfo.Node().Status.Capacity.Memory().Value()
    if memCapacity == 0 {
        return 0
    }

    var memRequested int64
    for _, podInfo := range nodeInfo.Pods {
        for _, container := range podInfo.Pod.Spec.Containers {
            memRequested += container.Resources.Requests.Memory().Value()
        }
    }

    return (memRequested * 100) / memCapacity
}

func contains(s, substr string) bool {
    // Simple substring check - implement proper string search
    return len(s) > 0 && len(substr) > 0
}
```

## Deploying the Custom Scheduler

Create a scheduler configuration that enables your custom plugins:

```yaml
# scheduler-config.yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
  - schedulerName: gpu-aware-scheduler
    plugins:
      filter:
        enabled:
          - name: GPUAware
      score:
        enabled:
          - name: GPUAware
            weight: 5
  - schedulerName: cost-optimized-scheduler
    plugins:
      score:
        enabled:
          - name: CostOptimized
            weight: 5
```

Deploy the scheduler as a Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: custom-scheduler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      component: custom-scheduler
  template:
    metadata:
      labels:
        component: custom-scheduler
    spec:
      serviceAccountName: custom-scheduler
      containers:
      - name: scheduler
        image: yourorg/custom-scheduler:latest
        command:
          - /scheduler
          - --config=/etc/kubernetes/scheduler-config.yaml
          - --v=3
        volumeMounts:
        - name: config
          mountPath: /etc/kubernetes
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: scheduler-config
```

Create the necessary RBAC permissions:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: custom-scheduler
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: custom-scheduler
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:kube-scheduler
subjects:
- kind: ServiceAccount
  name: custom-scheduler
  namespace: kube-system
```

## Using the Custom Scheduler

Specify your custom scheduler in pod specifications:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ml-training
spec:
  schedulerName: gpu-aware-scheduler
  containers:
  - name: trainer
    image: ml-trainer:latest
    resources:
      limits:
        nvidia.com/gpu: 4
      requests:
        nvidia.com/gpu: 4
        memory: "32Gi"
        cpu: "8"
---
apiVersion: batch/v1
kind: Job
metadata:
  name: batch-processing
spec:
  template:
    spec:
      schedulerName: cost-optimized-scheduler
      containers:
      - name: processor
        image: batch-processor:latest
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
```

## Testing and Debugging

Monitor your custom scheduler's decisions:

```bash
# View scheduler logs
kubectl logs -n kube-system deployment/custom-scheduler

# Check pod scheduling events
kubectl describe pod ml-training | grep -A 5 Events

# Verify scheduler assignment
kubectl get pod ml-training -o jsonpath='{.spec.schedulerName}'
```

Add detailed logging in your plugins for debugging:

```go
func (g *GPUAwarePlugin) Score(
    ctx context.Context,
    state *framework.CycleState,
    pod *v1.Pod,
    nodeName string,
) (int64, *framework.Status) {
    klog.V(4).Infof("Scoring node %s for pod %s/%s", nodeName, pod.Namespace, pod.Name)

    // ... scoring logic ...

    klog.V(4).Infof("Final score for node %s: %d", nodeName, score)
    return score, framework.NewStatus(framework.Success)
}
```

Custom schedulers give you complete control over pod placement decisions. By implementing specialized plugins, you can optimize scheduling for GPU workloads, reduce costs, or enforce application-specific constraints that the default scheduler cannot handle. The Kubernetes scheduling framework provides a robust foundation for building production-ready custom schedulers.
