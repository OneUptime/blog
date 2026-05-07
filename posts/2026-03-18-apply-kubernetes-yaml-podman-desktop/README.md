# How to Apply Kubernetes YAML from Podman Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Kubernetes, YAML, Manifest

Description: Learn how to apply Kubernetes YAML manifests directly from Podman Desktop to create and manage resources on your connected clusters.

---

> Applying Kubernetes YAML from Podman Desktop lets you define infrastructure as code and deploy it without leaving your container management interface.

Kubernetes YAML manifests are the standard way to define resources like pods, deployments, services, and config maps. Podman Desktop supports applying these manifests to connected Kubernetes clusters, combining container management and Kubernetes operations in a single tool. This guide covers creating, validating, and applying YAML manifests through Podman Desktop.

---

## Understanding Kubernetes YAML Manifests

Kubernetes resources are defined in YAML format with a standard structure:

```yaml
# Every Kubernetes resource follows this pattern

apiVersion: v1          # API version for the resource type
kind: Pod               # Type of resource
metadata:
  name: my-app          # Unique name within the namespace
  labels:
    app: my-app         # Labels for selection and organization
spec:                   # Resource-specific configuration
  containers:
    - name: web
      image: nginx:alpine
```

## Applying YAML via Podman Desktop

Podman Desktop provides an Apply YAML mechanism for Kubernetes objects:

1. Open Podman Desktop and go to the **Kubernetes** section.
2. Open the object page for the resource you want to create, such as **Deployments** or **Services**.
3. Select the namespace where you want to create the object.
4. Click the **Apply YAML** button and select your YAML manifest file.
5. Click **OK** in the confirmation notification to create the resources on the cluster.

## Creating a Complete Deployment YAML

Here is a practical deployment manifest you can apply through Podman Desktop:

```yaml
# Save as deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  labels:
    app: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: web
          image: nginx:alpine
          ports:
            - containerPort: 80
          resources:
            requests:
              memory: "64Mi"
              cpu: "100m"
            limits:
              memory: "128Mi"
              cpu: "250m"
---
apiVersion: v1
kind: Service
metadata:
  name: web-app-service
spec:
  selector:
    app: web-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: ClusterIP
```

## Applying YAML via the CLI

You can also use kubectl alongside Podman Desktop:

```bash
# Apply a single YAML file
kubectl apply -f deployment.yaml

# Apply all YAML files in a directory
kubectl apply -f ./manifests/

# Apply from a URL
kubectl apply -f https://raw.githubusercontent.com/user/repo/main/deploy.yaml

# Apply with a specific namespace
kubectl apply -f deployment.yaml -n staging

# Dry run to validate before applying
kubectl apply -f deployment.yaml --dry-run=client
```

## Using Podman to Generate YAML

Podman can generate Kubernetes YAML from running containers:

```bash
# Run a container locally first
podman run -d --name my-nginx -p 8080:80 nginx:alpine

# Generate the Kubernetes YAML
podman kube generate my-nginx > nginx-pod.yaml

# Review the generated manifest
cat nginx-pod.yaml

# Apply it to Kubernetes
kubectl apply -f nginx-pod.yaml
```

## Working with ConfigMaps and Secrets

Apply configuration resources alongside your deployments:

```yaml
# Save as config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  APP_ENV: "production"
  LOG_LEVEL: "info"
  MAX_CONNECTIONS: "100"
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  DB_PASSWORD: "supersecretpassword"
  API_KEY: "my-api-key-value"
```

```bash
# Apply the configuration
kubectl apply -f config.yaml

# Verify the resources were created
kubectl get configmaps
kubectl get secrets

# Reference them in your deployment
kubectl set env deployment/web-app --from=configmap/app-config
```

## Validating YAML Before Applying

Always validate your manifests to catch errors early:

```bash
# Client-side validation
kubectl apply -f deployment.yaml --dry-run=client -o yaml

# Server-side validation (checks against cluster)
kubectl apply -f deployment.yaml --dry-run=server

# Use kubectl to check syntax
kubectl create -f deployment.yaml --dry-run=client --validate=true

# Diff changes before applying
kubectl diff -f deployment.yaml
```

## Managing Applied Resources

After applying YAML, manage the lifecycle of your resources:

```bash
# View the applied resources
kubectl get all -l app=web-app

# Check resource status
kubectl rollout status deployment/web-app

# Update by modifying YAML and reapplying
kubectl apply -f deployment.yaml

# View the apply history
kubectl rollout history deployment/web-app

# Delete resources defined in YAML
kubectl delete -f deployment.yaml
```

## Summary

Applying Kubernetes YAML from Podman Desktop combines container development and cluster management in one tool. Whether you write manifests from scratch, generate them from running containers, or import existing files, Podman Desktop provides a visual workflow for reviewing and applying configurations. Always validate your YAML with dry runs before applying to catch issues early and ensure reliable deployments.
