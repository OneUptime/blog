# How to Use Ephemeral Outputs in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Output, Ephemeral, Security, Infrastructure as Code, DevOps

Description: A guide to using ephemeral outputs in OpenTofu to expose temporary values that are never stored in the state file.

## Introduction

Ephemeral outputs in OpenTofu (introduced in 1.11) are child-module output values that exist only during a single `tofu` execution and are never written to state or plan data. Unlike sensitive outputs (which are stored in state but masked in display), ephemeral outputs are truly transient - they cannot be persisted.

## Declaring Ephemeral Outputs

```hcl
# modules/secret-reader/outputs.tf
# Ephemeral outputs are only valid in child modules.

output "db_password" {
  description = "Database password fetched by an ephemeral resource"
  value       = ephemeral.aws_secretsmanager_secret_version.db.secret_string
  ephemeral   = true
  sensitive   = true
}

output "session_credentials" {
  description = "Temporary AWS session credentials fetched from Secrets Manager"
  value       = jsondecode(ephemeral.aws_secretsmanager_secret_version.aws_creds.secret_string)
  ephemeral   = true
  sensitive   = true
}
```

## Ephemeral Outputs vs Sensitive Outputs

```hcl
# Sensitive output: stored in state (encrypted ideally), masked in display

output "db_password" {
  value     = aws_db_instance.main.password
  sensitive = true
  # ^ In state file, but masked in terminal output
}

# Child-module ephemeral output: NEVER stored in state or plan data
output "session_credentials" {
  value       = jsondecode(ephemeral.aws_secretsmanager_secret_version.aws_creds.secret_string)
  ephemeral   = true
  sensitive   = true  # Also mask from display
  # ^ Only valid in a child module and only exists during the current run
}
```

## Using Ephemeral Outputs Between Modules

```hcl
# When an output is ephemeral, it can only be used in
# contexts that also support ephemeral values.

# modules/secret-management/outputs.tf
output "secrets" {
  value       = jsondecode(ephemeral.aws_secretsmanager_secret_version.secret_retrieval.secret_string)
  ephemeral   = true
  sensitive   = true
}
```

```hcl
# root/main.tf - Using an ephemeral child-module output
module "secret_management" {
  source = "./modules/secret-management"
}

# Use ephemeral output in a provider configuration
provider "aws" {
  alias      = "dev-access"
  access_key = module.secret_management.secrets["access_key"]
  secret_key = module.secret_management.secrets["secret_key"]
}
```

## Limitations of Ephemeral Outputs

```hcl
# Ephemeral outputs CANNOT be used in:
# 1. Root module outputs
# 2. Regular resource attributes stored in state
# 3. Regular data source arguments
# 4. Non-ephemeral output values

# This would fail because `content` is a normal resource argument:
# resource "local_file" "token" {
#   content = module.secret_management.secrets["access_key"]
# }

# Ephemeral values can be used in:
# - Ephemeral resources
# - Ephemeral variables
# - Ephemeral outputs
# - Locals
# - Provider configurations
# - Provisioners
# - Resource connection blocks
# - Resource write-only attributes
```

## Ephemeral Output Use Cases

```hcl
# Use case 1: Dynamic provider credentials
provider "aws" {
  alias      = "dev-access"
  access_key = module.secret_management.secrets["access_key"]
  secret_key = module.secret_management.secrets["secret_key"]
}

# Use case 2: Passing secrets into a write-only attribute
resource "aws_ssm_parameter" "store_ephemeral" {
  provider         = aws.dev-access
  name             = "parameter_from_ephemeral_value"
  type             = "SecureString"
  value_wo         = jsonencode(module.secret_management.secrets)
  value_wo_version = 1
}

# Use case 3: Provisioners that need temporary values
resource "aws_ssm_parameter" "provisioner_example" {
  provider         = aws.dev-access
  name             = "parameter_for_provisioner_example"
  type             = "SecureString"
  value_wo         = jsonencode(module.secret_management.secrets)
  value_wo_version = 1

  provisioner "local-exec" {
    when    = create
    command = "echo ephemeral value from module: #${jsonencode(module.secret_management.secrets)}#"
  }
}
```

## Conclusion

Ephemeral outputs provide the strongest security guarantee for truly transient values because OpenTofu does not store them in state or plan data. In practice, they are most useful in child modules, where they can pass temporary credentials or secrets into other ephemeral contexts such as providers, provisioners, connection blocks, and write-only attributes. Use ephemeral outputs for values that would be a security risk if persisted, and combine them with ephemeral variables and resources for a comprehensive ephemeral secret management strategy.
