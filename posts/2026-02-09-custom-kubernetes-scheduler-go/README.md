# How to Write a Custom Kubernetes Scheduler from Scratch in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, Go

Description: Learn how to build a custom Kubernetes scheduler from scratch using Go to implement specialized pod placement logic beyond the default scheduler's capabilities.

---

The default Kubernetes scheduler handles most workload placement scenarios well, but some applications require custom scheduling logic based on business rules, hardware requirements, or complex constraints. Writing a custom scheduler gives you complete control over pod placement decisions while integrating seamlessly with the Kubernetes control plane.

This guide will walk you through building a functional custom scheduler in Go that can coexist with the default scheduler and make intelligent placement decisions.

## Understanding Scheduler Architecture

A Kubernetes scheduler watches for unscheduled pods and binds them to nodes. The process involves filtering nodes that meet pod requirements, scoring the remaining nodes based on various factors, and selecting the highest-scoring node. The scheduler then creates a Binding object to assign the pod to the chosen node.

Custom schedulers follow the same pattern but implement different filtering and scoring logic. They can run alongside the default scheduler, with pods specifying which scheduler to use via the `schedulerName` field.

## Setting Up the Go Project

Create a new Go module for your scheduler:

```bash
# Initialize Go module
mkdir custom-scheduler
cd custom-scheduler
go mod init github.com/yourorg/custom-scheduler

# Install Kubernetes client dependencies
go get k8s.io/client-go@latest
go get k8s.io/apimachinery@latest
go get k8s.io/api@latest
```

Create the main scheduler structure:

```go
// main.go
package main

import (
    "context"
    "fmt"
    "log"
    "os"
    "path/filepath"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/labels"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
    "k8s.io/client-go/tools/clientcmd"
    "k8s.io/client-go/util/homedir"
)

const schedulerName = "custom-scheduler"

type CustomScheduler struct {
    clientset *kubernetes.Clientset
}

func NewCustomScheduler() (*CustomScheduler, error) {
    config, err := getKubeConfig()
    if err != nil {
        return nil, err
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return nil, err
    }

    return &CustomScheduler{
        clientset: clientset,
    }, nil
}

func getKubeConfig() (*rest.Config, error) {
    // Try in-cluster config first
    config, err := rest.InClusterConfig()
    if err == nil {
        return config, nil
    }

    // Fall back to kubeconfig file
    if home := homedir.HomeDir(); home != "" {
        kubeconfig := filepath.Join(home, ".kube", "config")
        return clientcmd.BuildConfigFromFlags("", kubeconfig)
    }

    return nil, fmt.Errorf("unable to load kube config")
}

func main() {
    scheduler, err := NewCustomScheduler()
    if err != nil {
        log.Fatalf("Failed to create scheduler: %v", err)
    }

    log.Printf("Starting %s...", schedulerName)
    scheduler.Run()
}
```

## Implementing the Scheduling Loop

The main scheduling loop watches for unscheduled pods and processes them:

```go
// scheduler.go
func (s *CustomScheduler) Run() {
    ctx := context.Background()

    for {
        // Get unscheduled pods assigned to this scheduler
        pods, err := s.getUnscheduledPods(ctx)
        if err != nil {
            log.Printf("Error getting unscheduled pods: %v", err)
            continue
        }

        for _, pod := range pods {
            log.Printf("Scheduling pod %s/%s", pod.Namespace, pod.Name)

            // Find suitable node
            node, err := s.schedule(ctx, &pod)
            if err != nil {
                log.Printf("Error scheduling pod %s/%s: %v", pod.Namespace, pod.Name, err)
                continue
            }

            // Bind pod to node
            if err := s.bind(ctx, &pod, node); err != nil {
                log.Printf("Error binding pod %s/%s to node %s: %v",
                    pod.Namespace, pod.Name, node, err)
                continue
            }

            log.Printf("Successfully scheduled pod %s/%s to node %s",
                pod.Namespace, pod.Name, node)
        }

        // Poll interval
        time.Sleep(5 * time.Second)
    }
}

func (s *CustomScheduler) getUnscheduledPods(ctx context.Context) ([]corev1.Pod, error) {
    podList, err := s.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{
        FieldSelector: "spec.nodeName=",
    })
    if err != nil {
        return nil, err
    }

    var unscheduledPods []corev1.Pod
    for _, pod := range podList.Items {
        // Only handle pods assigned to our scheduler
        if pod.Spec.SchedulerName == schedulerName {
            unscheduledPods = append(unscheduledPods, pod)
        }
    }

    return unscheduledPods, nil
}
```

## Implementing Node Filtering

Filter nodes that can't run the pod based on requirements:

```go
// filter.go
func (s *CustomScheduler) filterNodes(ctx context.Context, pod *corev1.Pod) ([]corev1.Node, error) {
    nodeList, err := s.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
    if err != nil {
        return nil, err
    }

    var filteredNodes []corev1.Node

    for _, node := range nodeList.Items {
        // Skip nodes that are unschedulable
        if node.Spec.Unschedulable {
            continue
        }

        // Check node is ready
        if !isNodeReady(&node) {
            continue
        }

        // Check resource requirements
        if !hasEnoughResources(&node, pod) {
            continue
        }

        // Check node selector
        if !matchesNodeSelector(&node, pod) {
            continue
        }

        // Check taints and tolerations
        if !toleratesTaints(&node, pod) {
            continue
        }

        filteredNodes = append(filteredNodes, node)
    }

    return filteredNodes, nil
}

func isNodeReady(node *corev1.Node) bool {
    for _, condition := range node.Status.Conditions {
        if condition.Type == corev1.NodeReady {
            return condition.Status == corev1.ConditionTrue
        }
    }
    return false
}

func hasEnoughResources(node *corev1.Node, pod *corev1.Pod) bool {
    // Get allocatable resources
    allocatable := node.Status.Allocatable

    // Calculate pod resource requests
    var cpuRequest, memoryRequest int64
    for _, container := range pod.Spec.Containers {
        cpuRequest += container.Resources.Requests.Cpu().MilliValue()
        memoryRequest += container.Resources.Requests.Memory().Value()
    }

    // Check if node has enough resources
    nodeCPU := allocatable.Cpu().MilliValue()
    nodeMemory := allocatable.Memory().Value()

    return nodeCPU >= cpuRequest && nodeMemory >= memoryRequest
}

func matchesNodeSelector(node *corev1.Node, pod *corev1.Pod) bool {
    if len(pod.Spec.NodeSelector) == 0 {
        return true
    }

    nodeLabels := labels.Set(node.Labels)
    selector := labels.SelectorFromSet(pod.Spec.NodeSelector)

    return selector.Matches(nodeLabels)
}

func toleratesTaints(node *corev1.Node, pod *corev1.Pod) bool {
    for _, taint := range node.Spec.Taints {
        // Skip if effect is not NoSchedule or NoExecute
        if taint.Effect != corev1.TaintEffectNoSchedule &&
            taint.Effect != corev1.TaintEffectNoExecute {
            continue
        }

        // Check if pod has matching toleration
        tolerated := false
        for _, toleration := range pod.Spec.Tolerations {
            if toleration.ToleratesTaint(&taint) {
                tolerated = true
                break
            }
        }

        if !tolerated {
            return false
        }
    }
    return true
}
```

## Implementing Custom Scoring Logic

Score filtered nodes to select the best placement:

```go
// score.go
type NodeScore struct {
    Node  corev1.Node
    Score int
}

func (s *CustomScheduler) scoreNodes(ctx context.Context, pod *corev1.Pod, nodes []corev1.Node) (string, error) {
    if len(nodes) == 0 {
        return "", fmt.Errorf("no nodes available")
    }

    var nodeScores []NodeScore

    for _, node := range nodes {
        score := s.calculateNodeScore(ctx, pod, &node)
        nodeScores = append(nodeScores, NodeScore{
            Node:  node,
            Score: score,
        })
    }

    // Sort by score (highest first)
    sort.Slice(nodeScores, func(i, j int) bool {
        return nodeScores[i].Score > nodeScores[j].Score
    })

    // Return highest scoring node
    return nodeScores[0].Node.Name, nil
}

func (s *CustomScheduler) calculateNodeScore(ctx context.Context, pod *corev1.Pod, node *corev1.Node) int {
    var score int

    // Score based on available resources (0-100)
    resourceScore := s.scoreResources(node, pod)
    score += resourceScore

    // Score based on pod affinity (0-50)
    affinityScore := s.scoreAffinity(ctx, pod, node)
    score += affinityScore

    // Custom business logic score (0-50)
    businessScore := s.scoreBusinessLogic(pod, node)
    score += businessScore

    return score
}

func (s *CustomScheduler) scoreResources(node *corev1.Node, pod *corev1.Pod) int {
    allocatable := node.Status.Allocatable

    // Calculate pod requests
    var cpuRequest, memoryRequest int64
    for _, container := range pod.Spec.Containers {
        cpuRequest += container.Resources.Requests.Cpu().MilliValue()
        memoryRequest += container.Resources.Requests.Memory().Value()
    }

    // Calculate remaining resources after scheduling this pod
    nodeCPU := allocatable.Cpu().MilliValue()
    nodeMemory := allocatable.Memory().Value()

    cpuRemaining := float64(nodeCPU-cpuRequest) / float64(nodeCPU)
    memoryRemaining := float64(nodeMemory-memoryRequest) / float64(nodeMemory)

    // Higher score for more remaining resources
    return int((cpuRemaining + memoryRemaining) / 2 * 100)
}

func (s *CustomScheduler) scoreAffinity(ctx context.Context, pod *corev1.Pod, node *corev1.Node) int {
    // Implement pod affinity/anti-affinity scoring
    // Higher score for nodes with compatible pods
    return 25
}

func (s *CustomScheduler) scoreBusinessLogic(pod *corev1.Pod, node *corev1.Node) int {
    score := 0

    // Example: Prefer nodes in specific zones
    if zone, ok := node.Labels["topology.kubernetes.io/zone"]; ok {
        if zone == "us-west-2a" {
            score += 20
        }
    }

    // Example: Prefer newer nodes
    if age := time.Since(node.CreationTimestamp.Time); age < 30*24*time.Hour {
        score += 15
    }

    // Example: Consider application labels
    if appType, ok := pod.Labels["app-type"]; ok {
        if appType == "gpu-workload" {
            if _, hasGPU := node.Labels["gpu"]; hasGPU {
                score += 50
            }
        }
    }

    return score
}
```

## Implementing the Schedule Method

Combine filtering and scoring:

```go
func (s *CustomScheduler) schedule(ctx context.Context, pod *corev1.Pod) (string, error) {
    // Filter nodes
    nodes, err := s.filterNodes(ctx, pod)
    if err != nil {
        return "", err
    }

    if len(nodes) == 0 {
        return "", fmt.Errorf("no suitable nodes found")
    }

    // Score and select best node
    selectedNode, err := s.scoreNodes(ctx, pod, nodes)
    if err != nil {
        return "", err
    }

    return selectedNode, nil
}
```

## Binding Pods to Nodes

Create the binding to assign the pod:

```go
// bind.go
func (s *CustomScheduler) bind(ctx context.Context, pod *corev1.Pod, nodeName string) error {
    binding := &corev1.Binding{
        ObjectMeta: metav1.ObjectMeta{
            Name:      pod.Name,
            Namespace: pod.Namespace,
        },
        Target: corev1.ObjectReference{
            Kind: "Node",
            Name: nodeName,
        },
    }

    err := s.clientset.CoreV1().Pods(pod.Namespace).Bind(ctx, binding, metav1.CreateOptions{})
    if err != nil {
        return err
    }

    // Emit event
    s.emitScheduledEvent(ctx, pod, nodeName)

    return nil
}

func (s *CustomScheduler) emitScheduledEvent(ctx context.Context, pod *corev1.Pod, nodeName string) {
    timestamp := time.Now()
    event := &corev1.Event{
        ObjectMeta: metav1.ObjectMeta{
            GenerateName: pod.Name + "-",
            Namespace:    pod.Namespace,
        },
        InvolvedObject: corev1.ObjectReference{
            Kind:      "Pod",
            Name:      pod.Name,
            Namespace: pod.Namespace,
            UID:       pod.UID,
        },
        Reason:  "Scheduled",
        Message: fmt.Sprintf("Successfully assigned %s/%s to %s", pod.Namespace, pod.Name, nodeName),
        Source: corev1.EventSource{
            Component: schedulerName,
        },
        FirstTimestamp: metav1.Time{Time: timestamp},
        LastTimestamp:  metav1.Time{Time: timestamp},
        Type:           corev1.EventTypeNormal,
    }

    s.clientset.CoreV1().Events(pod.Namespace).Create(ctx, event, metav1.CreateOptions{})
}
```

## Building and Deploying the Scheduler

Build the scheduler binary:

```bash
# Build binary
go build -o custom-scheduler .

# Build Docker image
cat > Dockerfile <<'EOF'
FROM golang:1.21 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o custom-scheduler .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/custom-scheduler .
CMD ["./custom-scheduler"]
EOF

docker build -t myregistry/custom-scheduler:v1 .
docker push myregistry/custom-scheduler:v1
```

Deploy to Kubernetes:

```yaml
# scheduler-deployment.yaml
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
        image: myregistry/custom-scheduler:v1
        imagePullPolicy: Always
---
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

Deploy pods with your scheduler:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  schedulerName: custom-scheduler  # Use custom scheduler
  containers:
  - name: nginx
    image: nginx
```

## Conclusion

Building a custom Kubernetes scheduler in Go gives you complete control over pod placement logic. This foundation can be extended with more sophisticated filtering and scoring algorithms tailored to your specific requirements.

Start with the basic framework shown here and add custom logic incrementally. Test thoroughly in development environments before deploying to production. Monitor scheduler performance and decision quality to ensure it meets your needs.
