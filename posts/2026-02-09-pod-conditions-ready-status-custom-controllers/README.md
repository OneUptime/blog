# How to Manage Pod Conditions and Ready Status with Custom Controllers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Custom Controllers, Pod Lifecycle

Description: Learn how to build custom Kubernetes controllers that manage pod conditions and readiness status for advanced application health checking and orchestration workflows.

---

Pod conditions provide a mechanism for Kubernetes and custom controllers to communicate detailed status information about a pod beyond the simple phase (Pending, Running, Succeeded, Failed). While Kubernetes manages standard conditions like PodScheduled, Initialized, and Ready, you can create custom controllers that add and manage your own conditions to implement sophisticated health checking and orchestration logic.

Understanding how to work with pod conditions programmatically enables you to build platform-level features that integrate deeply with Kubernetes lifecycle management.

## Understanding Pod Conditions

Pod conditions are an array of condition objects in the pod status. Each condition has a type, status, reason, message, and timestamp:

```bash
kubectl get pod example-pod -o jsonpath='{.status.conditions}' | jq
```

Standard conditions include:

- `PodScheduled`: Pod has been assigned to a node
- `Initialized`: All init containers have completed
- `ContainersReady`: All containers are ready
- `Ready`: Pod is ready to serve traffic

You can view these with kubectl:

```bash
kubectl describe pod example-pod
# Look for Conditions section
```

## Creating a Custom Controller

Here's a basic controller that adds custom conditions to pods:

```go
// main.go
package main

import (
    "context"
    "fmt"
    "time"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
    "k8s.io/client-go/tools/cache"
    "k8s.io/client-go/util/workqueue"
)

// Custom condition type
const (
    ConditionTypeCustomHealthy = "CustomHealthy"
    ConditionTypeDependenciesReady = "DependenciesReady"
)

type PodConditionController struct {
    clientset  *kubernetes.Clientset
    queue      workqueue.RateLimitingInterface
    informer   cache.SharedIndexInformer
}

func NewPodConditionController() (*PodConditionController, error) {
    // Create in-cluster config
    config, err := rest.InClusterConfig()
    if err != nil {
        return nil, err
    }

    // Create clientset
    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return nil, err
    }

    // Create controller
    controller := &PodConditionController{
        clientset: clientset,
        queue:     workqueue.NewRateLimitingQueue(workqueue.DefaultControllerRateLimiter()),
    }

    return controller, nil
}

func (c *PodConditionController) Run(stopCh <-chan struct{}) {
    defer c.queue.ShutDown()

    fmt.Println("Starting Pod Condition Controller")

    // Start workers
    for i := 0; i < 2; i++ {
        go c.worker()
    }

    <-stopCh
    fmt.Println("Stopping Pod Condition Controller")
}

func (c *PodConditionController) worker() {
    for c.processNextItem() {
    }
}

func (c *PodConditionController) processNextItem() bool {
    key, quit := c.queue.Get()
    if quit {
        return false
    }
    defer c.queue.Done(key)

    // Process the pod
    err := c.syncPod(key.(string))
    if err != nil {
        fmt.Printf("Error syncing pod %s: %v\n", key, err)
        c.queue.AddRateLimited(key)
        return true
    }

    c.queue.Forget(key)
    return true
}

func (c *PodConditionController) syncPod(key string) error {
    namespace, name, err := cache.SplitMetaNamespaceKey(key)
    if err != nil {
        return err
    }

    // Get the pod
    pod, err := c.clientset.CoreV1().Pods(namespace).Get(
        context.TODO(), name, metav1.GetOptions{})
    if err != nil {
        return err
    }

    // Check if pod has our custom annotation
    if pod.Annotations["custom-health-check"] != "enabled" {
        return nil
    }

    // Perform custom health check
    healthy, reason, message := c.performCustomHealthCheck(pod)

    // Update pod condition
    return c.updatePodCondition(pod, ConditionTypeCustomHealthy, healthy, reason, message)
}

func (c *PodConditionController) performCustomHealthCheck(pod *corev1.Pod) (bool, string, string) {
    // Example: Check if all containers are running and pod has been up for 30 seconds
    if pod.Status.Phase != corev1.PodRunning {
        return false, "NotRunning", "Pod is not in Running phase"
    }

    // Check container statuses
    for _, cs := range pod.Status.ContainerStatuses {
        if !cs.Ready {
            return false, "ContainerNotReady", fmt.Sprintf("Container %s is not ready", cs.Name)
        }
    }

    // Check if pod has been running long enough
    if pod.Status.StartTime != nil {
        uptime := time.Since(pod.Status.StartTime.Time)
        if uptime < 30*time.Second {
            return false, "StartupPeriod", "Pod is still in startup period"
        }
    }

    // Additional custom checks could go here
    // For example, check external dependencies, perform application-specific validation, etc.

    return true, "HealthCheckPassed", "All custom health checks passed"
}

func (c *PodConditionController) updatePodCondition(
    pod *corev1.Pod,
    conditionType string,
    status bool,
    reason string,
    message string,
) error {
    // Prepare the condition
    conditionStatus := corev1.ConditionFalse
    if status {
        conditionStatus = corev1.ConditionTrue
    }

    newCondition := corev1.PodCondition{
        Type:               corev1.PodConditionType(conditionType),
        Status:             conditionStatus,
        LastProbeTime:      metav1.Now(),
        LastTransitionTime: metav1.Now(),
        Reason:             reason,
        Message:            message,
    }

    // Find existing condition
    conditionIndex := -1
    for i, condition := range pod.Status.Conditions {
        if string(condition.Type) == conditionType {
            conditionIndex = i
            // Update LastTransitionTime only if status changed
            if condition.Status == newCondition.Status {
                newCondition.LastTransitionTime = condition.LastTransitionTime
            }
            break
        }
    }

    // Update or append condition
    if conditionIndex >= 0 {
        pod.Status.Conditions[conditionIndex] = newCondition
    } else {
        pod.Status.Conditions = append(pod.Status.Conditions, newCondition)
    }

    // Update pod status
    _, err := c.clientset.CoreV1().Pods(pod.Namespace).UpdateStatus(
        context.TODO(), pod, metav1.UpdateOptions{})

    return err
}
```

Deploy this controller as a Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pod-condition-controller
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: pod-condition-controller
  template:
    metadata:
      labels:
        app: pod-condition-controller
    spec:
      serviceAccountName: pod-condition-controller
      containers:
      - name: controller
        image: pod-condition-controller:1.0
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: pod-condition-controller
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: pod-condition-controller
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods/status"]
  verbs: ["update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: pod-condition-controller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: pod-condition-controller
subjects:
- kind: ServiceAccount
  name: pod-condition-controller
  namespace: kube-system
```

## Using Custom Conditions

Once the controller is running, annotate pods to enable custom health checks:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: monitored-app
  annotations:
    custom-health-check: "enabled"
spec:
  containers:
  - name: app
    image: myapp:1.0
    ports:
    - containerPort: 8080
```

Check the custom condition:

```bash
kubectl get pod monitored-app -o jsonpath='{.status.conditions}' | jq '.[] | select(.type == "CustomHealthy")'
```

## Implementing Dependency Checking

A more advanced use case is checking if dependencies are ready:

```go
func (c *PodConditionController) checkDependencies(pod *corev1.Pod) (bool, string, string) {
    // Read dependency annotation
    dependencies, ok := pod.Annotations["dependencies"]
    if !ok {
        return true, "NoDependencies", "No dependencies specified"
    }

    // Parse dependencies (format: "service1,service2,pod/pod-name")
    deps := strings.Split(dependencies, ",")

    for _, dep := range deps {
        parts := strings.Split(strings.TrimSpace(dep), "/")

        if parts[0] == "service" {
            // Check if service exists and has endpoints
            svc, err := c.clientset.CoreV1().Services(pod.Namespace).Get(
                context.TODO(), parts[1], metav1.GetOptions{})
            if err != nil {
                return false, "ServiceNotFound",
                    fmt.Sprintf("Service %s not found", parts[1])
            }

            endpoints, err := c.clientset.CoreV1().Endpoints(pod.Namespace).Get(
                context.TODO(), parts[1], metav1.GetOptions{})
            if err != nil || len(endpoints.Subsets) == 0 {
                return false, "NoEndpoints",
                    fmt.Sprintf("Service %s has no endpoints", parts[1])
            }
        } else if parts[0] == "pod" {
            // Check if pod exists and is ready
            depPod, err := c.clientset.CoreV1().Pods(pod.Namespace).Get(
                context.TODO(), parts[1], metav1.GetOptions{})
            if err != nil {
                return false, "PodNotFound",
                    fmt.Sprintf("Pod %s not found", parts[1])
            }

            // Check if dependency pod is ready
            podReady := false
            for _, cond := range depPod.Status.Conditions {
                if cond.Type == corev1.PodReady && cond.Status == corev1.ConditionTrue {
                    podReady = true
                    break
                }
            }

            if !podReady {
                return false, "DependencyNotReady",
                    fmt.Sprintf("Pod %s is not ready", parts[1])
            }
        }
    }

    return true, "AllDependenciesReady", "All dependencies are ready"
}
```

Use it in a pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-dependencies
  annotations:
    custom-health-check: "enabled"
    dependencies: "service/database,service/cache,pod/config-loader"
spec:
  containers:
  - name: app
    image: myapp:1.0
```

## Integrating with Readiness Gates

Kubernetes readiness gates let you block a pod from becoming ready until custom conditions are met:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gated-app
  annotations:
    custom-health-check: "enabled"
spec:
  readinessGates:
  - conditionType: "CustomHealthy"
  - conditionType: "DependenciesReady"
  containers:
  - name: app
    image: myapp:1.0
    readinessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 10
```

The pod won't be marked as Ready until both the readiness probe passes AND all readiness gate conditions are True.

## Python Example

Here's a simpler Python version for quick prototyping:

```python
#!/usr/bin/env python3
from kubernetes import client, config, watch
import time

config.load_incluster_config()
v1 = client.CoreV1Api()

def update_pod_condition(pod, condition_type, status, reason, message):
    """Update a pod's custom condition."""
    # Create the new condition
    new_condition = client.V1PodCondition(
        type=condition_type,
        status="True" if status else "False",
        last_probe_time=client.V1Time(),
        last_transition_time=client.V1Time(),
        reason=reason,
        message=message
    )

    # Find existing condition
    condition_index = -1
    for i, cond in enumerate(pod.status.conditions or []):
        if cond.type == condition_type:
            condition_index = i
            # Keep transition time if status hasn't changed
            if cond.status == new_condition.status:
                new_condition.last_transition_time = cond.last_transition_time
            break

    # Update or append
    if pod.status.conditions is None:
        pod.status.conditions = []

    if condition_index >= 0:
        pod.status.conditions[condition_index] = new_condition
    else:
        pod.status.conditions.append(new_condition)

    # Update pod status
    v1.patch_namespaced_pod_status(
        name=pod.metadata.name,
        namespace=pod.metadata.namespace,
        body=pod
    )

def check_database_connectivity(pod):
    """Example: Check if database is reachable."""
    # In a real implementation, you would:
    # 1. Read database connection info from pod annotations or env
    # 2. Attempt a connection
    # 3. Return True/False based on success

    # Simplified example
    if "database-client" in pod.metadata.labels.get("app", ""):
        # Assume we checked and it's reachable
        return True, "DatabaseReachable", "Successfully connected to database"
    return False, "DatabaseUnreachable", "Could not connect to database"

def main():
    """Main controller loop."""
    print("Starting Pod Condition Controller")

    w = watch.Watch()
    for event in w.stream(v1.list_pod_for_all_namespaces):
        pod = event['object']
        event_type = event['type']

        # Only process pods with our annotation
        if pod.metadata.annotations.get("custom-health-check") != "enabled":
            continue

        # Only process Running pods
        if pod.status.phase != "Running":
            continue

        print(f"Processing pod: {pod.metadata.namespace}/{pod.metadata.name}")

        # Perform custom check
        healthy, reason, message = check_database_connectivity(pod)

        # Update condition
        try:
            update_pod_condition(pod, "DatabaseConnectivity", healthy, reason, message)
            print(f"Updated condition for {pod.metadata.name}: {reason}")
        except Exception as e:
            print(f"Error updating pod condition: {e}")

        time.sleep(1)  # Rate limiting

if __name__ == "__main__":
    main()
```

## Monitoring and Debugging

Watch condition changes in real time:

```bash
kubectl get pods -w -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.conditions[?(@.type=="CustomHealthy")].status}{"\n"}{end}'
```

Create alerts based on custom conditions:

```yaml
# Prometheus rule
groups:
- name: pod-conditions
  rules:
  - alert: CustomHealthCheckFailing
    expr: |
      kube_pod_status_condition{condition="CustomHealthy",status="false"} == 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} failing custom health check"
```

## Best Practices

Use descriptive condition types with your organization prefix, like `com.example.DatabaseConnectivity` to avoid conflicts.

Always set meaningful reason and message fields. These appear in kubectl output and help with debugging.

Update LastTransitionTime only when the condition status actually changes. This allows monitoring systems to track state changes accurately.

Consider rate limiting your controller to avoid overwhelming the API server. Use client-go's rate limiting queues.

Test your controller thoroughly before production. Incorrect status updates can break pod scheduling and service routing.

Document your custom conditions in your team's runbook. Operators need to understand what each condition means and how to fix failures.

Custom pod conditions enable sophisticated orchestration patterns that go beyond basic health checks, allowing you to build platform features that integrate tightly with Kubernetes native workflows.
