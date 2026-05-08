# How to Generate Kubernetes YAML from a Podman Pod

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Kubernetes, YAML, Pod

Description: Learn how to export an entire Podman pod as a Kubernetes Pod YAML manifest.

---

> Generating Kubernetes YAML from a Podman pod captures the pod's application containers, volume references, and port mappings in a single manifest.

When your application runs as a multi-container pod in Podman, you can export the pod configuration as a Kubernetes YAML file. This captures application containers, their environment variables, volume mounts, and port mappings in one manifest that can be used as a starting point for Kubernetes or replayed with Podman.

---

## Setting Up a Pod

```bash
# Create a pod with multiple containers

podman pod create --name app-pod -p 8080:80
podman run -d --pod app-pod --name web docker.io/library/nginx:alpine
podman run -d --pod app-pod --name cache docker.io/library/redis:7-alpine
podman run -d --pod app-pod --name api \
  -e API_PORT=3000 \
  docker.io/library/node:20-alpine sleep 3600
```

## Generating YAML from the Pod

```bash
# Generate Kubernetes YAML for the entire pod
podman kube generate app-pod

# Save to a file
podman kube generate app-pod > app-pod.yaml
```

## Examining the Generated YAML

```bash
# The output includes all containers in the pod
cat app-pod.yaml

# The infra container is excluded from the output
# Only application containers are included
```

The generated YAML will have a structure like:

```yaml
# apiVersion: v1
# kind: Pod
# metadata:
#   name: app-pod
# spec:
#   containers:
#     - name: web
#       image: docker.io/library/nginx:alpine
#       ports:
#         - containerPort: 80
#           hostPort: 8080
#     - name: cache
#       image: docker.io/library/redis:7-alpine
#     - name: api
#       image: docker.io/library/node:20-alpine
#       env:
#         - name: API_PORT
#           value: "3000"
```

## Including a Service Definition

```bash
# Generate YAML with an accompanying Kubernetes Service
podman kube generate --service app-pod > app-pod-with-service.yaml

# The Service will expose the pod's published ports as NodePort entries
```

## Generating YAML from a Pod with Volumes

```bash
# Create a pod with shared volumes
podman pod create --name vol-pod
podman volume create app-data
podman run -d --pod vol-pod --name writer \
  -v app-data:/data \
  docker.io/library/alpine sh -c "echo hello > /data/test.txt && sleep 3600"
podman run -d --pod vol-pod --name reader \
  -v app-data:/data:ro \
  docker.io/library/alpine sleep 3600

# Generate YAML including volume definitions
podman kube generate vol-pod > vol-pod.yaml

# The YAML includes PersistentVolumeClaim references
```

## Replaying the Generated YAML

```bash
# Remove the original pod
podman pod rm --force app-pod

# Recreate it from the generated YAML
podman kube play app-pod.yaml

# Verify the pod is running
podman pod ls
podman ps --filter pod=app-pod
```

## Summary

Use `podman kube generate <pod-name>` to export a multi-container pod as a Kubernetes YAML manifest. The output includes application containers, environment variables, port mappings, and volume references. Add `--service` for a Service resource. The generated YAML can be used with `kubectl apply` after any cluster-specific adjustments and with `podman kube play`.
