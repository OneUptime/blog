# Terraform Is Multi-Provider, Not Cloud-Agnostic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, Cloud Portability, Terraform Modules, AWS, Azure, Google Cloud

Description: Put AWS, Azure, and Google Cloud resources behind comparable Terraform module contracts without pretending provider schemas or infrastructure semantics are interchangeable.

---

Terraform can configure many providers in one workflow. That makes it multi-provider. It does not make an `aws_lb`, `azurerm_lb`, and `google_compute_forwarding_rule` the same resource under different names.

Provider resource schemas represent different APIs and operational models. A portable Terraform design keeps those differences visible inside provider-specific modules while presenting a deliberately small, stable contract to the composition layer.

## Avoid Conditional Resources in One Giant Module

This pattern looks convenient at first:

```hcl
resource "aws_s3_bucket" "data" {
  count  = var.cloud == "aws" ? 1 : 0
  bucket = var.name
}

resource "azurerm_storage_account" "data" {
  count                    = var.cloud == "azure" ? 1 : 0
  name                     = var.name
  resource_group_name      = var.resource_group
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}
```

As providers accumulate, many provider-specific variables become optional, outputs need conditional or `try` expressions, validation becomes difficult, and Terraform must still install the providers and validate configuration for branches irrelevant to the selected cloud. More importantly, the module suggests false equivalence: an S3 bucket and a storage account have different containment, authorization, endpoint, versioning, and lifecycle concepts.

Use separate implementations instead:

```text
modules/
  object-store-contract.md
  object-store-aws/
  object-store-azure/
  object-store-gcp/
stacks/
  production-aws/
  evacuation-azure/
```

Terraform does not provide a formal interface keyword for modules. The contract is a convention enforced by matching typed inputs, outputs, documentation, and tests.

## Design the Contract from Consumer Needs

Do not expose the union of all provider fields. Start with what downstream code actually consumes:

```hcl
variable "name" {
  type = string
}

variable "data_classification" {
  type = string
  validation {
    condition     = contains(["internal", "confidential"], var.data_classification)
    error_message = "Use internal or confidential."
  }
}

variable "retention_days" {
  type = number
}

output "application_endpoint" {
  value = {
    uri             = "https://${aws_s3_bucket.data.bucket_regional_domain_name}"
    credential_mode = "workload_identity"
  }
}
```

The Azure and Google Cloud implementations can return the same object shape, even though they create different resources. Keep provider-native identifiers available in a clearly named diagnostic output rather than using them as application configuration:

```hcl
output "provider_details" {
  value = {
    provider    = "aws"
    resource_id = aws_s3_bucket.data.arn
    region      = var.region
  }
}
```

Comparable outputs do not guarantee comparable semantics. Document the contract precisely: for example, private object storage, version history enabled, TLS endpoint, and workload identity. Test each statement.

## Keep Provider Configuration in Root Modules

HashiCorp documents that reusable child modules should declare provider requirements but receive provider configurations from the root. A child module should not contain its own `provider` block.

An AWS implementation declares its requirement:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0"
    }
  }
}
```

The root configures and passes it:

```hcl
provider "aws" {
  region = var.aws_region
}

module "object_store" {
  source = "../../modules/object-store-aws"

  name                = var.object_store_name
  data_classification = "confidential"
  retention_days      = 30
}
```

Each child module declares the minimum provider version containing features it uses. The root owns tighter version selection and commits the dependency lock file. Provider aliases are passed explicitly when a module needs more than one region or account.

## Put Selection in the Composition Layer

There are two sound ways to choose an implementation.

The clearest is separate root configurations. Each environment has an ordinary, unconditional module call and is configured with independent state. This also prevents an accidental `cloud = "azure"` edit from proposing the destruction of AWS infrastructure.

If one root must select a module, keep the conditional at the module boundary:

```hcl
variable "target" {
  type = string

  validation {
    condition     = contains(["aws", "gcp"], var.target)
    error_message = "target must be aws or gcp."
  }
}

module "store_aws" {
  count               = var.target == "aws" ? 1 : 0
  source              = "../../modules/object-store-aws"
  name                = var.name
  data_classification = var.data_classification
  retention_days      = var.retention_days
}

module "store_gcp" {
  count               = var.target == "gcp" ? 1 : 0
  source              = "../../modules/object-store-gcp"
  name                = var.name
  data_classification = var.data_classification
  retention_days      = var.retention_days
}

locals {
  store_endpoint = one(concat(
    module.store_aws[*].application_endpoint,
    module.store_gcp[*].application_endpoint
  ))
}
```

Separate roots remain preferable for long-lived production targets because plans, permissions, and state stay isolated.

## Model Capabilities, Not Wishful Equivalence

Sometimes one implementation cannot satisfy a contract. Fail explicitly rather than silently weakening it. Use a precondition when a failed capability must stop the operation; Terraform `check` assertions report warnings and continue:

```hcl
variable "object_lock_required" {
  type = bool
}

output "capabilities" {
  value = {
    object_versioning     = true
    immutable_retention   = local.supports_object_lock
    customer_managed_keys = true
    private_endpoint      = var.enable_private_endpoint
  }

  precondition {
    condition     = !var.object_lock_required || local.supports_object_lock
    error_message = "This implementation cannot provide the required retention control."
  }
}
```

A capability record such as the output above can support composition without concealing differences. Callers can inspect `module.store.capabilities`, but they should still enforce every capability that is mandatory for the workload.

Consumers should assert required capabilities. Optional features may use provider-specific extension inputs, but name them as escape hatches and keep them out of the core contract:

```hcl
variable "provider_options" {
  description = "AWS-only options; changing these reduces portability."
  type = object({
    storage_class = optional(string, "STANDARD")
  })
  default = {}
}
```

Avoid `map(any)` for the primary interface. It weakens schema validation at the module boundary and defers errors until Terraform consumes the values.

## Test Every Implementation Against the Same Cases

Static matching of variable names is not enough. Run a small contract suite for each implementation:

1. format the configuration;
2. initialize with a committed lock file;
3. validate the initialized configuration;
4. plan representative inputs;
5. apply in an isolated test account or project;
6. test access, encryption, retention, and deletion behavior;
7. destroy and check for retained resources that need explicit cleanup.

Capture normalized evidence such as:

```json
{
  "private_access": true,
  "version_restore_passed": true,
  "unauthorized_read_denied": true,
  "provision_seconds": 47
}
```

Test provider-native features separately. The stable interface is a minimum accepted contract, not proof that the platforms are identical.

## Version the Contract Deliberately

Treat the shared inputs and outputs as a versioned product. Adding an optional input with a safe default is usually compatible; renaming an output, narrowing an accepted value, or changing an output type requires coordinated caller updates. Keep a small fixture for each supported contract version and run it against every provider implementation before release.

For each root, constrain the Terraform CLI and providers to versions the team has tested:

```hcl
terraform {
  required_version = ">= 1.13, < 2.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}
```

The numbers are examples, not universal recommendations. Select constraints from the features each implementation actually uses. Run `terraform init -upgrade` only as an intentional dependency change, review the resulting plan, and commit the updated lock file in each root configuration. The lock file records provider selections; it does not lock remote module versions, so pin module sources explicitly using the source mechanism's supported version or revision syntax.

Publish a short change log with the contract. When a breaking change is unavoidable, keep the old implementation available long enough for callers to migrate and verify both versions independently.

## Plan for State During a Provider Move

Terraform state binds resource instances to provider configurations. Swapping module source code does not transform an AWS resource into an Azure resource. A migration normally creates target infrastructure in separate state, moves application data, cuts traffic, and later decommissions the source.

Use `moved` blocks for address refactoring within a compatible configuration. Use import blocks to adopt existing target resources when appropriate. Neither mechanism migrates live service data or converts provider resource types.

## Official Documentation

- [Terraform provider requirements](https://developer.hashicorp.com/terraform/language/providers/requirements)
- [Providers within Terraform modules](https://developer.hashicorp.com/terraform/language/modules/develop/providers)
- [Terraform module composition](https://developer.hashicorp.com/terraform/language/modules/develop/composition)
- [Terraform dependency lock file](https://developer.hashicorp.com/terraform/language/files/dependency-lock)
- [Terraform validation, preconditions, and checks](https://developer.hashicorp.com/terraform/language/validate)
- [Terraform moved blocks](https://developer.hashicorp.com/terraform/language/modules/develop/refactoring)
- [Terraform import blocks](https://developer.hashicorp.com/terraform/language/import)

## Conclusion

Terraform's provider ecosystem is excellent for managing several clouds, but portability comes from architecture and tested contracts. Keep resource implementations provider-specific, stabilize only the outputs consumers need, expose capability gaps, and use separate state for migration. Honest modules reduce switching work without forcing every cloud into a fictional common schema.
