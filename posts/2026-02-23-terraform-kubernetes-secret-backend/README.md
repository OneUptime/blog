# How to Configure Kubernetes Secret Backend for Terraform State

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, State Management, Secrets, Infrastructure as Code

Description: Learn how to store Terraform state in Kubernetes Secrets, including configuration steps, RBAC setup, namespace organization, encryption, and practical considerations.

---

Storing Terraform state in Kubernetes Secrets is an option that makes sense when Kubernetes is central to your infrastructure and you want to keep your state close to your workloads. The Kubernetes backend stores the state as a Kubernetes Secret object, which means it benefits from Kubernetes RBAC, namespace isolation, and etcd encryption. This guide covers how to set it up and what to watch out for.

## When to Use the Kubernetes Backend

This backend is a good fit when:

- Kubernetes is your primary platform and you manage everything through it
- You run Terraform from within Kubernetes (e.g., in a CI/CD pipeline running on the cluster)
- You want namespace-level isolation for different teams or environments
- You do not want to introduce additional storage services just for Terraform state
- Your state files are relatively small (Kubernetes Secrets have a 1MB size limit)

It is not ideal for very large state files or environments where Kubernetes is not the central platform.

## Prerequisites

You need:

- A running Kubernetes cluster
- `kubectl` configured with appropriate access
- Terraform installed
- A namespace for storing state (or permission to create one)

## Creating a Namespace

Create a dedicated namespace for Terraform state:

```bash
# Create a namespace for Terraform state
kubectl create namespace terraform-state

# Verify the namespace
kubectl get namespace terraform-state
```

## Basic Backend Configuration

Here is the basic setup:

```hcl
# backend.tf
terraform {
  backend "kubernetes" {
    # The name of the Kubernetes Secret that will hold the state
    secret_suffix = "myproject"

    # The namespace where the Secret will be stored
    namespace     = "terraform-state"
  }
}
```

Terraform creates a Secret named `tfstate-default-myproject` (the format is `tfstate-<workspace>-<secret_suffix>`).

Initialize the backend:

```bash
# Initialize the Kubernetes backend
terraform init

# After applying, check the secret was created
kubectl get secrets -n terraform-state

# Output:
# NAME                          TYPE     DATA   AGE
# tfstate-default-myproject     Opaque   1      30s
```

## Authentication

The Kubernetes backend uses the same authentication as `kubectl`. There are several ways to configure it.

### Default kubeconfig

By default, Terraform uses your `~/.kube/config` file:

```hcl
terraform {
  backend "kubernetes" {
    secret_suffix = "myproject"
    namespace     = "terraform-state"

    # Uses default kubeconfig automatically
  }
}
```

### Custom kubeconfig Path

Point to a specific kubeconfig file:

```hcl
terraform {
  backend "kubernetes" {
    secret_suffix    = "myproject"
    namespace        = "terraform-state"

    # Custom kubeconfig file
    config_path      = "/path/to/custom/kubeconfig"

    # Optionally specify the context to use
    config_context   = "my-cluster-context"
  }
}
```

### In-Cluster Configuration

When running inside a Kubernetes pod (e.g., in a CI/CD pipeline):

```hcl
terraform {
  backend "kubernetes" {
    secret_suffix    = "myproject"
    namespace        = "terraform-state"

    # Use the pod's service account for authentication
    in_cluster_config = true
  }
}
```

### Explicit Credentials

You can also specify credentials directly:

```hcl
terraform {
  backend "kubernetes" {
    secret_suffix = "myproject"
    namespace     = "terraform-state"

    # Direct authentication
    host          = "https://my-cluster.example.com:6443"
    token         = "your-service-account-token"

    # TLS configuration
    cluster_ca_certificate = file("/path/to/ca.crt")
  }
}
```

## RBAC Configuration

Create a ServiceAccount and RBAC rules for Terraform:

```yaml
# terraform-rbac.yaml
# Service account for Terraform state operations

apiVersion: v1
kind: ServiceAccount
metadata:
  name: terraform
  namespace: terraform-state

---
# Role that allows managing secrets in the terraform-state namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: terraform-state-manager
  namespace: terraform-state
rules:
  # Permissions for state storage (Secrets)
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "create", "update", "patch", "delete"]
  # Permissions for state locking (Leases)
  - apiGroups: ["coordination.k8s.io"]
    resources: ["leases"]
    verbs: ["get", "create", "update", "delete"]

---
# Bind the role to the service account
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: terraform-state-manager
  namespace: terraform-state
subjects:
  - kind: ServiceAccount
    name: terraform
    namespace: terraform-state
roleRef:
  kind: Role
  name: terraform-state-manager
  apiGroup: rbac.authorization.k8s.io
```

Apply the RBAC configuration:

```bash
# Apply RBAC rules
kubectl apply -f terraform-rbac.yaml

# Create a token for the service account
kubectl create token terraform -n terraform-state --duration=24h
```

## State Locking

The Kubernetes backend supports state locking through Kubernetes Lease objects. This is enabled by default:

```bash
# During a terraform apply, check for lease objects
kubectl get leases -n terraform-state

# Output during an active operation:
# NAME                          HOLDER   AGE
# tflock-default-myproject      abc123   5s
```

The lease is automatically released when the operation completes. If it gets stuck:

```bash
# Force unlock with the lock ID from the error message
terraform force-unlock LOCK_ID

# Or manually delete the lease (last resort)
kubectl delete lease tflock-default-myproject -n terraform-state
```

## Inspecting State

You can view the stored state directly through kubectl:

```bash
# Get the secret containing the state
kubectl get secret tfstate-default-myproject -n terraform-state -o yaml

# The state is base64-encoded in the secret data
# Decode it to see the actual state JSON
kubectl get secret tfstate-default-myproject -n terraform-state \
  -o jsonpath='{.data.tfstate}' | base64 --decode | jq .
```

## Encryption at Rest

Kubernetes Secrets are base64-encoded but not encrypted by default. To encrypt them at rest, configure encryption in your Kubernetes cluster:

```yaml
# encryption-config.yaml
# Place this on your API server
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      - identity: {}
```

Managed Kubernetes services (EKS, GKE, AKS) typically provide encryption at rest options through their own configuration.

## Multiple Environments

Use different namespaces or secret suffixes for different environments:

```hcl
# Development
terraform {
  backend "kubernetes" {
    secret_suffix = "networking"
    namespace     = "terraform-dev"
  }
}

# Production
terraform {
  backend "kubernetes" {
    secret_suffix = "networking"
    namespace     = "terraform-prod"
  }
}
```

Or use workspaces - each workspace creates a separate secret:

```bash
# Create workspaces
terraform workspace new staging
terraform workspace new production

# Each workspace gets its own secret:
# tfstate-staging-myproject
# tfstate-production-myproject
```

## Running Terraform in a Kubernetes Pod

Here is a complete example of running Terraform inside a Kubernetes Job:

```yaml
# terraform-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: terraform-apply
  namespace: terraform-state
spec:
  template:
    spec:
      serviceAccountName: terraform
      containers:
        - name: terraform
          image: hashicorp/terraform:1.7
          command: ["sh", "-c"]
          args:
            - |
              # Initialize the backend
              terraform init
              # Run the plan
              terraform plan -out=tfplan
              # Apply the plan
              terraform apply tfplan
          workingDir: /terraform
          volumeMounts:
            - name: terraform-config
              mountPath: /terraform
      volumes:
        - name: terraform-config
          configMap:
            name: terraform-config
      restartPolicy: Never
  backoffLimit: 0
```

## Size Limitations

Kubernetes Secrets have a hard limit of 1MB. Since the state is base64-encoded inside the Secret, the effective state size limit is about 750KB of raw JSON. If your state file grows beyond this:

- Split your infrastructure into smaller configurations
- Use a different backend (S3, GCS, Azure Blob) for large projects
- Consider using the `etcd` backend directly for larger limits

Check your current state size:

```bash
# Check the size of your current state
terraform state pull | wc -c

# If it's approaching 750KB, consider splitting
```

## Backup Strategy

Since state lives in Kubernetes, include it in your cluster backup strategy:

```bash
# Backup all state secrets
kubectl get secrets -n terraform-state -o yaml > terraform-state-backup.yaml

# Restore from backup
kubectl apply -f terraform-state-backup.yaml
```

Tools like Velero can automate this as part of cluster-wide backups.

## Summary

The Kubernetes Secret backend is a niche but useful option for storing Terraform state when Kubernetes is at the center of your infrastructure. It provides namespace isolation, RBAC-based access control, and state locking through Leases. The main limitation is the 1MB Secret size cap, which makes it unsuitable for very large state files. For teams already deep in the Kubernetes ecosystem, it keeps everything in one place and avoids adding external storage dependencies. For more Terraform backend options, see our posts on [Consul backend](https://oneuptime.com/blog/post/2026-02-23-terraform-consul-backend/view) and [PostgreSQL backend](https://oneuptime.com/blog/post/2026-02-23-terraform-postgresql-backend/view).
