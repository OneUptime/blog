# How to Migrate from Kubernetes Dashboard to Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Portainer, Migration, Container Management, DevOps, Dashboard

Description: Learn how to migrate your Kubernetes management workflow from the native Kubernetes Dashboard to Portainer for a richer feature set and unified multi-environment control.

---

Kubernetes Dashboard is now deprecated and unmaintained. It still provides a web UI for common cluster tasks, but Portainer goes further with multi-environment management, registry integration, Helm-based application deployment, and a consistent UI across Docker and Kubernetes environments. This guide walks you through migrating from one to the other.

---

## Why Move to Portainer?

| Feature | Kubernetes Dashboard | Portainer |
|---|---|---|
| Unified Docker + Kubernetes UI | No | Yes |
| Registry management | No | Yes |
| Access control | Kubernetes RBAC | Admin/User in CE, granular roles in BE |
| Multi-environment management | No | Yes |
| Helm chart deployment | No | Yes |

---

## Step 1: Remove the Kubernetes Dashboard (Optional)

If you no longer want the old dashboard running, remove it cleanly before proceeding.

```bash
# Remove a Helm-based Kubernetes Dashboard installation
helm uninstall kubernetes-dashboard -n kubernetes-dashboard

# Confirm all dashboard resources are removed
kubectl get all -n kubernetes-dashboard
```

---

## Step 2: Deploy Portainer Agent on Your Cluster (If Portainer Server Runs Elsewhere)

If you already run a Portainer server outside the cluster, deploy the agent so that server can manage this Kubernetes environment.

```bash
# Apply the Portainer Agent load balancer manifest for Kubernetes
kubectl apply -n portainer -f https://downloads.portainer.io/ce-lts/portainer-agent-k8s-lb.yaml

# Verify the agent pod is running
kubectl get pods -n portainer
```

---

## Step 3: Install Portainer Server (If Not Already Running)

If you don't have a Portainer server running elsewhere, deploy it into the same cluster instead of Step 2. This install expects a default StorageClass for Portainer's persistent data.

```bash
# Deploy Portainer CE using the NodePort manifest
kubectl apply -n portainer -f https://downloads.portainer.io/ce-lts/portainer.yaml

# Get the service and find the NodePort
kubectl get svc -n portainer
```

---

## Step 4: Connect Your Cluster in Portainer

If you deployed only the agent in Step 2, add your Kubernetes environment in the Portainer UI. If you installed Portainer server in Step 3, use the local environment created during setup.

```bash
# Check the agent service and note the EXTERNAL-IP for port 9001
kubectl get svc portainer-agent -n portainer
```

In the Portainer UI:
1. Navigate to **Environments**
2. Click **Add environment**
3. Choose **Kubernetes** and click **Start Wizard**
4. Under **More options**, select **Agent**, then **Kubernetes via load balancer**
5. Enter the agent service's external IP or DNS name with port `9001` in **Environment URL**. Do not include `https://`
6. Click **Connect**

---

## Step 5: Recreate Your Workloads from Manifests

Portainer lets you deploy Kubernetes manifests as applications from the UI.

```yaml
# example-app.yaml - deploy an Nginx workload from a Kubernetes manifest
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:latest
          ports:
            - containerPort: 80
```

In Portainer, go to **Applications > Create from code**, choose **Manifest**, paste this YAML, and deploy.

---

## Step 6: Set Up Access Control

Portainer CE on Kubernetes provides `Admin` and `User` roles. If you need more granular roles such as `Operator` or `Helpdesk`, use Portainer Business Edition.

1. Go to **Users** to create user accounts
2. In Portainer CE, the built-in roles for Kubernetes access are **Admin** and **User**
3. If you need environment-level roles such as **Operator** or **Helpdesk**, use Portainer BE and assign users or teams to roles for the environment

---

## Monitoring with OneUptime

Once Portainer is managing your workloads, integrate OneUptime to monitor service health across all your Kubernetes namespaces - giving you uptime checks, on-call alerts, and status pages in one place.

---

## Summary

Migrating from Kubernetes Dashboard to Portainer takes about 15 minutes and gives you a dramatically richer management experience. You gain manifest and Helm-based application deployment, registry management, and multi-environment support without losing any visibility the old dashboard provided.
