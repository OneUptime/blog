# How to Tear Down Resources Created by podman kube play

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Kubernetes, YAML, Cleanup

Description: Learn how to remove pods, containers, and associated resources created by podman kube play using the --down flag.

---

> The --down flag reverses a podman kube play deployment, stopping and removing pods and containers in one command.

After testing or when you need to redeploy, you must clean up the resources that `podman kube play` created. The `--down` flag provides a declarative way to tear everything down using the same YAML file that created the resources.

---

## Basic Tear Down

```bash
# Deploy a pod from YAML

podman kube play deployment.yaml

# Tear down all resources created by that YAML
podman kube play --down deployment.yaml
```

The `--down` flag stops and removes all pods and containers that were created from the specified YAML file.

## What Gets Removed

```bash
# Before tear down - check running resources
podman pod ls
podman ps -a

# Tear down
podman kube play --down deployment.yaml

# After tear down - pods and containers are gone
podman pod ls
podman ps -a
```

Resources removed by `--down`:
- Pods defined in the YAML
- Containers within those pods
- The infra container for each pod

Resources that persist after `--down`:
- Named volumes (PersistentVolumeClaims), unless you use `--force`
- Podman secrets
- Downloaded images
- Networks

## Tearing Down Multi-Document YAML

```yaml
# multi-app.yaml - contains multiple pods
apiVersion: v1
kind: Pod
metadata:
  name: frontend
spec:
  containers:
    - name: web
      image: docker.io/library/nginx:alpine
---
apiVersion: v1
kind: Pod
metadata:
  name: backend
spec:
  containers:
    - name: api
      image: docker.io/library/python:3.12-slim
      command: ["python", "-m", "http.server", "8000"]
```

```bash
# Deploy both pods
podman kube play multi-app.yaml

# Tear down both pods in one command
podman kube play --down multi-app.yaml
```

## Force Flag for PersistentVolumeClaims

```bash
# Tear down the deployment and remove volumes linked to PersistentVolumeClaims
podman kube play --down --force deployment.yaml
```

## Cleaning Up Remaining Resources

```bash
# After --down, manually clean up volumes if needed
podman volume ls
podman volume rm my-pvc-volume

# Remove unused images
podman image prune -a -f

# Remove secrets
podman secret rm my-secret
```

## Redeploy After Tear Down

```bash
# Tear down the current deployment
podman kube play --down deployment.yaml

# Make changes to the YAML, then redeploy
podman kube play deployment.yaml
```

## Scripting Tear Down and Redeploy

```bash
#!/bin/bash
# redeploy.sh - tear down and redeploy in one script
YAML_FILE="$1"

echo "Tearing down existing deployment..."
podman kube play --down "$YAML_FILE" 2>/dev/null

echo "Deploying fresh..."
podman kube play "$YAML_FILE"

echo "Running pods:"
podman pod ls
```

```bash
# Usage
chmod +x redeploy.sh
./redeploy.sh my-app.yaml
```

## Summary

Use `podman kube play --down` with your original YAML file to stop and remove pods and containers. Named volumes and secrets persist after tear down unless you use `--force` for PersistentVolumeClaim volumes, so you must remove remaining resources separately if needed. This makes redeploy cycles fast and predictable.
