# How to Generate a Kubernetes Deployment YAML with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Kubernetes, YAML, Deployment

Description: Learn how to generate a Kubernetes Deployment manifest from a Podman container or pod.

---

> Podman can generate a Kubernetes Deployment YAML with replica management, making it easy to go from local testing to scalable cluster deployments.

While `podman generate kube` produces a Pod manifest by default, you can use the `--type deployment` flag to generate a Kubernetes Deployment instead. Deployments add replica management, rolling updates, and self-healing capabilities on top of the basic Pod spec.

---

## Generating a Deployment from a Container

```bash
# Run a container locally

podman run -d --name web-app \
  -p 8080:80 \
  -e APP_ENV=production \
  docker.io/library/nginx:alpine

# Generate a Deployment YAML instead of a Pod
podman generate kube --type deployment web-app > deployment.yaml

# View the generated file
cat deployment.yaml
```

## Understanding the Deployment Structure

The generated Deployment includes a `replicas` field, a selector, and a pod template.

```yaml
# Example structure:
# apiVersion: apps/v1
# kind: Deployment
# metadata:
#   name: web-app-pod-deployment
# spec:
#   replicas: 1
#   selector:
#     matchLabels:
#       app: web-app-pod
#   template:
#     metadata:
#       labels:
#         app: web-app-pod
#     spec:
#       containers:
#         - name: web-app
#           image: docker.io/library/nginx:alpine
#           ports:
#             - containerPort: 80
#               hostPort: 8080
```

## Generating a Deployment from a Pod

```bash
# Create a multi-container pod
podman pod create --name app-pod -p 8080:80
podman run -d --pod app-pod --name web docker.io/library/nginx:alpine
podman run -d --pod app-pod --name sidecar docker.io/library/alpine sleep 3600

# Generate a Deployment from the pod
podman generate kube --type deployment app-pod > app-deployment.yaml
```

## Including a Service

```bash
# Generate a Deployment with a Service definition
podman generate kube --type deployment --service web-app > full-deployment.yaml

# The output includes both Deployment and Service resources
```

## Setting Replicas

```bash
# Generate a Deployment with multiple replicas
podman generate kube --type deployment --replicas 3 web-app > scaled-deployment.yaml

# The generated YAML will have replicas: 3
```

## Applying the Deployment to Kubernetes

```bash
# Apply the generated Deployment to a cluster
kubectl apply -f deployment.yaml

# Check the deployment status
kubectl get deployment web-app-pod-deployment

# Scale it up
kubectl scale deployment web-app-pod-deployment --replicas=5
```

## Replaying a Deployment with Podman

```bash
# Podman can also play Deployment YAML locally
podman play kube deployment.yaml

# This creates a local pod matching the Deployment's pod template
podman pod ls
```

## Summary

Use `podman generate kube --type deployment` to create a Kubernetes Deployment manifest from a container or pod. Add `--replicas` to set the initial replica count and `--service` to include a Service definition. The generated YAML is ready for `kubectl apply` or local replay with `podman play kube`, though Podman plays Deployment YAML as a single local replica.
