# How to Test Kubernetes YAML Locally with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Kubernetes, Testing, Local Development

Description: Learn how to validate and test Kubernetes YAML manifests locally using Podman before deploying to a cluster.

---

> Test your Kubernetes YAML locally with Podman to catch errors before they reach your cluster.

Deploying untested YAML to a Kubernetes cluster can cause outages and debugging headaches. Podman lets you run supported Kubernetes manifests locally on your workstation. This fast feedback loop catches many misconfigurations, broken images, and resource issues before they affect production.

---

## Validating YAML Syntax

```bash
# podman kube play does not include a dry-run validation flag,
# so validate with other tools first

# Check YAML syntax with Python and PyYAML
python3 -c "import yaml; list(yaml.safe_load_all(open('deployment.yaml')))"

# Or use kubectl for schema validation if available
kubectl apply --dry-run=client --validate=strict -f deployment.yaml
```

## Running YAML Locally with Podman

```yaml
# app.yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-app
spec:
  containers:
    - name: web
      image: docker.io/library/nginx:alpine
      ports:
        - containerPort: 80
          hostPort: 8080
      readinessProbe:
        httpGet:
          path: /
          port: 80
        initialDelaySeconds: 5
        periodSeconds: 10
```

```bash
# Deploy the YAML locally
podman kube play app.yaml

# Test the application is running correctly
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080
# Output: 200
```

## Testing Multi-Container Pods

```yaml
# multi-container.yaml
apiVersion: v1
kind: Pod
metadata:
  name: full-app
spec:
  containers:
    - name: app
      image: docker.io/library/python:3.12-slim
      command: ["python", "-m", "http.server", "5000"]
      ports:
        - containerPort: 5000
          hostPort: 5000
    - name: redis
      image: docker.io/library/redis:7-alpine
```

```bash
# Deploy locally and verify both containers are running
podman kube play multi-container.yaml
podman ps --filter pod=full-app
```

## Testing Environment Variables and ConfigMaps

```bash
# Deploy with ConfigMaps and verify variables are set
podman kube play app-with-config.yaml

# Check that the environment variables are correctly injected
podman exec test-app-web env | grep APP_
```

## Checking Logs for Errors

```bash
# View logs from all containers in the pod
podman pod logs test-app

# View logs from a specific container
podman logs test-app-web

# Follow logs in real time during testing
podman logs -f test-app-web
```

## Iterative Testing Workflow

```bash
#!/bin/bash
# test-yaml.sh - quick iteration script
YAML_FILE="$1"

# Tear down any previous run
podman kube play --down "$YAML_FILE" 2>/dev/null

# Deploy fresh
podman kube play "$YAML_FILE"

# Wait for containers to start
sleep 3

# Run basic health checks
echo "Pod status:"
podman pod ps

echo "Container status:"
podman ps --filter pod=test-app

echo "Application response:"
curl -s http://localhost:8080 | head -5
```

## Cleaning Up After Tests

```bash
# Remove all test resources
podman kube play --down app.yaml

# Remove test volumes
podman volume prune -f

# Remove test images to save disk space
podman image prune -f
```

## Summary

Podman lets you test supported Kubernetes YAML locally by deploying pods on your workstation with `podman kube play`. This catches image, configuration, and networking errors before they reach your cluster. Use an iterative tear-down-and-redeploy script for a fast feedback loop.
