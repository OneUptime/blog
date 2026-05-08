# How to Play a Kubernetes Pod YAML with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Kubernetes, YAML, Pod

Description: Learn how to create Podman pods from Kubernetes Pod YAML manifests using podman play kube.

---

> Playing a Kubernetes Pod YAML with Podman creates a local pod with all the containers defined in the manifest.

A Kubernetes Pod is the smallest deployable unit of computing in Kubernetes. Podman can interpret supported Kubernetes manifests and create matching local pods with the supported containers, volumes, and networking options. This lets you smoke-test pod definitions before deploying to a cluster.

---

## Playing a Simple Pod YAML

```bash
# Create a Kubernetes Pod manifest

cat > /tmp/simple-pod.yaml << 'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: simple-pod
  labels:
    app: demo
spec:
  containers:
    - name: web
      image: docker.io/library/nginx:alpine
      ports:
        - containerPort: 80
          hostPort: 8080
    - name: sidecar
      image: docker.io/library/alpine
      command: ["sleep", "3600"]
EOF

# Play the manifest
podman play kube /tmp/simple-pod.yaml

# Both containers run in a single pod
podman pod ls
podman ps --filter pod=simple-pod
```

## Playing a Pod with Init Containers

```bash
cat > /tmp/init-pod.yaml << 'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: init-pod
spec:
  initContainers:
    - name: setup
      image: docker.io/library/alpine
      command: ["sh", "-c", "echo 'Initializing...' && sleep 2"]
  containers:
    - name: app
      image: docker.io/library/alpine
      command: ["sh", "-c", "echo 'App started' && sleep 3600"]
EOF

podman play kube /tmp/init-pod.yaml

# The init container runs first, then the app container starts
podman logs init-pod-setup
podman logs init-pod-app
```

## Playing a Pod with Resource Limits

```bash
cat > /tmp/limited-pod.yaml << 'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: limited-pod
spec:
  containers:
    - name: app
      image: docker.io/library/alpine
      command: ["sleep", "3600"]
      resources:
        limits:
          memory: "256Mi"
          cpu: "500m"
        requests:
          memory: "128Mi"
          cpu: "250m"
EOF

podman play kube /tmp/limited-pod.yaml

# Verify the memory limit is applied
podman inspect limited-pod-app --format '{{.HostConfig.Memory}}'
```

## Playing a Pod with ConfigMap

```bash
cat > /tmp/configmap-pod.yaml << 'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  APP_MODE: "production"
  LOG_LEVEL: "warn"
---
apiVersion: v1
kind: Pod
metadata:
  name: config-pod
spec:
  containers:
    - name: app
      image: docker.io/library/alpine
      command: ["sh", "-c", "echo $APP_MODE $LOG_LEVEL && sleep 3600"]
      envFrom:
        - configMapRef:
            name: app-config
EOF

podman play kube /tmp/configmap-pod.yaml
podman logs config-pod-app
# Output: production warn
```

## Cleaning Up Played Pods

```bash
# Remove all resources created from the YAML
podman play kube --down /tmp/simple-pod.yaml

# Or manually remove
podman pod rm --force simple-pod
```

## Verifying Pod Status

```bash
# After playing, check the status of each container
podman ps --filter pod=simple-pod --format "table {{.Names}}\t{{.Status}}"

# Inspect pod details
podman pod inspect simple-pod
```

## Summary

Use `podman play kube` with Kubernetes Pod YAML to create local pods matching the manifest specification. Podman supports init containers, resource limits, ConfigMaps, and multi-container pods. This provides a way to validate Kubernetes manifests locally before deploying to a cluster.
