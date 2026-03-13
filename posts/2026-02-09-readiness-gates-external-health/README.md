# How to Set Up Kubernetes Readiness Gates for External Health Check Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Readiness Gates, Health Checks, External Integration

Description: Integrate external health check systems with Kubernetes using readiness gates to control pod readiness based on criteria beyond built-in probe mechanisms, enabling sophisticated traffic management.

---

Standard Kubernetes probes execute inside the cluster and check application endpoints. Sometimes you need to control pod readiness based on external factors like load balancer health checks, external monitoring systems, or manual approval workflows. Readiness gates provide this capability by allowing external controllers to influence pod readiness status.

Readiness gates add additional conditions that pods must satisfy before Kubernetes considers them ready. Unlike standard probes that Kubernetes manages automatically, readiness gates require external controllers to set their status. This enables integration with external systems that have visibility into conditions Kubernetes cannot directly observe.

The most common use cases include coordinating with external load balancers, integrating with advanced monitoring platforms, and implementing manual approval gates for sensitive deployments.

## Understanding Readiness Gates

Readiness gates add custom conditions to pod readiness evaluation. A pod is ready only when all readiness probes pass and all readiness gates show true status.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api-pod
  labels:
    app: api-service
spec:
  readinessGates:
  - conditionType: "example.com/load-balancer-ready"
  - conditionType: "example.com/external-monitor-healthy"
  containers:
  - name: api
    image: api-service:v1.0.0
    ports:
    - containerPort: 8080
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      periodSeconds: 5
```

This pod defines two readiness gates. Even if the readiness probe passes, the pod remains not ready until an external controller sets both gate conditions to true.

Check readiness gate status:

```bash
kubectl get pod api-pod -o jsonpath='{.status.conditions[?(@.type=="example.com/load-balancer-ready")]}'
```

## Integrating with External Load Balancers

Cloud load balancers perform their own health checks separate from Kubernetes probes. Readiness gates synchronize Kubernetes pod status with load balancer health check results.

Create a controller that monitors load balancer health checks:

```go
package main

import (
    "context"
    "fmt"
    "time"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

type LoadBalancerController struct {
    clientset *kubernetes.Clientset
}

func NewController() (*LoadBalancerController, error) {
    config, err := rest.InClusterConfig()
    if err != nil {
        return nil, err
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return nil, err
    }

    return &LoadBalancerController{clientset: clientset}, nil
}

func (lbc *LoadBalancerController) UpdateReadinessGate(podName, namespace string, ready bool) error {
    pod, err := lbc.clientset.CoreV1().Pods(namespace).Get(
        context.TODO(), podName, metav1.GetOptions{})
    if err != nil {
        return err
    }

    // Create or update readiness gate condition
    conditionType := corev1.PodConditionType("example.com/load-balancer-ready")
    status := corev1.ConditionFalse
    if ready {
        status = corev1.ConditionTrue
    }

    newCondition := corev1.PodCondition{
        Type:               conditionType,
        Status:             status,
        LastProbeTime:      metav1.Now(),
        LastTransitionTime: metav1.Now(),
    }

    // Find and update existing condition or append new one
    found := false
    for i, condition := range pod.Status.Conditions {
        if condition.Type == conditionType {
            pod.Status.Conditions[i] = newCondition
            found = true
            break
        }
    }

    if !found {
        pod.Status.Conditions = append(pod.Status.Conditions, newCondition)
    }

    // Update pod status
    _, err = lbc.clientset.CoreV1().Pods(namespace).UpdateStatus(
        context.TODO(), pod, metav1.UpdateOptions{})
    return err
}

func (lbc *LoadBalancerController) MonitorLoadBalancer(ctx context.Context) {
    ticker := time.NewTicker(10 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            // Query external load balancer API
            healthy := lbc.checkLoadBalancerHealth()

            // Update all pod readiness gates
            pods, err := lbc.clientset.CoreV1().Pods("production").List(
                context.TODO(), metav1.ListOptions{
                    LabelSelector: "app=api-service",
                })
            if err != nil {
                fmt.Printf("Error listing pods: %v\n", err)
                continue
            }

            for _, pod := range pods.Items {
                err := lbc.UpdateReadinessGate(pod.Name, pod.Namespace, healthy)
                if err != nil {
                    fmt.Printf("Error updating pod %s: %v\n", pod.Name, err)
                }
            }
        }
    }
}

func (lbc *LoadBalancerController) checkLoadBalancerHealth() bool {
    // Query actual load balancer API
    // This is a stub implementation
    return true
}
```

Deploy this controller to monitor load balancer health and update pod readiness gates accordingly.

## Implementing Manual Approval Gates

For sensitive deployments requiring human approval, implement readiness gates that wait for manual confirmation before allowing pods into service.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-service
  namespace: production
  annotations:
    deployment.approval.required: "true"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: critical-service
  template:
    metadata:
      labels:
        app: critical-service
    spec:
      readinessGates:
      - conditionType: "approval.example.com/manual-approval"
      containers:
      - name: service
        image: critical-service:v2.0.0
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
```

Create a manual approval script:

```bash
#!/bin/bash
# approve-deployment.sh - Manually approve deployment readiness

NAMESPACE=$1
DEPLOYMENT=$2

if [ -z "$NAMESPACE" ] || [ -z "$DEPLOYMENT" ]; then
  echo "Usage: $0 <namespace> <deployment>"
  exit 1
fi

# Get all pods for deployment
PODS=$(kubectl get pods -n $NAMESPACE -l app=$DEPLOYMENT -o name)

echo "Pods pending approval:"
echo "$PODS"
echo
read -p "Approve deployment? (yes/no): " APPROVAL

if [ "$APPROVAL" != "yes" ]; then
  echo "Deployment not approved"
  exit 1
fi

# Approve each pod
for POD in $PODS; do
  POD_NAME=$(basename $POD)
  echo "Approving $POD_NAME..."

  # Update readiness gate condition
  kubectl patch pod $POD_NAME -n $NAMESPACE --subresource=status --type=merge -p '{
    "status": {
      "conditions": [{
        "type": "approval.example.com/manual-approval",
        "status": "True",
        "lastProbeTime": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
        "lastTransitionTime": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
      }]
    }
  }'
done

echo "Deployment approved"
```

## Integrating with External Monitoring Systems

Advanced monitoring platforms can provide sophisticated health assessments that inform Kubernetes readiness decisions.

```python
import time
from kubernetes import client, config
from datetime import datetime

class MonitoringIntegration:
    def __init__(self):
        config.load_incluster_config()
        self.v1 = client.CoreV1Api()

    def check_external_metrics(self, pod_name, namespace):
        """Query external monitoring system for pod health."""
        # This would query your actual monitoring system
        # Example: Query Datadog, New Relic, etc.
        metrics = {
            "error_rate": 0.01,
            "latency_p99": 150,
            "throughput": 1000
        }

        # Pod is healthy if error rate < 5%, latency < 500ms
        healthy = (metrics["error_rate"] < 0.05 and
                  metrics["latency_p99"] < 500)

        return healthy

    def update_readiness_gate(self, pod_name, namespace, ready):
        """Update pod readiness gate based on monitoring data."""
        try:
            pod = self.v1.read_namespaced_pod(pod_name, namespace)

            condition = client.V1PodCondition(
                type="monitoring.example.com/external-health",
                status="True" if ready else "False",
                last_probe_time=datetime.now(),
                last_transition_time=datetime.now()
            )

            # Update conditions
            conditions = pod.status.conditions or []
            found = False

            for i, cond in enumerate(conditions):
                if cond.type == condition.type:
                    conditions[i] = condition
                    found = True
                    break

            if not found:
                conditions.append(condition)

            # Update pod status
            pod.status.conditions = conditions
            self.v1.patch_namespaced_pod_status(pod_name, namespace, pod)

        except Exception as e:
            print(f"Error updating pod {pod_name}: {e}")

    def monitor_loop(self, namespace, label_selector):
        """Continuously monitor pods and update readiness gates."""
        while True:
            try:
                pods = self.v1.list_namespaced_pod(
                    namespace,
                    label_selector=label_selector
                )

                for pod in pods.items:
                    healthy = self.check_external_metrics(
                        pod.metadata.name,
                        namespace
                    )
                    self.update_readiness_gate(
                        pod.metadata.name,
                        namespace,
                        healthy
                    )

                time.sleep(30)

            except Exception as e:
                print(f"Error in monitoring loop: {e}")
                time.sleep(10)

if __name__ == "__main__":
    monitor = MonitoringIntegration()
    monitor.monitor_loop("production", "app=api-service")
```

## Deploying Readiness Gate Controllers

Package readiness gate controllers as Kubernetes deployments with appropriate RBAC permissions:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: readiness-controller
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: readiness-controller
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch", "patch"]
- apiGroups: [""]
  resources: ["pods/status"]
  verbs: ["update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: readiness-controller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: readiness-controller
subjects:
- kind: ServiceAccount
  name: readiness-controller
  namespace: kube-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: readiness-controller
  namespace: kube-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: readiness-controller
  template:
    metadata:
      labels:
        app: readiness-controller
    spec:
      serviceAccountName: readiness-controller
      containers:
      - name: controller
        image: readiness-controller:v1.0.0
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
```

Readiness gates extend Kubernetes health checking by integrating external systems into pod readiness decisions. This enables sophisticated traffic management scenarios where pod readiness depends on factors beyond what Kubernetes can directly observe. By implementing readiness gate controllers that monitor external systems and update gate status accordingly, you gain fine-grained control over when pods receive production traffic.
