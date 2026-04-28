# How to Use tofu get to Download Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, CLI, Module

Description: Learn how to use tofu get to download and update modules referenced in your OpenTofu configuration.

## Introduction

`tofu get` downloads modules referenced in the configuration into the `.terraform/modules` cache directory. It is a subset of what `tofu init` does - specifically the module download step. Use it when you have already initialized providers and only need to update module sources.

## Basic Usage

```bash
tofu get

# Output:

# Downloading git::https://github.com/acme/terraform-aws-vpc for module.networking...
# - module.networking in .terraform/modules/networking
```

## Update Modules

```bash
# Download latest matching versions (respects version constraints)
tofu get -update
```

Use `-update` when you want to pull the latest module version allowed by your version constraints.

## What get Does

`tofu get` downloads modules from:
- Local paths (copies into `.terraform/modules`)
- Git repositories (clones at the specified ref or tag)
- Terraform Registry / OpenTofu Registry
- S3, GCS, OCI registries
- HTTP URLs

## When to Use get vs init

```bash
# init does everything: providers + modules + backend
tofu init

# get does only modules
tofu get
```

Use `tofu get` when:
- You've already run `tofu init` and providers are installed
- You added a new module and don't want to re-download providers
- You want to quickly update module versions

In most workflows, `tofu init` is preferred because it handles all initialization in one step.

## Module Cache Location

Downloaded modules are stored in `.terraform/modules`:

```text
.terraform/
└── modules/
    ├── modules.json          # Module registry
    ├── networking/           # module "networking" from git
    │   └── ...
    └── database/             # module "database" from registry
        └── ...
```

## Example Configuration

```hcl
module "networking" {
  source  = "git::https://github.com/acme/terraform-aws-vpc.git?ref=v2.1.0"
}

module "database" {
  source  = "hashicorp/consul/aws"
  version = "~> 0.1"
}
```

```bash
# Download both modules
tofu get
```

## Verify Downloaded Modules

```bash
# Check which modules were downloaded
cat .terraform/modules/modules.json | jq '.'
```

## Gitignore the Module Cache

```bash
# .gitignore
.terraform/
```

Module sources are defined in configuration - the downloaded contents should not be committed.

## get with No Modules

```bash
tofu get
# If there are no modules, get completes silently with no output
```

## CI/CD Usage

```bash
# CI pipeline: initialize everything in one step
tofu init -input=false

# Or refresh modules later without re-running init
tofu get -update
```

## Conclusion

`tofu get` downloads modules into the local cache for use by `tofu plan` and `tofu apply`. In most cases, run `tofu init` instead - it includes module downloads plus provider installation and backend configuration. Use `tofu get -update` specifically when you want to refresh module sources without re-initializing providers. Always gitignore the `.terraform/` directory since module and provider caches are local artifacts.
