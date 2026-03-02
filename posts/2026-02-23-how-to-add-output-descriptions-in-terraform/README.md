# How to Add Output Descriptions in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Output, Documentation, Modules, Best Practices

Description: Learn how to write effective output descriptions in Terraform that document what each output contains, where it comes from, and how it should be used by consumers.

---

Output descriptions in Terraform serve the same purpose as comments on a function's return value - they tell consumers what they are getting back. When someone uses your module or reads your configuration, well-written output descriptions explain what each value represents, where it comes from, and how it should be used. This is especially important for modules where the person reading the output did not write the code that produces it.

This post covers how to add descriptions to outputs, what makes a good description, and patterns for documenting different types of outputs.

## Basic Output Descriptions

The `description` argument is a string that documents the output:

```hcl
# outputs.tf

output "vpc_id" {
  description = "The ID of the VPC created by this module"
  value       = aws_vpc.main.id
}

output "load_balancer_dns" {
  description = "DNS name of the application load balancer for use in DNS records"
  value       = aws_lb.app.dns_name
}

output "instance_public_ips" {
  description = "Public IP addresses of all EC2 instances in the autoscaling group"
  value       = aws_instance.app[*].public_ip
}
```

## Where Descriptions Appear

Output descriptions show up in several places:

### terraform output

When running `terraform output`, descriptions are not shown directly. But they appear in:

### Terraform Documentation

If you use `terraform-docs` (a widely-used documentation generator), descriptions are rendered in the generated docs:

```bash
terraform-docs markdown table .
```

This produces a markdown table:

```markdown
| Name | Description |
|------|-------------|
| vpc_id | The ID of the VPC created by this module |
| load_balancer_dns | DNS name of the application load balancer for use in DNS records |
```

### Terraform Registry

If you publish your module to the Terraform Registry, descriptions appear on the module's documentation page, making them visible to anyone considering using your module.

### terraform console

```bash
terraform console
> output
# Shows outputs with their descriptions in some versions
```

### IDE Support

Modern IDE plugins for Terraform display output descriptions in hover tooltips and autocomplete menus.

## Writing Good Descriptions

A good description answers three questions: What is this value? Where does it come from? How should it be used?

### Bad Descriptions

```hcl
# Too vague
output "id" {
  description = "The ID"
  value       = aws_vpc.main.id
}

# Just restates the name
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

# No description at all
output "endpoint" {
  value = aws_db_instance.main.endpoint
}
```

### Good Descriptions

```hcl
# Clear about what and where
output "vpc_id" {
  description = "ID of the VPC created for the application environment"
  value       = aws_vpc.main.id
}

# Explains how to use it
output "alb_dns_name" {
  description = "DNS name of the ALB. Create a CNAME record pointing your domain to this value."
  value       = aws_lb.app.dns_name
}

# Explains the format
output "database_endpoint" {
  description = "RDS instance endpoint in the format hostname:port"
  value       = aws_db_instance.main.endpoint
}

# Notes about the value
output "nat_gateway_ips" {
  description = "Elastic IP addresses of the NAT gateways, one per availability zone. Use these for IP allowlisting in external services."
  value       = aws_eip.nat[*].public_ip
}
```

## Descriptions for Different Output Types

### Simple Attributes

```hcl
output "cluster_name" {
  description = "Name of the EKS cluster"
  value       = aws_eks_cluster.main.name
}

output "cluster_version" {
  description = "Kubernetes version running on the EKS cluster"
  value       = aws_eks_cluster.main.version
}

output "cluster_endpoint" {
  description = "API server endpoint URL for the EKS cluster. Use this to configure kubectl."
  value       = aws_eks_cluster.main.endpoint
}
```

### Lists

```hcl
output "private_subnet_ids" {
  description = "List of private subnet IDs, one per availability zone, in the order of the input AZs"
  value       = aws_subnet.private[*].id
}

output "security_group_ids" {
  description = "List of security group IDs attached to the application instances. Pass these to other resources that need network access to the app."
  value       = [aws_security_group.app.id, aws_security_group.monitoring.id]
}
```

### Maps and Objects

```hcl
output "subnet_map" {
  description = "Map of subnet name to subnet ID for all subnets created by this module"
  value = {
    for name, subnet in aws_subnet.all :
    name => subnet.id
  }
}

output "cluster_config" {
  description = "EKS cluster configuration object containing endpoint, certificate authority data, and cluster name for kubeconfig generation"
  value = {
    endpoint       = aws_eks_cluster.main.endpoint
    ca_certificate = aws_eks_cluster.main.certificate_authority[0].data
    name           = aws_eks_cluster.main.name
  }
}
```

### Sensitive Outputs

```hcl
output "database_password" {
  description = "Auto-generated master password for the RDS instance. Retrieve with 'terraform output -raw database_password'. Also stored in AWS Secrets Manager."
  value       = random_password.db.result
  sensitive   = true
}

output "kubeconfig" {
  description = "Generated kubeconfig file content for the EKS cluster. Write to ~/.kube/config or use with KUBECONFIG environment variable."
  value       = local.kubeconfig
  sensitive   = true
}
```

### Conditional Outputs

```hcl
output "bastion_public_ip" {
  description = "Public IP of the bastion host. Null if bastion was not created (when create_bastion is false)."
  value       = var.create_bastion ? aws_instance.bastion[0].public_ip : null
}

output "cdn_domain_name" {
  description = "CloudFront distribution domain name. Only available when enable_cdn is true, otherwise null."
  value       = var.enable_cdn ? aws_cloudfront_distribution.main[0].domain_name : null
}
```

## Multi-Line Descriptions

For complex outputs that need more explanation, use heredoc syntax:

```hcl
output "connection_info" {
  description = <<-EOT
    Database connection information as a structured object.
    Contains host, port, database name, and username.
    The password is stored separately in the database_password output.
    Use this to construct connection strings in your application config.
  EOT

  value = {
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    database = var.database_name
    username = var.database_username
  }
}
```

## Module-Level Output Documentation

When building a module, think of outputs as the module's API documentation:

```hcl
# modules/eks/outputs.tf

# Cluster identification
output "cluster_id" {
  description = "Unique identifier of the EKS cluster"
  value       = aws_eks_cluster.main.id
}

output "cluster_name" {
  description = "Name of the EKS cluster as specified in the input variables"
  value       = aws_eks_cluster.main.name
}

output "cluster_arn" {
  description = "ARN of the EKS cluster for use in IAM policies"
  value       = aws_eks_cluster.main.arn
}

# Cluster networking
output "cluster_endpoint" {
  description = "Kubernetes API server endpoint URL. Configure kubectl with this endpoint."
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster control plane. Add rules to this SG to control API server access."
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

# Authentication
output "cluster_certificate_authority" {
  description = "Base64-encoded certificate authority data for the cluster. Required for kubeconfig."
  value       = aws_eks_cluster.main.certificate_authority[0].data
}

output "cluster_oidc_issuer_url" {
  description = "OIDC provider URL for the cluster. Use this to set up IAM roles for service accounts (IRSA)."
  value       = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

# Node groups
output "node_group_arns" {
  description = "Map of node group name to ARN for all managed node groups"
  value = {
    for name, ng in aws_eks_node_group.main :
    name => ng.arn
  }
}
```

## Automating Documentation

Use `terraform-docs` to generate documentation from your descriptions:

```bash
# Install terraform-docs
brew install terraform-docs

# Generate markdown documentation
terraform-docs markdown table ./modules/eks > modules/eks/README.md

# Generate in different formats
terraform-docs json ./modules/eks
terraform-docs yaml ./modules/eks
```

You can automate this with a pre-commit hook:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/terraform-docs/terraform-docs
    rev: v0.18.0
    hooks:
      - id: terraform-docs-go
        args: ["markdown", "table", "--output-file", "README.md"]
```

## Consistency Patterns

Establish conventions for your team:

```hcl
# Pattern: Start with the resource type
output "vpc_id" {
  description = "ID of the VPC"
  # ...
}

# Pattern: Include usage hints for outputs consumed by other tools
output "ecr_repository_url" {
  description = "ECR repository URL. Use as the image registry in docker push commands."
  # ...
}

# Pattern: Note the format when it is not obvious
output "cidr_blocks" {
  description = "List of CIDR blocks in x.x.x.x/xx format for all created subnets"
  # ...
}

# Pattern: Explain null values
output "elastic_ip" {
  description = "Elastic IP address. Null when use_elastic_ip is false."
  # ...
}
```

## Best Practices

1. **Never skip descriptions.** Every output should have one. It takes seconds to write and saves minutes of confusion.

2. **Describe the value, not the implementation.** Say "ID of the VPC" not "The value of aws_vpc.main.id."

3. **Include usage guidance.** If the output is meant for a specific purpose, say so.

4. **Document null cases.** If an output can be null, explain when and why.

5. **Note the format.** If the value has a specific format (like host:port), mention it.

6. **Keep descriptions under two sentences for simple outputs.** Use heredocs only when genuinely needed.

## Wrapping Up

Output descriptions are the documentation layer for your Terraform module's return values. They cost almost nothing to write but significantly improve the usability of your code. When someone reads your outputs - whether in the CLI, in generated docs, or in the Terraform Registry - the descriptions are what help them understand what they are getting and how to use it. Make them a habit, and your future self and teammates will thank you.

For more on Terraform outputs, see our posts on [defining output values](https://oneuptime.com/blog/post/2026-02-23-how-to-define-output-values-in-terraform/view) and [exporting outputs from modules](https://oneuptime.com/blog/post/2026-02-23-how-to-export-outputs-from-modules-in-terraform/view).
