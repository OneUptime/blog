# How to Use Portainer for Kubernetes Training

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Training, Education, K8s

Description: Build a hands-on Kubernetes training environment using Portainer to teach pod management, deployments, services, and cluster operations.

## Introduction

Kubernetes has a steep learning curve, with dozens of resource types, YAML manifests, and `kubectl` commands. Portainer's Kubernetes interface provides a visual layer that lets trainees understand cluster concepts before diving deep into manifests. This guide builds a structured Kubernetes training program using Portainer as the primary learning interface.

## Training Environment Setup

### Option A: Managed Training Clusters

```bash
# Use k3s for lightweight training clusters (one per trainee)

# On each training VM:
curl -sfL https://get.k3s.io | K3S_KUBECONFIG_MODE="644" sh -

# Use the cluster kubeconfig
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# Deploy Portainer
kubectl apply -n portainer -f https://downloads.portainer.io/ce-lts/portainer.yaml
kubectl get svc -n portainer portainer
```

### Option B: Shared Cluster with Namespaces

```bash
# One cluster, one namespace per trainee
for trainee in alice bob charlie david; do
  kubectl create namespace "training-${trainee}"
  
  # Create service account for the trainee
  kubectl create serviceaccount "trainee-${trainee}" -n "training-${trainee}"
  
  # Grant access to their namespace only
  kubectl create rolebinding "${trainee}-admin" \
    --clusterrole=admin \
    --serviceaccount="training-${trainee}:trainee-${trainee}" \
    --namespace="training-${trainee}"
done
```

## Module 1: Understanding Kubernetes Resources

### Exercise 1.1: Deploy Your First Pod

In Portainer: **Kubernetes > Applications > Add with form**

```yaml
# Or deploy via manifest (Portainer: Kubernetes > Applications > Create from code > Manifest)
apiVersion: v1
kind: Pod
metadata:
  name: my-first-pod
  namespace: training-alice
  labels:
    app: first-pod
spec:
  containers:
  - name: web
    image: nginx:alpine
    ports:
    - containerPort: 80
    resources:
      requests:
        cpu: "50m"
        memory: "64Mi"
      limits:
        cpu: "100m"
        memory: "128Mi"
```

Key concepts to explain while deploying:
- Pod vs Container
- Labels and selectors
- Resource requests vs limits
- Namespace isolation

### Exercise 1.2: Expose the Pod with a Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-first-service
  namespace: training-alice
spec:
  selector:
    app: first-pod
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

In Portainer: **Kubernetes > Networking > Services** - show how the service selects pods by label.

## Module 2: Deployments and ReplicaSets

### Exercise 2.1: Create a Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-deployment
  namespace: training-alice
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: nginx:1.25-alpine
        ports:
        - containerPort: 80
```

Exercise steps in Portainer:
1. Deploy the manifest
2. View the application in **Kubernetes > Applications**, then inspect it to see the 3 pods
3. Delete one pod manually - watch it recreate
4. Scale to 5 replicas - observe new pods starting

### Exercise 2.2: Rolling Updates

```bash
# Trigger a rolling update
kubectl set image deployment/web-deployment web=nginx:1.26-alpine -n training-alice

# Watch in Portainer > Kubernetes > Applications > web-deployment
# Shows old pods terminating, new pods starting

# Check rollout history
kubectl rollout history deployment/web-deployment -n training-alice

# Rollback
kubectl rollout undo deployment/web-deployment -n training-alice
```

## Module 3: ConfigMaps and Secrets

### Exercise 3.1: Externalize Configuration

```yaml
# ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: training-alice
data:
  APP_ENV: "training"
  LOG_LEVEL: "debug"
  MAX_CONNECTIONS: "100"
---
# Secret
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: training-alice
type: Opaque
stringData:
  DB_PASSWORD: "mysecretpassword"
  API_KEY: "abc123xyz"
```

```yaml
# Reference in Deployment
spec:
  containers:
  - name: app
    image: nginx:alpine
    envFrom:
    - configMapRef:
        name: app-config
    - secretRef:
        name: app-secrets
```

In Portainer: **Kubernetes > ConfigMaps & Secrets** - show that secret values are masked.

## Module 4: Persistent Storage

### Exercise 4.1: PersistentVolumeClaim

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: training-pvc
  namespace: training-alice
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: local-path  # k3s default
---
apiVersion: v1
kind: Pod
metadata:
  name: pvc-demo-pod
  namespace: training-alice
spec:
  containers:
  - name: app
    image: busybox
    command: ["sh", "-c", "echo 'Hello PVC' > /data/test.txt && sleep 3600"]
    volumeMounts:
    - name: storage
      mountPath: /data
  volumes:
  - name: storage
    persistentVolumeClaim:
      claimName: training-pvc
```

Demonstrate data persistence by:
1. Writing data to the PVC
2. Deleting the pod
3. Recreating it and showing the data still exists

## Module 5: Kubernetes Troubleshooting Exercises

```bash
# Instructor creates intentionally broken scenarios
# Exercise: Fix the CrashLoopBackOff

kubectl apply -f - -n training-alice << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: broken-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: broken
  template:
    metadata:
      labels:
        app: broken
    spec:
      containers:
      - name: app
        image: busybox
        command: ["sh", "-c", "exit 1"]  # Always fails
EOF

# Trainee must:
# 1. Notice the CrashLoopBackOff in Portainer
# 2. View the logs
# 3. Fix the command to: sleep infinity
# 4. Apply the fix and verify it works
```

## Training Progress Tracking

```bash
#!/bin/bash
# check-k8s-training-progress.sh
NAMESPACE=$1

echo "=== Training Progress for $NAMESPACE ==="

echo "Deployments:"
kubectl get deployments -n "$NAMESPACE" -o name | wc -l

echo "Services:"
kubectl get services -n "$NAMESPACE" -o name | grep -v '^service/kubernetes$' | wc -l

echo "ConfigMaps:"
kubectl get configmaps -n "$NAMESPACE" -o name | grep -v '^configmap/kube-root-ca\.crt$' | wc -l

echo "Healthy pods:"
kubectl get pods -n "$NAMESPACE" --field-selector status.phase=Running -o name | wc -l

echo "PVCs:"
kubectl get pvc -n "$NAMESPACE" -o name | wc -l
```

## Conclusion

Portainer accelerates Kubernetes training by providing a visual interface that makes the relationship between resources tangible. Trainees can deploy their first pod through the UI, observe the effects visually, then move to manifests with a clearer mental model. The progression from Pods to Deployments to full multi-service applications, combined with intentional troubleshooting exercises, builds real-world competency. Portainer's namespace-level isolation ensures each trainee has a safe sandbox without affecting others.
