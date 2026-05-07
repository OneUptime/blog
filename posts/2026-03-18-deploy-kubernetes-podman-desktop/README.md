# How to Deploy to Kubernetes from Podman Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Kubernetes, Deployment

Description: Learn how to deploy your containerized applications to Kubernetes directly from Podman Desktop using built-in tools and generated YAML manifests.

---

> Podman Desktop bridges the gap between local container development and Kubernetes deployment, letting you go from local pods to production clusters seamlessly.

Podman Desktop includes built-in Kubernetes integration that allows you to generate YAML manifests from your running containers and deploy them to a connected cluster. This workflow eliminates the need to manually write deployment files from scratch, accelerating the path from development to production.

---

## Prerequisites

Before deploying to Kubernetes, ensure you have a cluster available:

```bash
# Check if kubectl is installed

kubectl version --client

# Verify you have a cluster connection
kubectl cluster-info

# List available contexts
kubectl config get-contexts
```

Podman Desktop can connect to local clusters like Kind, Minikube, or remote clusters configured in your kubeconfig.

## Generating Kubernetes YAML from Containers

Podman can generate Kubernetes-compatible YAML from running containers and pods:

```bash
# Start a sample application
podman run -d --name my-web-app \
  -p 8080:80 \
  -e APP_ENV=production \
  nginx:alpine

# Generate Kubernetes YAML from the container
podman kube generate my-web-app > my-web-app.yaml

# View the generated YAML
cat my-web-app.yaml
```

The generated YAML includes pod definitions, port mappings, and environment variables that match your local setup.

## Generating YAML from Pods

Pods produce more complete YAML since they already group containers:

```bash
# Create a pod with multiple containers
podman pod create --name fullstack-app -p 8080:80 -p 5432:5432

# Add containers to the pod
podman run -d --pod fullstack-app --name web nginx:alpine
podman run -d --pod fullstack-app --name db \
  -e POSTGRES_PASSWORD=secret \
  postgres:16-alpine

# Generate YAML for the entire pod
podman kube generate fullstack-app > fullstack-app.yaml
```

## Deploying from Podman Desktop UI

Podman Desktop provides a visual deployment workflow:

1. Select the target Kubernetes context.
2. Navigate to the **Pods** or **Containers** section.
3. Open the overflow menu for the pod or container you want to deploy.
4. Select **Deploy to Kubernetes**.
5. Optionally select a namespace and expose the service locally when a port is exposed correctly.
6. Click **Deploy** to apply the manifest to your cluster.

Podman Desktop will report the deployment status and any errors.

## Deploying via the CLI

Apply the generated YAML to your Kubernetes cluster:

```bash
# Apply the generated manifest
kubectl apply -f my-web-app.yaml

# Verify the deployment
kubectl get pods

# Check pod details
kubectl describe pod my-web-app-pod

# View pod logs
kubectl logs my-web-app-pod
```

## Adding Services for External Access

The generated YAML creates a pod by default. You can use `podman kube generate --service` to include a service, or add one manually for external access:

```bash
# Create a service YAML for your deployment
cat > my-web-app-service.yaml << 'EOF'
apiVersion: v1
kind: Service
metadata:
  name: my-web-app-service
spec:
  selector:
    app: my-web-app-pod
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: NodePort
EOF

# Apply the service
kubectl apply -f my-web-app-service.yaml

# Get the service URL
kubectl get svc my-web-app-service
```

## Pushing Images to a Registry for Kubernetes

Kubernetes clusters need to pull images from a registry:

```bash
# Tag your local image for a registry
podman tag nginx:alpine ghcr.io/myuser/my-web-app:v1.0.0

# Push the image
podman push ghcr.io/myuser/my-web-app:v1.0.0

# Update the YAML to reference the registry image
sed -i 's|image: docker.io/library/nginx:alpine|image: ghcr.io/myuser/my-web-app:v1.0.0|' my-web-app.yaml

# Reapply the updated manifest
kubectl apply -f my-web-app.yaml
```

## Monitoring Deployments in Podman Desktop

After deploying, Podman Desktop lets you monitor Kubernetes resources:

1. Switch to the **Kubernetes** section in the left sidebar.
2. View running pods, their status, and logs.
3. Click on individual pods to see detailed information.
4. Use the built-in terminal to run kubectl commands.

```bash
# Watch pod status changes
kubectl get pods -w

# Check resource usage
kubectl top pods

# View events for troubleshooting
kubectl get events --sort-by=.metadata.creationTimestamp
```

## Cleaning Up Kubernetes Resources

Remove deployed resources when they are no longer needed:

```bash
# Delete using the YAML file
kubectl delete -f my-web-app.yaml
kubectl delete -f my-web-app-service.yaml

# Or delete by name
kubectl delete pod my-web-app-pod
kubectl delete svc my-web-app-service
```

## Summary

Deploying to Kubernetes from Podman Desktop streamlines the transition from local development to cluster deployment. The ability to generate YAML from running containers and pods eliminates manual manifest writing, while the built-in Kubernetes integration provides a visual workflow for deploying and monitoring your applications. This approach ensures consistency between your local environment and production clusters.
