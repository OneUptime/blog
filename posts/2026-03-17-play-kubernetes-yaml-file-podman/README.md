# How to Play a Kubernetes YAML File with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Kubernetes, YAML, Plays

Description: Learn how to use podman play kube to create containers and pods from Kubernetes YAML manifests.

---

> The podman play kube command brings Kubernetes YAML manifests to life as local Podman pods and containers.

Podman can consume Kubernetes YAML files and create the corresponding pods, containers, and volumes locally. This lets you test Kubernetes manifests without a cluster, run Kubernetes-defined workloads on a single machine, and share deployment configurations between Podman and Kubernetes environments.

---

## Basic Usage

```bash
# Create a simple Kubernetes Pod YAML file

cat > /tmp/web-pod.yaml << 'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: web-pod
spec:
  containers:
    - name: web
      image: docker.io/library/nginx:alpine
      ports:
        - containerPort: 80
          hostPort: 8080
EOF

# Play the YAML file with Podman
podman play kube /tmp/web-pod.yaml

# Verify the pod and container are running
podman pod ls
podman ps
```

## Playing YAML with Environment Variables

```bash
cat > /tmp/app-pod.yaml << 'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
    - name: app
      image: docker.io/library/alpine
      command: ["sh", "-c", "echo $APP_NAME is running && sleep 3600"]
      env:
        - name: APP_NAME
          value: "my-application"
        - name: LOG_LEVEL
          value: "info"
EOF

podman play kube /tmp/app-pod.yaml
podman logs app-pod-app
```

## Playing YAML with Volumes

```bash
cat > /tmp/vol-pod.yaml << 'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: vol-pod
spec:
  containers:
    - name: writer
      image: docker.io/library/alpine
      command: ["sh", "-c", "echo hello > /data/test.txt && sleep 3600"]
      volumeMounts:
        - name: shared
          mountPath: /data
  volumes:
    - name: shared
      persistentVolumeClaim:
        claimName: my-pvc
EOF

# Podman creates a named volume for the PVC
podman play kube /tmp/vol-pod.yaml
podman volume ls
```

## Tearing Down Resources

```bash
# Remove all resources created by play kube
podman play kube --down /tmp/web-pod.yaml

# This stops and removes the pods and containers
podman pod ls
```

## Playing from a URL

```bash
# Play a YAML file directly from a URL
podman play kube https://example.com/manifests/app-pod.yaml
```

## Playing with Image Pull Policy

```bash
# Always pull the image when starting the container
sed -i '/image: docker.io\/library\/nginx:alpine/a\      imagePullPolicy: Always' /tmp/web-pod.yaml
podman play kube /tmp/web-pod.yaml

# Never pull, use only local images
sed -i 's/imagePullPolicy: Always/imagePullPolicy: Never/' /tmp/web-pod.yaml
podman play kube --replace /tmp/web-pod.yaml

# Pull only if not present locally (default)
sed -i 's/imagePullPolicy: Never/imagePullPolicy: IfNotPresent/' /tmp/web-pod.yaml
podman play kube --replace /tmp/web-pod.yaml
```

## Replacing Existing Resources

```bash
# Replace existing pods created from the same YAML
podman play kube --replace /tmp/web-pod.yaml

# This tears down the old pod and creates a new one
```

## Summary

Use `podman play kube` to create pods, containers, and volumes from Kubernetes YAML manifests. This lets you test manifests locally without a Kubernetes cluster. Use `--down` to tear down resources, `--replace` to update them, and `imagePullPolicy` to control image fetching behavior.
