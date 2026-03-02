# How to Use Workspaces with Dynamic Provider Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspace, Provider, Dynamic Configuration, Multi-Region, Multi-Account

Description: Learn how to dynamically configure Terraform providers based on the active workspace to deploy to different regions, accounts, and cloud environments from a single configuration.

---

When you use Terraform workspaces to manage multiple environments, the provider configuration often needs to change with each workspace. A dev workspace might deploy to us-east-1 in a sandbox account, while prod deploys to eu-west-1 in a production account. Since Terraform does not let you use variables in provider blocks directly, you need patterns that work within the language's constraints. This post covers those patterns in detail.

## The Constraint

Terraform provider blocks have a limitation: they cannot use dynamic expressions that depend on resource attributes or data source results. However, they can use input variables and local values. This means you can build dynamic provider configurations as long as the values are known at plan time.

```hcl
# This works - locals and variables are resolved at plan time
provider "aws" {
  region = local.region
}

# This also works
provider "aws" {
  region = var.region
}

# This does NOT work - depends on a resource attribute
# provider "aws" {
#   region = aws_ssm_parameter.region.value  # ERROR
# }
```

## Pattern 1: Workspace-to-Region Mapping

The most common pattern maps workspace names to provider settings through locals:

```hcl
locals {
  # Map workspace names to AWS regions
  workspace_region = {
    dev     = "us-east-1"
    staging = "us-west-2"
    prod    = "eu-west-1"
  }
}

provider "aws" {
  region = lookup(local.workspace_region, terraform.workspace, "us-east-1")
}
```

The `lookup` function provides a default value ("us-east-1") for workspaces that are not in the map. This prevents errors if someone creates a workspace with an unexpected name.

## Pattern 2: Multi-Account Configuration

Different workspaces can target different AWS accounts using role assumption:

```hcl
locals {
  account_config = {
    dev = {
      region   = "us-east-1"
      role_arn = "arn:aws:iam::111111111111:role/TerraformDev"
      profile  = "dev"
    }
    staging = {
      region   = "us-east-1"
      role_arn = "arn:aws:iam::222222222222:role/TerraformStaging"
      profile  = "staging"
    }
    prod = {
      region   = "eu-west-1"
      role_arn = "arn:aws:iam::333333333333:role/TerraformProd"
      profile  = "production"
    }
  }

  # Get the config for the current workspace
  current_account = lookup(
    local.account_config,
    terraform.workspace,
    local.account_config["dev"]
  )
}

provider "aws" {
  region = local.current_account.region

  assume_role {
    role_arn     = local.current_account.role_arn
    session_name = "terraform-${terraform.workspace}"
  }
}
```

## Pattern 3: Mixed Variable and Workspace Configuration

Use input variables for values that might change, with workspace-specific defaults:

```hcl
variable "region_override" {
  type        = string
  default     = ""
  description = "Override the region for this workspace. Leave empty to use the default."
}

locals {
  default_regions = {
    dev     = "us-east-1"
    staging = "us-west-2"
    prod    = "eu-west-1"
  }

  # Use override if provided, otherwise use workspace default
  effective_region = (
    var.region_override != "" ?
    var.region_override :
    lookup(local.default_regions, terraform.workspace, "us-east-1")
  )
}

provider "aws" {
  region = local.effective_region
}
```

This lets you override the region through a variable when needed:

```bash
# Use the workspace default
terraform plan

# Override the region for this run
terraform plan -var="region_override=ap-southeast-1"
```

## Pattern 4: Multi-Cloud Provider Selection

Workspaces can determine which cloud providers get configured:

```hcl
locals {
  cloud_config = {
    "aws-dev" = {
      cloud  = "aws"
      region = "us-east-1"
    }
    "aws-prod" = {
      cloud  = "aws"
      region = "eu-west-1"
    }
    "gcp-dev" = {
      cloud   = "gcp"
      project = "myapp-dev"
      region  = "us-central1"
    }
    "gcp-prod" = {
      cloud   = "gcp"
      project = "myapp-prod"
      region  = "europe-west1"
    }
  }

  config   = local.cloud_config[terraform.workspace]
  is_aws   = local.config.cloud == "aws"
  is_gcp   = local.config.cloud == "gcp"
}

provider "aws" {
  region = local.is_aws ? local.config.region : "us-east-1"

  # Skip credential validation if we are not using AWS
  skip_credentials_validation = !local.is_aws
  skip_metadata_api_check     = !local.is_aws
  skip_requesting_account_id  = !local.is_aws
}

provider "google" {
  project = local.is_gcp ? local.config.project : "unused"
  region  = local.is_gcp ? local.config.region : "us-central1"
}

# Resources conditionally created based on cloud
resource "aws_instance" "web" {
  count         = local.is_aws ? 1 : 0
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

resource "google_compute_instance" "web" {
  count        = local.is_gcp ? 1 : 0
  name         = "web-${terraform.workspace}"
  machine_type = "e2-medium"
  zone         = "${local.config.region}-a"

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
    }
  }

  network_interface {
    network = "default"
  }
}
```

## Pattern 5: Provider Aliases with Workspace Logic

Combine provider aliases with workspace-driven configuration for complex setups like cross-region resources:

```hcl
locals {
  primary_region = lookup({
    dev  = "us-east-1"
    prod = "eu-west-1"
  }, terraform.workspace, "us-east-1")

  dr_region = lookup({
    dev  = "us-west-2"
    prod = "us-east-1"
  }, terraform.workspace, "us-west-2")
}

# Primary region provider
provider "aws" {
  region = local.primary_region
}

# DR region provider
provider "aws" {
  alias  = "dr"
  region = local.dr_region
}

# Primary resources
resource "aws_vpc" "primary" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = "primary-${terraform.workspace}"
  }
}

# DR resources in the secondary region
resource "aws_vpc" "dr" {
  provider   = aws.dr
  cidr_block = "10.1.0.0/16"

  tags = {
    Name = "dr-${terraform.workspace}"
  }
}

# VPC peering between regions
resource "aws_vpc_peering_connection" "primary_to_dr" {
  vpc_id      = aws_vpc.primary.id
  peer_vpc_id = aws_vpc.dr.id
  peer_region = local.dr_region

  tags = {
    Name = "primary-to-dr-${terraform.workspace}"
  }
}

resource "aws_vpc_peering_connection_accepter" "dr_accept" {
  provider                  = aws.dr
  vpc_peering_connection_id = aws_vpc_peering_connection.primary_to_dr.id
  auto_accept               = true
}
```

## Pattern 6: Variable Files Combined with Provider Logic

Use workspace-specific variable files to feed into provider configuration:

```hcl
# variables.tf
variable "aws_region" {
  type = string
}

variable "aws_role_arn" {
  type      = string
  sensitive = true
}

# provider.tf
provider "aws" {
  region = var.aws_region

  assume_role {
    role_arn = var.aws_role_arn
  }
}
```

```hcl
# envs/dev.tfvars
aws_region   = "us-east-1"
aws_role_arn = "arn:aws:iam::111111111111:role/TerraformDev"
```

```hcl
# envs/prod.tfvars
aws_region   = "eu-west-1"
aws_role_arn = "arn:aws:iam::333333333333:role/TerraformProd"
```

```bash
terraform workspace select dev
terraform plan -var-file=envs/dev.tfvars
```

This approach separates the "what" (variables) from the "how" (provider configuration), keeping things clean.

## Pattern 7: Azure Subscription Switching

For Azure, switch subscriptions per workspace:

```hcl
locals {
  azure_config = {
    dev = {
      subscription_id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
      location        = "East US"
    }
    staging = {
      subscription_id = "ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj"
      location        = "East US"
    }
    prod = {
      subscription_id = "kkkkkkkk-llll-mmmm-nnnn-oooooooooooo"
      location        = "West Europe"
    }
  }

  azure = lookup(local.azure_config, terraform.workspace, local.azure_config["dev"])
}

provider "azurerm" {
  features {}

  subscription_id = local.azure.subscription_id
}

resource "azurerm_resource_group" "main" {
  name     = "rg-myapp-${terraform.workspace}"
  location = local.azure.location
}
```

## Pattern 8: GCP Project Switching

```hcl
locals {
  gcp_config = {
    dev = {
      project = "mycompany-dev-12345"
      region  = "us-central1"
    }
    staging = {
      project = "mycompany-staging-67890"
      region  = "us-central1"
    }
    prod = {
      project = "mycompany-prod-11111"
      region  = "europe-west1"
    }
  }

  gcp = lookup(local.gcp_config, terraform.workspace, local.gcp_config["dev"])
}

provider "google" {
  project = local.gcp.project
  region  = local.gcp.region
}

resource "google_compute_network" "main" {
  name                    = "vpc-${terraform.workspace}"
  auto_create_subnetworks = false
}
```

## Validating Provider Configuration

Add checks to catch configuration errors early:

```hcl
locals {
  known_workspaces = ["dev", "staging", "prod"]
}

check "provider_configuration" {
  assert {
    condition     = contains(local.known_workspaces, terraform.workspace)
    error_message = "Workspace '${terraform.workspace}' does not have a provider configuration. Known workspaces: ${join(", ", local.known_workspaces)}"
  }
}
```

## Debugging Provider Configuration

When things go wrong, verify what the provider is actually using:

```hcl
output "provider_debug" {
  value = {
    workspace = terraform.workspace
    region    = local.effective_region
    account   = local.current_account.role_arn
  }
}
```

```bash
# Check the provider configuration without applying
terraform workspace select prod
terraform plan -target=null_resource.debug
# Review the outputs to confirm the right region/account
```

## Limitations

**You cannot create providers dynamically.** Each provider block must be written explicitly. You cannot loop over a list of regions and create a provider for each one.

**Provider configuration is evaluated once.** It does not change between resources. If you need resources in different regions within the same workspace, use provider aliases.

**Credential management gets complex.** Each workspace might need different credentials. Use a secrets manager or CI/CD credential injection rather than storing credentials in variable files.

## Conclusion

Dynamic provider configuration through workspaces lets you target different regions, accounts, and even cloud platforms from a single Terraform codebase. The key is mapping workspace names to provider settings through locals or variables, staying within Terraform's constraint that provider values must be known at plan time. Start with a simple region map and expand to multi-account or multi-cloud patterns as your needs grow. This approach works well for teams that want workspace simplicity with provider flexibility. For more on the workspace ecosystem, revisit our guide on [understanding Terraform workspaces](https://oneuptime.com/blog/post/2026-02-23-how-to-understand-terraform-workspaces/view).
