# How to Create Namespaces in Portainer for Kubernetes - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Namespace, Organization, DevOps

Description: Learn how to create and configure Kubernetes namespaces in Portainer for organizing workloads and implementing multi-tenancy.

## Introduction

Kubernetes namespaces provide a mechanism for isolating groups of resources within a cluster. They enable multi-tenancy, access control boundaries, and resource quota enforcement. Portainer provides an interface for creating and managing namespaces alongside their access controls and resource quotas. This guide covers namespace creation and configuration.

## Prerequisites

- Portainer with Kubernetes environment
- Admin access to Portainer and the cluster

## When to Use Namespaces

```text
Single namespace (default):     Small projects, learning environments
Multiple namespaces:
  By environment:               production, staging, development
  By team:                      frontend, backend, data-platform
  By application:               ecommerce, analytics, internal-tools
  By combination:               production-frontend, staging-backend
```

## Step 1: Create a Namespace via Portainer

1. Select your Kubernetes environment in Portainer
2. Click **Namespaces** in the sidebar
3. Click **Add with form**
4. Configure:

```text
Name:         production
Annotations:
  description: "Production environment namespace"
  contact: ops@company.com
```

5. Click **Create namespace**

## Step 2: Create Namespace via YAML

In Portainer's **Create from manifest** editor:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    environment: production
    team: platform
    pod-security.kubernetes.io/enforce: restricted   # Pod Security Admission
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
  annotations:
    description: "Production environment - restricted access"
    contact: "ops@company.com"
    documentation: "https://wiki.company.com/production"
```

```bash
# Or via kubectl

kubectl create namespace production \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Step 3: Create Multiple Namespaces for Environments

```yaml
# Create all environment namespaces at once
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    environment: production
---
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    environment: staging
---
apiVersion: v1
kind: Namespace
metadata:
  name: development
  labels:
    environment: development
---
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
  labels:
    team: platform
    purpose: monitoring
```

## Step 4: Restrict Access to the `default` Namespace in Portainer

After creating namespaces, you can make the built-in `default` namespace behave like a regular restricted namespace:

1. In the Kubernetes environment, expand **Cluster**
2. Click **Setup**
3. Enable **Restrict access to the default namespace**

## Step 5: Namespace Naming Conventions

Best practices for namespace names:

```text
# By environment + team
production-backend
staging-frontend
development-data-team

# By application
ecommerce-app
analytics-platform
internal-tools

# Simple environments
production
staging
development
testing
```

Rules:
- Lowercase alphanumeric and hyphens only
- Must start with a letter or number
- Must end with a letter or number
- Maximum 63 characters
- Avoid the `kube-` prefix (reserved for Kubernetes system namespaces)

## Step 6: Reserved Namespaces

Do not use these reserved namespaces for application workloads:

```text
kube-system       - Kubernetes system components
kube-public       - Public cluster information
kube-node-lease   - Node heartbeat leases
default           - OK for small projects, but prefer dedicated namespaces
```

## Step 7: Verify Namespace Creation

```bash
# List all namespaces
kubectl get namespaces

# Output:
# NAME              STATUS   AGE
# default           Active   30d
# kube-node-lease   Active   30d
# kube-public       Active   30d
# kube-system       Active   30d
# production        Active   1m
# staging           Active   1m
# development       Active   1m
# monitoring        Active   1m

# View namespace details
kubectl describe namespace production
```

## Step 8: Set Default Namespace for kubectl

```bash
# Set default namespace for your kubectl context
kubectl config set-context --current --namespace=production

# Verify
kubectl config view --minify | grep namespace:

# Now all kubectl commands use production namespace by default
kubectl get pods    # Lists pods in production
```

## Step 9: Namespace-scoped vs Cluster-scoped Resources

Most Kubernetes resources are namespace-scoped:

```text
Namespace-scoped:     Pods, Deployments, Services, PVCs, ConfigMaps, Secrets
Cluster-scoped:       Nodes, PersistentVolumes, StorageClasses, ClusterRoles
```

When you delete a namespace, ALL namespace-scoped resources in it are deleted.

## Namespace Best Practices

```yaml
# Include these in every new namespace:
# 1. Default resource quota
apiVersion: v1
kind: ResourceQuota
metadata:
  name: default-quota
  namespace: production
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    pods: "100"

---
# 2. Default limit range
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
    - type: Container
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      default:
        cpu: 500m
        memory: 256Mi

---
# 3. Default deny network policy
# Requires a CNI plugin with NetworkPolicy support
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

## Conclusion

Namespaces are the primary organizational unit in Kubernetes and the foundation for multi-tenancy. Portainer makes it easy to create namespaces and associate them with teams and resource quotas. Establish a clear naming convention from the start, and apply resource quotas, limit ranges, and, where your CNI supports NetworkPolicy enforcement, default network policies to new namespaces to ensure consistent governance across your cluster.
