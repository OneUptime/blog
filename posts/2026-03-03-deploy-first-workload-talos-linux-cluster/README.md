# How to Deploy Your First Workload on a Talos Linux Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Deployment, Workloads, Getting Started

Description: Walk through deploying your first application on a Talos Linux Kubernetes cluster, from simple pods to full deployments with services.

---

You have set up your Talos Linux cluster, bootstrapped Kubernetes, and retrieved your kubeconfig. Now comes the fun part: actually running something on it. Deploying workloads on a Talos cluster works exactly like any other Kubernetes cluster because at the application layer, it is standard Kubernetes.

This guide walks through deploying your first workload, from a simple pod to a more realistic deployment with services and configuration.

## Verifying Your Cluster Is Ready

Before deploying anything, make sure the cluster is healthy:

```bash
# Check that all nodes are Ready
kubectl get nodes

# Verify system pods are running
kubectl get pods -n kube-system

# Make sure CoreDNS is ready (needed for service discovery)
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

All system pods should be in the `Running` state. If CoreDNS pods are not ready, wait a few more minutes. Without DNS, pods cannot resolve service names.

## Starting Simple: A Single Pod

The simplest workload is a single pod:

```bash
# Run an nginx pod
kubectl run my-nginx --image=nginx:alpine

# Check that it is running
kubectl get pods

# View the pod's details
kubectl describe pod my-nginx

# View the pod's logs
kubectl logs my-nginx
```

If the pod reaches the `Running` state, congratulations - your cluster is working and can pull container images and schedule workloads.

Clean it up when done:

```bash
# Delete the test pod
kubectl delete pod my-nginx
```

## A Proper Deployment

In practice, you rarely run standalone pods. Deployments provide replica management, rolling updates, and self-healing.

Create a deployment manifest:

```yaml
# nginx-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-app
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:alpine
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi
```

Apply it:

```bash
# Create the deployment
kubectl apply -f nginx-deployment.yaml

# Watch the rollout
kubectl rollout status deployment/nginx-app

# See the pods
kubectl get pods -l app=nginx -o wide
```

The pods should distribute across your nodes. On a single-node cluster (with scheduling on control planes enabled), all three replicas run on the same node.

## Exposing the Deployment with a Service

To make the deployment accessible, create a Service:

```yaml
# nginx-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  selector:
    app: nginx
  ports:
    - port: 80
      targetPort: 80
      nodePort: 30080
  type: NodePort
```

```bash
# Create the service
kubectl apply -f nginx-service.yaml

# Check the service
kubectl get svc nginx-service
```

Now you can access nginx on any node's IP at port 30080:

```bash
# Access the service (replace with your node's IP)
curl http://192.168.1.101:30080
```

## Adding a ConfigMap

Most real applications need configuration. Use ConfigMaps:

```yaml
# custom-nginx-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
data:
  default.conf: |
    server {
        listen 80;
        server_name localhost;

        location / {
            root /usr/share/nginx/html;
            index index.html;
        }

        location /health {
            return 200 'healthy';
            add_header Content-Type text/plain;
        }
    }
```

Update the deployment to mount the ConfigMap:

```yaml
# nginx-deployment-with-config.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-app
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:alpine
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi
          volumeMounts:
            - name: nginx-config
              mountPath: /etc/nginx/conf.d
      volumes:
        - name: nginx-config
          configMap:
            name: nginx-config
```

```bash
# Apply the ConfigMap and updated deployment
kubectl apply -f custom-nginx-config.yaml
kubectl apply -f nginx-deployment-with-config.yaml

# Test the health endpoint
curl http://192.168.1.101:30080/health
```

## A More Complete Example: A Web Application

Let us deploy something more interesting - a simple web app with a backend and frontend:

```yaml
# app-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: demo-app
---
# Backend deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: demo-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: hashicorp/http-echo:latest
          args:
            - "-text=Hello from the backend!"
            - "-listen=:8080"
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 25m
              memory: 32Mi
            limits:
              cpu: 50m
              memory: 64Mi
---
# Backend service
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: demo-app
spec:
  selector:
    app: backend
  ports:
    - port: 8080
      targetPort: 8080
---
# Frontend deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: demo-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: nginx:alpine
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi
---
# Frontend service
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: demo-app
spec:
  selector:
    app: frontend
  ports:
    - port: 80
      targetPort: 80
      nodePort: 30081
  type: NodePort
```

```bash
# Deploy everything
kubectl apply -f app-namespace.yaml

# Check the status
kubectl get all -n demo-app

# Test the frontend
curl http://192.168.1.101:30081

# Test internal DNS resolution from a pod
kubectl run -it --rm debug --image=alpine -n demo-app -- nslookup backend.demo-app.svc.cluster.local
```

## Checking Resource Usage

See how your workloads are consuming resources:

```bash
# If metrics-server is installed
kubectl top pods -n demo-app
kubectl top nodes

# Otherwise, check pod status
kubectl describe pods -n demo-app
```

## Debugging Failed Deployments

If pods are not starting, here is how to troubleshoot:

```bash
# Check pod events
kubectl describe pod <pod-name> -n demo-app

# Common issues:
# - ImagePullBackOff: The container image cannot be pulled (check image name, registry access)
# - Pending: No node has enough resources (check resource requests)
# - CrashLoopBackOff: The container is crashing (check logs)

# View container logs
kubectl logs <pod-name> -n demo-app

# If the pod has multiple containers
kubectl logs <pod-name> -c <container-name> -n demo-app

# Get an overview of events in the namespace
kubectl get events -n demo-app --sort-by=.lastTimestamp
```

## Cleaning Up

Remove the test workloads when you are done:

```bash
# Delete the demo namespace and everything in it
kubectl delete namespace demo-app

# Delete the nginx deployment and service
kubectl delete deployment nginx-app
kubectl delete service nginx-service
kubectl delete configmap nginx-config
```

Deploying workloads on Talos Linux is standard Kubernetes - no special steps needed. The difference is all underneath: your nodes are running an immutable, API-managed operating system that keeps the infrastructure layer secure and consistent. From the application perspective, it is just Kubernetes.
