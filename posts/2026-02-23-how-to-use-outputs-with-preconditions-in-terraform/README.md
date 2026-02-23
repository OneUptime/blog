# How to Use Outputs with Preconditions in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Outputs, Preconditions, Validation, Infrastructure as Code

Description: Learn how to add precondition blocks to Terraform outputs to validate that resources are in the expected state before exposing their values to consumers.

---

Terraform 1.2 introduced preconditions and postconditions for resources, data sources, and outputs. For outputs specifically, preconditions let you validate that the infrastructure is in the expected state before the output value is made available. This is a defensive programming technique - instead of blindly passing a value downstream, you verify that the value is actually usable.

This post covers the syntax, practical use cases, and patterns for output preconditions.

## Basic Syntax

A precondition block inside an output works like a validation rule:

```hcl
output "cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = aws_eks_cluster.main.endpoint

  precondition {
    condition     = aws_eks_cluster.main.status == "ACTIVE"
    error_message = "EKS cluster is not in ACTIVE state. Current status: ${aws_eks_cluster.main.status}"
  }
}
```

If the condition evaluates to `false`, Terraform produces an error with your message and stops. The output value is never exposed. This prevents downstream consumers from receiving a value that appears valid but represents a broken resource.

## How Preconditions Differ from Validation

Variable validation checks inputs before anything is created. Output preconditions check results after resources are created (or during plan if the values are known).

```hcl
# Input validation - checks BEFORE creating resources
variable "instance_type" {
  type = string
  validation {
    condition     = can(regex("^t3\\.", var.instance_type))
    error_message = "Must use a t3 instance type."
  }
}

# Output precondition - checks AFTER resources exist
output "instance_id" {
  value = aws_instance.app.id
  precondition {
    condition     = aws_instance.app.instance_state == "running"
    error_message = "Instance is not running."
  }
}
```

Think of it this way: validation catches bad inputs; preconditions catch bad outcomes.

## Practical Use Cases

### Checking Resource State

```hcl
output "database_endpoint" {
  description = "RDS instance endpoint for application connections"
  value       = aws_db_instance.main.endpoint

  precondition {
    condition     = aws_db_instance.main.status == "available"
    error_message = "Database is not in 'available' status. Cannot provide connection endpoint."
  }
}
```

### Verifying Encryption

```hcl
output "s3_bucket_arn" {
  description = "ARN of the encrypted S3 bucket"
  value       = aws_s3_bucket.data.arn

  precondition {
    condition     = aws_s3_bucket_server_side_encryption_configuration.data.rule[0].apply_server_side_encryption_by_default[0].sse_algorithm == "aws:kms"
    error_message = "S3 bucket must use KMS encryption. Current encryption is not aws:kms."
  }
}
```

### Validating Network Configuration

```hcl
output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = aws_subnet.public[*].id

  precondition {
    condition     = length(aws_subnet.public) >= 2
    error_message = "At least 2 public subnets are required for high availability, but only ${length(aws_subnet.public)} were created."
  }
}
```

### Checking Certificate Validity

```hcl
output "certificate_arn" {
  description = "ARN of the validated ACM certificate"
  value       = aws_acm_certificate.main.arn

  precondition {
    condition     = aws_acm_certificate.main.status == "ISSUED"
    error_message = "ACM certificate has not been issued. Status: ${aws_acm_certificate.main.status}. Check DNS validation records."
  }
}
```

### Verifying Cross-Resource Consistency

```hcl
output "load_balancer_url" {
  description = "URL for the application load balancer"
  value       = "https://${aws_lb.app.dns_name}"

  precondition {
    condition     = length(aws_lb_target_group_attachment.app) > 0
    error_message = "No targets are attached to the load balancer target group."
  }

  precondition {
    condition     = aws_lb_listener.https.port == 443
    error_message = "HTTPS listener is not configured on port 443."
  }
}
```

## Multiple Preconditions

You can have multiple precondition blocks on a single output. All must pass:

```hcl
output "cluster_config" {
  description = "EKS cluster configuration for kubectl"
  value = {
    endpoint       = aws_eks_cluster.main.endpoint
    ca_certificate = aws_eks_cluster.main.certificate_authority[0].data
    name           = aws_eks_cluster.main.name
  }

  # Check cluster is active
  precondition {
    condition     = aws_eks_cluster.main.status == "ACTIVE"
    error_message = "EKS cluster is not active. Status: ${aws_eks_cluster.main.status}"
  }

  # Check node groups are ready
  precondition {
    condition     = alltrue([for ng in aws_eks_node_group.main : ng.status == "ACTIVE"])
    error_message = "One or more node groups are not active."
  }

  # Check minimum node count
  precondition {
    condition = sum([
      for ng in aws_eks_node_group.main : ng.scaling_config[0].desired_size
    ]) >= 2
    error_message = "Total desired node count across all node groups must be at least 2."
  }
}
```

## Preconditions in Module Outputs

Preconditions are particularly valuable in modules because they enforce contracts with consumers:

```hcl
# modules/vpc/outputs.tf

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id

  precondition {
    condition     = aws_vpc.main.state == "available"
    error_message = "VPC is not in available state."
  }
}

output "private_subnet_ids" {
  description = "Private subnet IDs with NAT gateway access"
  value       = aws_subnet.private[*].id

  precondition {
    condition     = length(aws_subnet.private) == length(var.private_cidrs)
    error_message = "Not all requested private subnets were created. Expected ${length(var.private_cidrs)}, got ${length(aws_subnet.private)}."
  }

  precondition {
    condition     = length(aws_nat_gateway.main) > 0
    error_message = "No NAT gateways were created. Private subnets will not have internet access."
  }
}
```

## Preconditions with Data Sources

You can reference data sources in preconditions:

```hcl
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

output "deployment_info" {
  description = "Deployment metadata"
  value = {
    account_id = data.aws_caller_identity.current.account_id
    region     = data.aws_region.current.name
  }

  precondition {
    condition     = data.aws_caller_identity.current.account_id != "123456789012"
    error_message = "This configuration must not be applied to the production account (123456789012)."
  }

  precondition {
    condition     = contains(["us-east-1", "us-west-2", "eu-west-1"], data.aws_region.current.name)
    error_message = "This configuration is only supported in us-east-1, us-west-2, and eu-west-1."
  }
}
```

## Error Message Best Practices

Good error messages help debugging:

```hcl
# Bad - not helpful
precondition {
  condition     = aws_db_instance.main.status == "available"
  error_message = "Check failed."
}

# Good - includes current state
precondition {
  condition     = aws_db_instance.main.status == "available"
  error_message = "Database status is '${aws_db_instance.main.status}', expected 'available'."
}

# Better - includes remediation hint
precondition {
  condition     = aws_db_instance.main.status == "available"
  error_message = "Database is in '${aws_db_instance.main.status}' state. If it says 'modifying', wait for the current operation to complete and re-run."
}
```

## When to Use Preconditions vs Other Approaches

| Approach | When to Use |
|----------|-------------|
| Variable validation | Check inputs before anything happens |
| Resource postcondition | Verify a resource immediately after creation |
| Output precondition | Verify state before exposing to consumers |
| Data source postcondition | Validate external data before using it |

Output preconditions are the final checkpoint. They catch issues after all resources are created but before the values leave the module.

## A Complete Example

```hcl
# modules/web-platform/outputs.tf

output "application_url" {
  description = "Public URL for the application"
  value       = "https://${aws_lb.app.dns_name}"

  precondition {
    condition     = aws_lb.app.status == "active"
    error_message = "Load balancer is not active. Status: ${aws_lb.app.status}"
  }
}

output "database_connection" {
  description = "Database connection details"
  value = {
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    database = var.db_name
  }

  precondition {
    condition     = aws_db_instance.main.status == "available"
    error_message = "Database not available. Status: ${aws_db_instance.main.status}"
  }

  precondition {
    condition     = aws_db_instance.main.storage_encrypted == true
    error_message = "Database storage is not encrypted. This violates security policy."
  }
}

output "monitoring_endpoints" {
  description = "CloudWatch dashboard and alarm endpoints"
  value = {
    dashboard_url = "https://${var.region}.console.aws.amazon.com/cloudwatch/home?region=${var.region}#dashboards/dashboard/${aws_cloudwatch_dashboard.main.dashboard_name}"
    alarm_count   = length(aws_cloudwatch_metric_alarm.critical)
  }

  precondition {
    condition     = length(aws_cloudwatch_metric_alarm.critical) >= 3
    error_message = "Expected at least 3 critical alarms (CPU, memory, disk), but only ${length(aws_cloudwatch_metric_alarm.critical)} were created."
  }
}
```

## Wrapping Up

Output preconditions add a validation layer between your infrastructure and its consumers. They verify that resources are in the expected state before exposing their attributes, catching issues that would otherwise surface as mysterious failures downstream. Use them for state checks, security validations, and consistency verifications. The small overhead of writing preconditions pays back the first time they catch a half-configured resource before it causes problems in a consuming module.

For more on Terraform outputs, see our posts on [defining output values](https://oneuptime.com/blog/post/2026-02-23-how-to-define-output-values-in-terraform/view) and [output depends_on](https://oneuptime.com/blog/post/2026-02-23-how-to-use-output-depends-on-in-terraform/view).
