# How to Use Scheduler Plugins Framework to Add Custom Scoring Logic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, Plugins

Description: Learn how to extend Kubernetes scheduler with custom scoring plugins to implement specialized pod placement logic using the scheduler plugins framework.

---

The Kubernetes scheduler plugins framework allows you to extend scheduling behavior without forking the scheduler code. While the default scoring plugins work well for general workloads, specialized applications often require custom placement logic based on business rules, external data, or application-specific requirements. The scheduler framework provides extension points where you can inject custom scoring logic.

This guide will show you how to build and integrate custom scoring plugins to implement specialized scheduling decisions.

## Understanding the Scheduler Framework

The Kubernetes scheduler operates in phases: queue sort, pre-filter, filter, post-filter, pre-score, score, reserve, permit, pre-bind, bind, and post-bind. Custom plugins can hook into any of these phases. Scoring plugins specifically run in the score phase, assigning numeric scores to nodes after filtering.

Plugins implement defined interfaces and register themselves with the scheduler. The framework handles plugin lifecycle, invocation order, and score normalization. Your plugin focuses purely on the scoring logic.

## Setting Up the Plugin Development Environment

Create a new Go module for your plugin:

```bash
mkdir custom-scorer
cd custom-scorer
go mod init github.com/yourorg/custom-scorer

# Install scheduler framework dependencies
go get k8s.io/kubernetes/pkg/scheduler/framework@v1.28.0
go get k8s.io/api@v0.28.0
go get k8s.io/apimachinery@v0.28.0
```

## Implementing a Custom Scoring Plugin

Create a plugin that scores nodes based on custom metrics. This example scores nodes based on their age, preferring newer nodes:

```go
// nodeage/plugin.go
package nodeage

import (
    "context"
    "fmt"
    "time"

    v1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/kubernetes/pkg/scheduler/framework"
)

const (
    Name = "NodeAge"
    // Maximum age in days for scoring
    maxAgeDays = 365
)

type NodeAge struct {
    handle framework.Handle
}

var _ framework.ScorePlugin = &NodeAge{}

// Name returns the plugin name
func (na *NodeAge) Name() string {
    return Name
}

// Score assigns a score to a node based on its age
// Newer nodes get higher scores (0-100)
func (na *NodeAge) Score(ctx context.Context, state *framework.CycleState, p *v1.Pod, nodeName string) (int64, *framework.Status) {
    nodeInfo, err := na.handle.SnapshotSharedLister().NodeInfos().Get(nodeName)
    if err != nil {
        return 0, framework.NewStatus(framework.Error, fmt.Sprintf("getting node %q: %v", nodeName, err))
    }

    node := nodeInfo.Node()
    if node == nil {
        return 0, framework.NewStatus(framework.Error, fmt.Sprintf("node %q not found", nodeName))
    }

    // Calculate node age in days
    age := time.Since(node.CreationTimestamp.Time)
    ageDays := int(age.Hours() / 24)

    // Score: newer nodes get higher scores
    // Age 0 days = 100 points
    // Age maxAgeDays or more = 0 points
    score := int64(100 - (ageDays * 100 / maxAgeDays))
    if score < 0 {
        score = 0
    }

    return score, nil
}

// ScoreExtensions returns nil as we don't normalize scores
func (na *NodeAge) ScoreExtensions() framework.ScoreExtensions {
    return nil
}

// New creates a new NodeAge plugin
func New(obj runtime.Object, handle framework.Handle) (framework.Plugin, error) {
    return &NodeAge{
        handle: handle,
    }, nil
}
```

## Implementing a Plugin Based on External Metrics

Create a plugin that scores nodes based on external metrics like cost or energy efficiency:

```go
// costaware/plugin.go
package costaware

import (
    "context"
    "fmt"

    v1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/kubernetes/pkg/scheduler/framework"
)

type CostAware struct {
    handle    framework.Handle
    costMap   map[string]float64
}

var _ framework.ScorePlugin = &CostAware{}

func (ca *CostAware) Name() string {
    return "CostAware"
}

// Score nodes based on their cost
// Lower cost nodes get higher scores
func (ca *CostAware) Score(ctx context.Context, state *framework.CycleState, p *v1.Pod, nodeName string) (int64, *framework.Status) {
    nodeInfo, err := ca.handle.SnapshotSharedLister().NodeInfos().Get(nodeName)
    if err != nil {
        return 0, framework.NewStatus(framework.Error, err.Error())
    }

    node := nodeInfo.Node()

    // Get cost from node label or annotation
    costStr, ok := node.Labels["node.kubernetes.io/cost-per-hour"]
    if !ok {
        // Default cost if not specified
        return 50, nil
    }

    var cost float64
    fmt.Sscanf(costStr, "%f", &cost)

    // Invert cost to score (lower cost = higher score)
    // Assuming cost range of $0.10 to $1.00 per hour
    maxCost := 1.0
    score := int64((maxCost - cost) / maxCost * 100)

    if score < 0 {
        score = 0
    }
    if score > 100 {
        score = 100
    }

    return score, nil
}

func (ca *CostAware) ScoreExtensions() framework.ScoreExtensions {
    return nil
}

func New(obj runtime.Object, handle framework.Handle) (framework.Plugin, error) {
    return &CostAware{
        handle: handle,
    }, nil
}
```

## Implementing a Data Locality Plugin

Score nodes based on data locality for data-intensive workloads:

```go
// datalocality/plugin.go
package datalocality

import (
    "context"
    "strings"

    v1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/kubernetes/pkg/scheduler/framework"
)

type DataLocality struct {
    handle framework.Handle
}

var _ framework.ScorePlugin = &DataLocality{}

func (dl *DataLocality) Name() string {
    return "DataLocality"
}

func (dl *DataLocality) Score(ctx context.Context, state *framework.CycleState, p *v1.Pod, nodeName string) (int64, *framework.Status) {
    // Check if pod requests specific data locality
    dataZone, hasDataZone := p.Labels["data-zone"]
    if !hasDataZone {
        return 50, nil  // Neutral score if no preference
    }

    nodeInfo, err := dl.handle.SnapshotSharedLister().NodeInfos().Get(nodeName)
    if err != nil {
        return 0, framework.NewStatus(framework.Error, err.Error())
    }

    node := nodeInfo.Node()

    // Check if node is in the same data zone
    nodeZone, ok := node.Labels["topology.kubernetes.io/zone"]
    if !ok {
        return 0, nil
    }

    // Full score for same zone
    if nodeZone == dataZone {
        return 100, nil
    }

    // Partial score for same region
    if strings.Split(nodeZone, "-")[0] == strings.Split(dataZone, "-")[0] {
        return 30, nil
    }

    return 0, nil
}

func (dl *DataLocality) ScoreExtensions() framework.ScoreExtensions {
    return nil
}

func New(obj runtime.Object, handle framework.Handle) (framework.Plugin, error) {
    return &DataLocality{
        handle: handle,
    }, nil
}
```

## Registering Plugins with the Scheduler

Create a plugin registry and build a custom scheduler:

```go
// main.go
package main

import (
    "os"

    "k8s.io/component-base/cli"
    "k8s.io/kubernetes/cmd/kube-scheduler/app"

    "github.com/yourorg/custom-scorer/nodeage"
    "github.com/yourorg/custom-scorer/costaware"
    "github.com/yourorg/custom-scorer/datalocality"
)

func main() {
    // Register custom plugins
    command := app.NewSchedulerCommand(
        app.WithPlugin(nodeage.Name, nodeage.New),
        app.WithPlugin(costaware.Name, costaware.New),
        app.WithPlugin(datalocality.Name, datalocality.New),
    )

    code := cli.Run(command)
    os.Exit(code)
}
```

## Configuring the Scheduler to Use Custom Plugins

Create a scheduler configuration that enables your custom plugins:

```yaml
# scheduler-config.yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: custom-scheduler
  plugins:
    score:
      enabled:
      # Enable custom plugins
      - name: NodeAge
        weight: 2
      - name: CostAware
        weight: 5
      - name: DataLocality
        weight: 3
      # Keep default plugins
      - name: NodeResourcesBalancedAllocation
        weight: 1
      - name: ImageLocality
        weight: 1
```

## Building and Deploying the Custom Scheduler

Build the scheduler with your plugins:

```bash
# Build binary
go build -o custom-scheduler main.go

# Create Docker image
cat > Dockerfile <<'EOF'
FROM golang:1.21 AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o custom-scheduler .

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
# deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: scheduler-config
  namespace: kube-system
data:
  scheduler-config.yaml: |
    apiVersion: kubescheduler.config.k8s.io/v1
    kind: KubeSchedulerConfiguration
    profiles:
    - schedulerName: custom-scheduler
      plugins:
        score:
          enabled:
          - name: NodeAge
            weight: 2
          - name: CostAware
            weight: 5
          - name: DataLocality
            weight: 3
---
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
        command:
        - ./custom-scheduler
        - --config=/etc/kubernetes/scheduler-config.yaml
        - --leader-elect=false
        volumeMounts:
        - name: config
          mountPath: /etc/kubernetes
      volumes:
      - name: config
        configMap:
          name: scheduler-config
```

## Testing Custom Plugins

Deploy pods that exercise your custom scoring logic:

```yaml
# test-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: data-intensive-app
  labels:
    data-zone: us-west-2a
spec:
  schedulerName: custom-scheduler
  containers:
  - name: app
    image: myapp:latest
```

Check scheduling decisions:

```bash
# Deploy test pod
kubectl apply -f test-pod.yaml

# Check which node was selected
kubectl get pod data-intensive-app -o wide

# View scheduler decision logs
kubectl logs -n kube-system deployment/custom-scheduler | grep Score
```

## Best Practices

Keep scoring logic simple and fast to avoid impacting scheduling latency. Cache external data rather than making API calls during scoring. Implement proper error handling and return sensible default scores when data is unavailable.

Use appropriate score ranges (0-100) and document what different scores mean. Weight plugins appropriately based on their relative importance. Test plugin behavior with various pod and node configurations.

Monitor plugin performance and impact on scheduling latency. Log scoring decisions at debug level for troubleshooting. Version your plugins and test thoroughly before deploying to production.

## Conclusion

Custom scoring plugins extend Kubernetes scheduler capabilities while maintaining compatibility with the standard scheduler framework. By implementing focused scoring logic in plugins, you can optimize pod placement for cost, performance, data locality, or any application-specific requirements.

Start with simple plugins and add complexity as needed. Use proper abstraction and error handling. Monitor scheduling decisions to verify plugins behave as intended and adjust scoring weights based on real-world results.
