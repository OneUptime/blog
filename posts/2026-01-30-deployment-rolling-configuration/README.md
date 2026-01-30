# How to Build Rolling Deployment Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, Deployment, DevOps, CI/CD

Description: Configure Kubernetes rolling deployments with maxSurge, maxUnavailable, and progress deadlines for zero-downtime updates.

---

Rolling deployments are the default strategy in Kubernetes for updating applications without downtime. Instead of replacing all pods at once, Kubernetes gradually replaces old pods with new ones, ensuring your application remains available throughout the update process.

This guide walks through the complete configuration of rolling deployments, from basic setup to advanced options like readiness gates and rollback strategies.

## Understanding Rolling Update Strategy

A rolling update works by incrementally replacing pods running the old version with pods running the new version. Kubernetes manages this process by:

1. Creating new pods with the updated specification
2. Waiting for new pods to become ready
3. Terminating old pods
4. Repeating until all pods are updated

The key parameters that control this behavior are `maxSurge` and `maxUnavailable`.

## Basic Rolling Deployment Configuration

Here is a complete deployment manifest with rolling update configuration. This example deploys a web application with three replicas and configures the rolling update behavior.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-application
  namespace: production
  labels:
    app: web-application
    version: v1.2.0
spec:
  # Number of desired pods
  replicas: 3

  # How long to wait for a deployment to progress before reporting failure
  progressDeadlineSeconds: 600

  # Number of old ReplicaSets to retain for rollback
  revisionHistoryLimit: 10

  selector:
    matchLabels:
      app: web-application

  # Rolling update strategy configuration
  strategy:
    type: RollingUpdate
    rollingUpdate:
      # Maximum pods that can be created above desired count
      maxSurge: 1
      # Maximum pods that can be unavailable during update
      maxUnavailable: 0

  template:
    metadata:
      labels:
        app: web-application
    spec:
      containers:
      - name: web
        image: myregistry/web-application:v1.2.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

        # Readiness probe determines when pod can receive traffic
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3

        # Liveness probe determines when to restart the container
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 20
          timeoutSeconds: 3
          failureThreshold: 3
```

## maxSurge and maxUnavailable Explained

These two parameters give you precise control over the rolling update process. Understanding how they interact is essential for configuring deployments correctly.

### maxSurge

The `maxSurge` parameter specifies the maximum number of pods that can be created over the desired number of pods. This value can be an absolute number or a percentage.

| Value | Meaning |
|-------|---------|
| `maxSurge: 1` | At most 1 extra pod can exist during the update |
| `maxSurge: 25%` | At most 25% extra pods (rounded up) can exist |
| `maxSurge: 0` | No extra pods allowed, must remove old pods first |

### maxUnavailable

The `maxUnavailable` parameter specifies the maximum number of pods that can be unavailable during the update process.

| Value | Meaning |
|-------|---------|
| `maxUnavailable: 0` | All pods must remain available (safest for production) |
| `maxUnavailable: 1` | At most 1 pod can be unavailable |
| `maxUnavailable: 25%` | At most 25% of pods (rounded down) can be unavailable |

### Common Configuration Patterns

Different deployment scenarios call for different configurations.

**Zero-downtime deployment (safest)**

This configuration ensures no capacity loss during updates by always having extra pods ready before terminating old ones.

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
```

**Fast deployment (when brief capacity reduction is acceptable)**

This configuration speeds up deployments by allowing both extra pods and some unavailability simultaneously.

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 25%
    maxUnavailable: 25%
```

**Resource-constrained deployment (limited cluster capacity)**

When cluster resources are limited, this configuration prevents creating extra pods by removing old ones first.

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 0
    maxUnavailable: 1
```

### Update Sequence Examples

The following table shows how a 4-replica deployment progresses with different configurations.

| Step | maxSurge=1, maxUnavailable=0 | maxSurge=25%, maxUnavailable=25% |
|------|------------------------------|----------------------------------|
| Start | 4 old, 0 new | 4 old, 0 new |
| Step 1 | 4 old, 1 new (creating) | 3 old, 2 new (creating) |
| Step 2 | 3 old, 1 new (ready) | 2 old, 2 new (ready) |
| Step 3 | 3 old, 2 new (creating) | 1 old, 3 new (creating) |
| Step 4 | 2 old, 2 new (ready) | 0 old, 4 new (ready) |
| ... | Continue until complete | Complete |

## progressDeadlineSeconds Configuration

The `progressDeadlineSeconds` field specifies how long Kubernetes waits for a deployment to make progress before marking it as failed. Progress means either new pods becoming available or old pods being terminated.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-application
spec:
  # Wait 10 minutes for deployment progress
  progressDeadlineSeconds: 600

  # Rest of deployment spec...
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

### Choosing the Right Deadline

Consider these factors when setting `progressDeadlineSeconds`:

| Application Type | Recommended Value | Reasoning |
|-----------------|-------------------|-----------|
| Fast-starting services | 120-300 seconds | Quick startup, failures detected fast |
| Java/JVM applications | 300-600 seconds | JVM warmup takes time |
| Applications with migrations | 600-1200 seconds | Database migrations add delay |
| Large container images | 300-600 seconds | Image pull time varies |

### Monitoring Progress

Check deployment progress with the following command.

```bash
# View deployment status and progress
kubectl rollout status deployment/web-application -n production

# Sample output during rolling update:
# Waiting for deployment "web-application" rollout to finish: 1 out of 3 new replicas have been updated...
# Waiting for deployment "web-application" rollout to finish: 2 out of 3 new replicas have been updated...
# deployment "web-application" successfully rolled out
```

When the deadline is exceeded, Kubernetes adds a condition to the deployment.

```bash
# Check deployment conditions
kubectl describe deployment web-application -n production | grep -A5 Conditions

# Failed deployment shows:
# Conditions:
#   Type           Status  Reason
#   ----           ------  ------
#   Available      True    MinimumReplicasAvailable
#   Progressing    False   ProgressDeadlineExceeded
```

## Readiness Gates for Advanced Traffic Control

Readiness gates provide additional conditions that must be met before a pod is considered ready. This is useful for integrating with external systems like load balancers or service meshes.

### Pod Readiness Gate Configuration

This example shows a pod with a custom readiness gate that waits for a load balancer to register the pod.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-application
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: web-application
    spec:
      # Define custom readiness gates
      readinessGates:
      - conditionType: "www.example.com/load-balancer-ready"

      containers:
      - name: web
        image: myregistry/web-application:v1.2.0
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
```

### Setting Readiness Gate Conditions

An external controller or script must update the pod condition. Here is how to set the condition using kubectl.

```bash
# Get the pod name
POD_NAME=$(kubectl get pods -l app=web-application -n production -o jsonpath='{.items[0].metadata.name}')

# Patch the pod to set the readiness gate condition
kubectl patch pod $POD_NAME -n production --type=json -p='[
  {
    "op": "add",
    "path": "/status/conditions/-",
    "value": {
      "type": "www.example.com/load-balancer-ready",
      "status": "True",
      "lastTransitionTime": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }
  }
]' --subresource=status
```

### AWS ALB Ingress Controller Example

When using AWS ALB Ingress Controller, you can configure readiness gates to wait for target group registration.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-application
  annotations:
    # Enable ALB readiness gates
    alb.ingress.kubernetes.io/pod-readiness-gate-inject: enabled
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: web-application
    spec:
      containers:
      - name: web
        image: myregistry/web-application:v1.2.0
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
```

## Rollback Commands and Strategies

Kubernetes maintains a history of deployments, allowing you to roll back to previous versions when issues occur.

### Basic Rollback Commands

Roll back to the previous version when the current deployment has problems.

```bash
# Roll back to previous version
kubectl rollout undo deployment/web-application -n production

# Check rollback status
kubectl rollout status deployment/web-application -n production
```

### Viewing Deployment History

Review past deployments to choose a specific revision for rollback.

```bash
# View deployment history
kubectl rollout history deployment/web-application -n production

# Sample output:
# REVISION  CHANGE-CAUSE
# 1         Initial deployment
# 2         Update to v1.1.0
# 3         Update to v1.2.0 - added new feature
# 4         Update to v1.2.1 - hotfix

# View details of a specific revision
kubectl rollout history deployment/web-application -n production --revision=2
```

### Rolling Back to a Specific Revision

When you need to roll back to a specific version rather than just the previous one.

```bash
# Roll back to revision 2
kubectl rollout undo deployment/web-application -n production --to-revision=2

# Verify the rollback
kubectl get deployment web-application -n production -o jsonpath='{.spec.template.spec.containers[0].image}'
```

### Adding Change Cause Annotations

Track why each deployment was made by adding change cause annotations.

```bash
# Deploy with change cause annotation
kubectl apply -f deployment.yaml
kubectl annotate deployment/web-application -n production \
  kubernetes.io/change-cause="Update to v1.3.0 - performance improvements"

# Or include in the deployment manifest
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-application
  annotations:
    kubernetes.io/change-cause: "Update to v1.3.0 - performance improvements"
spec:
  # ... rest of spec
```

### Configuring Revision History Limit

Control how many old ReplicaSets are retained for rollback purposes.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-application
spec:
  # Keep last 10 revisions for rollback
  revisionHistoryLimit: 10

  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

| revisionHistoryLimit | Use Case |
|---------------------|----------|
| 0 | No rollback capability, saves etcd storage |
| 2-5 | Most production workloads |
| 10+ | When frequent rollbacks are needed |

## Monitoring Deployment Events

Kubernetes generates events during deployments that help you understand what is happening and troubleshoot issues.

### Viewing Deployment Events

Use kubectl to view events related to your deployment.

```bash
# View events for a specific deployment
kubectl describe deployment web-application -n production

# Events section shows:
# Events:
#   Type    Reason             Age   From                   Message
#   ----    ------             ----  ----                   -------
#   Normal  ScalingReplicaSet  5m    deployment-controller  Scaled up replica set web-application-7d9c8b5f6 to 1
#   Normal  ScalingReplicaSet  4m    deployment-controller  Scaled down replica set web-application-6b8c7d5e4 to 2
#   Normal  ScalingReplicaSet  4m    deployment-controller  Scaled up replica set web-application-7d9c8b5f6 to 2
```

### Filtering Events by Type

Find specific events using kubectl with field selectors.

```bash
# View only Warning events in the namespace
kubectl get events -n production --field-selector type=Warning

# View events for a specific object
kubectl get events -n production --field-selector involvedObject.name=web-application

# Watch events in real-time during a deployment
kubectl get events -n production --watch
```

### Common Deployment Events

The following table describes events you will see during rolling updates.

| Event Reason | Description |
|-------------|-------------|
| ScalingReplicaSet | Deployment is scaling a ReplicaSet up or down |
| ProgressDeadlineExceeded | Deployment failed to progress within deadline |
| MinimumReplicasAvailable | Required minimum replicas are available |
| ReplicaSetUpdated | ReplicaSet has been updated |
| NewReplicaSetCreated | New ReplicaSet created for updated pods |

### Event Monitoring Script

This script monitors deployment events and alerts on failures.

```bash
#!/bin/bash
# monitor-deployment.sh
# Usage: ./monitor-deployment.sh <deployment-name> <namespace>

DEPLOYMENT=$1
NAMESPACE=${2:-default}

echo "Monitoring deployment: $DEPLOYMENT in namespace: $NAMESPACE"

# Start watching rollout status in background
kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE --watch &
ROLLOUT_PID=$!

# Watch for warning events
kubectl get events -n $NAMESPACE --watch --field-selector type=Warning &
EVENTS_PID=$!

# Wait for rollout to complete
wait $ROLLOUT_PID
ROLLOUT_STATUS=$?

# Cleanup
kill $EVENTS_PID 2>/dev/null

if [ $ROLLOUT_STATUS -eq 0 ]; then
    echo "Deployment completed successfully"
else
    echo "Deployment failed or timed out"
    exit 1
fi
```

## Complete Production-Ready Example

Here is a complete deployment configuration that incorporates all the concepts covered in this guide.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-api
  namespace: production
  labels:
    app: production-api
    team: platform
    environment: production
  annotations:
    kubernetes.io/change-cause: "v2.1.0 - Added caching layer"
spec:
  # Desired number of running pods
  replicas: 5

  # Deployment progress timeout
  progressDeadlineSeconds: 600

  # Keep 5 revisions for rollback capability
  revisionHistoryLimit: 5

  # Minimum time a pod must be ready before considering it available
  minReadySeconds: 30

  selector:
    matchLabels:
      app: production-api

  strategy:
    type: RollingUpdate
    rollingUpdate:
      # Allow 2 extra pods during update (40% of 5)
      maxSurge: 2
      # Ensure all existing pods stay available
      maxUnavailable: 0

  template:
    metadata:
      labels:
        app: production-api
        version: v2.1.0
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      # Spread pods across availability zones
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: production-api

      # Graceful termination period
      terminationGracePeriodSeconds: 60

      # Service account for pod identity
      serviceAccountName: production-api

      containers:
      - name: api
        image: myregistry/production-api:v2.1.0
        imagePullPolicy: IfNotPresent

        ports:
        - name: http
          containerPort: 8080
          protocol: TCP
        - name: metrics
          containerPort: 9090
          protocol: TCP

        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace

        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"

        # Readiness probe: pod receives traffic only when ready
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3

        # Liveness probe: container restarts if unhealthy
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        # Startup probe: prevents other probes until startup completes
        startupProbe:
          httpGet:
            path: /health/startup
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 30

        # Lifecycle hooks for graceful shutdown
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - "sleep 10 && /app/graceful-shutdown.sh"

        volumeMounts:
        - name: config
          mountPath: /etc/config
          readOnly: true
        - name: tmp
          mountPath: /tmp

      volumes:
      - name: config
        configMap:
          name: production-api-config
      - name: tmp
        emptyDir: {}

      # Pod disruption budget reference
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: production-api
              topologyKey: kubernetes.io/hostname

---
# Pod Disruption Budget for controlled disruptions
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: production-api-pdb
  namespace: production
spec:
  # At least 3 pods must be available during voluntary disruptions
  minAvailable: 3
  selector:
    matchLabels:
      app: production-api
```

## Troubleshooting Rolling Deployments

When deployments fail or stall, use these commands to diagnose issues.

### Checking Deployment Status

```bash
# Get deployment overview
kubectl get deployment production-api -n production -o wide

# Check detailed status
kubectl describe deployment production-api -n production

# View replica set status
kubectl get replicasets -n production -l app=production-api

# Check pod status
kubectl get pods -n production -l app=production-api -o wide
```

### Debugging Failed Pods

```bash
# View logs from a failing pod
kubectl logs -n production -l app=production-api --tail=100

# View previous container logs (if container restarted)
kubectl logs -n production <pod-name> --previous

# Get detailed pod information
kubectl describe pod <pod-name> -n production

# Execute into pod for debugging
kubectl exec -it <pod-name> -n production -- /bin/sh
```

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Deployment stuck | Pods failing readiness probe | Check probe endpoints, increase timeouts |
| ProgressDeadlineExceeded | Update taking too long | Increase deadline, check image pull times |
| Pods in CrashLoopBackOff | Application crashing | Check logs, verify configuration |
| ImagePullBackOff | Cannot pull container image | Verify image name, check registry credentials |
| Insufficient resources | Not enough CPU or memory | Request more resources or scale cluster |

### Pausing and Resuming Deployments

Pause a deployment to make multiple changes without triggering multiple rollouts.

```bash
# Pause the deployment
kubectl rollout pause deployment/production-api -n production

# Make multiple changes
kubectl set image deployment/production-api -n production api=myregistry/production-api:v2.2.0
kubectl set resources deployment/production-api -n production -c api --limits=memory=2Gi

# Resume the deployment (triggers single rollout with all changes)
kubectl rollout resume deployment/production-api -n production
```

## Summary

Rolling deployments in Kubernetes provide a reliable way to update applications without downtime. The key configuration options are:

1. **maxSurge and maxUnavailable** control the pace and capacity during updates
2. **progressDeadlineSeconds** sets the timeout for deployment progress
3. **Readiness probes and gates** ensure pods are ready before receiving traffic
4. **revisionHistoryLimit** controls rollback capabilities
5. **Pod Disruption Budgets** protect against accidental capacity loss

Start with conservative settings (maxSurge=1, maxUnavailable=0) and adjust based on your application's requirements and your tolerance for risk during deployments. Monitor deployment events and maintain rollback capability by keeping sufficient revision history.
