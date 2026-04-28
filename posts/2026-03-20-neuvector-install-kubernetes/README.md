# How to Install NeuVector on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Kubernetes, Container Security, Security, Installation

Description: A step-by-step guide to installing NeuVector on a Kubernetes cluster using kubectl and YAML manifests.

## Introduction

NeuVector is a full lifecycle container security platform that provides runtime security, vulnerability scanning, and compliance checking for Kubernetes workloads. In this guide, you will learn how to install NeuVector directly on a Kubernetes cluster using native kubectl commands and YAML manifests.

## Prerequisites

Before you begin, ensure you have the following:

- A running Kubernetes cluster (v1.19+)
- `kubectl` configured with cluster admin access
- At least 4 GB of RAM available across your nodes
- Container runtime: Docker, containerd, or CRI-O

## Step 1: Create the NeuVector Namespace

NeuVector components run in a dedicated namespace. Create it first:

```bash
# Create the neuvector namespace

kubectl create namespace neuvector
```

## Step 2: Create Service Accounts and RBAC

NeuVector requires specific RBAC permissions to monitor and enforce security policies. Create the service accounts and RBAC manually:

```yaml
# neuvector-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: controller
  namespace: neuvector
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: enforcer
  namespace: neuvector
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: neuvector-binding-app
rules:
  - apiGroups:
      - ""
    resources:
      - nodes
      - pods
      - services
      - namespaces
    verbs:
      - get
      - list
      - watch
      - update
  - apiGroups:
      - apps
    resources:
      - deployments
      - daemonsets
    verbs:
      - get
      - list
      - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: neuvector-binding-app
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: neuvector-binding-app
subjects:
  - kind: ServiceAccount
    name: controller
    namespace: neuvector
  - kind: ServiceAccount
    name: enforcer
    namespace: neuvector
```

```bash
kubectl apply -f neuvector-rbac.yaml
```

## Step 3: Create the Custom Resource Definitions

NeuVector uses CRDs to define its security policies:

```bash
# Apply NeuVector CRDs
kubectl apply -f https://raw.githubusercontent.com/neuvector/manifests/main/kubernetes/5.3.0/crd-k8s-1.19.yaml
```

## Step 4: Deploy NeuVector Components

NeuVector consists of three main components:

- **Controller**: The management and policy enforcement engine
- **Enforcer**: A DaemonSet that runs on every node for runtime enforcement
- **Manager**: The web UI for managing NeuVector

```yaml
# neuvector-deploy.yaml
# Deploy NeuVector Controller
apiVersion: apps/v1
kind: Deployment
metadata:
  name: neuvector-controller-pod
  namespace: neuvector
spec:
  replicas: 3
  selector:
    matchLabels:
      app: neuvector-controller-pod
  template:
    metadata:
      labels:
        app: neuvector-controller-pod
    spec:
      serviceAccountName: controller
      containers:
        - name: neuvector-controller-pod
          image: neuvector/controller:5.3.0
          securityContext:
            privileged: true
          env:
            - name: CLUSTER_JOIN_ADDR
              value: neuvector-svc-controller.neuvector
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "2000m"
---
# Deploy NeuVector Enforcer as DaemonSet
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: neuvector-enforcer-pod
  namespace: neuvector
spec:
  selector:
    matchLabels:
      app: neuvector-enforcer-pod
  template:
    metadata:
      labels:
        app: neuvector-enforcer-pod
    spec:
      hostPID: true
      serviceAccountName: enforcer
      containers:
        - name: neuvector-enforcer-pod
          image: neuvector/enforcer:5.3.0
          securityContext:
            privileged: true
          env:
            - name: CLUSTER_JOIN_ADDR
              value: neuvector-svc-controller.neuvector
          volumeMounts:
            - mountPath: /var/neuvector
              name: nv-share
              readOnly: false
            - mountPath: /run/containerd/containerd.sock
              name: runtime-sock
              readOnly: true
            - mountPath: /host/proc
              name: proc-vol
              readOnly: true
            - mountPath: /host/cgroup
              name: cgroup-vol
              readOnly: true
      volumes:
        - name: nv-share
          hostPath:
            path: /var/neuvector
        - name: runtime-sock
          hostPath:
            path: /run/containerd/containerd.sock
        - name: proc-vol
          hostPath:
            path: /proc
        - name: cgroup-vol
          hostPath:
            path: /sys/fs/cgroup
---
# Deploy NeuVector Manager (Web UI)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: neuvector-manager-pod
  namespace: neuvector
spec:
  replicas: 1
  selector:
    matchLabels:
      app: neuvector-manager-pod
  template:
    metadata:
      labels:
        app: neuvector-manager-pod
    spec:
      containers:
        - name: neuvector-manager-pod
          image: neuvector/manager:5.3.0
          env:
            - name: CTRL_SERVER_IP
              value: neuvector-svc-controller.neuvector
```

```bash
kubectl apply -f neuvector-deploy.yaml
```

## Step 5: Create Services

Expose NeuVector components with appropriate services:

```yaml
# neuvector-services.yaml
apiVersion: v1
kind: Service
metadata:
  name: neuvector-svc-controller
  namespace: neuvector
spec:
  ports:
    - port: 18300
      protocol: TCP
      name: cluster-tcp-18300
    - port: 18301
      protocol: TCP
      name: cluster-tcp-18301
    - port: 18301
      protocol: UDP
      name: cluster-udp-18301
  clusterIP: None
  selector:
    app: neuvector-controller-pod
---
apiVersion: v1
kind: Service
metadata:
  name: neuvector-service-webui
  namespace: neuvector
spec:
  ports:
    - port: 8443
      name: manager-443
  type: NodePort
  selector:
    app: neuvector-manager-pod
```

```bash
kubectl apply -f neuvector-services.yaml
```

## Step 6: Verify the Installation

Check that all NeuVector pods are running:

```bash
# Check pod status
kubectl get pods -n neuvector

# Expected output:
# NAME                                        READY   STATUS    RESTARTS   AGE
# neuvector-controller-pod-xxx               1/1     Running   0          2m
# neuvector-enforcer-pod-xxx                 1/1     Running   0          2m
# neuvector-manager-pod-xxx                  1/1     Running   0          2m

# Check services
kubectl get svc -n neuvector
```

## Step 7: Access the NeuVector Manager UI

Get the NodePort assigned to the Manager service:

```bash
# Get the NodePort
kubectl get svc neuvector-service-webui -n neuvector

# Access the UI at https://<node-ip>:<nodeport>
# Default credentials:
# Username: admin
# Password: admin
```

> **Security Note**: Change the default admin password immediately after first login.

## Conclusion

You have successfully installed NeuVector on your Kubernetes cluster. The platform is now monitoring your containerized workloads in Discover mode by default. Next steps include configuring security policies, setting up vulnerability scanning, and transitioning workloads from Discover to Protect mode. For production deployments, consider using Helm for easier management and upgrades.
