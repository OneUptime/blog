# How to Store Terraform State in Ceph RGW S3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Terraform, S3, RGW, Infrastructure, DevOps

Description: Use Ceph RGW as an S3-compatible Terraform remote state backend to store and lock Terraform state files on-premises without relying on cloud object storage.

---

## Overview

Terraform's S3 backend stores state files in S3-compatible object storage and optionally uses DynamoDB for state locking. Ceph RGW supports the S3 backend, allowing you to keep Terraform state on-premises. For state locking without DynamoDB, you can use Ceph RGW with community lock solutions.

## Prepare Ceph RGW

Create the state bucket with versioning:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid=terraform \
  --display-name="Terraform" \
  --access-key=tfaccesskey \
  --secret-key=tfsecretkey

aws s3 mb s3://terraform-state \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80

aws s3api put-bucket-versioning \
  --bucket terraform-state \
  --versioning-configuration Status=Enabled \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80
```

## Configure Terraform S3 Backend

In your Terraform configuration `backend.tf`:

```hcl
terraform {
  backend "s3" {
    bucket = "terraform-state"
    key    = "prod/kubernetes/terraform.tfstate"
    region = "us-east-1"

    endpoints = {
      s3 = "http://rook-ceph-rgw-my-store.rook-ceph:80"
    }

    access_key                  = "tfaccesskey"
    secret_key                  = "tfsecretkey"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    use_path_style              = true
  }
}
```

Initialize the backend:

```bash
terraform init
# Initializing the backend...
# Successfully configured the backend "s3"!
```

## Use Environment Variables for Credentials

Keep credentials out of source code:

```bash
export AWS_ACCESS_KEY_ID=tfaccesskey
export AWS_SECRET_ACCESS_KEY=tfsecretkey
```

And simplify the backend config:

```hcl
terraform {
  backend "s3" {
    bucket = "terraform-state"
    key    = "prod/kubernetes/terraform.tfstate"
    region = "us-east-1"

    endpoints = {
      s3 = "http://rook-ceph-rgw-my-store.rook-ceph:80"
    }

    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    use_path_style              = true
  }
}
```

## Organize State by Environment

Use workspace-based key paths:

```bash
terraform workspace new staging
terraform workspace new production
terraform apply
# State is stored at: terraform-state/env:/staging/prod/kubernetes/terraform.tfstate
```

## Verify State in Ceph

```bash
aws s3 ls s3://terraform-state/ \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --recursive

aws s3 cp s3://terraform-state/prod/kubernetes/terraform.tfstate /tmp/state.json \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80
cat /tmp/state.json | jq .serial
```

## Summary

Ceph RGW provides a reliable on-premises Terraform remote state backend using the standard S3 backend configuration. Enabling bucket versioning gives you state history for rollback. When using a non-AWS S3 endpoint, set `use_path_style = true`, `skip_credentials_validation = true`, `skip_requesting_account_id = true`, and the other skip flags shown above to bypass AWS-specific checks.
