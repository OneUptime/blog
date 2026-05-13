# How to Create a Terraform Resource CRD with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Tofu Controller, Terraform, GitOps, Kubernetes, CRD

Description: Define Terraform resources using the Tofu Controller CRD managed by Flux CD to bring Terraform module execution into the Kubernetes reconciliation loop.

---

## Introduction

The Tofu Controller's `Terraform` custom resource is the bridge between your Git-hosted Terraform modules and actual infrastructure provisioning. Each `Terraform` object specifies which module to run, where the state lives, what variables to use, and whether to apply automatically or wait for approval. Flux CD watches the source repository and triggers reconciliation whenever the module changes.

Understanding the core schema of the `Terraform` CRD is essential for writing effective GitOps Terraform workflows. Unlike running `terraform apply` in a CI/CD pipeline, the CRD approach allows the Tofu Controller to detect drift between the Terraform state and the actual infrastructure, and automatically reconcile it on a schedule.

This guide walks through the core `Terraform` CRD fields with practical examples for common use cases.

## Prerequisites

- Tofu Controller installed via Flux HelmRelease
- A Flux GitRepository source pointing to your Terraform modules
- `kubectl` and `flux` CLIs installed

## Step 1: Create a GitRepository Source for Terraform Modules

```yaml
# infrastructure/sources/terraform-modules.yaml

apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: terraform-modules
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/terraform-modules
  ref:
    branch: main
  # If using a private repository, reference a secret with credentials
  secretRef:
    name: github-ssh-key
```

## Step 2: Create a Basic Terraform Resource

```yaml
# infrastructure/terraform/s3-bucket.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: s3-application-bucket
  namespace: flux-system
spec:
  # How often Flux reconciles this Terraform resource
  interval: 10m

  # Reference to the Flux source containing the Terraform module
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system

  # Path within the repository to the Terraform module
  path: ./modules/s3-bucket

  # Workspace name - creates isolated Terraform state
  workspace: s3-application-bucket-production

  # approvePlan: "auto" automatically applies plans
  # Omit approvePlan or set it to "" to require explicit approval
  approvePlan: "auto"

  # Variables to pass to the Terraform module
  vars:
    - name: bucket_name
      value: my-app-assets-production
    - name: region
      value: us-east-1
    - name: versioning_enabled
      value: "true"

  # Store human-readable plan output in a Kubernetes ConfigMap
  storeReadablePlan: human

  # Write Terraform outputs to a Kubernetes Secret
  writeOutputsToSecret:
    name: s3-bucket-outputs
    outputs:
      - bucket_name
      - bucket_arn
      - bucket_regional_domain_name
```

## Step 3: Create a Terraform Resource with Backend Configuration

```yaml
# infrastructure/terraform/vpc.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: production-vpc
  namespace: flux-system
spec:
  interval: 15m
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/vpc
  workspace: production-vpc
  approvePlan: "auto"

  # Configure an S3 backend instead of Kubernetes Secrets for state storage
  backendConfig:
    customConfiguration: |
      backend "s3" {
        bucket         = "my-terraform-state-bucket"
        key            = "production/vpc/terraform.tfstate"
        region         = "us-east-1"
        encrypt        = true
        dynamodb_table = "terraform-state-lock"
      }

  vars:
    - name: vpc_cidr
      value: "10.0.0.0/16"
    - name: region
      value: us-east-1
    - name: environment
      value: production
    - name: availability_zones
      value: '["us-east-1a", "us-east-1b", "us-east-1c"]'

  # Pass sensitive variables from Kubernetes Secrets
  varsFrom:
    - kind: Secret
      name: terraform-aws-credentials
      optional: false

  writeOutputsToSecret:
    name: vpc-outputs
    outputs:
      - vpc_id
      - private_subnet_ids
      - public_subnet_ids
```

## Step 4: Use a Specific Git Tag or Commit

Pin Terraform modules to specific Git refs for production environments by creating a separate Flux source for the pinned ref.

```yaml
# infrastructure/sources/terraform-modules-v1-2-3.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: terraform-modules-v1-2-3
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/terraform-modules
  ref:
    tag: v1.2.3
---
# infrastructure/terraform/database-pinned.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: production-database
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: terraform-modules-v1-2-3
    namespace: flux-system
  path: ./modules/rds
  workspace: production-rds
  approvePlan: "auto"

  # This resource uses the module version checked out by terraform-modules-v1-2-3
  vars:
    - name: db_instance_class
      value: db.t3.medium
    - name: db_engine_version
      value: "15.4"
    - name: multi_az
      value: "true"
```

## Step 5: Configure Runner Termination and Drift Detection

```yaml
# infrastructure/terraform/long-running.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: eks-cluster
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/eks
  workspace: production-eks
  approvePlan: "auto"

  # Grace period for the runner pod to shut Terraform down cleanly
  # Large infrastructure changes can need more than the 30-second default
  runnerTerminationGracePeriodSeconds: 1800  # 30 minutes

  # Disable drift detection for resources managed manually
  # (useful during active troubleshooting)
  disableDriftDetection: false

  vars:
    - name: cluster_name
      value: production-eks
    - name: kubernetes_version
      value: "1.29"
    - name: node_count
      value: "3"
```

## Step 6: Create the Flux Kustomization

```yaml
# clusters/my-cluster/terraform/s3-buckets.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: terraform-s3-buckets
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/terraform
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: tofu-controller
```

## Step 7: Check Terraform Resource Status

```bash
# List all Terraform resources
kubectl get terraform -n flux-system

# Check the pending plan ID
kubectl get terraform s3-application-bucket -n flux-system \
  -o jsonpath='{.status.plan.pending}'

# Get the human-readable plan stored by storeReadablePlan: human
kubectl get configmap tfplan-s3-application-bucket-production-s3-application-bucket \
  -n flux-system \
  -o jsonpath='{.data.tfplan}'

# Check the outputs
kubectl get secret s3-bucket-outputs \
  -n flux-system -o yaml
```

## Best Practices

- Use `workspace` to isolate Terraform state between environments. Naming convention `{resource-name}-{environment}` works well.
- Use `writeOutputsToSecret` for all Terraform outputs that other resources need. This makes Terraform outputs accessible to Kubernetes workloads without requiring Terraform CLI access.
- Set `approvePlan: "auto"` for non-production environments and omit `approvePlan` or set it to `""` for production to enforce human review of infrastructure changes.
- Use `storeReadablePlan: human` to store human-readable plan output in a Kubernetes ConfigMap for debugging and audit purposes.
- Pin production module versions using specific Git tags rather than tracking `main` to prevent unreviewed changes from being applied automatically.

## Conclusion

You have defined Terraform resources using the Tofu Controller CRD and integrated them with Flux CD. The controller continuously reconciles Terraform state, detecting and correcting drift between actual infrastructure and the module definition. Outputs are published as Kubernetes Secrets, making them accessible to other resources in the cluster without manual intervention.
