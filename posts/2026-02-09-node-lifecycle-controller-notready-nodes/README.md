# How to Use Node Lifecycle Controller to Handle NotReady Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Node Management, High Availability, Cluster Administration

Description: Learn how the Kubernetes node lifecycle controller manages NotReady nodes, configures eviction timeouts, and implements custom handling for unhealthy nodes to maintain cluster reliability.

---

The node lifecycle controller is a Kubernetes control plane component that monitors node health and takes action when nodes become NotReady. It marks nodes as NotReady when kubelet stops sending heartbeats and taints them so the scheduler avoids unhealthy nodes. In Kubernetes 1.29 and later, the separate taint eviction controller handles pod eviction from NotReady and unreachable nodes. Understanding these controllers is critical for reliable cluster operations.

## Understanding Node Lifecycle States

Nodes transition through several states based on kubelet heartbeats and node conditions. The Ready condition indicates whether kubelet is healthy and ready to accept pods. When kubelet fails to send heartbeats within the configured grace period, the controller marks the node as NotReady.

The node lifecycle controller applies taints to NotReady nodes. The built-in taint `node.kubernetes.io/not-ready:NoExecute` evicts existing pods that do not tolerate the taint, while node-condition taints with `NoSchedule` prevent new pods from scheduling onto unhealthy nodes.

Check node status and conditions:

```bash
# View all nodes and their status

kubectl get nodes

# Get detailed node conditions
kubectl describe node <node-name>

# View node conditions in JSON format
kubectl get node <node-name> -o json | \
  jq '.status.conditions'

# Filter for NotReady nodes
kubectl get nodes -o json | \
  jq -r '.items[] | select(.status.conditions[] | select(.type=="Ready" and .status=="False")) | .metadata.name'
```

## Configuring Node Monitor Grace Period

The node monitor grace period determines how long the controller waits before marking a node NotReady. Configure this in the controller manager:

```bash
# Edit controller manager manifest
sudo nano /etc/kubernetes/manifests/kube-controller-manager.yaml
```

Add node monitoring flags:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-controller-manager
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-controller-manager
    # Time before marking node as unhealthy (default: 50s)
    - --node-monitor-grace-period=50s
    # Interval for checking node status (default: 5s)
    - --node-monitor-period=5s
    # Other flags...
```

These settings control how quickly the controller responds to node failures:

- `--node-monitor-grace-period`: Kubelet must send heartbeat within this time
- `--node-monitor-period`: How often controller checks node status

## Configuring Pod Eviction Timeout

In current Kubernetes releases, pod eviction timing for NotReady and unreachable nodes is controlled by the `NoExecute` tolerations on pods. For pods that do not explicitly set these tolerations, the API server adds default tolerations for 300 seconds. Configure those defaults in the API server:

```yaml
spec:
  containers:
  - command:
    - kube-apiserver
    # Add 2 minute default tolerations for pods that do not set their own
    - --default-not-ready-toleration-seconds=120
    - --default-unreachable-toleration-seconds=120
```

For critical workloads, set explicit pod tolerations with shorter `tolerationSeconds` to enable faster failover. For less critical workloads, longer tolerations prevent unnecessary pod movement during transient issues.

Test eviction behavior:

```bash
# Simulate node failure by stopping kubelet
sudo systemctl stop kubelet

# Watch node status change
kubectl get nodes -w

# Monitor pod eviction
kubectl get pods -A -o wide -w

# Watch for pod rescheduling
kubectl get events --all-namespaces -w | grep -i evict
```

## Adding Tolerations for NotReady Nodes

Configure pods to tolerate NotReady nodes for specific durations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: critical-app
spec:
  containers:
  - name: app
    image: myapp:latest
  # Tolerate NotReady nodes for 30 seconds
  tolerations:
  - key: "node.kubernetes.io/not-ready"
    operator: "Exists"
    effect: "NoExecute"
    tolerationSeconds: 30
  # Tolerate unreachable nodes for 30 seconds
  - key: "node.kubernetes.io/unreachable"
    operator: "Exists"
    effect: "NoExecute"
    tolerationSeconds: 30
```

This pod will be evicted 30 seconds after the matching `NoExecute` taint is added, regardless of the API server's default toleration duration.

For StatefulSets that should stay on nodes longer:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      # Tolerate NotReady for 10 minutes (stateful apps need more time)
      tolerations:
      - key: "node.kubernetes.io/not-ready"
        operator: "Exists"
        effect: "NoExecute"
        tolerationSeconds: 600
      - key: "node.kubernetes.io/unreachable"
        operator: "Exists"
        effect: "NoExecute"
        tolerationSeconds: 600
      containers:
      - name: postgres
        image: postgres:16
```

## Implementing Custom Node Health Checks

Create a custom controller to extend node health monitoring:

```go
// node-health-controller.go
package main

import (
    "context"
    "log"
    "time"

    v1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

type NodeHealthController struct {
    clientset *kubernetes.Clientset
}

func NewNodeHealthController() (*NodeHealthController, error) {
    config, err := rest.InClusterConfig()
    if err != nil {
        return nil, err
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return nil, err
    }

    return &NodeHealthController{
        clientset: clientset,
    }, nil
}

func (c *NodeHealthController) Run(ctx context.Context) {
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            c.checkNodes(ctx)
        case <-ctx.Done():
            return
        }
    }
}

func (c *NodeHealthController) checkNodes(ctx context.Context) {
    nodes, err := c.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
    if err != nil {
        log.Printf("Error listing nodes: %v", err)
        return
    }

    for _, node := range nodes.Items {
        if !isNodeReady(&node) {
            c.handleNotReadyNode(ctx, &node)
        }
    }
}

func isNodeReady(node *v1.Node) bool {
    for _, condition := range node.Status.Conditions {
        if condition.Type == v1.NodeReady {
            return condition.Status == v1.ConditionTrue
        }
    }
    return false
}

func (c *NodeHealthController) handleNotReadyNode(ctx context.Context, node *v1.Node) {
    log.Printf("Node %s is NotReady, taking action", node.Name)

    for _, existing := range node.Spec.Taints {
        if existing.Key == "custom/node-unhealthy" && existing.Effect == v1.TaintEffectNoSchedule {
            sendAlert(node.Name, "Node is NotReady")
            return
        }
    }

    // Add custom taint
    taint := v1.Taint{
        Key:    "custom/node-unhealthy",
        Value:  "true",
        Effect: v1.TaintEffectNoSchedule,
    }

    node.Spec.Taints = append(node.Spec.Taints, taint)

    _, err := c.clientset.CoreV1().Nodes().Update(ctx, node, metav1.UpdateOptions{})
    if err != nil {
        log.Printf("Error updating node %s: %v", node.Name, err)
    }

    // Send alert to monitoring system
    sendAlert(node.Name, "Node is NotReady")
}

func sendAlert(nodeName, message string) {
    // Implement alerting logic (e.g., send to Slack, PagerDuty, etc.)
    log.Printf("ALERT: Node %s - %s", nodeName, message)
}
```

## Disabling Taint-Based Eviction

For specific use cases, disable taint-based eviction:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: stays-on-node
spec:
  containers:
  - name: app
    image: myapp:latest
  # Never evict from NotReady nodes
  tolerations:
  - key: "node.kubernetes.io/not-ready"
    operator: "Exists"
    effect: "NoExecute"
  - key: "node.kubernetes.io/unreachable"
    operator: "Exists"
    effect: "NoExecute"
```

Without `tolerationSeconds`, the pod tolerates the taint indefinitely.

## Monitoring Node Lifecycle Events

Track node status changes and evictions:

```bash
# Watch for node status changes
kubectl get events --all-namespaces --field-selector involvedObject.kind=Node -w

# Monitor pod evictions
kubectl get events --all-namespaces | grep -i evict

# Check node conditions over time
watch -n 5 'kubectl get nodes -o custom-columns=NAME:.metadata.name,STATUS:.status.conditions[?(@.type==\"Ready\")].status,REASON:.status.conditions[?(@.type==\"Ready\")].reason'

# List NotReady nodes
kubectl get nodes -o json | \
  jq -r '.items[] | select(.status.conditions[] | select(.type=="Ready" and .status!="True")) | .metadata.name'
```

Create Prometheus alerts for NotReady nodes:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: node-lifecycle-alerts
  namespace: monitoring
spec:
  groups:
  - name: nodes
    rules:
    - alert: NodeNotReady
      expr: kube_node_status_condition{condition="Ready",status="false"} == 1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Node {{ $labels.node }} is NotReady"
        description: "Node has been NotReady for more than 5 minutes"

    - alert: NodeUnreachable
      expr: kube_node_status_condition{condition="Ready",status="unknown"} == 1
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Node {{ $labels.node }} is unreachable"

    - alert: FrequentNodeNotReady
      expr: |
        changes(kube_node_status_condition{condition="Ready",status="false"}[1h]) > 5
      labels:
        severity: warning
      annotations:
        summary: "Node {{ $labels.node }} frequently becomes NotReady"
```

## Automating Node Recovery

Create a DaemonSet to automatically attempt node recovery:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-recovery
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: node-recovery
  template:
    metadata:
      labels:
        app: node-recovery
    spec:
      hostNetwork: true
      hostPID: true
      containers:
      - name: recovery
        image: ubuntu:22.04
        command:
        - /bin/bash
        - -c
        - |
          HOST_NS="nsenter -t 1 -m -u -i -n -p --"

          while true; do
            # Check if kubelet is running
            if ! $HOST_NS systemctl is-active --quiet kubelet; then
              echo "Kubelet is down, attempting restart..."
              $HOST_NS systemctl restart kubelet
              sleep 30
            fi

            # Check disk space
            DISK_USAGE=$($HOST_NS df -P / | awk 'NR==2 {print $5}' | sed 's/%//')
            if [ $DISK_USAGE -gt 85 ]; then
              echo "Disk usage is high, cleaning up..."
              $HOST_NS sh -c 'crictl rmi --prune 2>/dev/null || docker system prune -af 2>/dev/null || true'
              $HOST_NS journalctl --vacuum-time=2d
            fi

            sleep 60
          done
        securityContext:
          privileged: true
```

## Troubleshooting NotReady Nodes

Debug node health issues:

```bash
# Check node details
kubectl describe node <node-name>

# View kubelet logs on the node
ssh <node-ip>
sudo journalctl -u kubelet -f

# Check node resources
kubectl top node <node-name>

# Verify network connectivity
kubectl run test --rm -it --image=curlimages/curl -- \
  curl -v http://kubernetes.default.svc

# Check for disk pressure
kubectl get nodes -o json | \
  jq -r '.items[] | select(.status.conditions[] | select(.type=="DiskPressure" and .status=="True")) | .metadata.name'

# Manually drain and uncordon
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
kubectl uncordon <node-name>
```

The node lifecycle controller automates handling of unhealthy nodes. Configure appropriate timeouts based on your workload requirements, use tolerations to control pod eviction timing, and implement monitoring to detect node issues before they impact applications.
