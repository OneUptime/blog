# How to Manage Ceph RGW Users with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Terraform, RGW, User Management, Infrastructure as Code

Description: Use Terraform with the Ceph provider or Kubernetes manifests to manage Ceph RGW user lifecycle including creation, quota assignment, and key management.

---

Managing Ceph RGW users as Terraform resources brings the same consistency and auditability to user management that you apply to infrastructure. Changes are tracked in state, reviewed in PRs, and rolled back if needed.

## Option 1: Using CephObjectStoreUser CRD

Rook provides the `CephObjectStoreUser` CRD, which you can manage with Terraform's Kubernetes provider:

```hcl
terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

# Create a Ceph RGW user
resource "kubernetes_manifest" "rgw_user_app1" {
  manifest = {
    apiVersion = "ceph.rook.io/v1"
    kind       = "CephObjectStoreUser"
    metadata = {
      name      = "app1-user"
      namespace = "rook-ceph"
    }
    spec = {
      store       = "my-store"
      displayName = "Application 1 User"
      quotas = {
        maxObjects = 1000000
        maxSize    = "50GiB"
      }
      capabilities = {
        user   = "read"
        bucket = "read,write"
      }
    }
  }
}
```

## Option 2: Managing Users via Local-Exec Provisioner

For organizations not yet using Rook CRDs, use Terraform local-exec to call radosgw-admin:

```hcl
resource "terraform_data" "rgw_user" {
  triggers_replace = {
    uid          = var.uid
    display_name = var.display_name
    quota_size   = var.quota_size_gb
  }

  provisioner "local-exec" {
    command = <<-EOT
      kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
        radosgw-admin user create \
          --uid="${var.uid}" \
          --display-name="${var.display_name}" \
          --email="${var.email}" \
          --max-buckets="${var.max_buckets}"

      kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
        radosgw-admin quota set \
          --uid="${var.uid}" \
          --quota-scope=user \
          --max-size="${var.quota_size_gb}GiB"

      kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
        radosgw-admin quota enable \
          --uid="${var.uid}" \
          --quota-scope=user
    EOT
  }

  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
        radosgw-admin user rm --uid="${self.triggers_replace["uid"]}" || true
    EOT
  }
}
```

## User Module for Reusability

```hcl
# modules/ceph-rgw-user/main.tf
variable "uid" { type = string }
variable "display_name" { type = string }
variable "email" { type = string }
variable "max_buckets" {
  type    = number
  default = 100
}
variable "quota_size_gb" {
  type    = number
  default = 10
}
variable "store_name" {
  type    = string
  default = "my-store"
}
variable "namespace" {
  type    = string
  default = "rook-ceph"
}

resource "kubernetes_manifest" "user" {
  manifest = {
    apiVersion = "ceph.rook.io/v1"
    kind       = "CephObjectStoreUser"
    metadata = {
      name      = var.uid
      namespace = var.namespace
    }
    spec = {
      store       = var.store_name
      displayName = var.display_name
      quotas = {
        maxObjects = 10000000
        maxSize    = "${var.quota_size_gb}GiB"
      }
    }
  }
}

output "secret_name" {
  value = "rook-ceph-object-user-${var.store_name}-${var.uid}"
}
```

## Consuming User Credentials

After Terraform creates the user, retrieve credentials from the Rook-generated secret:

```hcl
# Retrieve the generated credentials
data "kubernetes_secret" "rgw_user_creds" {
  metadata {
    name      = "rook-ceph-object-user-my-store-app1-user"
    namespace = "rook-ceph"
  }

  depends_on = [kubernetes_manifest.rgw_user_app1]
}

output "access_key" {
  value     = data.kubernetes_secret.rgw_user_creds.data["AccessKey"]
  sensitive = true
}

output "secret_key" {
  value     = data.kubernetes_secret.rgw_user_creds.data["SecretKey"]
  sensitive = true
}
```

## Managing Multiple Users from a List

```hcl
# users.tf
locals {
  rgw_users = [
    { uid = "app-backend", display_name = "Backend Service", quota_gb = 100 },
    { uid = "app-frontend", display_name = "Frontend Service", quota_gb = 20 },
    { uid = "data-pipeline", display_name = "Data Pipeline", quota_gb = 500 }
  ]
}

module "rgw_users" {
  for_each = { for u in local.rgw_users : u.uid => u }
  source   = "./modules/ceph-rgw-user"

  uid           = each.value.uid
  display_name  = each.value.display_name
  email         = "${each.value.uid}@example.com"
  quota_size_gb = each.value.quota_gb
}
```

## Summary

Managing Ceph RGW users with Terraform via the CephObjectStoreUser CRD or local-exec provisioners brings user lifecycle management into your infrastructure-as-code workflow. Storing user definitions in Git enables change reviews, audit trails, and consistent quota enforcement across all applications accessing your Ceph object store.
