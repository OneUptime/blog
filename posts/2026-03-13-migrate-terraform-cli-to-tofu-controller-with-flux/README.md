# How to Migrate from Terraform CLI to Tofu Controller with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Tofu Controller, Terraform, Migration, GitOps, Kubernetes, Infrastructure as Code

Description: Migrate existing Terraform workloads from CLI-based execution to the Tofu Controller with Flux CD for GitOps-native infrastructure management.

---

## Introduction

Many teams start their Terraform journey with CI/CD pipelines that run `terraform apply` imperatively. While this provides basic automation, it lacks the continuous reconciliation and drift detection that GitOps offers. Migrating to the Tofu Controller transforms Terraform from a deployment tool into a continuously reconciling controller—similar to moving from manual `kubectl apply` to Kubernetes deployments.

The migration path is non-destructive. Existing Terraform state is preserved and imported into the Tofu Controller without reprovisioning resources. The migration involves three phases: preparing the Kubernetes environment, importing existing state, and configuring the Tofu Controller to manage the resources going forward.

This guide covers a safe, zero-downtime migration strategy for existing Terraform workloads.

## Prerequisites

- Tofu Controller installed via Flux
- Existing Terraform workloads with remote state (S3, GCS, or Azure Blob)
- Access to the existing Terraform state backend
- `kubectl`, `terraform`, and `flux` CLIs installed

## Step 1: Audit Existing Terraform Workspaces

```bash
# List all existing Terraform workspaces in your state backend
# For S3 backend:
aws s3 ls s3://my-org-terraform-state/ --recursive | grep terraform.tfstate

# For GCS backend:
gsutil ls gs://my-org-terraform-state/**/*.tfstate

# Document each workspace that needs migration
# Example inventory:
# production/vpc/terraform.tfstate
# production/eks/terraform.tfstate
# production/rds/terraform.tfstate
# staging/vpc/terraform.tfstate
```

## Step 2: Verify the Existing State is Clean

Before migrating, ensure there are no pending changes.

```bash
# Navigate to your existing Terraform configuration
cd terraform/production/vpc

# Initialize and verify clean state
terraform init
terraform plan

# Expected output: "No changes. Your infrastructure matches the configuration."
# If there ARE changes, apply them with the CLI BEFORE migrating
terraform apply  # Only if there are changes to apply
```

## Step 3: Configure the Tofu Controller Resource to Use Existing State

When using an S3, GCS, or Azure backend, the Tofu Controller imports the existing state automatically by using the same backend configuration. The controller re-runs `terraform plan` against the existing state and recognizes all existing resources.

```yaml
# infrastructure/terraform/production/vpc-migrated.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: production-vpc
  namespace: flux-system
  annotations:
    # Temporary annotation during migration - remove after verification
    migration.example.com/migrated-from: "ci-pipeline"
    migration.example.com/migration-date: "2026-03-13"
spec:
  interval: 15m
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  # This must match your existing module path exactly
  path: ./modules/vpc
  # This must match the existing workspace name exactly
  workspace: production-vpc

  # Start with manual approval to review the first plan before auto-applying
  approvePlan: "manual"

  # Use the SAME backend configuration as your existing pipeline
  # The controller will find the existing state and use it
  backendConfig:
    customConfiguration: |
      backend "s3" {
        bucket         = "my-org-terraform-state"
        key            = "production/vpc/terraform.tfstate"
        region         = "us-east-1"
        encrypt        = true
        dynamodb_table = "terraform-state-lock"
      }

  runnerPodTemplate:
    spec:
      env:
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: terraform-aws-credentials
              key: AWS_ACCESS_KEY_ID
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: terraform-aws-credentials
              key: AWS_SECRET_ACCESS_KEY
        - name: AWS_DEFAULT_REGION
          value: us-east-1

  # Use the same variables as your existing configuration
  vars:
    - name: vpc_cidr
      value: "10.0.0.0/16"
    - name: region
      value: us-east-1
    - name: environment
      value: production
    - name: availability_zones
      value: '["us-east-1a", "us-east-1b", "us-east-1c"]'
```

## Step 4: Disable the Existing CI/CD Pipeline

Before the Tofu Controller begins reconciling, disable the existing pipeline to prevent concurrent applies.

```bash
# In GitHub Actions: disable the workflow
gh workflow disable "terraform-apply.yml"

# In GitLab CI: pause the pipeline schedule
# In Jenkins: disable the job

# Verify no pipeline runs are in progress
# Check your CI/CD system for any running Terraform jobs
```

## Step 5: Apply the Tofu Controller Resource and Review the Plan

```bash
# Commit and push the new Terraform resource
git add infrastructure/terraform/production/vpc-migrated.yaml
git commit -m "feat: migrate production-vpc to Tofu Controller"
git push origin main

# Wait for Flux to apply the resource
flux reconcile kustomization terraform-production --with-source

# The Tofu Controller generates a plan against the existing state
# Check the plan output
kubectl get terraform production-vpc -n flux-system --watch
```

Expected output after successful state import:
```
NAME             READY   STATUS                          AGE
production-vpc   False   Plan: 0 to add, 0 to change, 0 to destroy   2m
```

Zero changes means the controller found the existing state and the configuration matches perfectly.

## Step 6: Approve the Migration Plan

```bash
# Get the plan ID
PLAN_ID=$(kubectl get terraform production-vpc \
  -n flux-system \
  -o jsonpath='{.status.plan.planId}')

# Approve the plan (even a no-op plan requires approval in manual mode)
kubectl annotate terraform production-vpc \
  -n flux-system \
  infra.contrib.fluxcd.io/approvePlan="${PLAN_ID}"

# Watch the apply
kubectl get terraform production-vpc -n flux-system --watch
```

## Step 7: Switch to Auto-Apply After Verification

After verifying the migration is successful:

```bash
# Update the resource to enable auto-apply for future reconciliations
kubectl patch terraform production-vpc \
  -n flux-system \
  --type='merge' \
  -p '{"spec":{"approvePlan": "auto"}}'

# Also update the manifest in Git
git add infrastructure/terraform/production/vpc-migrated.yaml
git commit -m "chore: enable auto-apply for production-vpc after migration"
```

## Best Practices

- Migrate one workspace at a time, starting with the least critical (development, then staging, then production). This lets you build confidence in the process before touching production.
- Always verify that the first plan generated by the Tofu Controller shows zero changes before approving it. Any changes indicate a variable mismatch between your old CLI configuration and the new CRD.
- Keep the existing CI/CD pipeline disabled (not deleted) for at least two weeks after migration so you can roll back quickly if issues arise.
- Migrate state for Terraform modules that haven't changed in the last 30 days first. Actively developed modules have higher risk during the transition period.
- After successful migration, remove the CI/CD pipeline definition and archive the pipeline configuration in Git history as documentation.

## Conclusion

Your existing Terraform workloads are now managed by the Tofu Controller and Flux CD. No resources were reprovisioned, and all existing state was preserved. The infrastructure is now continuously reconciled, drift is detected automatically, and every change flows through the GitOps review process. The CI/CD pipeline can be decommissioned.
