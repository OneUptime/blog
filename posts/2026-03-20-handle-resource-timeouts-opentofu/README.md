# How to Handle Resource Timeouts in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Timeout, Resource Lifecycle, HCL, Infrastructure as Code, DevOps

Description: Learn how to configure resource timeouts in OpenTofu to control how long create, update, and delete operations are allowed to run before OpenTofu marks them as failed.

---

Some infrastructure operations - creating RDS databases, provisioning EKS clusters, waiting for DNS propagation - can take many minutes. OpenTofu supports `timeouts` blocks to define how long each operation should be permitted to run before the provider marks it as an error.

---

## Timeout Block Syntax

The `timeouts` block is defined inside a resource block and supports provider-defined optional fields for operations such as `create`, `read`, `update`, and `delete`:

```hcl
resource "aws_db_instance" "main" {
  # ... resource arguments ...

  timeouts {
    create = "40m"
    update = "80m"
    delete = "40m"
  }
}
```

The values are duration strings such as `"30s"`, `"10m"`, `"2h"`, and `"1h30m"`.

---

## When Timeouts Apply

Not all resources support a `timeouts` block. Only resources where the provider exposes configurable operation timeouts support this configuration. Common examples include:

```hcl
# RDS instances - provisioning takes many minutes

resource "aws_db_instance" "main" {
  identifier     = "mydb"
  engine         = "mysql"
  engine_version = "8.0"
  instance_class = "db.t3.medium"
  username       = "admin"
  password       = var.db_password
  allocated_storage = 20

  timeouts {
    create = "60m"
    update = "80m"
    delete = "40m"
  }
}
```

```hcl
# EKS clusters - control plane provisioning takes 10-20 minutes
resource "aws_eks_cluster" "main" {
  name     = "my-cluster"
  role_arn = aws_iam_role.eks.arn

  vpc_config {
    subnet_ids = var.subnet_ids
  }

  timeouts {
    create = "30m"
    delete = "15m"
  }
}
```

---

## GCP and Azure Resources

Timeout blocks work the same way in GCP and Azure providers:

```hcl
# Google Cloud SQL
resource "google_sql_database_instance" "main" {
  name             = "mydb"
  database_version = "POSTGRES_15"
  region           = "us-central1"

  settings {
    tier = "db-f1-micro"
  }

  timeouts {
    create = "30m"
    update = "30m"
    delete = "30m"
  }
}
```

```hcl
# Azure Kubernetes Service
resource "azurerm_kubernetes_cluster" "main" {
  name                = "myaks"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "myaks"

  default_node_pool {
    name       = "default"
    node_count = 1
    vm_size    = "Standard_D2_v2"
  }

  identity {
    type = "SystemAssigned"
  }

  timeouts {
    create = "90m"
    read   = "5m"
    update = "90m"
    delete = "90m"
  }
}
```

---

## Default Timeout Values

Each provider sets its own defaults. For AWS resources, common defaults are:

| Resource | Create | Read | Update | Delete |
|---|---|---|---|---|
| `aws_db_instance` | 40m | - | 80m | 60m |
| `aws_eks_cluster` | 30m | - | 60m | 15m |
| `aws_elasticache_cluster` | 40m | - | 80m | 40m |
| `aws_instance` | 10m | 15m | 10m | 20m |

If you don't specify a `timeouts` block, the provider default is used. Add timeouts explicitly when you know an operation will take longer than the default.

---

## When a Timeout Is Exceeded

If a `create` timeout is exceeded, OpenTofu fails the operation, but the remote resource may still exist or continue provisioning depending on the provider. You'll need to inspect both the cloud provider and OpenTofu state before deciding whether to:

1. Import the resource once it finishes provisioning if it is not tracked in state, or
2. Destroy and recreate it after increasing the timeout if the resource is incomplete or unusable.

---

## Summary

The `timeouts` block controls how long OpenTofu waits for provider-defined operations such as `create`, `read`, `update`, and `delete` to complete before treating them as failures. Not all resources support it - only those where the provider exposes configurable operation timeouts. Use duration strings (`"30m"`, `"2h"`) and increase timeouts for large resources like databases and Kubernetes clusters that take longer than provider defaults. Check the provider documentation for the specific operations each resource exposes in its `timeouts` block.
