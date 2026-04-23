# How to Configure a Private Registry in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Container Registry, Private Registry

Description: Learn how to configure and use a private container registry in Rancher to securely pull and manage container images across your clusters.

## Introduction

Private container registries are essential for organizations that need to maintain control over their container images, enforce security policies, or operate in air-gapped environments. Rancher provides built-in support for connecting to private registries, making it straightforward to pull images from internal or external private repositories.

This guide walks you through configuring a private registry in Rancher, setting up authentication, and ensuring your workloads can pull images seamlessly.

## Prerequisites

- A running Rancher instance (v2.6 or later)
- Access to a private container registry (self-hosted or cloud-based)
- `kubectl` configured to talk to your cluster
- Rancher cluster admin or project owner permissions

## Understanding Registry Authentication in Kubernetes

Kubernetes uses `imagePullSecrets` to authenticate with private registries. These secrets contain the registry URL and credentials encoded in a Docker configuration format. Rancher provides a UI-driven approach to create namespace-scoped registry secrets, while workloads created with `kubectl` still need to reference those secrets explicitly.

## Step 1: Add a Private Registry Secret in Rancher

1. Log in to the Rancher UI.
2. Go to **Cluster Management** and open your cluster with **Explore**.
3. Go to **Storage** > **Secrets** or **More Resources** > **Core** > **Secrets**.
4. Click **Create** > **Registry**.
5. Fill in the form:
   - **Name**: A descriptive name for the registry secret
   - **Namespace**: The namespace that will use the secret
   - **Registry**: Your registry host or provider (e.g., `registry.example.com`)
   - **Username**: Registry username
   - **Password**: Registry password or token
6. Click **Save**.

In Rancher v2.6 and later, namespace-scoped registries are the default. Project-scoped registries still exist, but require enabling the `legacy` feature flag first. Rancher creates a Kubernetes `Secret` of type `kubernetes.io/dockerconfigjson` in the selected namespace.

## Step 2: Create a Registry Secret via kubectl

You can also create registry secrets directly with kubectl:

```bash
# Create a registry secret for a private registry

kubectl create secret docker-registry my-private-registry \
  --docker-server=registry.example.com \
  --docker-username=myuser \
  --docker-password=mypassword \
  --namespace=my-namespace
```

Verify the secret was created:

```bash
kubectl get secret my-private-registry -n my-namespace -o yaml
```

## Step 3: Configure a Deployment to Use the Registry

Reference the registry secret in your deployment manifest:

```yaml
# deployment.yaml - Deployment using a private registry image
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-namespace
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      # Reference the registry secret here
      imagePullSecrets:
        - name: my-private-registry
      containers:
        - name: my-app
          # Use the full registry URL for the image
          image: registry.example.com/myorg/my-app:v1.0.0
          ports:
            - containerPort: 8080
```

## Step 4: Set Default Registry in Rancher

For Rancher system images in air-gapped environments, you can configure a global default registry that does not require credentials:

1. In Rancher UI, navigate to **Global Settings**.
2. Edit the `system-default-registry` setting.
3. Enter your registry hostname and optional port, without `http://` or `https://`.

If the registry requires credentials for Rancher-provisioned clusters, Rancher documents configuring the cluster-scoped container registry during cluster creation rather than adding it later from **Edit Config**.

On RKE2 nodes, configure authenticated private registry access in `/etc/rancher/rke2/registries.yaml`:

```yaml
# /etc/rancher/rke2/registries.yaml - RKE2 private registry configuration
mirrors:
  docker.io:
    endpoint:
      - "https://registry.example.com:5000"
configs:
  "registry.example.com:5000":
    auth:
      username: myuser
      password: mypassword
    tls:
      insecure_skip_verify: false
```

Create or update this file on every node that needs the registry, then restart RKE2 for the change to take effect.

## Step 5: Automate Secret Distribution with ServiceAccount

To automatically inject registry secrets into all pods in a namespace, patch the default ServiceAccount:

```bash
# Patch the default service account to automatically use the registry secret
kubectl patch serviceaccount default \
  -n my-namespace \
  -p '{"imagePullSecrets": [{"name": "my-private-registry"}]}'
```

New pods that use the default ServiceAccount in that namespace will inherit the registry secret automatically unless they define `imagePullSecrets` explicitly in the pod spec.

## Troubleshooting Common Issues

### ImagePullBackOff Error

If you see `ImagePullBackOff` or `ErrImagePull`:

```bash
# Check pod events for detailed error messages
kubectl describe pod <pod-name> -n <namespace>

# Verify the secret exists and has correct credentials
kubectl get secret my-private-registry -n my-namespace -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d
```

### Testing Registry Connectivity

```bash
# Test registry authentication from inside the cluster
kubectl run test-registry --image=registry.example.com/myorg/test-image:latest \
  -n my-namespace \
  --restart=Never \
  --overrides='{"apiVersion":"v1","spec":{"imagePullSecrets":[{"name":"my-private-registry"}]}}'
```

## Conclusion

Configuring a private registry in Rancher is straightforward and provides secure, centralized management of container images. By leveraging Rancher's built-in registry credential management, you can ensure your workloads consistently pull from the correct sources while maintaining authentication security. For production environments, consider using a dedicated secrets management solution like Vault to rotate registry credentials automatically.
