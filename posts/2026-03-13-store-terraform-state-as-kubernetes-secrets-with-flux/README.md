# How to Store Terraform State as Kubernetes Secrets with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Tofu Controller, Terraform, State Management, Kubernetes Secrets, GitOps

Description: Configure the Tofu Controller to store Terraform state in Kubernetes secrets for simple, cluster-native state management without external backends.

---

## Introduction

Terraform state is the source of truth for your infrastructure. Losing it means losing the ability to manage existing resources without manual import. The Tofu Controller's default state backend stores Terraform state as Kubernetes Secrets within the cluster, which is simple to configure, requires no external dependencies, and integrates naturally with Kubernetes RBAC and backup tools like Velero.

Storing state in Kubernetes Secrets is an excellent choice for development environments, small-scale deployments, or teams that already back up their cluster's etcd data. The secrets are automatically managed by the controller, encrypted at rest when Kubernetes encryption-at-rest is enabled, and scoped to the namespace where the Terraform resource lives.

This guide covers the default Kubernetes secret state backend, including how to access, back up, and restore state.

## Prerequisites

- Tofu Controller installed via Flux
- `kubectl` CLI with access to the cluster
- Kubernetes encryption-at-rest configured (recommended for production)

## Step 1: Understand the Default State Backend

When no `backendConfig` is specified in a `Terraform` resource, the Tofu Controller automatically uses a Kubernetes Secret backend. No configuration is required.

```yaml
# infrastructure/terraform/simple-state-example.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: my-s3-bucket
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/s3-bucket
  workspace: my-s3-bucket-dev
  approvePlan: "auto"

  # No backendConfig means the controller uses Kubernetes Secrets for state
  # State is stored in a Secret named: tfstate-{workspace}-{resource-name}

  vars:
    - name: bucket_name
      value: my-app-dev-assets
    - name: region
      value: us-east-1
```

## Step 2: Locate the State Secret

After the first successful apply, the Tofu Controller creates a state secret.

```bash
# List state secrets (they follow the naming convention tfstate-*)
kubectl get secrets -n flux-system | grep tfstate

# Example output:
# tfstate-my-s3-bucket-dev-my-s3-bucket   Opaque   1      10m

# View the secret metadata
kubectl describe secret tfstate-my-s3-bucket-dev-my-s3-bucket \
  -n flux-system
```

## Step 3: Access the Terraform State for Debugging

```bash
# Extract the state file for inspection
kubectl get secret tfstate-my-s3-bucket-dev-my-s3-bucket \
  -n flux-system \
  -o jsonpath='{.data.tfstate}' | base64 -d | gunzip > terraform.tfstate

# View the state resources
cat terraform.tfstate | jq '.resources[].type'

# View a specific resource in the state
cat terraform.tfstate | jq '.resources[] | select(.type == "aws_s3_bucket")'

# Clean up the local state file
rm terraform.tfstate
```

## Step 4: Back Up State Secrets with Velero

Configure Velero to back up Terraform state secrets so they survive cluster failures.

```yaml
# infrastructure/velero/terraform-state-backup.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: terraform-state-backup
  namespace: velero
spec:
  # Back up every hour
  schedule: "0 * * * *"
  template:
    includedNamespaces:
      - flux-system
    # Only back up secrets matching the terraform state label
    labelSelector:
      matchLabels:
        # Tofu Controller labels state secrets with this label
        tfstate: "true"
    storageLocation: default
    ttl: 720h  # Retain backups for 30 days
```

## Step 5: Restore State After Cluster Failure

If the cluster is lost, restore the state secrets before re-bootstrapping Flux.

```bash
# Restore terraform state secrets from Velero backup
velero restore create terraform-state-restore \
  --from-schedule terraform-state-backup \
  --include-namespaces flux-system \
  --selector tfstate=true

# Wait for the restore to complete
velero restore describe terraform-state-restore --details

# Verify the state secrets are restored
kubectl get secrets -n flux-system | grep tfstate
```

## Step 6: Export State for Manual Operations

Sometimes you need to run Terraform CLI commands outside the controller.

```bash
# Extract state for a specific workspace
WORKSPACE="my-s3-bucket-dev"
RESOURCE="my-s3-bucket"

kubectl get secret "tfstate-${WORKSPACE}-${RESOURCE}" \
  -n flux-system \
  -o jsonpath='{.data.tfstate}' | base64 -d | gunzip > terraform.tfstate

# Initialize Terraform with the local state file
export TF_CLI_ARGS_init="-backend=false"
terraform init

# Use the local state file
terraform state list -state=terraform.tfstate
terraform state show -state=terraform.tfstate aws_s3_bucket.main

# After manual operations, import the state back
# (re-compress and base64 encode before creating/updating the secret)
gzip -c terraform.tfstate | base64 > tfstate.b64
kubectl create secret generic "tfstate-${WORKSPACE}-${RESOURCE}" \
  -n flux-system \
  --from-file=tfstate=<(cat tfstate.b64 | base64 -d) \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Step 7: Configure Encryption at Rest

For production clusters, ensure Kubernetes encryption-at-rest is enabled to protect state secrets.

```yaml
# kube-apiserver EncryptionConfiguration (applied to your control plane)
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      # Encrypt secrets with AES-CBC using a 256-bit key
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      # Identity (unencrypted) as fallback for reading old secrets
      - identity: {}
```

## Best Practices

- Enable Kubernetes encryption-at-rest for Secrets when using the Kubernetes state backend. Terraform state often contains sensitive values like database passwords and API keys.
- Use Velero or etcd backup to protect state secrets from cluster failures. Back up on a schedule that aligns with your recovery time objective.
- For shared infrastructure (VPCs, DNS zones) that multiple teams depend on, use an S3 or GCS backend instead of Kubernetes Secrets. The shared backend provides a single source of truth accessible to multiple clusters.
- Apply RBAC to restrict who can read state secrets. Terraform state contains the values of all resource attributes, including sensitive ones.
- Tag state secrets with consistent labels so backup tools and access policies can target them reliably.

## Conclusion

Terraform state is now stored in Kubernetes Secrets managed by the Tofu Controller. This zero-configuration approach works out of the box and integrates with Kubernetes RBAC, cluster backup tools, and encryption-at-rest. For simple deployments and development environments, it provides reliable state management without the operational overhead of a dedicated remote backend.
