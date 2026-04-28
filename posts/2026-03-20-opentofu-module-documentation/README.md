# Writing Good Documentation for OpenTofu Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Module, Documentation

Description: Learn how to write clear, comprehensive documentation for your OpenTofu modules that helps users get started quickly.

Good documentation is what separates a module that gets used from one that gets rewritten. Clear README files, well-described variables and outputs, and working examples significantly reduce the time it takes for someone to use your module correctly.

## The Essential README Structure

Every module should have a README.md with these sections:

````markdown
# Module Name

Brief description of what this module creates.

## Usage

```hcl
module "example" {
  source  = "registry.opentofu.org/myorg/module/aws"
  version = "~> 1.0"

  required_var = "value"
}
```

## Requirements

| Name | Version |
|------|---------|
| opentofu | >= 1.6 |
| aws | >= 5.0 |

## Providers

| Name | Version |
|------|---------|
| aws | >= 5.0 |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| name | Resource name prefix | string | n/a | yes |
| environment | Target environment | string | "dev" | no |

## Outputs

| Name | Description |
|------|-------------|
| id | Resource identifier |
| arn | Resource ARN |

## Examples

- [Basic usage](./examples/basic)
- [Advanced configuration](./examples/advanced)
````

## Documenting Variables

```hcl
# variables.tf - every variable needs a description

variable "name" {
  description = "Name prefix for all resources. Used in resource naming to ensure uniqueness."
  type        = string
}

variable "instance_type" {
  description = <<-EOT
    EC2 instance type for application servers.
    For production, use t3.large or larger.
    For development, t3.small is sufficient.
    
    See: https://aws.amazon.com/ec2/instance-types/
  EOT
  type    = string
  default = "t3.medium"
}

variable "tags" {
  description = "Map of tags to apply to all created resources. These tags merge with default module tags, with these values taking precedence."
  type        = map(string)
  default     = {}
}

variable "enable_deletion_protection" {
  description = "When true, prevents accidental deletion of the database. Disable only for testing environments or when decommissioning."
  type        = bool
  default     = true
}
```

## Documenting Outputs

```hcl
# outputs.tf - describe what each output is and how to use it
output "instance_id" {
  description = "EC2 instance ID. Use this to reference the instance in other resources or modules."
  value       = aws_instance.main.id
}

output "security_group_id" {
  description = "ID of the security group created for this instance. Add rules to this group to allow traffic from other resources."
  value       = aws_security_group.main.id
}

output "iam_role_arn" {
  description = "ARN of the IAM role attached to the instance. Attach additional policies to grant the instance access to other AWS services."
  value       = aws_iam_role.main.arn
}

output "connection_string" {
  description = "Database connection string in the format 'hostname:port/database'. Keep this sensitive - do not log or output to the console."
  value       = "${aws_db_instance.main.address}:${aws_db_instance.main.port}/${aws_db_instance.main.db_name}"
  sensitive   = true
}
```

## Writing Example Configurations

```text
modules/rds/
├── main.tf
├── variables.tf
├── outputs.tf
└── examples/
    ├── basic/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── README.md
    ├── with-read-replicas/
    │   ├── main.tf
    │   └── README.md
    └── multi-az/
        ├── main.tf
        └── README.md
```

```hcl
# examples/basic/main.tf - minimal working example
provider "aws" {
  region = "us-east-1"
}

module "database" {
  source  = "../../"   # Reference parent module

  name            = "example-db"
  environment     = "dev"
  instance_class  = "db.t3.micro"
  engine          = "postgres"
  engine_version  = "14"
  database_name   = "appdb"
  master_username = "admin"
  master_password = "changeme123!"  # Use secrets manager in real usage

  vpc_id     = "vpc-12345678"
  subnet_ids = ["subnet-12345678", "subnet-87654321"]
}

output "endpoint" {
  value = module.database.endpoint
}
```

## Auto-generating Documentation with terraform-docs

```bash
# Install terraform-docs
brew install terraform-docs

# Generate README inputs/outputs tables
terraform-docs markdown table . > INPUTS.md

# Update README.md in-place
terraform-docs markdown table --output-file README.md .

# Configuration file: .terraform-docs.yml
```

````yaml
# .terraform-docs.yml
formatter: "markdown table"

version: ""

header-from: main.tf
footer-from: ""

recursive:
  enabled: false

sections:
  hide: []
  show: []

content: |-
  {{ .Header }}

  ## Usage

  ```hcl
  module "example" {
    source = "."
    name   = "my-resource"
  }
  ```

  {{ .Requirements }}
  {{ .Providers }}
  {{ .Modules }}
  {{ .Resources }}
  {{ .Inputs }}
  {{ .Outputs }}

output:
  file: "README.md"
  mode: replace
````

## Conclusion

Documentation is not optional for shared modules - it's what makes the difference between a module that gets adopted and one that gets ignored. Write clear descriptions for every variable and output, provide working examples for common use cases, and consider automating documentation generation with tools like terraform-docs to keep it in sync with your code.
