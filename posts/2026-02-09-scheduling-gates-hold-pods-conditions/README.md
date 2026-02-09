# How to Configure Scheduling Gates to Hold Pods Until External Conditions Are Met

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling Gates, Pod Lifecycle

Description: Learn how to use scheduling gates to prevent pods from being scheduled until external conditions are met, enabling coordination with external systems and custom readiness checks.

---

Scheduling gates allow you to block pod scheduling until specific conditions are satisfied. This is useful when pods depend on external resources, manual approval, or complex validation that must complete before the pod can run.

A scheduling gate keeps a pod in "SchedulingGated" state, preventing the scheduler from even considering it until the gate is removed.

## Understanding Scheduling Gates

Scheduling gates were introduced in Kubernetes 1.26. They let you:

- Wait for external systems to be ready
- Require manual approval before scheduling
- Coordinate pod scheduling with CI/CD pipelines
- Implement custom admission logic
- Delay scheduling until specific cluster conditions are met

## Basic Scheduling Gate

Create a pod with a scheduling gate:

```yaml
# gated-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: gated-app
spec:
  schedulingGates:
  - name: example.com/wait-for-approval
  containers:
  - name: app
    image: nginx:1.21
    resources:
      requests:
        cpu: 500m
        memory: 512Mi
```

Check pod status:

```bash
kubectl get pod gated-app

# Output:
# NAME        READY   STATUS             RESTARTS   AGE
# gated-app   0/1     SchedulingGated    0          10s

kubectl describe pod gated-app

# You'll see:
# Status: SchedulingGated
# Scheduling Gates:
#   example.com/wait-for-approval
```

Remove the gate to allow scheduling:

```bash
# Remove all gates
kubectl patch pod gated-app --type=json -p='[{"op":"remove","path":"/spec/schedulingGates"}]'

# Or remove specific gate
kubectl patch pod gated-app --type=json -p='[{"op":"remove","path":"/spec/schedulingGates/0"}]'
```

## Multiple Scheduling Gates

Use multiple gates for complex conditions:

```yaml
# multi-gate-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-gated-app
spec:
  schedulingGates:
  - name: example.com/database-ready
  - name: example.com/storage-provisioned
  - name: example.com/manual-approval
  containers:
  - name: app
    image: myapp:v1.0
```

All gates must be removed before scheduling begins:

```bash
# Remove gates one by one
kubectl patch pod multi-gated-app --type=json -p='[{"op":"remove","path":"/spec/schedulingGates/2"}]'
kubectl patch pod multi-gated-app --type=json -p='[{"op":"remove","path":"/spec/schedulingGates/1"}]'
kubectl patch pod multi-gated-app --type=json -p='[{"op":"remove","path":"/spec/schedulingGates/0"}]'
```

## Automated Gate Controller

Build a controller that removes gates based on conditions:

```go
// gate-controller.go
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

type GateController struct {
    clientset *kubernetes.Clientset
}

func (c *GateController) processGatedPods(ctx context.Context) {
    pods, err := c.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
    if err != nil {
        fmt.Printf("Error listing pods: %v\n", err)
        return
    }

    for _, pod := range pods.Items {
        if pod.Spec.SchedulingGates == nil || len(pod.Spec.SchedulingGates) == 0 {
            continue
        }

        for i, gate := range pod.Spec.SchedulingGates {
            switch gate.Name {
            case "example.com/database-ready":
                if c.isDatabaseReady(pod.Namespace) {
                    c.removeGate(&pod, i)
                }
            case "example.com/storage-provisioned":
                if c.isStorageReady(&pod) {
                    c.removeGate(&pod, i)
                }
            case "example.com/config-validated":
                if c.isConfigValid(&pod) {
                    c.removeGate(&pod, i)
                }
            }
        }
    }
}

func (c *GateController) removeGate(pod *corev1.Pod, index int) {
    pod.Spec.SchedulingGates = append(
        pod.Spec.SchedulingGates[:index],
        pod.Spec.SchedulingGates[index+1:]...,
    )

    _, err := c.clientset.CoreV1().Pods(pod.Namespace).Update(
        context.Background(),
        pod,
        metav1.UpdateOptions{},
    )
    if err != nil {
        fmt.Printf("Error removing gate: %v\n", err)
    } else {
        fmt.Printf("Removed gate from pod %s/%s\n", pod.Namespace, pod.Name)
    }
}

func (c *GateController) isDatabaseReady(namespace string) bool {
    // Check if database is ready (example logic)
    statefulset, err := c.clientset.AppsV1().StatefulSets(namespace).Get(
        context.Background(),
        "database",
        metav1.GetOptions{},
    )
    if err != nil {
        return false
    }
    return statefulset.Status.ReadyReplicas >= statefulset.Status.Replicas
}

func (c *GateController) isStorageReady(pod *corev1.Pod) bool {
    // Check if all PVCs are bound
    for _, volume := range pod.Spec.Volumes {
        if volume.PersistentVolumeClaim != nil {
            pvc, err := c.clientset.CoreV1().PersistentVolumeClaims(pod.Namespace).Get(
                context.Background(),
                volume.PersistentVolumeClaim.ClaimName,
                metav1.GetOptions{},
            )
            if err != nil || pvc.Status.Phase != corev1.ClaimBound {
                return false
            }
        }
    }
    return true
}

func (c *GateController) isConfigValid(pod *corev1.Pod) bool {
    // Implement custom config validation
    return true
}

func main() {
    config, err := rest.InClusterConfig()
    if err != nil {
        panic(err)
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        panic(err)
    }

    controller := &GateController{clientset: clientset}

    ticker := time.NewTicker(10 * time.Second)
    defer ticker.Stop()

    for range ticker.C {
        controller.processGatedPods(context.Background())
    }
}
```

## Deployment with Scheduling Gates

Apply gates to deployment pods:

```yaml
# gated-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gated-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gated-app
  template:
    metadata:
      labels:
        app: gated-app
    spec:
      schedulingGates:
      - name: example.com/canary-approved
      containers:
      - name: app
        image: myapp:v2.0
        resources:
          requests:
            cpu: 1000m
            memory: 1Gi
```

Approve canary deployment by removing gates:

```bash
# List gated pods
kubectl get pods -l app=gated-app --field-selector status.phase=Pending

# Approve first pod (canary)
kubectl patch pod gated-app-7d8f9c5b-xyz12 --type=json \
  -p='[{"op":"remove","path":"/spec/schedulingGates"}]'

# Monitor canary
sleep 300

# If successful, approve remaining pods
for pod in $(kubectl get pods -l app=gated-app -o name); do
  kubectl patch $pod --type=json -p='[{"op":"remove","path":"/spec/schedulingGates"}]'
done
```

## Integration with CI/CD

Use gates for deployment approvals:

```yaml
# cicd-gated-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-app
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: production-app
  template:
    metadata:
      labels:
        app: production-app
      annotations:
        deployment-id: "12345"
        requires-approval: "true"
    spec:
      schedulingGates:
      - name: cicd.example.com/deployment-approved
      containers:
      - name: app
        image: production-app:v3.0
```

CI/CD pipeline removes gate after validation:

```bash
#!/bin/bash
# approve-deployment.sh

DEPLOYMENT_ID=$1
NAMESPACE="production"

# Run automated tests
./run-integration-tests.sh $DEPLOYMENT_ID

if [ $? -eq 0 ]; then
  echo "Tests passed, approving deployment"

  # Get pods for this deployment
  pods=$(kubectl get pods -n $NAMESPACE \
    -l app=production-app \
    -o json | jq -r ".items[] | select(.metadata.annotations.\"deployment-id\"==\"$DEPLOYMENT_ID\") | .metadata.name")

  # Remove gates
  for pod in $pods; do
    kubectl patch pod $pod -n $NAMESPACE --type=json \
      -p='[{"op":"remove","path":"/spec/schedulingGates"}]'
  done
else
  echo "Tests failed, deployment not approved"
  exit 1
fi
```

## Database Migration Gate

Wait for database migrations before scheduling:

```yaml
# migration-aware-deployment.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  namespace: production
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: migrate
        image: migrate:v1.0
        command: ["./migrate", "up"]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api-server
  template:
    spec:
      schedulingGates:
      - name: example.com/migration-complete
      containers:
      - name: api
        image: api-server:v2.0
```

Controller monitors migration job and removes gate when complete.

## Monitoring Gated Pods

Track pods waiting on gates:

```bash
# Count gated pods
kubectl get pods --all-namespaces --field-selector status.phase=Pending -o json | \
  jq '[.items[] | select(.spec.schedulingGates != null)] | length'

# List gated pods with their gates
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.schedulingGates != null) | {namespace: .metadata.namespace, name: .metadata.name, gates: .spec.schedulingGates}'

# Find pods waiting longest
kubectl get pods --all-namespaces --field-selector status.phase=Pending -o json | \
  jq -r '.items[] | select(.spec.schedulingGates != null) | {name: .metadata.name, age: .metadata.creationTimestamp}'
```

## Best Practices

1. **Use Descriptive Names**: Gate names should clearly indicate what they're waiting for
2. **Set Timeouts**: Implement timeouts to clean up stuck gated pods
3. **Document Gates**: Maintain documentation of what each gate means
4. **Monitor Metrics**: Track how long pods spend in gated state
5. **Automate Removal**: Use controllers to automatically remove gates when conditions are met
6. **Test Thoroughly**: Validate gate logic works correctly
7. **Avoid Overuse**: Don't use gates when init containers or readiness probes would suffice
8. **Clean Up**: Delete gated pods that will never be approved

Scheduling gates provide fine-grained control over when pods begin scheduling, enabling integration with external systems, manual approval workflows, and complex orchestration scenarios that go beyond standard Kubernetes scheduling mechanisms.

