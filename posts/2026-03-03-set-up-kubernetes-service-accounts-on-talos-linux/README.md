# How to Set Up Kubernetes Service Accounts on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Service Account, RBAC, Security

Description: A comprehensive guide to creating and managing Kubernetes service accounts on Talos Linux with proper RBAC configuration.

---

Service accounts are the identity mechanism for workloads running inside a Kubernetes cluster. Every pod runs as a service account, and that account determines what the pod is allowed to do when it interacts with the Kubernetes API. On Talos Linux, service accounts work exactly the same way as on any other Kubernetes distribution, but the API server configuration that controls token signing and validation is managed through the Talos machine configuration.

This guide covers creating service accounts, binding them to roles, configuring token behavior, and following security best practices on Talos Linux.

## Understanding Service Accounts

Every namespace in Kubernetes has a default service account. When you create a pod without specifying a service account, it uses this default account. The default service account typically has no special permissions, which is the right behavior for security.

```bash
# View service accounts in a namespace
kubectl get serviceaccounts -n default

# View the default service account details
kubectl get serviceaccount default -n default -o yaml
```

## Creating a Service Account

Create service accounts for your workloads that need specific API access:

```yaml
# service-account.yaml
# Service account for a monitoring application
apiVersion: v1
kind: ServiceAccount
metadata:
  name: monitoring-agent
  namespace: monitoring
  labels:
    app: monitoring-agent
  annotations:
    description: "Service account for the monitoring agent"
```

Apply it:

```bash
kubectl apply -f service-account.yaml
```

## Creating Roles and Bindings

Service accounts are useful only when paired with RBAC roles that define their permissions. There are two levels: Role (namespace-scoped) and ClusterRole (cluster-wide).

### Namespace-Scoped Access

```yaml
# monitoring-role.yaml
# Role that allows reading pods and services in the monitoring namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: monitoring-reader
  namespace: monitoring
rules:
  - apiGroups: [""]
    resources: ["pods", "services", "endpoints"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets"]
    verbs: ["get", "list", "watch"]
---
# Bind the role to the service account
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: monitoring-reader-binding
  namespace: monitoring
subjects:
  - kind: ServiceAccount
    name: monitoring-agent
    namespace: monitoring
roleRef:
  kind: Role
  name: monitoring-reader
  apiGroup: rbac.authorization.k8s.io
```

### Cluster-Wide Access

```yaml
# cluster-monitoring-role.yaml
# ClusterRole for reading resources across all namespaces
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-monitoring-reader
rules:
  - apiGroups: [""]
    resources: ["nodes", "pods", "services", "endpoints", "namespaces"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets", "replicasets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["batch"]
    resources: ["jobs", "cronjobs"]
    verbs: ["get", "list", "watch"]
---
# Bind to the service account
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-monitoring-reader-binding
subjects:
  - kind: ServiceAccount
    name: monitoring-agent
    namespace: monitoring
roleRef:
  kind: ClusterRole
  name: cluster-monitoring-reader
  apiGroup: rbac.authorization.k8s.io
```

Apply the roles:

```bash
kubectl apply -f monitoring-role.yaml
kubectl apply -f cluster-monitoring-role.yaml
```

## Using Service Accounts in Pods

Assign a service account to a pod or deployment:

```yaml
# deployment-with-sa.yaml
# Deployment using a specific service account
apiVersion: apps/v1
kind: Deployment
metadata:
  name: monitoring-agent
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: monitoring-agent
  template:
    metadata:
      labels:
        app: monitoring-agent
    spec:
      serviceAccountName: monitoring-agent
      # Disable auto-mounting for pods that don't need API access
      # automountServiceAccountToken: false
      containers:
        - name: agent
          image: monitoring-agent:1.0
          env:
            # The service account token is available at this path
            - name: KUBERNETES_TOKEN_PATH
              value: /var/run/secrets/kubernetes.io/serviceaccount/token
```

## Configuring Service Account Token Settings on Talos

Talos Linux manages the API server configuration that controls how service account tokens work. You can customize token-related settings:

```yaml
# sa-token-config.yaml
# Configure service account token settings through the API server
cluster:
  apiServer:
    extraArgs:
      # Token issuer URL
      service-account-issuer: "https://kubernetes.default.svc.cluster.local"
      # Maximum token expiration
      service-account-max-token-expiration: "48h"
```

Apply to control plane nodes:

```bash
talosctl apply-config --nodes 192.168.1.10,192.168.1.11,192.168.1.12 \
  --patch @sa-token-config.yaml
```

## Bound Service Account Tokens

Modern Kubernetes uses bound service account tokens by default. These tokens are time-limited and audience-bound, which is more secure than the legacy long-lived tokens.

Create a token manually for external use:

```bash
# Create a token that expires in 1 hour
kubectl create token monitoring-agent -n monitoring --duration=1h

# Create a token with a specific audience
kubectl create token monitoring-agent -n monitoring --audience=my-api --duration=24h
```

For programmatic access from outside the cluster, create a long-lived token secret:

```yaml
# long-lived-token.yaml
# Create a long-lived token for external access (use sparingly)
apiVersion: v1
kind: Secret
metadata:
  name: monitoring-agent-token
  namespace: monitoring
  annotations:
    kubernetes.io/service-account.name: monitoring-agent
type: kubernetes.io/service-account-token
```

## Disabling Auto-Mounted Tokens

Not every pod needs access to the Kubernetes API. Disable token auto-mounting for pods that do not need it:

```yaml
# no-token-pod.yaml
# Pod without an auto-mounted service account token
apiVersion: v1
kind: Pod
metadata:
  name: simple-app
  namespace: default
spec:
  automountServiceAccountToken: false
  containers:
    - name: app
      image: my-app:1.0
```

You can also disable auto-mounting at the service account level:

```yaml
# sa-no-auto-mount.yaml
# Service account with auto-mounting disabled by default
apiVersion: v1
kind: ServiceAccount
metadata:
  name: restricted-sa
  namespace: default
automountServiceAccountToken: false
```

## Service Account Best Practices

### Principle of Least Privilege

Always create specific roles with the minimum required permissions:

```yaml
# least-privilege-role.yaml
# Example: A role for an application that only needs to read its own configmaps
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: app-config-reader
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get"]
    resourceNames: ["my-app-config"]  # Restrict to specific resources
```

### Separate Service Accounts per Application

Do not share service accounts between different applications:

```bash
# Create separate service accounts
kubectl create serviceaccount app-a -n production
kubectl create serviceaccount app-b -n production
kubectl create serviceaccount app-c -n production
```

### Audit Service Account Usage

Regularly review which service accounts have powerful permissions:

```bash
# Find all ClusterRoleBindings that grant cluster-admin
kubectl get clusterrolebindings -o json | \
  jq '.items[] | select(.roleRef.name == "cluster-admin") | .subjects[]'

# Find all service accounts with write access
kubectl auth can-i --list --as=system:serviceaccount:default:my-sa

# Check what a specific service account can do
kubectl auth can-i create pods --as=system:serviceaccount:monitoring:monitoring-agent
kubectl auth can-i delete deployments --as=system:serviceaccount:monitoring:monitoring-agent
```

## Verifying Service Account Permissions

Test that your service account has the expected permissions:

```bash
# Run a pod with the service account and test API access
kubectl run test-sa --image=bitnami/kubectl --rm -it \
  --overrides='{"spec":{"serviceAccountName":"monitoring-agent"}}' \
  --namespace=monitoring --restart=Never \
  -- kubectl get pods -n monitoring

# This should succeed because monitoring-agent has pod read access
# But this should fail:
kubectl run test-sa --image=bitnami/kubectl --rm -it \
  --overrides='{"spec":{"serviceAccountName":"monitoring-agent"}}' \
  --namespace=monitoring --restart=Never \
  -- kubectl delete pod some-pod -n monitoring
```

## Rotating Service Account Signing Keys

On Talos Linux, the service account signing key is part of the cluster secrets managed by Talos. If you need to rotate it:

```bash
# View current cluster secrets (be careful with this output)
talosctl -n 192.168.1.10 get secretstatus
```

Key rotation is a sensitive operation that affects all service account tokens in the cluster. Plan for it carefully and test in a non-production environment first.

Service accounts on Talos Linux follow standard Kubernetes patterns. The Talos-specific aspects are limited to API server configuration for token settings, which is managed through machine configuration patches. The real work is in designing your RBAC roles and bindings to follow the principle of least privilege, creating separate accounts for each workload, and regularly auditing permissions to ensure nothing has more access than it needs.
