# How to Build Automated Rollback Procedures Triggered by Kubernetes Health Check Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Automation, Health Checks, Rollback

Description: Implement automated rollback mechanisms that detect health check failures during deployments and automatically revert to the last known good version, minimizing service disruptions.

---

Deployments fail. Even with extensive testing, issues slip through to production and cause health check failures. The difference between a minor incident and a major outage often comes down to how quickly you detect and respond to these failures. Automated rollback procedures triggered by health check failures provide that rapid response without requiring human intervention.

Manual rollback processes introduce dangerous delays. By the time someone notices failing health checks, investigates the issue, and executes a rollback command, users have already experienced degraded service. Automated rollback reduces this mean time to recovery from minutes or hours to seconds.

This approach shifts the burden from reactive monitoring to proactive automation. Instead of hoping someone notices the alert and takes action quickly, your system automatically detects problems and reverts to safety. This is not about avoiding investigation; it is about minimizing user impact while you figure out what went wrong.

## Understanding Kubernetes Health Check Mechanisms

Kubernetes provides three types of probes that monitor container health: liveness probes, readiness probes, and startup probes. Each serves a distinct purpose in maintaining application availability.

Liveness probes determine whether a container is running properly. When liveness checks fail repeatedly, Kubernetes restarts the container. This handles situations where the application has deadlocked or entered an unrecoverable state.

Readiness probes determine whether a container is ready to serve traffic. Failing readiness checks causes Kubernetes to remove the pod from service endpoints, preventing traffic from reaching unhealthy instances. The pod continues running but receives no requests.

Startup probes protect slow-starting applications during initialization. They disable liveness and readiness checks until the application has fully started, preventing premature restarts of legitimately slow-starting services.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: api-service:v2.0.0
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        startupProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 0
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 30
```

For automated rollback, readiness probe failures are the most relevant signal. When new pods consistently fail readiness checks during a deployment, that indicates the new version has problems serving traffic. This is the trigger point for automated rollback.

## Implementing Basic Automated Rollback with Kubernetes

Kubernetes does not provide built-in automated rollback based on health check failures, but you can build this capability using deployment strategies and external controllers. The simplest approach uses progressive rollout with manual intervention points, while more sophisticated solutions employ custom controllers that monitor health and trigger rollbacks automatically.

Start by configuring your deployment with appropriate rollout parameters that limit blast radius:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  annotations:
    # Rollback settings
    deployment.kubernetes.io/revision: "5"
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  minReadySeconds: 30
  progressDeadlineSeconds: 600
  template:
    spec:
      containers:
      - name: app
        image: web-app:v3.0.0
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          periodSeconds: 5
          failureThreshold: 3
```

The `maxSurge: 1` and `maxUnavailable: 0` settings ensure that only one new pod is created at a time and no old pods are removed until the new pod is ready. The `minReadySeconds: 30` setting requires new pods to pass readiness checks for 30 seconds before considering them ready. This prevents flapping health checks from being considered successful.

The `progressDeadlineSeconds: 600` setting causes Kubernetes to mark the deployment as failed if it does not make progress within 10 minutes. This handles scenarios where new pods never become ready.

Check deployment status programmatically to detect rollout failures:

```bash
#!/bin/bash
# check-deployment-health.sh - Monitor deployment and rollback on failure

DEPLOYMENT="web-app"
NAMESPACE="production"
TIMEOUT=600

# Wait for rollout to complete or fail
kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE --timeout=${TIMEOUT}s

if [ $? -ne 0 ]; then
  echo "Deployment rollout failed or timed out"

  # Check if new pods are failing readiness checks
  FAILING_PODS=$(kubectl get pods -n $NAMESPACE -l app=$DEPLOYMENT \
    -o jsonpath='{range .items[?(@.status.containerStatuses[0].ready==false)]}{.metadata.name}{"\n"}{end}')

  if [ -n "$FAILING_PODS" ]; then
    echo "Found pods failing readiness checks:"
    echo "$FAILING_PODS"

    # Trigger rollback to previous version
    echo "Rolling back to previous version..."
    kubectl rollout undo deployment/$DEPLOYMENT -n $NAMESPACE

    # Wait for rollback to complete
    kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE --timeout=300s

    echo "Rollback completed"
    exit 1
  fi
fi

echo "Deployment completed successfully"
```

This script monitors deployment progress and automatically triggers a rollback if the deployment fails or times out. Run this as part of your CI/CD pipeline to provide automated rollback for deployments.

## Building a Custom Rollback Controller

For production environments requiring more sophisticated rollback logic, build a custom Kubernetes controller that monitors deployment health continuously and triggers rollbacks based on configurable criteria.

Here is a Go-based controller that watches deployments and triggers rollback when health check failures exceed thresholds:

```go
package main

import (
    "context"
    "fmt"
    "time"

    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

type RollbackController struct {
    clientset *kubernetes.Clientset
    namespace string
    failureThreshold int
    checkInterval time.Duration
}

func NewRollbackController(namespace string, failureThreshold int) (*RollbackController, error) {
    config, err := rest.InClusterConfig()
    if err != nil {
        return nil, err
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return nil, err
    }

    return &RollbackController{
        clientset: clientset,
        namespace: namespace,
        failureThreshold: failureThreshold,
        checkInterval: 30 * time.Second,
    }, nil
}

func (rc *RollbackController) MonitorDeployment(ctx context.Context, deploymentName string) {
    ticker := time.NewTicker(rc.checkInterval)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            if err := rc.checkAndRollback(deploymentName); err != nil {
                fmt.Printf("Error checking deployment: %v\n", err)
            }
        }
    }
}

func (rc *RollbackController) checkAndRollback(deploymentName string) error {
    deployment, err := rc.clientset.AppsV1().Deployments(rc.namespace).Get(
        context.TODO(), deploymentName, metav1.GetOptions{})
    if err != nil {
        return err
    }

    // Check if deployment is progressing
    if !isDeploymentHealthy(deployment) {
        failedPods, err := rc.getFailedPods(deployment)
        if err != nil {
            return err
        }

        if len(failedPods) >= rc.failureThreshold {
            fmt.Printf("Deployment %s has %d failed pods, triggering rollback\n",
                deploymentName, len(failedPods))
            return rc.rollback(deploymentName)
        }
    }

    return nil
}

func isDeploymentHealthy(deployment *appsv1.Deployment) bool {
    // Check if deployment is progressing
    for _, condition := range deployment.Status.Conditions {
        if condition.Type == appsv1.DeploymentProgressing {
            if condition.Status == corev1.ConditionFalse {
                return false
            }
        }
    }

    // Check if desired replicas match ready replicas
    if deployment.Status.ReadyReplicas < deployment.Status.Replicas {
        return false
    }

    return true
}

func (rc *RollbackController) getFailedPods(deployment *appsv1.Deployment) ([]corev1.Pod, error) {
    labelSelector := metav1.FormatLabelSelector(deployment.Spec.Selector)
    pods, err := rc.clientset.CoreV1().Pods(rc.namespace).List(
        context.TODO(), metav1.ListOptions{LabelSelector: labelSelector})
    if err != nil {
        return nil, err
    }

    var failedPods []corev1.Pod
    for _, pod := range pods.Items {
        // Check if pod is failing readiness checks
        for _, condition := range pod.Status.Conditions {
            if condition.Type == corev1.PodReady && condition.Status == corev1.ConditionFalse {
                failedPods = append(failedPods, pod)
                break
            }
        }
    }

    return failedPods, nil
}

func (rc *RollbackController) rollback(deploymentName string) error {
    // Get deployment to find previous revision
    deployment, err := rc.clientset.AppsV1().Deployments(rc.namespace).Get(
        context.TODO(), deploymentName, metav1.GetOptions{})
    if err != nil {
        return err
    }

    // Rollback to previous revision
    rollbackConfig := &appsv1.DeploymentRollback{
        Name: deploymentName,
    }

    err = rc.clientset.AppsV1().Deployments(rc.namespace).Rollback(
        context.TODO(), rollbackConfig, metav1.CreateOptions{})
    if err != nil {
        return err
    }

    fmt.Printf("Successfully triggered rollback for deployment %s\n", deploymentName)
    return nil
}

func main() {
    controller, err := NewRollbackController("production", 2)
    if err != nil {
        panic(err)
    }

    ctx := context.Background()
    controller.MonitorDeployment(ctx, "api-service")
}
```

Deploy this controller as a Deployment in your cluster with appropriate RBAC permissions to watch deployments and trigger rollbacks.

## Integrating with Progressive Delivery Tools

Progressive delivery tools like Flagger and Argo Rollouts provide sophisticated automated rollback capabilities based on metrics and health checks. These tools offer production-ready implementations of automated rollback logic.

Flagger performs canary analysis during rollouts and automatically rolls back if metrics indicate problems:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api-service
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  progressDeadlineSeconds: 600
  service:
    port: 8080
  analysis:
    interval: 30s
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 1m
    webhooks:
    - name: load-test
      url: http://flagger-loadtester/
      timeout: 5s
      metadata:
        type: cmd
        cmd: "hey -z 1m -q 10 -c 2 http://api-service-canary:8080/"
```

Flagger gradually shifts traffic to the new version while monitoring metrics. If the success rate drops below 99% or request duration exceeds 500ms, Flagger automatically rolls back to the stable version.

Argo Rollouts provides similar capabilities with more flexible analysis options:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: web-app
spec:
  replicas: 10
  strategy:
    canary:
      steps:
      - setWeight: 10
      - pause: {duration: 1m}
      - setWeight: 25
      - pause: {duration: 2m}
      - setWeight: 50
      - pause: {duration: 3m}
      - setWeight: 75
      - pause: {duration: 5m}
      analysis:
        templates:
        - templateName: health-check-analysis
        startingStep: 1
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: app
        image: web-app:v2.0.0
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: health-check-analysis
spec:
  metrics:
  - name: success-rate
    interval: 30s
    successCondition: result >= 0.95
    failureLimit: 3
    provider:
      prometheus:
        address: http://prometheus:9090
        query: |
          sum(rate(http_requests_total{status!~"5.."}[1m]))
          /
          sum(rate(http_requests_total[1m]))
```

These tools handle the complexity of gradual rollout, metric collection, analysis, and automated rollback, providing battle-tested implementations suitable for production use.

## Testing Automated Rollback Procedures

Before relying on automated rollback in production, test the mechanisms thoroughly in staging environments. Simulate various failure scenarios to verify that rollback triggers correctly and restores service quickly.

Create a broken deployment intentionally to test rollback behavior:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-app
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: app
        image: nginx:latest
        readinessProbe:
          httpGet:
            path: /nonexistent
            port: 8080
          periodSeconds: 5
          failureThreshold: 2
```

This deployment will fail readiness checks because the path does not exist. Deploy it and verify that your automated rollback mechanism detects the failure and reverts to the previous version.

Measure rollback timing to ensure it meets your recovery time objectives:

```bash
# Deploy broken version and measure rollback time
START_TIME=$(date +%s)
kubectl apply -f broken-deployment.yaml

# Wait for automated rollback to trigger
while true; do
  STATUS=$(kubectl rollout status deployment/test-app --timeout=5s 2>&1)
  if echo "$STATUS" | grep -q "successfully rolled out"; then
    END_TIME=$(date +%s)
    ROLLBACK_TIME=$((END_TIME - START_TIME))
    echo "Rollback completed in $ROLLBACK_TIME seconds"
    break
  fi
  sleep 2
done
```

Document the expected rollback time and set alerting thresholds accordingly. If rollback takes longer than expected, investigate bottlenecks in your detection or rollback execution logic.

Automated rollback procedures provide critical protection against deployment failures. By detecting health check failures and automatically reverting to known good versions, you minimize the impact of bad deployments on users. This does not eliminate the need for good testing and gradual rollouts, but it provides an essential safety net when problems slip through.
