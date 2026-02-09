# How to Troubleshoot Kubernetes Deployment ReplicaSet Stuck at Zero Available Replicas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Deployments, Troubleshooting

Description: Learn how to diagnose and fix Kubernetes Deployments with ReplicaSets stuck at zero available replicas, including pod scheduling failures, image pull errors, and resource constraints.

---

Deployments stuck with zero available replicas prevent applications from serving traffic and indicate serious problems preventing pod creation or readiness. While the Deployment and ReplicaSet objects exist, no pods reach the Running and Ready state. This complete availability failure requires systematic diagnosis to identify and resolve the blocking issue.

This guide walks through diagnosing ReplicaSet availability problems, identifying common blockers, and implementing solutions that restore service availability.

## Understanding ReplicaSet Replica Management

Deployments create ReplicaSets that manage pod replicas. The ReplicaSet controller creates pods matching the desired count and monitors their status. Available replicas are pods that are Running and pass readiness checks. When the available count stays at zero, either pods aren't being created, they're failing to start, or they're failing readiness checks.

Multiple layers can block replica availability. Scheduling failures prevent pods from being placed on nodes. Image pull errors stop containers from starting. Resource constraints cause OOMKills. Readiness probe failures mark running pods as unavailable. Each requires different diagnostic approaches.

## Identifying Zero Replica Deployments

Check Deployment status to confirm zero available replicas.

```bash
# List deployments
kubectl get deployments -A

# Output showing problem:
# NAMESPACE   NAME     READY   UP-TO-DATE   AVAILABLE   AGE
# default     myapp    0/3     3            0           10m

# Get detailed Deployment information
kubectl describe deployment myapp -n default
```

Check the ReplicaSet status.

```bash
# Find ReplicaSet for Deployment
kubectl get replicaset -n default -l app=myapp

# Output:
# NAME               DESIRED   CURRENT   READY   AGE
# myapp-6f8d9c7b5    3         3         0       10m

# Describe ReplicaSet for events
kubectl describe replicaset myapp-6f8d9c7b5 -n default
```

Check pod status to understand what's failing.

```bash
# List pods for the Deployment
kubectl get pods -n default -l app=myapp

# Common problematic states:
# NAME                    READY   STATUS             RESTARTS   AGE
# myapp-6f8d9c7b5-abc     0/1     ImagePullBackOff   0          10m
# myapp-6f8d9c7b5-def     0/1     Pending            0          10m
# myapp-6f8d9c7b5-ghi     0/1     CrashLoopBackOff   5          10m
```

## Diagnosing Scheduling Failures

Pods stuck in Pending state indicate scheduling failures. Check why the scheduler can't place pods.

```bash
# Describe a pending pod
kubectl describe pod myapp-6f8d9c7b5-abc -n default | grep -A 10 Events

# Common scheduling failure messages:
# Warning  FailedScheduling  2m  default-scheduler  0/3 nodes available:
#   3 Insufficient cpu, 3 Insufficient memory
# Warning  FailedScheduling  2m  default-scheduler  0/3 nodes available:
#   3 node(s) didn't match Pod's node affinity/selector
```

Check resource requests against node capacity.

```bash
# View resource requests in Deployment
kubectl get deployment myapp -n default -o jsonpath='{.spec.template.spec.containers[0].resources}'

# Output:
# {"requests":{"cpu":"4","memory":"16Gi"},"limits":{"cpu":"8","memory":"32Gi"}}

# Check node allocatable resources
kubectl describe nodes | grep -A 10 "Allocatable:"

# If requests exceed allocatable, reduce requests or add nodes
```

Fix scheduling failures by adjusting resource requests.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:v1.0
        resources:
          requests:
            cpu: "500m"      # Reduced from 4 cores
            memory: "1Gi"    # Reduced from 16Gi
          limits:
            cpu: "1"
            memory: "2Gi"
```

Apply the fix.

```bash
kubectl apply -f deployment.yaml

# Watch pod creation
kubectl get pods -n default -l app=myapp -w
```

## Fixing Image Pull Errors

ImagePullBackOff prevents containers from starting. Check image configuration and registry access.

```bash
# Check image pull errors
kubectl describe pod myapp-6f8d9c7b5-abc -n default | grep -A 5 "Failed to pull image"

# Common errors:
# Failed to pull image "myregistry.com/myapp:v1.0": rpc error: code = Unknown
#   desc = failed to pull: failed to resolve reference: pull access denied
# Failed to pull image "myapp:v1.0": rpc error: code = NotFound
#   desc = failed to pull: manifest unknown
```

Verify the image exists and is accessible.

```bash
# Check if image name and tag are correct
kubectl get deployment myapp -n default -o jsonpath='{.spec.template.spec.containers[0].image}'

# Test image pull manually
docker pull myregistry.com/myapp:v1.0

# If authentication fails, check ImagePullSecrets
kubectl get deployment myapp -n default -o jsonpath='{.spec.template.spec.imagePullSecrets}'
```

Fix by correcting the image reference or adding authentication.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
      - name: app
        image: myregistry.com/myapp:v1.0  # Correct image path
        imagePullPolicy: IfNotPresent
      imagePullSecrets:
      - name: regcred  # Add registry credentials
```

## Resolving CrashLoopBackOff Issues

Pods that start but immediately crash indicate application or configuration problems.

```bash
# Check pod logs
kubectl logs myapp-6f8d9c7b5-abc -n default

# Common crash causes:
# Error: Environment variable DATABASE_URL not set
# panic: runtime error: invalid memory address
# Error: Cannot bind to port 8080: permission denied

# Check previous container logs if restarting
kubectl logs myapp-6f8d9c7b5-abc -n default --previous
```

Check for missing configuration or secrets.

```bash
# Verify ConfigMaps exist
kubectl get configmap -n default

# Verify Secrets exist
kubectl get secret -n default

# Check environment variables in pod spec
kubectl get deployment myapp -n default -o yaml | grep -A 20 env:
```

Fix configuration issues.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:v1.0
        env:
        # Add missing environment variables
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        - name: LOG_LEVEL
          value: "info"
        # Fix port binding for non-root user
        - name: PORT
          value: "8080"
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
```

## Debugging Readiness Probe Failures

Pods that are Running but never become Ready fail readiness probes.

```bash
# Check readiness probe configuration
kubectl get deployment myapp -n default -o yaml | grep -A 10 readinessProbe

# Describe pod to see probe failures
kubectl describe pod myapp-6f8d9c7b5-abc -n default | grep -A 5 Readiness

# Output:
# Readiness probe failed: HTTP probe failed with statuscode: 503
# Readiness probe failed: Get "http://10.244.1.5:8080/health": dial tcp: connect: connection refused
```

Test the readiness endpoint directly.

```bash
# Port-forward to pod
kubectl port-forward pod/myapp-6f8d9c7b5-abc 8080:8080 -n default

# Test readiness endpoint
curl http://localhost:8080/health

# If endpoint doesn't exist or returns errors, fix the application
# or adjust the probe configuration
```

Fix readiness probe configuration.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:v1.0
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /health/ready  # Correct path
            port: 8080
          initialDelaySeconds: 30  # Give app time to start
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
```

## Handling Persistent Volume Claims

Pods waiting for PVCs to bind stay in Pending state.

```bash
# Check PVC status
kubectl get pvc -n default

# Output showing pending PVC:
# NAME        STATUS    VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS   AGE
# app-data    Pending                                       fast-ssd       10m

# Check why PVC is pending
kubectl describe pvc app-data -n default
```

Fix PVC issues before pods can start.

```bash
# Create missing StorageClass
kubectl apply -f storageclass.yaml

# Or update Deployment to use existing StorageClass
kubectl patch deployment myapp -n default -p \
  '{"spec":{"template":{"spec":{"volumes":[{"name":"data","persistentVolumeClaim":{"claimName":"app-data-fixed"}}]}}}}'
```

## Implementing Deployment Health Checks

Create a script that validates Deployment health and identifies issues.

```bash
#!/bin/bash
# check-deployment-health.sh

NAMESPACE=${1:-default}
DEPLOYMENT=$2

if [ -z "$DEPLOYMENT" ]; then
  echo "Usage: $0 <namespace> <deployment>"
  exit 1
fi

echo "Checking Deployment: $NAMESPACE/$DEPLOYMENT"

# Get desired vs available replicas
DESIRED=$(kubectl get deployment $DEPLOYMENT -n $NAMESPACE -o jsonpath='{.spec.replicas}')
AVAILABLE=$(kubectl get deployment $DEPLOYMENT -n $NAMESPACE -o jsonpath='{.status.availableReplicas}')

echo "Desired: $DESIRED, Available: ${AVAILABLE:-0}"

if [ "${AVAILABLE:-0}" -eq 0 ]; then
  echo "⚠️  Zero replicas available!"

  # Check pods
  echo "\nPod Status:"
  kubectl get pods -n $NAMESPACE -l app=$DEPLOYMENT

  # Check for scheduling issues
  PENDING=$(kubectl get pods -n $NAMESPACE -l app=$DEPLOYMENT -o json | \
    jq -r '.items[] | select(.status.phase=="Pending") | .metadata.name' | wc -l)

  if [ $PENDING -gt 0 ]; then
    echo "\n⚠️  $PENDING pods pending - checking scheduling..."
    kubectl describe pods -n $NAMESPACE -l app=$DEPLOYMENT | \
      grep -A 5 "Events:" | grep "FailedScheduling"
  fi

  # Check for image pull errors
  IMAGEPULL=$(kubectl get pods -n $NAMESPACE -l app=$DEPLOYMENT -o json | \
    jq -r '.items[] | select(.status.containerStatuses[0].state.waiting.reason=="ImagePullBackOff") | .metadata.name' | wc -l)

  if [ $IMAGEPULL -gt 0 ]; then
    echo "\n⚠️  $IMAGEPULL pods with image pull errors"
  fi

  # Check for crashes
  CRASHES=$(kubectl get pods -n $NAMESPACE -l app=$DEPLOYMENT -o json | \
    jq -r '.items[] | select(.status.containerStatuses[0].state.waiting.reason=="CrashLoopBackOff") | .metadata.name' | wc -l)

  if [ $CRASHES -gt 0 ]; then
    echo "\n⚠️  $CRASHES pods crashing"
    kubectl logs -n $NAMESPACE -l app=$DEPLOYMENT --tail=20
  fi
fi
```

## Monitoring Deployment Availability

Set up alerts for deployments with zero available replicas.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: deployment_availability
      rules:
      - alert: DeploymentZeroReplicas
        expr: |
          kube_deployment_status_replicas_available == 0
          and kube_deployment_spec_replicas > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Deployment {{ $labels.namespace }}/{{ $labels.deployment }} has zero available replicas"
          description: "Check pod status and events"

      - alert: DeploymentReplicasMismatch
        expr: |
          kube_deployment_spec_replicas != kube_deployment_status_replicas_available
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Deployment replica count mismatch"
```

Deployments stuck at zero available replicas indicate complete service unavailability. By systematically checking pod scheduling, image availability, resource constraints, application crashes, and readiness probe configuration, you identify and resolve the blocking issue. Combined with automated health checks and alerting, these practices minimize downtime and accelerate recovery from deployment failures.
