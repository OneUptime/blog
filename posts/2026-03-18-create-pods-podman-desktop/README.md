# How to Create Pods with Podman Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Pod, Multi-Container

Description: Learn how to create and manage pods in Podman Desktop to group related containers together for streamlined multi-container workflows.

---

> Pods let you group related containers that share networking and can use shared volumes, mirroring the Kubernetes pod model right on your local machine.

Pods are one of the most powerful features in Podman, allowing you to bundle multiple containers into a single manageable unit. Podman Desktop provides a graphical interface to create, inspect, and manage pods without memorizing CLI flags. This guide walks you through creating pods using both the Podman Desktop UI and the underlying CLI commands.

---

## Understanding Pods in Podman

A pod in Podman is a group of one or more containers that share the same network namespace, meaning they can communicate over localhost. This mirrors how Kubernetes pods work, making it easier to develop locally and deploy to production clusters.

```bash
# Check your Podman version to ensure pod support

podman --version

# List existing pods (if any)
podman pod ls
```

By default, each Podman pod includes an "infra" container that holds the shared namespaces. This small container runs automatically and keeps the pod alive even if your application containers restart.

## Creating a Pod via Podman Desktop UI

To create a pod in Podman Desktop, follow these steps:

1. Open Podman Desktop and navigate to the **Containers** section in the left sidebar.
2. Select the containers you want to group into a pod.
3. Click the **Create Pod** button.
4. Enter a name for your pod (e.g., `my-web-app`).
5. Check that the correct ports are exposed if your containers need to be accessible externally.
6. Click **Create Pod** to initialize the pod.

Once the pod is created, you can view it in the **Pods** section.

## Creating a Pod via the CLI

You can also create pods using the Podman CLI, which Podman Desktop reflects in real time:

```bash
# Create a simple pod with a name and port mapping
podman pod create --name my-web-app -p 8080:80

# Verify the pod was created
podman pod ls

# Inspect the pod for detailed information
podman pod inspect my-web-app
```

## Adding Containers to a Pod

After creating a pod, add containers to it using the `--pod` flag:

```bash
# Add an Nginx container to the pod
podman run -d --pod my-web-app --name web-server nginx:alpine

# Add a backend API container to the same pod
podman run -d --pod my-web-app --name api-server \
  -e APP_PORT=3000 \
  node:18-alpine node -e "
    const http = require('http');
    http.createServer((req, res) => {
      res.end('Hello from API');
    }).listen(3000);
  "
```

Since both containers share the same network namespace, the Nginx container can reach the API server at `localhost:3000`.

## Creating a Pod with a YAML Definition

Podman supports Kubernetes-style YAML for pod creation:

```yaml
# Save this as my-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-full-stack
  labels:
    app: fullstack
spec:
  containers:
    - name: frontend
      image: nginx:alpine
      ports:
        - containerPort: 80
          hostPort: 8080
    - name: backend
      image: node:18-alpine
      command: ["node", "-e"]
      args:
        - |
          const http = require('http');
          http.createServer((req, res) => {
            res.end('Backend OK');
          }).listen(3000);
```

```bash
# Create the pod from YAML
podman kube play my-pod.yaml

# Verify the pod and its containers are running
podman pod ps
podman ps --pod
```

## Managing Pod Lifecycle

Podman Desktop shows pod status in the UI, but you can also manage pods from the terminal:

```bash
# Stop all containers in a pod
podman pod stop my-web-app

# Start the pod again
podman pod start my-web-app

# Restart the entire pod
podman pod restart my-web-app

# View logs from a specific container in the pod
podman logs web-server

# View resource usage for the pod
podman pod stats my-web-app --no-stream
```

## Removing Pods

When you no longer need a pod, remove it along with all its containers:

```bash
# Stop and remove a pod and all its containers
podman pod rm -f my-web-app

# Remove all pods at once
podman pod rm -f --all

# Clean up generated YAML resources
podman kube down my-pod.yaml
```

In Podman Desktop, you can right-click a pod and select **Delete** to achieve the same result.

## Summary

Pods in Podman Desktop provide a convenient way to group related containers that share a network namespace and can use shared volumes or resource limits. Whether you use the graphical interface or the CLI, pods simplify multi-container development by mirroring the Kubernetes pod model locally. By defining pods in YAML, you can also create a Kubernetes-style manifest that is easier to adapt for production Kubernetes deployments.
