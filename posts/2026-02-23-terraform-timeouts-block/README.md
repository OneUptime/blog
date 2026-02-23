# How to Use the Timeouts Block in Terraform Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Timeouts, Infrastructure as Code, DevOps, Resource Management

Description: Learn how to configure the timeouts block in Terraform resources to control how long Terraform waits for create, update, and delete operations to complete.

---

Some infrastructure takes a long time to provision. An RDS database can take 15 minutes to create. A CloudFront distribution might need 30 minutes to deploy globally. A large GKE cluster could take 20 minutes to spin up. By default, Terraform providers set reasonable timeout values for these operations, but sometimes the defaults are not enough, or you want tighter timeouts to fail fast when something goes wrong.

The `timeouts` block lets you override these defaults on a per-resource basis. It controls how long Terraform will wait for create, update, read, and delete operations before giving up and reporting an error.

## Basic Syntax

The `timeouts` block goes inside a resource definition, just like `lifecycle`. It supports up to four keys depending on what the provider supports: `create`, `update`, `read`, and `delete`.

```hcl
resource "aws_db_instance" "main" {
  identifier     = "production-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"
  allocated_storage = 100
  db_name        = "appdb"
  username       = var.db_username
  password       = var.db_password
  skip_final_snapshot = false

  timeouts {
    create = "60m"   # Wait up to 60 minutes for creation
    update = "45m"   # Wait up to 45 minutes for updates
    delete = "30m"   # Wait up to 30 minutes for deletion
  }
}
```

## Timeout Duration Format

Timeout values are specified as strings with a number followed by a unit suffix:

- `"30s"` - 30 seconds
- `"10m"` - 10 minutes
- `"2h"` - 2 hours
- `"1h30m"` - 1 hour and 30 minutes

You can combine units. The format follows Go's duration parsing, which Terraform uses under the hood.

```hcl
timeouts {
  create = "1h30m"  # 90 minutes
  delete = "45m"    # 45 minutes
}
```

## Which Resources Support Timeouts

Not every resource supports the `timeouts` block, and not every resource that does supports all four operations. It depends on the provider. You can check the Terraform documentation for a specific resource to see which timeout operations are available.

For example:

- `aws_db_instance` supports `create`, `update`, `delete`
- `aws_instance` supports `create`, `update`, `delete`
- `azurerm_virtual_machine` supports `create`, `update`, `read`, `delete`
- `google_container_cluster` supports `create`, `update`, `read`, `delete`

If you specify a timeout for an operation that the resource does not support, Terraform will produce an error.

## Common Scenarios Where You Need Custom Timeouts

### Large Database Instances

RDS instances with large storage allocations or Multi-AZ deployments can take much longer than the default timeout.

```hcl
resource "aws_db_instance" "analytics" {
  identifier          = "analytics-db"
  engine              = "postgres"
  engine_version      = "15.4"
  instance_class      = "db.r6g.4xlarge"
  allocated_storage   = 2000
  multi_az            = true
  storage_encrypted   = true
  db_name             = "analytics"
  username            = var.db_username
  password            = var.db_password
  skip_final_snapshot = false

  # Large Multi-AZ instances can take a very long time
  timeouts {
    create = "90m"
    update = "90m"
    delete = "60m"
  }
}
```

### Kubernetes Clusters

Managed Kubernetes clusters involve provisioning control planes, node pools, and networking. These operations are slow.

```hcl
resource "google_container_cluster" "primary" {
  name     = "production-cluster"
  location = "us-central1"

  initial_node_count = 3

  node_config {
    machine_type = "e2-standard-4"
    disk_size_gb = 100
  }

  # GKE clusters can take a while, especially in busy regions
  timeouts {
    create = "45m"
    update = "30m"
    delete = "30m"
  }
}
```

### CloudFront Distributions

CloudFront distributions propagate to edge locations worldwide, which takes time.

```hcl
resource "aws_cloudfront_distribution" "cdn" {
  enabled = true

  origin {
    domain_name = aws_s3_bucket.static.bucket_regional_domain_name
    origin_id   = "s3-origin"
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-origin"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  # Global propagation takes time
  timeouts {
    create = "60m"
    update = "60m"
  }
}
```

### VPN Connections

VPN tunnels involve negotiation between endpoints and can be unpredictable.

```hcl
resource "aws_vpn_connection" "main" {
  vpn_gateway_id      = aws_vpn_gateway.main.id
  customer_gateway_id = aws_customer_gateway.main.id
  type                = "ipsec.1"

  # VPN tunnel establishment can be slow
  timeouts {
    create = "30m"
    update = "30m"
    delete = "20m"
  }
}
```

## Setting Shorter Timeouts for Fast Failure

Sometimes you want the opposite of longer timeouts. If a resource should create quickly and something is wrong if it takes too long, a shorter timeout helps you fail fast.

```hcl
resource "aws_security_group" "web" {
  name_prefix = "web-sg-"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Security groups should create almost instantly
  # If it takes more than 5 minutes, something is wrong
  timeouts {
    create = "5m"
    delete = "5m"
  }
}
```

## What Happens When a Timeout Expires

When a timeout expires, Terraform does not automatically roll back the operation. What happens depends on the operation:

### Create Timeout

If a create operation times out, Terraform marks the resource as "tainted" in state. The resource may or may not have actually been created in the cloud. On the next `terraform apply`, Terraform will try to destroy and recreate it.

### Update Timeout

If an update times out, the resource may be in a partially updated state. Terraform will try the update again on the next apply.

### Delete Timeout

If a delete times out, the resource remains in the state file. You will need to either increase the timeout and try again, or manually delete the resource and then remove it from state with `terraform state rm`.

## Azure-Specific Timeout Patterns

Azure resources frequently benefit from custom timeouts because of how the Azure Resource Manager works. Many operations are asynchronous and can take longer than expected.

```hcl
resource "azurerm_kubernetes_cluster" "main" {
  name                = "production-aks"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "production"

  default_node_pool {
    name       = "default"
    node_count = 3
    vm_size    = "Standard_D4s_v3"
  }

  identity {
    type = "SystemAssigned"
  }

  timeouts {
    create = "60m"
    update = "60m"
    read   = "5m"
    delete = "60m"
  }
}
```

The `read` timeout is particularly relevant in Azure. If a resource takes too long to read its current state, Terraform can time out during plan operations.

## Timeouts in Modules

When you wrap resources in modules, consumers of your module cannot directly set timeouts on the internal resources. You should expose timeout values as variables if your module wraps slow-provisioning resources.

```hcl
# modules/database/variables.tf
variable "create_timeout" {
  description = "Timeout for database creation"
  type        = string
  default     = "60m"
}

variable "delete_timeout" {
  description = "Timeout for database deletion"
  type        = string
  default     = "30m"
}

# modules/database/main.tf
resource "aws_db_instance" "this" {
  identifier     = var.name
  engine         = var.engine
  instance_class = var.instance_class
  # ... other config

  timeouts {
    create = var.create_timeout
    update = var.create_timeout
    delete = var.delete_timeout
  }
}
```

This gives module consumers the flexibility to adjust timeouts without forking the module.

## Debugging Timeout Issues

When you hit a timeout, the first question is whether the operation is genuinely slow or if something is stuck. Here are some debugging strategies:

1. **Check the cloud console.** Go to the AWS/Azure/GCP console and look at the resource's status. Is it still creating? Is there an error?

2. **Review provider logs.** Set `TF_LOG=DEBUG` to see the API calls Terraform is making. This can reveal if the provider is polling for completion or if there is an error in the API response.

3. **Check service quotas.** Sometimes creation is slow because the cloud provider is queuing the request due to capacity constraints.

```bash
# Enable debug logging
export TF_LOG=DEBUG
terraform apply 2>&1 | tee terraform-debug.log
```

4. **Try a smaller configuration first.** If a large database instance times out, try creating a smaller one to verify the configuration is correct, then scale up.

## Summary

The `timeouts` block is a straightforward but important feature. It lets you control how patient Terraform is when waiting for infrastructure operations to complete. Set longer timeouts for slow-provisioning resources like databases and Kubernetes clusters. Set shorter timeouts for resources that should provision quickly, so you fail fast when something goes wrong. And when wrapping resources in modules, expose timeout variables so your module users can tune behavior for their environment.

For more on managing resource behavior in Terraform, check out our posts on [lifecycle rules](https://oneuptime.com/blog/post/2026-01-24-terraform-lifecycle-rules/view) and [provisioners](https://oneuptime.com/blog/post/2026-01-24-terraform-provisioners/view).
