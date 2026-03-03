# How to Add Variable Descriptions in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Variables, Documentation, Infrastructure as Code

Description: Learn how to write effective variable descriptions in Terraform that serve as documentation, improve module usability, and help team members understand your configuration.

---

Variable descriptions are the documentation layer of your Terraform configuration. They appear in `terraform plan` prompts, in the Terraform Registry module pages, and in generated documentation. Well-written descriptions make the difference between a module that people can use independently and one that requires a phone call to the author every time.

This post covers how to write descriptions that are genuinely helpful, with patterns and examples for different variable types.

## The description Argument

Every `variable` block accepts a `description` argument:

```hcl
variable "instance_type" {
  description = "The EC2 instance type for application servers"
  type        = string
  default     = "t3.micro"
}
```

When Terraform prompts for a variable (because it has no default and no value was provided), the description is displayed:

```text
var.instance_type
  The EC2 instance type for application servers

  Enter a value:
```

## Where Descriptions Appear

Descriptions show up in several places:

1. **Interactive prompts** - when Terraform asks for a value
2. **Terraform Registry** - on the module's input/output documentation page
3. **terraform-docs** - a popular documentation generation tool
4. **terraform plan** - in some contexts when values are being resolved
5. **IDE integration** - VS Code and other editors with Terraform plugins show descriptions on hover

Given this visibility, investing in good descriptions pays off.

## Writing Effective Descriptions

### Be Specific About What the Variable Controls

```hcl
# Bad - too vague
variable "size" {
  description = "The size"
  type        = string
}

# Good - tells you exactly what it affects
variable "instance_type" {
  description = "EC2 instance type for the web server fleet (e.g., t3.micro, t3.small, m5.large)"
  type        = string
}
```

### Include Valid Values or Formats

```hcl
variable "environment" {
  description = "Deployment environment. Must be one of: dev, staging, production"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC in the format X.X.X.X/Y (e.g., 10.0.0.0/16)"
  type        = string
}

variable "project_name" {
  description = "Name of the project. Used as a prefix for all resource names. Must be lowercase alphanumeric, max 20 characters."
  type        = string
}
```

### Explain the Impact of the Value

```hcl
variable "multi_az" {
  description = "Enable Multi-AZ deployment for the RDS instance. Setting this to true doubles the cost but provides automatic failover."
  type        = bool
  default     = false
}

variable "deletion_protection" {
  description = "Enable deletion protection on the database. When true, the database cannot be deleted without first disabling this flag."
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Number of days to retain automated database backups. Set to 0 to disable automated backups. AWS allows 0-35 days."
  type        = number
  default     = 7
}
```

### Document the Default Behavior

```hcl
variable "kms_key_id" {
  description = "ARN of the KMS key for encryption. If not specified, the default AWS-managed key is used."
  type        = string
  default     = null
}

variable "log_level" {
  description = "Application log level. Defaults to 'info'. Set to 'debug' for troubleshooting."
  type        = string
  default     = "info"
}
```

### Note Any Dependencies or Interactions

```hcl
variable "enable_nat_gateway" {
  description = "Create a NAT Gateway for private subnet internet access. Requires at least one public subnet to be defined."
  type        = bool
  default     = true
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS. Required when enable_https is set to true."
  type        = string
  default     = null
}
```

## Descriptions for Complex Types

When a variable has a complex type, describe the structure:

```hcl
variable "autoscaling_config" {
  description = <<-EOT
    Auto Scaling configuration for the ECS service.
    - min_capacity: Minimum number of tasks (must be >= 1)
    - max_capacity: Maximum number of tasks
    - target_cpu: Target CPU utilization percentage for scaling (1-100)
    - target_memory: Target memory utilization percentage for scaling (1-100)
    - scale_in_cooldown: Seconds to wait before scaling in after a scaling activity
    - scale_out_cooldown: Seconds to wait before scaling out after a scaling activity
  EOT
  type = object({
    min_capacity       = number
    max_capacity       = number
    target_cpu         = number
    target_memory      = number
    scale_in_cooldown  = optional(number, 300)
    scale_out_cooldown = optional(number, 60)
  })
}
```

Using heredoc syntax for multi-line descriptions keeps them readable in the code while still rendering properly in documentation tools.

```hcl
variable "ingress_rules" {
  description = <<-EOT
    List of ingress rules for the security group. Each rule specifies:
    - port: The port number to allow
    - protocol: Protocol (tcp, udp, or icmp)
    - cidr_blocks: List of CIDR blocks to allow access from
    - description: Human-readable description of the rule
  EOT
  type = list(object({
    port        = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
  default = []
}
```

## Descriptions for Sensitive Variables

For sensitive variables, the description is even more important because the value itself is hidden:

```hcl
variable "database_password" {
  description = "Password for the RDS master user. Must be at least 16 characters. Do not commit this value to version control."
  type        = string
  sensitive   = true
}

variable "github_token" {
  description = "GitHub personal access token with repo and admin:org scopes. Used for GitHub provider authentication."
  type        = string
  sensitive   = true
}
```

## Descriptions for Module Variables

Module variables deserve extra attention since they define the module's public API:

```hcl
# modules/vpc/variables.tf

variable "name" {
  description = "Name for the VPC. Used as the Name tag and as a prefix for associated resources (subnets, route tables, etc.)."
  type        = string
}

variable "cidr_block" {
  description = "CIDR block for the VPC. Determines the IP address range. Common choices: 10.0.0.0/16 (65K IPs), 172.16.0.0/16, 192.168.0.0/16."
  type        = string
}

variable "public_subnet_count" {
  description = "Number of public subnets to create, spread across availability zones. Each subnet gets a /24 CIDR block carved from the VPC CIDR."
  type        = number
  default     = 2
}

variable "private_subnet_count" {
  description = "Number of private subnets to create. These have no direct internet access. Use enable_nat_gateway to provide outbound access."
  type        = number
  default     = 2
}

variable "enable_nat_gateway" {
  description = "Create NAT Gateway(s) for private subnet outbound internet access. Each NAT Gateway costs approximately $32/month plus data transfer."
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use a single NAT Gateway for all private subnets instead of one per AZ. Saves cost but creates a single point of failure."
  type        = bool
  default     = false
}
```

## Anti-Patterns

### Restating the variable name

```hcl
# Bad - description adds no information
variable "instance_type" {
  description = "The instance type"
  type        = string
}

# Good - description adds context
variable "instance_type" {
  description = "EC2 instance type for the application tier. Use t3 for dev, m5 for production workloads."
  type        = string
}
```

### Descriptions that are too long

Keep descriptions to one or two sentences for simple variables. Use heredoc for complex types that need structured documentation.

### No description at all

```hcl
# Bad - no description
variable "enable_waf" {
  type    = bool
  default = false
}

# Good - caller understands the purpose
variable "enable_waf" {
  description = "Enable AWS WAF (Web Application Firewall) on the ALB. Adds protection against common web exploits."
  type        = bool
  default     = false
}
```

## Generating Documentation from Descriptions

The `terraform-docs` tool generates markdown documentation from your variable descriptions:

```bash
# Install terraform-docs
brew install terraform-docs

# Generate markdown documentation
terraform-docs markdown table ./modules/vpc

# Output includes a table with variable name, description, type, default, and required status
```

This makes your descriptions even more valuable since they become the module's documentation automatically.

## Wrapping Up

Variable descriptions are the most accessible form of documentation in Terraform. They show up in prompts, in generated docs, in the Terraform Registry, and in IDE tooltips. Write descriptions that tell the caller what the variable controls, what valid values look like, what the impact of the choice is, and what happens when the default is used. Good descriptions reduce support questions and make your modules genuinely reusable.

For more on variable configuration, see [How to Define Input Variables in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-define-input-variables/view) and [How to Set Variable Default Values in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-variable-default-values/view).
