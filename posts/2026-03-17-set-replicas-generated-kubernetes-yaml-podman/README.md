# How to Set Replicas in Generated Kubernetes YAML with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Kubernetes, YAML, Replica, Scaling

Description: Learn how to set the replica count when generating Kubernetes Deployment YAML with Podman.

---

> The --replicas flag lets you define how many pod instances should run when generating Kubernetes Deployment YAML from Podman.

When generating a Kubernetes Deployment manifest with Podman, you can specify the number of replicas directly. This saves you from editing the YAML after generation and ensures the manifest is ready for scaled deployment.

---

## Generating a Deployment with Replicas

```bash
# Run a container locally

podman run -d --name api-server \
  -p 3000:3000 \
  -e NODE_ENV=production \
  docker.io/library/node:20-alpine sleep 3600

# Generate a Deployment with 3 replicas
podman generate kube --type deployment --replicas 3 api-server > api-deployment.yaml

# View the replicas field in the generated YAML
cat api-deployment.yaml
```

## Verifying the Replica Count

```bash
# Check the replicas field in the generated YAML
grep -A 1 "replicas:" api-deployment.yaml
# Output:   replicas: 3
```

## Different Replica Counts for Different Environments

```bash
# Development: single replica
podman generate kube --type deployment --replicas 1 api-server > deploy-dev.yaml

# Staging: 2 replicas for basic redundancy
podman generate kube --type deployment --replicas 2 api-server > deploy-staging.yaml

# Production: 5 replicas for high availability
podman generate kube --type deployment --replicas 5 api-server > deploy-prod.yaml
```

## Generating Replicas from a Pod

```bash
# Create a multi-container pod
podman pod create --name web-pod -p 8080:80
podman run -d --pod web-pod --name web docker.io/library/nginx:alpine
podman run -d --pod web-pod --name sidecar docker.io/library/alpine sleep 3600

# Generate a Deployment with 4 replicas from the pod
podman generate kube --type deployment --replicas 4 web-pod > web-deployment.yaml

# Each replica will have both the web and sidecar containers
```

## Including a Service with Replicas

```bash
# Generate a Deployment with replicas and a load-balancing Service
podman generate kube --type deployment --replicas 3 --service api-server > full-deploy.yaml

# The Service will route traffic across all replicas
```

## Applying and Verifying on Kubernetes

```bash
# Apply the scaled deployment
kubectl apply -f api-deployment.yaml

# Verify the replica count
kubectl get deployment api-server-pod-deployment
# NAME                        READY   UP-TO-DATE   AVAILABLE   AGE
# api-server-pod-deployment   3/3     3            3           10s

# List all pods
kubectl get pods -l app=api-server-pod
```

## Scaling After Deployment

```bash
# The generated YAML sets the initial replica count
# You can scale up or down after deployment
kubectl scale deployment api-server-pod-deployment --replicas=10

# Or use autoscaling
kubectl autoscale deployment api-server-pod-deployment \
  --min=3 --max=10 --cpu=80%
```

## Summary

Use `--replicas` with `podman generate kube --type deployment` to set the initial pod replica count in the generated Kubernetes manifest. Generate different manifests for different environments and combine with `--service` to include a load-balancing Service. The replica count can be adjusted after deployment using `kubectl scale`.
