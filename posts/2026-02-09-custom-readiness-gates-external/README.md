# How to Use Custom Readiness Gates for External System Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Readiness Gates, Pod Lifecycle, External Systems, Service Mesh

Description: Master custom readiness gates in Kubernetes to coordinate pod readiness with external systems like load balancers, service meshes, and monitoring platforms for more sophisticated deployment control.

---

Kubernetes readiness probes check if a pod is ready to serve traffic by testing the application itself. But what happens when your pod needs approval from an external system before it should receive traffic? This is where custom readiness gates come in.

Custom readiness gates extend Kubernetes' built-in readiness system, allowing external controllers to have a say in whether a pod should be marked ready. This enables sophisticated coordination between Kubernetes and external infrastructure.

## Understanding Readiness Gates

A readiness gate is a condition that must be satisfied before a pod is considered ready. While standard readiness probes check the pod's containers, readiness gates check arbitrary conditions that can be set by external controllers.

Think of readiness gates as external approval checkpoints. Your pod might be running and passing health checks, but it won't receive traffic until external systems give it the green light.

Common use cases include waiting for load balancer registration, service mesh proxy initialization, DNS propagation, or custom pre-production validation steps.

## How Readiness Gates Work

Readiness gates are defined in the pod specification. Each gate has a name, and Kubernetes waits for a condition with that name to be set to True before marking the pod ready.

External controllers watch for pods with specific readiness gates and update the pod's status conditions when appropriate. The pod only becomes ready when all readiness probes pass and all readiness gates are satisfied.

## Implementing a Basic Readiness Gate

Let's start with a simple pod using a custom readiness gate:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-app
  labels:
    app: web-app
spec:
  readinessGates:
  - conditionType: "example.com/load-balancer-ready"
  containers:
  - name: nginx
    image: nginx:1.24
    ports:
    - containerPort: 80
    readinessProbe:
      httpGet:
        path: /
        port: 80
      initialDelaySeconds: 5
      periodSeconds: 5
```

This pod won't be marked ready until both the readiness probe passes and something sets the `example.com/load-balancer-ready` condition to True.

## Building an External Controller

Let's build a controller that manages readiness gates for load balancer integration:

```go
// controller.go
package main

import (
    "context"
    "fmt"
    "time"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/watch"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
    "k8s.io/client-go/tools/clientcmd"
)

const (
    // Custom condition type for our readiness gate
    LoadBalancerReadyCondition = "example.com/load-balancer-ready"
)

type LoadBalancerController struct {
    clientset *kubernetes.Clientset
    lbClient  *LoadBalancerClient // Your load balancer API client
}

func NewLoadBalancerController() (*LoadBalancerController, error) {
    // Load kubeconfig
    config, err := rest.InClusterConfig()
    if err != nil {
        // Fallback to local kubeconfig for development
        config, err = clientcmd.BuildConfigFromFlags("",
            clientcmd.RecommendedHomeFile)
        if err != nil {
            return nil, err
        }
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return nil, err
    }

    return &LoadBalancerController{
        clientset: clientset,
        lbClient:  NewLoadBalancerClient(),
    }, nil
}

func (c *LoadBalancerController) Run(ctx context.Context) error {
    fmt.Println("Starting LoadBalancer Readiness Gate Controller")

    // Watch for pod events
    watcher, err := c.clientset.CoreV1().Pods("").Watch(ctx, metav1.ListOptions{})
    if err != nil {
        return fmt.Errorf("failed to create watcher: %w", err)
    }
    defer watcher.Stop()

    for {
        select {
        case <-ctx.Done():
            return nil
        case event := <-watcher.ResultChan():
            pod, ok := event.Object.(*corev1.Pod)
            if !ok {
                continue
            }

            // Check if this pod has our readiness gate
            if !c.hasReadinessGate(pod, LoadBalancerReadyCondition) {
                continue
            }

            switch event.Type {
            case watch.Added, watch.Modified:
                if err := c.reconcilePod(ctx, pod); err != nil {
                    fmt.Printf("Error reconciling pod %s/%s: %v\n",
                        pod.Namespace, pod.Name, err)
                }
            case watch.Deleted:
                if err := c.handlePodDeletion(ctx, pod); err != nil {
                    fmt.Printf("Error handling deletion of pod %s/%s: %v\n",
                        pod.Namespace, pod.Name, err)
                }
            }
        }
    }
}

func (c *LoadBalancerController) reconcilePod(ctx context.Context,
    pod *corev1.Pod) error {

    // Skip if pod is not running
    if pod.Status.Phase != corev1.PodRunning {
        return nil
    }

    // Check if condition already set to True
    if c.isConditionTrue(pod, LoadBalancerReadyCondition) {
        return nil
    }

    // Check if pod IP is assigned
    if pod.Status.PodIP == "" {
        fmt.Printf("Pod %s/%s has no IP yet, waiting\n",
            pod.Namespace, pod.Name)
        return nil
    }

    // Check if all containers are ready
    if !c.areContainersReady(pod) {
        fmt.Printf("Pod %s/%s containers not ready yet\n",
            pod.Namespace, pod.Name)
        return nil
    }

    // Register pod with load balancer
    fmt.Printf("Registering pod %s/%s with load balancer\n",
        pod.Namespace, pod.Name)

    if err := c.lbClient.RegisterBackend(pod.Status.PodIP,
        c.getServicePort(pod)); err != nil {
        return fmt.Errorf("failed to register with load balancer: %w", err)
    }

    // Wait for load balancer health checks to pass
    if err := c.waitForHealthyBackend(ctx, pod.Status.PodIP); err != nil {
        return fmt.Errorf("backend failed health checks: %w", err)
    }

    // Update pod condition to mark readiness gate as satisfied
    return c.updatePodCondition(ctx, pod, LoadBalancerReadyCondition,
        corev1.ConditionTrue, "LoadBalancerReady",
        "Pod successfully registered with load balancer")
}

func (c *LoadBalancerController) waitForHealthyBackend(ctx context.Context,
    ip string) error {

    timeout := time.After(60 * time.Second)
    ticker := time.NewTicker(2 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-timeout:
            return fmt.Errorf("timeout waiting for backend to be healthy")
        case <-ticker.C:
            healthy, err := c.lbClient.CheckBackendHealth(ip)
            if err != nil {
                fmt.Printf("Error checking backend health: %v\n", err)
                continue
            }
            if healthy {
                return nil
            }
        }
    }
}

func (c *LoadBalancerController) updatePodCondition(ctx context.Context,
    pod *corev1.Pod, conditionType corev1.PodConditionType,
    status corev1.ConditionStatus, reason, message string) error {

    // Get fresh copy of pod
    currentPod, err := c.clientset.CoreV1().Pods(pod.Namespace).Get(ctx,
        pod.Name, metav1.GetOptions{})
    if err != nil {
        return err
    }

    // Find existing condition or create new one
    conditionIndex := -1
    for i, condition := range currentPod.Status.Conditions {
        if condition.Type == conditionType {
            conditionIndex = i
            break
        }
    }

    newCondition := corev1.PodCondition{
        Type:               conditionType,
        Status:             status,
        LastTransitionTime: metav1.Now(),
        Reason:             reason,
        Message:            message,
    }

    if conditionIndex >= 0 {
        currentPod.Status.Conditions[conditionIndex] = newCondition
    } else {
        currentPod.Status.Conditions = append(currentPod.Status.Conditions,
            newCondition)
    }

    // Update pod status
    _, err = c.clientset.CoreV1().Pods(pod.Namespace).UpdateStatus(ctx,
        currentPod, metav1.UpdateOptions{})
    return err
}

func (c *LoadBalancerController) handlePodDeletion(ctx context.Context,
    pod *corev1.Pod) error {

    if pod.Status.PodIP == "" {
        return nil
    }

    fmt.Printf("Deregistering pod %s/%s from load balancer\n",
        pod.Namespace, pod.Name)
    return c.lbClient.DeregisterBackend(pod.Status.PodIP)
}

func (c *LoadBalancerController) hasReadinessGate(pod *corev1.Pod,
    conditionType corev1.PodConditionType) bool {

    for _, gate := range pod.Spec.ReadinessGates {
        if gate.ConditionType == conditionType {
            return true
        }
    }
    return false
}

func (c *LoadBalancerController) isConditionTrue(pod *corev1.Pod,
    conditionType corev1.PodConditionType) bool {

    for _, condition := range pod.Status.Conditions {
        if condition.Type == conditionType && condition.Status == corev1.ConditionTrue {
            return true
        }
    }
    return false
}

func (c *LoadBalancerController) areContainersReady(pod *corev1.Pod) bool {
    for _, status := range pod.Status.ContainerStatuses {
        if !status.Ready {
            return false
        }
    }
    return true
}

func (c *LoadBalancerController) getServicePort(pod *corev1.Pod) int {
    // Extract port from pod labels or annotations
    // Simplified for example
    return 80
}

// Simplified load balancer client
type LoadBalancerClient struct{}

func NewLoadBalancerClient() *LoadBalancerClient {
    return &LoadBalancerClient{}
}

func (lb *LoadBalancerClient) RegisterBackend(ip string, port int) error {
    // Call load balancer API to register backend
    fmt.Printf("Registering backend %s:%d\n", ip, port)
    // Implementation depends on your load balancer
    return nil
}

func (lb *LoadBalancerClient) DeregisterBackend(ip string) error {
    fmt.Printf("Deregistering backend %s\n", ip)
    return nil
}

func (lb *LoadBalancerClient) CheckBackendHealth(ip string) (bool, error) {
    // Check if backend is healthy in load balancer
    // Simulate health check passing after registration
    return true, nil
}

func main() {
    controller, err := NewLoadBalancerController()
    if err != nil {
        panic(err)
    }

    ctx := context.Background()
    if err := controller.Run(ctx); err != nil {
        panic(err)
    }
}
```

## Python-Based Readiness Gate Controller

Here's a Python implementation using the Kubernetes client library:

```python
# readiness_gate_controller.py
from kubernetes import client, config, watch
import time
import logging
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

READINESS_GATE_TYPE = "example.com/external-validator-ready"

class ExternalValidatorController:
    def __init__(self):
        try:
            config.load_incluster_config()
        except config.ConfigException:
            config.load_kube_config()

        self.v1 = client.CoreV1Api()
        self.validator = ExternalValidator()

    def run(self):
        """Main controller loop"""
        logger.info("Starting External Validator Readiness Gate Controller")

        w = watch.Watch()
        for event in w.stream(self.v1.list_pod_for_all_namespaces):
            pod = event['object']
            event_type = event['type']

            # Check if pod has our readiness gate
            if not self.has_readiness_gate(pod):
                continue

            if event_type in ['ADDED', 'MODIFIED']:
                self.reconcile_pod(pod)
            elif event_type == 'DELETED':
                self.handle_deletion(pod)

    def has_readiness_gate(self, pod: client.V1Pod) -> bool:
        """Check if pod has our custom readiness gate"""
        if not pod.spec.readiness_gates:
            return False

        for gate in pod.spec.readiness_gates:
            if gate.condition_type == READINESS_GATE_TYPE:
                return True
        return False

    def is_condition_true(self, pod: client.V1Pod) -> bool:
        """Check if our condition is already set to True"""
        if not pod.status.conditions:
            return False

        for condition in pod.status.conditions:
            if (condition.type == READINESS_GATE_TYPE and
                condition.status == "True"):
                return True
        return False

    def reconcile_pod(self, pod: client.V1Pod):
        """Reconcile pod readiness gate"""
        namespace = pod.metadata.namespace
        name = pod.metadata.name

        # Skip if not running
        if pod.status.phase != "Running":
            return

        # Skip if already satisfied
        if self.is_condition_true(pod):
            return

        # Skip if no IP assigned
        if not pod.status.pod_ip:
            logger.info(f"Pod {namespace}/{name} has no IP yet")
            return

        # Check if containers are ready
        if not self.are_containers_ready(pod):
            logger.info(f"Pod {namespace}/{name} containers not ready")
            return

        # Perform external validation
        logger.info(f"Validating pod {namespace}/{name} with external system")

        try:
            if self.validator.validate_pod(pod):
                self.update_condition(pod, "True", "ValidationPassed",
                    "Pod passed external validation")
            else:
                self.update_condition(pod, "False", "ValidationFailed",
                    "Pod failed external validation")
        except Exception as e:
            logger.error(f"Error validating pod {namespace}/{name}: {e}")

    def are_containers_ready(self, pod: client.V1Pod) -> bool:
        """Check if all containers are ready"""
        if not pod.status.container_statuses:
            return False

        return all(status.ready for status in pod.status.container_statuses)

    def update_condition(self, pod: client.V1Pod, status: str,
                        reason: str, message: str):
        """Update pod condition for readiness gate"""
        namespace = pod.metadata.namespace
        name = pod.metadata.name

        # Get fresh copy of pod
        current_pod = self.v1.read_namespaced_pod(name, namespace)

        # Create new condition
        new_condition = client.V1PodCondition(
            type=READINESS_GATE_TYPE,
            status=status,
            last_transition_time=client.V1Time(),
            reason=reason,
            message=message
        )

        # Find and update existing condition or append new one
        if current_pod.status.conditions is None:
            current_pod.status.conditions = []

        found = False
        for i, condition in enumerate(current_pod.status.conditions):
            if condition.type == READINESS_GATE_TYPE:
                current_pod.status.conditions[i] = new_condition
                found = True
                break

        if not found:
            current_pod.status.conditions.append(new_condition)

        # Update pod status
        try:
            self.v1.patch_namespaced_pod_status(name, namespace, current_pod)
            logger.info(f"Updated condition for pod {namespace}/{name} to {status}")
        except Exception as e:
            logger.error(f"Failed to update pod status: {e}")

    def handle_deletion(self, pod: client.V1Pod):
        """Handle pod deletion"""
        namespace = pod.metadata.namespace
        name = pod.metadata.name
        logger.info(f"Pod {namespace}/{name} deleted, cleaning up")
        self.validator.cleanup_pod(pod)

class ExternalValidator:
    """Mock external validation system"""

    def validate_pod(self, pod: client.V1Pod) -> bool:
        """
        Validate pod with external system
        Replace with actual validation logic
        """
        # Simulate validation delay
        time.sleep(2)

        # Example: check if pod has required labels
        required_labels = ['app', 'version']
        if not pod.metadata.labels:
            return False

        for label in required_labels:
            if label not in pod.metadata.labels:
                logger.warning(f"Pod missing required label: {label}")
                return False

        # Simulate external API call
        logger.info(f"Pod {pod.metadata.name} validation successful")
        return True

    def cleanup_pod(self, pod: client.V1Pod):
        """Cleanup any external resources for pod"""
        logger.info(f"Cleaning up external resources for {pod.metadata.name}")

if __name__ == "__main__":
    controller = ExternalValidatorController()
    controller.run()
```

## Deployment Configuration for the Controller

Deploy the controller to manage readiness gates:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: readiness-gate-controller
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: readiness-gate-controller
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch", "patch"]
- apiGroups: [""]
  resources: ["pods/status"]
  verbs: ["patch", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: readiness-gate-controller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: readiness-gate-controller
subjects:
- kind: ServiceAccount
  name: readiness-gate-controller
  namespace: kube-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: readiness-gate-controller
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: readiness-gate-controller
  template:
    metadata:
      labels:
        app: readiness-gate-controller
    spec:
      serviceAccountName: readiness-gate-controller
      containers:
      - name: controller
        image: readiness-gate-controller:latest
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
```

## Testing Readiness Gates

Create a test deployment that uses the readiness gate:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: test-app
  template:
    metadata:
      labels:
        app: test-app
        version: "1.0"
    spec:
      readinessGates:
      - conditionType: "example.com/external-validator-ready"
      containers:
      - name: app
        image: nginx:1.24
        ports:
        - containerPort: 80
        readinessProbe:
          httpGet:
            path: /
            port: 80
```

Watch the pod status to see the readiness gate in action:

```bash
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.conditions[?(@.type=="example.com/external-validator-ready")].status}{"\n"}{end}'
```

Custom readiness gates provide powerful integration points between Kubernetes and external systems. They enable sophisticated deployment orchestration, ensuring that pods only receive traffic when all dependencies, both internal and external, are fully satisfied.
