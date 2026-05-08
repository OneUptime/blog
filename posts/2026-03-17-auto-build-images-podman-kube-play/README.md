# How to Auto-Build Images with podman kube play

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Kubernetes, Build, Image

Description: Learn how to automatically build container images from a Containerfile when deploying with podman kube play using the --build flag.

---

> The --build flag tells podman kube play to build images from local Containerfiles before deploying your pods.

During development you often need to rebuild images and redeploy pods in a tight loop. Instead of running separate build and play commands, `podman kube play --build` combines both steps. Podman looks for a build context matching the image name and builds it on the fly.

---

## Project Structure

```text
my-app/
├── Containerfile
├── app.py
└── kube.yaml
```

## The Containerfile

```dockerfile
# Containerfile

FROM docker.io/library/python:3.12-slim
WORKDIR /app
COPY app.py .
CMD ["python", "app.py"]
```

## The Kubernetes YAML

```yaml
# kube.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
    - name: app
      # Use a local image name that matches the build directory
      image: my-app
      ports:
        - containerPort: 8080
```

## Building and Deploying

```bash
# Build the image and deploy the pod in one command
# The --build flag triggers a build for local images
podman kube play --build kube.yaml

# Podman looks for a directory named "my-app" with a Containerfile
# and uses that directory as the build context
```

## Specifying a Build Context

```bash
# Use --context-dir to point to the build context directory
podman kube play --build --context-dir ./my-app kube.yaml

# Podman builds my-app from ./my-app/Containerfile
# then deploys the pod using the freshly built image
```

## Rebuild and Redeploy Cycle

```bash
# Tear down the existing deployment
podman kube play --down kube.yaml

# Rebuild and redeploy after code changes
podman kube play --build kube.yaml
```

## Using the Matching Directory Layout

```yaml
# kube-layout.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
    - name: app
      # Podman builds from ./my-app/Containerfile
      image: my-app
```

## Multiple Containers with Builds

```yaml
# multi-build.yaml
apiVersion: v1
kind: Pod
metadata:
  name: fullstack
spec:
  containers:
    - name: frontend
      image: frontend
    - name: backend
      image: backend
```

```bash
# Build both images and deploy
# Podman looks for frontend/ and backend/ directories
podman kube play --build multi-build.yaml
```

## Summary

The `--build` flag on `podman kube play` builds container images from local Containerfiles before deploying pods. Use `--context-dir` to specify the build context directory. This eliminates the need for separate build and deploy steps during development.
