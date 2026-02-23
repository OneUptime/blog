# How to Understand OpenTofu vs Terraform Differences

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Comparison, Open Source

Description: A detailed comparison of OpenTofu and Terraform covering licensing, features, registry differences, community governance, and technical distinctions to help you choose the right tool.

---

OpenTofu and Terraform share the same roots but have diverged in important ways since the fork in 2023. Understanding the differences helps you make an informed decision about which tool to use and what to expect if you switch. This article breaks down the differences across licensing, features, governance, and ecosystem.

## The Licensing Split

The most fundamental difference is the license. Terraform switched from the Mozilla Public License 2.0 (MPL 2.0) to the Business Source License 1.1 (BSL 1.1) in August 2023. The BSL is not an open-source license by the Open Source Initiative's definition. It restricts competitive use of Terraform.

OpenTofu uses the MPL 2.0 license, which is a recognized open-source license. This means:

- You can use OpenTofu for any purpose, including commercial, without restrictions
- You can modify and redistribute it freely
- Companies building products that compete with HashiCorp are not restricted

For most end-users deploying infrastructure, the license difference does not affect daily use. It matters more for companies building infrastructure management platforms or managed services.

## Governance Structure

Terraform is controlled by HashiCorp (now part of IBM after the 2024 acquisition). Product decisions, roadmap priorities, and release schedules are determined by HashiCorp.

OpenTofu is a Linux Foundation project with a community-driven governance model. Decisions are made through an open RFC process, and multiple companies contribute to development. The steering committee includes representatives from various organizations, not just one company.

This matters for long-term planning. With OpenTofu, the community has a real voice in the project's direction. With Terraform, you rely on HashiCorp's business priorities aligning with your needs.

## Feature Differences

Since the fork, both projects have continued development independently. Some features exist in one but not the other.

### Features Unique to OpenTofu

**State Encryption**: OpenTofu supports client-side encryption of state files. This is a significant security feature that Terraform does not offer natively.

```hcl
# OpenTofu state encryption configuration
terraform {
  encryption {
    key_provider "pbkdf2" "my_key" {
      passphrase = var.state_encryption_passphrase
    }

    method "aes_gcm" "encrypt" {
      keys = key_provider.pbkdf2.my_key
    }

    state {
      method = method.aes_gcm.encrypt
    }
  }
}
```

**Early Variable/Locals Evaluation**: OpenTofu allows variables and locals to be used in backend configuration and module sources, which Terraform does not support.

```hcl
# This works in OpenTofu but not in Terraform
variable "environment" {
  type = string
}

terraform {
  backend "s3" {
    bucket = "state-${var.environment}"  # OpenTofu only
    key    = "terraform.tfstate"
    region = "us-east-1"
  }
}
```

**Provider-Defined Functions**: OpenTofu supports functions defined by providers, extending the function ecosystem beyond built-in functions.

**for_each with Count Results**: OpenTofu allows using `for_each` with resources that use `count`, making certain patterns easier to express.

### Features Unique to Terraform

**HCP Terraform Integration**: Native integration with HashiCorp Cloud Platform (formerly Terraform Cloud) for remote operations, policy enforcement, and cost estimation.

**Terraform Stacks**: A newer feature for managing groups of related configurations as a single unit.

**Import Block Enhancements**: Terraform has been iterating on the `import` block feature with some improvements that may not have been ported to OpenTofu yet.

## Registry Differences

Both tools have their own registries:

- **Terraform Registry**: registry.terraform.io
- **OpenTofu Registry**: registry.opentofu.org

The OpenTofu registry mirrors most providers and modules from the Terraform registry. For the vast majority of providers, you will not notice any difference.

```hcl
# This source works with both tools
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

There are edge cases where a provider might be available on one registry but not the other, particularly for very new or niche providers. If you encounter this, you can configure provider installation to use direct downloads.

## Command Compatibility

The commands are nearly identical:

```bash
# Terraform commands
terraform init
terraform plan
terraform apply
terraform destroy
terraform state list
terraform import

# OpenTofu equivalents (same flags, same behavior)
tofu init
tofu plan
tofu apply
tofu destroy
tofu state list
tofu import
```

Configuration files use the same syntax, the same block types, and the same built-in functions. A `.tf` file that works with Terraform 1.5 will work with OpenTofu 1.6 without changes in almost all cases.

## State File Compatibility

State files are compatible between Terraform and OpenTofu, with some version-dependent caveats:

- State files from Terraform 1.5.x and earlier work directly with OpenTofu
- State files from Terraform 1.6.x generally work with OpenTofu 1.6.x
- State files from newer Terraform versions may have a higher state format version that OpenTofu has not adopted yet

```bash
# Check state file version
cat terraform.tfstate | jq '.version, .terraform_version'

# OpenTofu can read Terraform state files
tofu state list
```

## Provider Compatibility

Both tools use the same provider plugin protocol. A provider binary that works with Terraform works with OpenTofu. The providers themselves do not need to know which tool is calling them.

```bash
# Provider plugins are in the same format
ls .terraform/providers/registry.terraform.io/hashicorp/aws/

# OpenTofu downloads them to a similar location
ls .terraform/providers/registry.opentofu.org/hashicorp/aws/
```

## Performance Comparison

In practice, performance is very similar. Both tools execute the same Terraform provider plugins and use similar graph-based execution engines. Some benchmarks show minor differences in planning speed, but these are not significant enough to be a deciding factor.

Both tools support the `-parallelism` flag to control concurrent operations:

```bash
# Both tools support parallelism
tofu apply -parallelism=20
terraform apply -parallelism=20
```

## Ecosystem and Tooling

Most third-party tools that work with Terraform also work with OpenTofu:

| Tool | Terraform | OpenTofu |
|------|-----------|----------|
| Terragrunt | Yes | Yes |
| Atlantis | Yes | Yes |
| Checkov | Yes | Yes |
| tflint | Yes | Yes |
| Infracost | Yes | Yes |
| Spacelift | Yes | Yes |
| env0 | Yes | Yes |

Some tools require minor configuration changes. For example, Terragrunt needs the `terraform_binary` setting:

```hcl
# terragrunt.hcl
terraform_binary = "tofu"
```

## When to Choose OpenTofu

Choose OpenTofu if:

- You need a truly open-source tool with community governance
- You want state encryption built into the tool
- You are building a product that competes with HashiCorp offerings
- You prefer the early variable evaluation feature
- You want to contribute to the project's direction

## When to Choose Terraform

Choose Terraform if:

- You are already invested in HCP Terraform (Terraform Cloud)
- You need features specific to the latest Terraform release
- Your organization has a HashiCorp enterprise agreement
- You want the backing of a major vendor for support contracts

## The Bottom Line

For individual developers and most organizations, the practical differences between OpenTofu and Terraform are small. The code is the same syntax, the providers are the same, and the workflow is the same. The big differences are in licensing, governance, and a few unique features on each side.

If you are starting a new project with no existing investment in either ecosystem, OpenTofu is the safer long-term bet for open-source continuity. If you are already deeply integrated with HashiCorp's commercial offerings, staying with Terraform may be more pragmatic.

For a hands-on migration guide, see [How to Migrate from Terraform to OpenTofu](https://oneuptime.com/blog/post/2026-02-23-migrate-from-terraform-to-opentofu/view).
