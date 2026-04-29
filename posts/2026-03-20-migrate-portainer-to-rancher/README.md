# How to Migrate from Portainer to Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Portainer, Kubernetes, Migration, Container Management

Description: Learn how to migrate container workloads and configurations from Portainer to Rancher for enterprise-scale multi-cluster Kubernetes management.

## Introduction

Portainer is excellent for managing Docker containers and small Kubernetes clusters. As deployments scale, Rancher provides advanced multi-cluster management, GitOps with Fleet, comprehensive RBAC, and deeper Kubernetes integration. This guide covers migrating your workloads and workflows from Portainer to Rancher.

## When to Migrate from Portainer to Rancher

- Managing more than 2-3 Kubernetes clusters
- Need for centralized multi-tenant RBAC
- GitOps deployment workflows with Fleet
- Built-in Prometheus monitoring and Grafana dashboards
- Advanced network policy management

## Step 1: Inventory Current Portainer Workloads

In Portainer, navigate to each environment and document:

```bash
# Export Docker Compose stacks from Portainer

# Use Portainer API to list stacks
curl -s -H "X-API-Key: your-portainer-api-key" \
  https://portainer.example.com/api/stacks | jq '.[] | {name, type, status}'
```

For Kubernetes environments in Portainer, export workloads:

```bash
kubectl get deployments,services,ingress,configmaps,secrets \
  -A -o yaml > portainer-k8s-export.yaml
```

## Step 2: Install Rancher

Deploy Rancher on a dedicated cluster:

```bash
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update

kubectl create namespace cattle-system

helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --set hostname=rancher.example.com \
  --set bootstrapPassword=admin \
  --set ingress.tls.source=letsEncrypt \
  --set letsEncrypt.email=ops@example.com
```

## Step 3: Import Clusters into Rancher

For Kubernetes clusters managed in Portainer:

1. In Rancher, go to **Cluster Management** > **Import Existing**.
2. Select cluster type (Generic, EKS, GKE, AKS).
3. Run the provided import command:

```bash
kubectl apply -f https://rancher.example.com/v3/import/xxxxx.yaml
```

## Step 4: Recreate Portainer Stacks in Rancher

### Docker Compose to Kubernetes

Convert Portainer Docker Compose stacks to Kubernetes manifests or Helm charts. For a simple stack:

```yaml
# Portainer stack (docker-compose.yml)
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
```

Rancher Kubernetes equivalent:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: nginx:alpine
          ports:
            - containerPort: 80
          volumeMounts:
            - name: html
              mountPath: /usr/share/nginx/html
              readOnly: true
      volumes:
        - name: html
          configMap:
            name: web-html
---
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: production
spec:
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 80
```

Deploy via Rancher's **Import YAML** feature.

## Step 5: Replicate Portainer User Access in Rancher

Portainer users map to Rancher users with RBAC roles:

| Portainer Role | Rancher Role |
|---|---|
| Administrator | Cluster Owner |
| Standard User | Cluster Member |
| Read-Only | Read-only (project-level) |
| Operator | Custom Role |

In Rancher, navigate to **Users & Authentication** and add users, or configure an identity provider.

## Step 6: Migrate Environment Variables and Secrets

Portainer stores secrets as environment variables in stacks. In Rancher/Kubernetes:

```bash
kubectl create secret generic app-secrets \
  --from-literal=DB_PASSWORD="your-secret" \
  --from-literal=API_KEY="your-api-key" \
  -n production
```

Reference in Deployments via `secretKeyRef` or `envFrom`.

## Step 7: Set Up Rancher Monitoring

Replace Portainer's container stats with Rancher Monitoring:

1. In Rancher, go to your cluster > **Apps** > **Charts**.
2. Install the **Monitoring** chart.
3. Access Grafana dashboards for cluster and workload metrics.

## Step 8: Decommission Portainer

After validating all workloads in Rancher:

```bash
# Remove Portainer from Docker
docker stop portainer && docker rm portainer

# Remove Portainer from Kubernetes
kubectl delete namespace portainer
```

## Best Practices

- Migrate read-only environments first to familiarize the team with Rancher.
- Set up Rancher Projects to group namespaces as you had environments in Portainer.
- Use Rancher Fleet for GitOps to replace manual stack deployments.
- Enable Rancher's audit logging to maintain a deployment history.
- Keep Portainer running in read-only mode during the transition period.

## Conclusion

Migrating from Portainer to Rancher is a natural evolution for teams scaling their container infrastructure. By systematically converting stacks to Kubernetes manifests, recreating access controls, and setting up monitoring, you gain a robust multi-cluster management platform built for enterprise scale.
