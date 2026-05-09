# How to Use Output Descriptions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Output, Documentation, Infrastructure as Code, DevOps

Description: A guide to writing effective output descriptions in OpenTofu to document your infrastructure's exposed values.

## Introduction

The `description` attribute in output blocks serves as self-documentation for your infrastructure. It is consumed by module documentation generators, IDE tooling, and module registries, and helps other engineers understand what each output represents. Good descriptions make modules more maintainable and easier to use.

## Adding Descriptions to Outputs

```hcl
# outputs.tf

output "vpc_id" {
  description = "The ID of the VPC created by this module"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "List of IDs of public subnets, sorted by availability zone"
  value       = aws_subnet.public[*].id
}

output "database_endpoint" {
  description = "The connection endpoint of the RDS database in the format hostname:port"
  value       = aws_db_instance.main.endpoint
}

output "load_balancer_dns" {
  description = "The DNS name of the Application Load Balancer (use this for DNS CNAME records)"
  value       = aws_lb.main.dns_name
}
```

## Description Best Practices

```hcl
# BAD: Too vague

output "id" {
  description = "The ID"
  value       = aws_vpc.main.id
}

# BETTER: Specific and informative
output "vpc_id" {
  description = "The ID of the main VPC (used for configuring security groups and subnets)"
  value       = aws_vpc.main.id
}

# BAD: States the obvious
output "instance_type" {
  description = "Instance type"
  value       = aws_instance.web.instance_type
}

# BETTER: Explains the context and usage
output "web_instance_type" {
  description = "The EC2 instance type of web server instances (reflects the capacity tier deployed)"
  value       = aws_instance.web.instance_type
}
```

## Descriptions for Complex Outputs

```hcl
output "cluster_config" {
  description = <<-EOT
    Kubernetes cluster configuration object containing:
    - endpoint: The HTTPS endpoint for the Kubernetes API server
    - ca_certificate: Base64-encoded CA certificate for cluster authentication
    - name: The cluster name for use with kubectl and AWS CLI commands
    Use with: aws eks update-kubeconfig --name <name> --region <region>
  EOT
  value = {
    endpoint       = aws_eks_cluster.main.endpoint
    ca_certificate = aws_eks_cluster.main.certificate_authority[0].data
    name           = aws_eks_cluster.main.name
  }
}
```

## Module Output Documentation

When building reusable modules, thorough output descriptions serve as API documentation:

```hcl
# modules/rds/outputs.tf

output "instance_id" {
  description = "The RDS instance identifier. Use this to reference the database in other AWS resources."
  value       = aws_db_instance.this.id
}

output "endpoint" {
  description = "The database endpoint in 'hostname:port' format. Use this for application connection strings."
  value       = aws_db_instance.this.endpoint
}

output "port" {
  description = "The port number on which the database accepts connections (typically 5432 for PostgreSQL)."
  value       = aws_db_instance.this.port
}

output "arn" {
  description = "The ARN of the RDS instance. Use this for IAM policies and CloudWatch alarms."
  value       = aws_db_instance.this.arn
}

output "hosted_zone_id" {
  description = "The Route 53 Hosted Zone ID of the endpoint. Required for Route 53 alias records."
  value       = aws_db_instance.this.hosted_zone_id
}
```

## Viewing Descriptions

The `tofu output` command itself does not display descriptions - it only prints output names and values. Descriptions are also not included in `tofu output -json`, which exposes only `value`, `type`, and `sensitive` per output. To surface the descriptions you have written, use a documentation generator or your IDE:

```bash
# Generate a markdown table of outputs (with descriptions) using terraform-docs,
# which works against OpenTofu modules as well.
terraform-docs markdown table .

# Inspect the raw configuration to see descriptions alongside values
tofu show
```

Modern IDE plugins for OpenTofu/Terraform also display output descriptions in hover tooltips, and modules published to a registry render their descriptions on the module documentation page.

## Conclusion

Well-written output descriptions transform your OpenTofu modules from black boxes into self-documenting infrastructure components. Descriptions should explain the purpose and typical usage of each output, not just restate the resource type. For complex objects, multi-line descriptions with usage examples are particularly valuable. When building shared modules used across teams, comprehensive output documentation is as important as the implementation itself.
