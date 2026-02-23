# How to Use Terraform Ephemeral Values for Temporary Data

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Ephemeral Values, Security, Infrastructure as Code

Description: Learn how to use Terraform ephemeral values to handle temporary data like tokens and credentials that should never be persisted in state or plan files.

---

Terraform stores everything in its state file - resource attributes, outputs, even sensitive values. For most infrastructure data, this is fine. But some values should genuinely never be written to disk at all: short-lived tokens, temporary credentials, one-time passwords, and session keys. Terraform's ephemeral values feature addresses exactly this need.

Introduced in Terraform 1.10, ephemeral values let you work with data that exists only during a plan or apply operation and is never persisted to the state file or plan files.

## What Makes Ephemeral Values Different

Regular Terraform values, even those marked `sensitive = true`, are still stored in the state file. The `sensitive` flag just prevents them from appearing in CLI output. They are still in the JSON state file on disk or in your remote backend.

Ephemeral values go further. They are:
- Never written to the state file
- Never written to plan files
- Only available during the current Terraform operation
- Re-evaluated every time you run plan or apply

```hcl
# Regular sensitive value - hidden in output, but stored in state
variable "db_password" {
  type      = string
  sensitive = true
}

# Ephemeral value - never stored anywhere
variable "temp_token" {
  type      = string
  ephemeral = true
}
```

## Ephemeral Variables

You can declare a variable as ephemeral:

```hcl
# This variable's value is never written to state or plan files
variable "vault_token" {
  type        = string
  ephemeral   = true
  description = "Short-lived Vault token for secret retrieval"
}

variable "session_credentials" {
  type = object({
    access_key    = string
    secret_key    = string
    session_token = string
  })
  ephemeral   = true
  description = "Temporary AWS STS credentials"
}
```

Pass them in just like regular variables:

```bash
# Via environment variable
export TF_VAR_vault_token="s.abc123xyz"

# Via -var flag
terraform apply -var="vault_token=s.abc123xyz"
```

## Ephemeral Outputs

Outputs can be ephemeral too, which is useful for passing temporary data between root module and child modules:

```hcl
# In a child module
output "temp_credentials" {
  value     = data.vault_generic_secret.creds.data
  ephemeral = true
}
```

Ephemeral outputs cannot be queried with `terraform output` after an apply completes because they are not stored.

## Ephemeral Resources

Terraform 1.10 introduced ephemeral resources - a new resource type that creates temporary objects during plan/apply but never stores them in state:

```hcl
# Get temporary AWS credentials from Vault
ephemeral "vault_aws_secret" "deploy" {
  backend = "aws"
  role    = "deploy-role"
  ttl     = "15m"
}

# Use the temporary credentials in a provider
provider "aws" {
  region     = "us-east-1"
  access_key = ephemeral.vault_aws_secret.deploy.access_key
  secret_key = ephemeral.vault_aws_secret.deploy.secret_key
  token      = ephemeral.vault_aws_secret.deploy.security_token
}
```

The credentials are generated fresh each time you run Terraform and are never saved to the state file.

## Where Ephemeral Values Can Be Used

Ephemeral values have restrictions on where they can be used, because Terraform needs to ensure they are never accidentally persisted.

### Allowed Uses

```hcl
# In provider configuration - credentials for authentication
provider "aws" {
  region     = "us-east-1"
  access_key = var.temp_access_key  # ephemeral variable
  secret_key = var.temp_secret_key  # ephemeral variable
}

# In provisioner blocks
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  provisioner "remote-exec" {
    inline = [
      "echo ${var.temp_token} > /tmp/token",  # used during provisioning only
    ]
  }
}

# In local-exec provisioners
resource "null_resource" "setup" {
  provisioner "local-exec" {
    command = "curl -H 'Authorization: Bearer ${var.temp_token}' https://api.example.com/setup"
  }
}

# Passed to other ephemeral variables in modules
module "deploy" {
  source = "./modules/deploy"

  auth_token = var.temp_token  # if the module's variable is also ephemeral
}
```

### Not Allowed

Ephemeral values cannot be used in places where Terraform would need to persist them:

```hcl
# This will NOT work - resource arguments are stored in state
resource "aws_ssm_parameter" "token" {
  name  = "/app/token"
  type  = "SecureString"
  value = var.temp_token  # ERROR: ephemeral value cannot be used here
}

# This will NOT work - non-ephemeral outputs are stored in state
output "token" {
  value = var.temp_token  # ERROR: must mark output as ephemeral
}

# This will NOT work - locals could be referenced by state-persisted resources
locals {
  token = var.temp_token  # allowed, but restricted in downstream usage
}
```

## Practical Use Case: Vault Integration

One of the primary use cases is integrating with HashiCorp Vault for just-in-time secrets:

```hcl
# Ephemeral variable for Vault authentication
variable "vault_token" {
  type      = string
  ephemeral = true
}

# Configure the Vault provider with the ephemeral token
provider "vault" {
  address = "https://vault.example.com"
  token   = var.vault_token
}

# Read secrets from Vault (the data source result is also ephemeral-safe)
ephemeral "vault_kv_secret_v2" "db_creds" {
  mount = "secret"
  name  = "database/production"
}

# Use the secret in a provider configuration
provider "postgresql" {
  host     = "db.example.com"
  username = ephemeral.vault_kv_secret_v2.db_creds.data["username"]
  password = ephemeral.vault_kv_secret_v2.db_creds.data["password"]
}
```

## Practical Use Case: STS Temporary Credentials

```hcl
# Temporary AWS credentials from an STS assume-role call
variable "sts_credentials" {
  type = object({
    access_key    = string
    secret_key    = string
    session_token = string
  })
  ephemeral = true
}

# Use temporary credentials for cross-account access
provider "aws" {
  alias  = "target_account"
  region = "us-east-1"

  access_key = var.sts_credentials.access_key
  secret_key = var.sts_credentials.secret_key
  token      = var.sts_credentials.session_token
}

# Resources in the target account use the temporary credentials
resource "aws_s3_bucket" "cross_account" {
  provider = aws.target_account
  bucket   = "cross-account-bucket"
}
```

## Ephemeral Values vs Sensitive Values

Here is a comparison to help you choose:

| Feature | sensitive = true | ephemeral = true |
|---------|-----------------|-----------------|
| Hidden in CLI output | Yes | Yes |
| Stored in state file | Yes | No |
| Stored in plan file | Yes | No |
| Available after apply | Yes | No |
| Can be used in resource args | Yes | Restricted |
| Re-evaluated each run | No | Yes |

Use `sensitive` for values that need to persist (like database passwords that Terraform manages). Use `ephemeral` for values that should never be stored (like temporary auth tokens).

## Wrapping Up

Ephemeral values fill an important gap in Terraform's security model. Before this feature, even sensitive values were stored in state. Now you can work with truly temporary data - session tokens, short-lived credentials, and one-time secrets - with confidence that they will never be written to disk. The key constraint is that ephemeral values can only be used in contexts where persistence is not required, like provider configurations and provisioners.

For more on protecting data in Terraform, see [How to Handle Sensitive Data in Terraform](https://oneuptime.com/blog/post/2026-01-27-terraform-sensitive-data/view). For general Terraform configuration, check [How to Configure Terraform Settings in the terraform Block](https://oneuptime.com/blog/post/2026-02-23-terraform-settings-block/view).
