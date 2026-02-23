# How to Generate Random Pet Names with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Random Provider, Pet Names, Infrastructure as Code, Naming

Description: Learn how to generate human-readable random pet names with Terraform for development environments, test clusters, temporary resources, and friendly identifiers.

---

Random pet names are one of Terraform's most charming features. Instead of cryptic hex strings or UUIDs, the random_pet resource generates memorable, human-friendly names like "happy-panda" or "clever-robin-smartly." These names are perfect for development environments, test clusters, feature branches, and any resource where human readability matters more than guaranteed global uniqueness.

In this guide, we will explore the random_pet resource in detail. We will cover configuration options, practical use cases, and patterns for incorporating pet names into your Terraform workflows.

## Understanding random_pet

The random_pet resource generates a name composed of random words from a built-in dictionary. Each name consists of an adjective followed by a noun (an animal name), with an optional additional adjective for longer names. The result is always lowercase, and words are joined by a configurable separator.

## Basic Setup

```hcl
# main.tf - Provider configuration
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Generating a Basic Pet Name

```hcl
# basic.tf - Simple pet name generation
resource "random_pet" "example" {}

output "pet_name" {
  value = random_pet.example.id
  # Example output: "suitable-eft"
}
```

## Configuring Pet Name Length

The length parameter controls how many words appear in the name:

```hcl
# lengths.tf - Different name lengths
# Two words (default): adjective-animal
resource "random_pet" "two_words" {
  length = 2
}

# Three words: adjective-adjective-animal
resource "random_pet" "three_words" {
  length = 3
}

# One word: just an animal name
resource "random_pet" "one_word" {
  length = 1
}

output "name_examples" {
  value = {
    two_words   = random_pet.two_words.id    # "happy-panda"
    three_words = random_pet.three_words.id  # "clearly-valid-chipmunk"
    one_word    = random_pet.one_word.id     # "robin"
  }
}
```

## Customizing the Separator

Change the separator between words:

```hcl
# separators.tf - Custom separators
resource "random_pet" "hyphen" {
  separator = "-"  # Default
}

resource "random_pet" "underscore" {
  separator = "_"
}

resource "random_pet" "dot" {
  separator = "."
}

resource "random_pet" "none" {
  separator = ""
}

output "separator_examples" {
  value = {
    hyphen     = random_pet.hyphen.id      # "happy-panda"
    underscore = random_pet.underscore.id  # "happy_panda"
    dot        = random_pet.dot.id         # "happy.panda"
    none       = random_pet.none.id        # "happypanda"
  }
}
```

## Adding a Prefix

Use the prefix argument to add context to the name:

```hcl
# prefix.tf - Pet names with meaningful prefixes
resource "random_pet" "dev_env" {
  prefix = "dev"
  length = 2
}

resource "random_pet" "staging_env" {
  prefix = "staging"
  length = 2
}

resource "random_pet" "feature" {
  prefix = "feature"
  length = 2
}

output "prefixed_names" {
  value = {
    dev     = random_pet.dev_env.id      # "dev-happy-panda"
    staging = random_pet.staging_env.id  # "staging-clever-robin"
    feature = random_pet.feature.id      # "feature-brave-fox"
  }
}
```

## Naming Development Environments

Pet names are ideal for naming development and ephemeral environments:

```hcl
# dev-environments.tf - Name development environments with pet names
resource "random_pet" "environment" {
  prefix    = "dev"
  length    = 2
  separator = "-"

  keepers = {
    # Regenerate when the developer changes
    developer = var.developer_name
  }
}

variable "developer_name" {
  type    = string
  default = "alice"
}

# Use the pet name for the entire environment
resource "aws_ecs_cluster" "dev" {
  name = random_pet.environment.id

  tags = {
    Environment = "development"
    Developer   = var.developer_name
    Nickname    = random_pet.environment.id
  }
}

resource "aws_cloudwatch_log_group" "dev" {
  name              = "/dev/${random_pet.environment.id}"
  retention_in_days = 7
}

# The environment gets a friendly name like "dev-happy-panda"
output "environment_name" {
  value = random_pet.environment.id
}
```

## Naming Kubernetes Clusters

Pet names make Kubernetes clusters easy to reference in conversation:

```hcl
# k8s-clusters.tf - Name K8s clusters with pet names
variable "clusters" {
  type    = list(string)
  default = ["primary", "secondary", "edge"]
}

resource "random_pet" "cluster" {
  for_each = toset(var.clusters)

  prefix = each.value
  length = 2

  keepers = {
    cluster_type = each.value
  }
}

output "cluster_names" {
  value = { for k, v in random_pet.cluster : k => v.id }
  # Example:
  # primary   = "primary-brave-fox"
  # secondary = "secondary-gentle-bear"
  # edge      = "edge-swift-hawk"
}
```

## Feature Branch Environments

Create unique names for feature branch deployments:

```hcl
# feature-branches.tf - Unique names for feature branch environments
resource "random_pet" "branch_env" {
  prefix = "branch"
  length = 2

  keepers = {
    # Regenerate for each branch
    branch_name = var.branch_name
    commit_sha  = var.commit_sha
  }
}

variable "branch_name" {
  type    = string
  default = "feature/new-auth"
}

variable "commit_sha" {
  type    = string
  default = "abc1234"
}

# Use for subdomain routing
locals {
  branch_subdomain = random_pet.branch_env.id
  branch_url       = "https://${local.branch_subdomain}.preview.example.com"
}

output "preview_url" {
  value = local.branch_url
  # "https://branch-gentle-bear.preview.example.com"
}
```

## Combining Pet Names with Random IDs

For uniqueness plus readability, combine pet names with random IDs:

```hcl
# combined.tf - Pet name plus unique suffix
resource "random_pet" "readable" {
  length = 2
}

resource "random_id" "unique" {
  byte_length = 2
}

locals {
  # Combine for human-readable yet unique names
  unique_readable_name = "${random_pet.readable.id}-${random_id.unique.hex}"
}

resource "aws_s3_bucket" "uniquely_named" {
  bucket = "data-${local.unique_readable_name}"
  # Result: data-happy-panda-a1b2
}

output "unique_name" {
  value = local.unique_readable_name
}
```

## Using Keepers for Controlled Regeneration

```hcl
# keepers.tf - Control when pet names change
resource "random_pet" "stable" {
  length = 2
  # No keepers - name stays the same forever
}

resource "random_pet" "per_deploy" {
  length = 2
  keepers = {
    deploy_id = var.deploy_id
  }
}

variable "deploy_id" {
  type    = string
  default = "deploy-001"
}

resource "random_pet" "per_sprint" {
  length = 2
  keepers = {
    sprint = var.sprint_number
  }
}

variable "sprint_number" {
  type    = string
  default = "sprint-42"
}
```

## Conclusion

The random_pet resource brings a touch of personality to your infrastructure naming. While it should not be used where guaranteed global uniqueness is required (use random_id for that), it excels at making development environments, test clusters, and temporary resources easy to identify and discuss. The combination of prefixes, configurable length, and keepers gives you enough control to fit pet names into any workflow. For scenarios requiring more formal identifiers, see our guides on [random IDs](https://oneuptime.com/blog/post/2026-02-23-how-to-generate-random-ids-with-terraform/view) and [random UUIDs](https://oneuptime.com/blog/post/2026-02-23-how-to-generate-random-uuids-with-terraform/view).
