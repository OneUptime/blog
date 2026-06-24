# How to Use Ephemeral Variables in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, Ephemeral, Security, Infrastructure as Code, DevOps

Description: A guide to using ephemeral variables in OpenTofu to pass secrets that are not stored in state files.

## Introduction

Ephemeral variables in OpenTofu (introduced in 1.11) are a special type of variable whose values are never stored in state or plan files. Unlike regular sensitive variables that are still stored in state and saved plans (but redacted in output), ephemeral variables exist only during a single OpenTofu command execution. This makes them ideal for temporary credentials, one-time tokens, and secrets that should never persist.

## Declaring Ephemeral Variables

```hcl
# variables.tf

variable "vault_token" {
  type      = string
  ephemeral = true  # Value is never written to state or plan
  sensitive = true  # Also redact from output
}

variable "temporary_credentials" {
  type = object({
    access_key    = string
    secret_key    = string
    session_token = string
  })
  ephemeral = true
  sensitive = true
}
```

## Ephemeral vs Sensitive: Key Difference

```hcl
# Sensitive variable: stored in state and saved plans (encrypted ideally), redacted in output
variable "db_password" {
  type      = string
  sensitive = true
  # ^ This IS stored in state and saved plan files
  # Only the display is masked
}

# Ephemeral variable: NEVER stored in state or plan
variable "temp_token" {
  type      = string
  ephemeral = true
  # ^ This value is NEVER written to state or plan files
  # Truly transient - only exists during execution
}
```

## Using Ephemeral Variables

```hcl
variable "vault_role_id" {
  type      = string
  ephemeral = true
  sensitive = true
}

variable "vault_secret_id" {
  type      = string
  ephemeral = true
  sensitive = true
}

# Use ephemeral variables in provider configuration
provider "vault" {
  address = "https://vault.example.com"

  auth_login {
    path = "auth/approle/login"

    parameters = {
      role_id   = var.vault_role_id
      secret_id = var.vault_secret_id
    }
  }
}
```

## Ephemeral Variables in Resource Provisioners

```hcl
variable "ssh_private_key" {
  type      = string
  ephemeral = true
  sensitive = true
}

resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = var.ssh_private_key  # Ephemeral - not stored in state or plan
    host        = self.public_ip
  }

  provisioner "remote-exec" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y nginx"
    ]
  }
}
```

## Limitations of Ephemeral Variables

```hcl
# Ephemeral values CANNOT be used in:
# - resource arguments that are stored in state
# - root module output values
# - child module output values (unless the output is also ephemeral)
# - local values that feed into non-ephemeral contexts

variable "temp_value" {
  type      = string
  ephemeral = true
}

# This would fail - can't persist an ephemeral value in a regular resource argument:
# resource "aws_secretsmanager_secret_version" "example" {
#   secret_id     = aws_secretsmanager_secret.example.id
#   secret_string = var.temp_value  # Error! Can't store ephemeral values here
# }
```

## Practical Use Case: Temporary AWS Credentials

```hcl
# Get temporary credentials from vault for the deployment
variable "aws_access_key_id" {
  type      = string
  ephemeral = true
  sensitive = true
}

variable "aws_secret_access_key" {
  type      = string
  ephemeral = true
  sensitive = true
}

variable "aws_session_token" {
  type      = string
  ephemeral = true
  sensitive = true
  default   = null
}

provider "aws" {
  access_key = var.aws_access_key_id
  secret_key = var.aws_secret_access_key
  token      = var.aws_session_token
  region     = "us-east-1"
}
```

```bash
# Provide credentials at runtime (not stored in state or plan)
export TF_VAR_aws_access_key_id="AKIATEMPTOKEN"
export TF_VAR_aws_secret_access_key="temp-secret-key"
export TF_VAR_aws_session_token="temp-session-token"

tofu apply
# Credentials used for authentication but never written to state or plan
```

## Conclusion

Ephemeral variables represent a significant security improvement over sensitive variables for short-lived credentials and tokens. By ensuring these values never touch state or plan files, you eliminate an important attack vector in your infrastructure security posture. Use ephemeral variables for any credential that should not outlive the operation that needs it, combined with dynamic secrets from a vault or secrets manager for the strongest security.
