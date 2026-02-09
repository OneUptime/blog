# How to Run Kubernetes Locally Using Docker Desktop

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Kubernetes, Docker Desktop, Local Development, Container Orchestration

Description: A complete guide to enabling and using the built-in Kubernetes cluster in Docker Desktop for local development.

---

Docker Desktop ships with a built-in Kubernetes cluster that you can enable with a single checkbox. There is no need to install Minikube, Kind, or any other tool. The cluster runs alongside your Docker containers, shares the same Docker daemon, and integrates with your existing Docker workflow. For developers who want to test Kubernetes manifests without setting up additional infrastructure, this is the fastest path from zero to a running cluster.

This guide walks through enabling Kubernetes in Docker Desktop, configuring it for development, deploying applications, and troubleshooting common issues.

## Enabling Kubernetes

Open Docker Desktop and navigate to Settings (the gear icon). Click on the Kubernetes tab and check "Enable Kubernetes." Click "Apply & Restart."

Docker Desktop downloads the Kubernetes components and starts the cluster. This takes a few minutes on the first run. Subsequent starts are much faster.

Verify the cluster is running:

```bash
# Check that kubectl can connect to the Docker Desktop cluster
kubectl cluster-info

# List the nodes (you should see one node called "docker-desktop")
kubectl get nodes
```

You should see output like:

```
NAME             STATUS   ROLES           AGE   VERSION
docker-desktop   Ready    control-plane   2m    v1.29.1
```

## Switching Kubectl Context

If you have multiple Kubernetes clusters configured (maybe from a cloud provider or another local tool), make sure kubectl is pointing at the Docker Desktop cluster.

```bash
# List all available contexts
kubectl config get-contexts

# Switch to the Docker Desktop context
kubectl config use-context docker-desktop

# Verify you are on the right context
kubectl config current-context
```

## The Docker Desktop Advantage: Shared Image Store

The biggest practical benefit of Docker Desktop's Kubernetes is that it shares the Docker daemon. Images you build with `docker build` are immediately available to the Kubernetes cluster. No need to push to a registry or use `kind load`.

```bash
# Build an image locally
docker build -t myapp:v1.0 .

# Use it directly in a Kubernetes deployment - no registry push needed
kubectl create deployment myapp --image=myapp:v1.0
```

Just set `imagePullPolicy` to `Never` or `IfNotPresent` so Kubernetes does not try to pull from a remote registry:

```yaml
# deployment.yaml - Using a locally built image
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myapp:v1.0
          # Use the local image, do not attempt to pull from a registry
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8080
```

```bash
# Apply the deployment
kubectl apply -f deployment.yaml

# Check that pods are running
kubectl get pods
```

## Resource Allocation

Docker Desktop's Kubernetes cluster runs on your machine, so it competes with everything else for CPU and memory. Configure resource limits in Docker Desktop Settings > Resources.

For comfortable Kubernetes development, allocate at least:

- **CPUs**: 4 cores
- **Memory**: 6 GB (8 GB if running multiple services)
- **Disk**: 40 GB

The Kubernetes system components (API server, etcd, controller manager, scheduler, CoreDNS) consume roughly 1-2 GB of memory at idle. Plan your workload resources accordingly.

## Deploying a Full Application Stack

Let us deploy a more realistic example: a web application with a database.

```yaml
# postgres-deployment.yaml - PostgreSQL database
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          env:
            - name: POSTGRES_USER
              value: appuser
            - name: POSTGRES_PASSWORD
              value: devpassword
            - name: POSTGRES_DB
              value: myapp
          ports:
            - containerPort: 5432
          # Mount a persistent volume for data
          volumeMounts:
            - name: pgdata
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: pgdata
          persistentVolumeClaim:
            claimName: pgdata-pvc
---
# PVC for PostgreSQL data persistence
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pgdata-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
  # Docker Desktop provides the "hostpath" storage class by default
  storageClassName: hostpath
---
# Service to expose PostgreSQL within the cluster
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
```

Docker Desktop provides a `hostpath` StorageClass by default, which stores data on the Docker Desktop VM's filesystem. This persists across pod restarts but not across Kubernetes resets.

Now deploy the application:

```yaml
# app-deployment.yaml - Web application connecting to PostgreSQL
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
        - name: webapp
          image: myapp:v1.0
          imagePullPolicy: IfNotPresent
          env:
            - name: DATABASE_URL
              value: postgres://appuser:devpassword@postgres:5432/myapp
          ports:
            - containerPort: 8080
---
# Service to expose the web app
apiVersion: v1
kind: Service
metadata:
  name: webapp
spec:
  type: LoadBalancer
  selector:
    app: webapp
  ports:
    - port: 80
      targetPort: 8080
```

```bash
# Deploy everything
kubectl apply -f postgres-deployment.yaml
kubectl apply -f app-deployment.yaml

# Wait for pods to be ready
kubectl get pods -w
```

Using `type: LoadBalancer` on Docker Desktop maps the service to `localhost`. After the service gets an external IP, access it at `http://localhost:80`.

```bash
# Check the service's external IP
kubectl get svc webapp
```

On Docker Desktop, the external IP shows as `localhost`.

## Installing an Ingress Controller

For routing multiple services through a single entry point, install an Ingress controller. Nginx Ingress is the most common choice.

```bash
# Install Nginx Ingress Controller using kubectl
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.5/deploy/static/provider/cloud/deploy.yaml

# Wait for the controller to be ready
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s
```

Create an Ingress resource:

```yaml
# ingress.yaml - Route traffic based on hostname
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
spec:
  ingressClassName: nginx
  rules:
    - host: myapp.localhost
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: webapp
                port:
                  number: 80
```

```bash
# Apply the ingress
kubectl apply -f ingress.yaml
```

Access the app at `http://myapp.localhost`. The `.localhost` domain resolves to 127.0.0.1 on most systems without any `/etc/hosts` changes.

## Using Helm with Docker Desktop Kubernetes

Helm works the same way as any other Kubernetes cluster.

```bash
# Install Helm
brew install helm

# Add a chart repository
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install Redis using Helm
helm install my-redis bitnami/redis --set auth.enabled=false

# Check the installation
helm list
kubectl get pods
```

## Dashboard

Install the Kubernetes Dashboard for a visual overview of your cluster:

```bash
# Install the Kubernetes Dashboard
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

# Create a service account for dashboard access
kubectl create serviceaccount dashboard-admin -n kubernetes-dashboard
kubectl create clusterrolebinding dashboard-admin \
  --clusterrole=cluster-admin \
  --serviceaccount=kubernetes-dashboard:dashboard-admin

# Generate a login token
kubectl create token dashboard-admin -n kubernetes-dashboard

# Start the proxy
kubectl proxy
```

Visit `http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/` and paste the token.

## Resetting Kubernetes

If something goes wrong, you can reset Kubernetes without reinstalling Docker Desktop. Go to Settings > Kubernetes and click "Reset Kubernetes Cluster." This destroys all workloads, services, and configurations but keeps Docker Desktop itself intact.

## Troubleshooting

**Kubernetes is stuck starting**: Check Docker Desktop logs. On macOS, they are at `~/Library/Containers/com.docker.docker/Data/log/`. Reset Kubernetes from the settings if it does not recover.

**Pods stuck in Pending**: Usually a resource issue. Check `kubectl describe pod <name>` for scheduling failures. Increase Docker Desktop resource allocation.

**Services not accessible on localhost**: Verify the service type is `LoadBalancer` and check `kubectl get svc` for the external IP. Restart Docker Desktop if localhost routing breaks.

```bash
# General debugging commands
kubectl get events --sort-by='.lastTimestamp'
kubectl top pods
kubectl top nodes
```

## Conclusion

Docker Desktop's built-in Kubernetes is the lowest-friction way to run Kubernetes locally. The shared Docker daemon eliminates the image loading step entirely, and the single-node cluster starts quickly with minimal configuration. It is ideal for testing Kubernetes manifests, developing Helm charts, and validating CI/CD pipelines before deploying to production clusters. While it lacks the multi-node capabilities of Kind or k3d, the simplicity of a checkbox to enable Kubernetes makes it the right choice for many development workflows.
