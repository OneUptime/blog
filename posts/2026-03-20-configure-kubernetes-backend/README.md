# How to Configure the Kubernetes Backend in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Kubernetes, State Management

Description: Learn how to configure the OpenTofu Kubernetes backend to store state in Kubernetes Secrets with lease-based locking for cloud-native infrastructure management.

## Introduction

The Kubernetes backend stores OpenTofu state as a Kubernetes Secret in a specified namespace. It uses Kubernetes lease objects for state locking and integrates with Kubernetes RBAC for access control. This is a natural fit for platform teams managing Kubernetes infrastructure from within a cluster.

## Basic Configuration

```hcl
# backend.tf

terraform {
  backend "kubernetes" {
    namespace    = "opentofu-state"  # Kubernetes namespace
    secret_suffix = "prod"           # Secret name: tfstate-default-prod

    # Optional: specify kubeconfig
    config_path = "~/.kube/config"
  }
}
```

The state is stored in a Secret named `tfstate-<workspace>-<secret_suffix>`.

## Step 1: Create the Namespace and RBAC

```hcl
# namespace.tf
resource "kubernetes_namespace" "opentofu_state" {
  metadata {
    name = "opentofu-state"
    labels = {
      "app.kubernetes.io/managed-by" = "opentofu"
    }
  }
}

# ServiceAccount for OpenTofu
resource "kubernetes_service_account" "opentofu" {
  metadata {
    name      = "opentofu-runner"
    namespace = kubernetes_namespace.opentofu_state.metadata[0].name
  }
}

# Role with permissions to manage state secrets and leases
resource "kubernetes_role" "opentofu_state" {
  metadata {
    name      = "opentofu-state-manager"
    namespace = kubernetes_namespace.opentofu_state.metadata[0].name
  }

  rule {
    api_groups = [""]
    resources  = ["secrets"]
    verbs      = ["get", "create", "update", "delete", "list"]
  }

  rule {
    api_groups = ["coordination.k8s.io"]
    resources  = ["leases"]
    verbs      = ["get", "create", "update", "delete"]
  }
}

resource "kubernetes_role_binding" "opentofu_state" {
  metadata {
    name      = "opentofu-state-binding"
    namespace = kubernetes_namespace.opentofu_state.metadata[0].name
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.opentofu_state.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.opentofu.metadata[0].name
    namespace = kubernetes_namespace.opentofu_state.metadata[0].name
  }
}
```

## Authentication Methods

### Using kubeconfig File

```hcl
terraform {
  backend "kubernetes" {
    namespace     = "opentofu-state"
    secret_suffix = "prod-app"
    config_path   = "~/.kube/config"
    config_context = "my-cluster-context"  # Specific context
  }
}
```

### Using In-Cluster Config

When running OpenTofu inside the cluster (e.g., as a Job/Pod):

```hcl
terraform {
  backend "kubernetes" {
    namespace     = "opentofu-state"
    secret_suffix = "prod-app"
    in_cluster_config = true  # Use mounted ServiceAccount token
  }
}
```

### Using Explicit Token

```hcl
terraform {
  backend "kubernetes" {
    namespace     = "opentofu-state"
    secret_suffix = "prod-app"
    host          = "https://api.k8s.example.com"
    token         = var.k8s_token
    cluster_ca_certificate = base64decode(var.k8s_ca_cert)
  }
}
```

## Running OpenTofu as a Kubernetes Job

```yaml
# opentofu-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: opentofu-apply
  namespace: opentofu-state
spec:
  template:
    spec:
      serviceAccountName: opentofu-runner
      containers:
        - name: opentofu
          image: ghcr.io/opentofu/opentofu:1.8.0
          command: ["tofu", "apply", "-auto-approve"]
          workingDir: /workspace
          volumeMounts:
            - name: config
              mountPath: /workspace
          env:
            - name: AWS_REGION
              value: us-east-1
      restartPolicy: Never
      volumes:
        - name: config
          configMap:
            name: opentofu-config
```

## Workspace Support

```bash
# Create workspaces
tofu workspace new production

# State secrets:
# tfstate-default-prod         ← default workspace
# tfstate-production-prod      ← production workspace
```

## Viewing State Secrets

```bash
# List OpenTofu state secrets
kubectl get secrets -n opentofu-state | grep tfstate

# Decode and view state (data is gzipped before base64 encoding)
kubectl get secret tfstate-default-prod -n opentofu-state \
  -o jsonpath='{.data.tfstate}' | base64 -d | gunzip | python3 -m json.tool
```

## Locking via Kubernetes Leases

OpenTofu uses Kubernetes Lease objects for state locking:

```bash
# Check for active leases
kubectl get leases -n opentofu-state

# Force delete a stuck lease
kubectl delete lease lock-tfstate-default-prod -n opentofu-state
```

## Conclusion

The Kubernetes backend is a natural fit for platform teams operating Kubernetes-native infrastructure. By storing state in Kubernetes Secrets and using Lease-based locking, it integrates seamlessly with existing RBAC and secret management workflows. For production use, enable Kubernetes Secret encryption at rest and use namespace-based isolation to separate states for different applications or environments.
