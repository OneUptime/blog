# How to Version Control Ceph Infrastructure with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Terraform, Git, Infrastructure as Code, GitOps

Description: Apply GitOps principles to Ceph infrastructure using Terraform, remote state backends, and CI/CD pipelines to safely version and review all cluster changes.

---

Version controlling your Ceph infrastructure with Terraform means every change is reviewed, tested, and auditable. This guide covers remote state management, module organization, and CI/CD integration for Ceph clusters.

## Repository Structure

```text
ceph-infra/
  environments/
    dev/
      main.tf
      terraform.tfvars
    staging/
      main.tf
      terraform.tfvars
    prod/
      main.tf
      terraform.tfvars
  modules/
    ceph-cluster/
      main.tf
      variables.tf
      outputs.tf
    ceph-pool/
      main.tf
      variables.tf
    ceph-object-store/
      main.tf
      variables.tf
  .github/
    workflows/
      terraform-plan.yml
      terraform-apply.yml
```

## Remote State Backend

Store Terraform state in S3 with DynamoDB locking to prevent concurrent modifications:

```hcl
# environments/prod/backend.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "ceph/prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

## Reusable Ceph Pool Module

```hcl
# modules/ceph-pool/main.tf
resource "kubernetes_manifest" "pool" {
  manifest = {
    apiVersion = "ceph.rook.io/v1"
    kind       = "CephBlockPool"
    metadata = {
      name      = var.pool_name
      namespace = var.namespace
    }
    spec = {
      failureDomain = var.failure_domain
      replicated = {
        size                   = var.replica_size
        requireSafeReplicaSize = true
      }
    }
  }
}

# modules/ceph-pool/variables.tf
variable "pool_name" { type = string }
variable "namespace" { type = string; default = "rook-ceph" }
variable "replica_size" { type = number; default = 3 }
variable "failure_domain" { type = string; default = "host" }
```

## Environment-Specific Configuration

```hcl
# environments/prod/main.tf
module "rbd_pool" {
  source = "../../modules/ceph-pool"

  pool_name    = "prod-rbd"
  replica_size = 3
}

module "rgw_data_pool" {
  source = "../../modules/ceph-pool"

  pool_name    = "prod-rgw-data"
  replica_size = 3
}
```

```hcl
# environments/dev/main.tf
module "rbd_pool" {
  source = "../../modules/ceph-pool"

  pool_name    = "dev-rbd"
  replica_size = 2  # fewer replicas in dev
}
```

## CI/CD Pipeline with GitHub Actions

```yaml
# .github/workflows/terraform-plan.yml
name: Terraform Plan

on:
  pull_request:
    paths:
      - 'environments/**'
      - 'modules/**'

jobs:
  plan:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, prod]
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Terraform Init
        run: terraform init
        working-directory: environments/${{ matrix.environment }}

      - name: Terraform Plan
        run: terraform plan -out=tfplan
        working-directory: environments/${{ matrix.environment }}
        env:
          KUBECONFIG_DATA: ${{ secrets.KUBECONFIG }}

      - name: Upload Plan
        uses: actions/upload-artifact@v4
        with:
          name: tfplan-${{ matrix.environment }}
          path: environments/${{ matrix.environment }}/tfplan
```

```yaml
# .github/workflows/terraform-apply.yml
name: Terraform Apply

on:
  push:
    branches: [main]
    paths:
      - 'environments/**'
      - 'modules/**'

jobs:
  apply:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Terraform Init
        run: terraform init
        working-directory: environments/prod

      - name: Terraform Apply
        run: terraform apply -auto-approve
        working-directory: environments/prod
```

## Drift Detection

```bash
# Check for infrastructure drift
terraform plan -detailed-exitcode
# Exit code 0: no changes
# Exit code 1: error
# Exit code 2: changes detected (drift)

# Schedule weekly drift checks via cron
0 9 * * 1 cd /opt/ceph-infra/environments/prod && terraform plan -detailed-exitcode
```

## Summary

Version controlling Ceph infrastructure with Terraform, remote state backends, and GitHub Actions CI/CD creates a safe, reviewable change management workflow. Every Ceph configuration change goes through a plan-review-apply cycle, reducing the risk of accidental modifications and providing a complete audit trail of all infrastructure changes.
