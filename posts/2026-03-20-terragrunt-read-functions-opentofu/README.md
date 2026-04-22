# How to Use Terragrunt Read Functions with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terragrunt, Read Functions, Built-in Functions, Configuration

Description: Learn how to use Terragrunt's built-in read functions like read_terragrunt_config, find_in_parent_folders, get_env, and get_aws_account_id to build dynamic configurations.

## Introduction

Terragrunt provides a set of built-in functions that read data from the environment, file system, and cloud providers. These functions enable dynamic configuration that adapts to its execution context without hard-coding values.

## find_in_parent_folders

```hcl
# Find the root.hcl by walking up the directory tree

include "root" {
  path = find_in_parent_folders("root.hcl")
}

# Find a specific named file
locals {
  env_file = find_in_parent_folders("env.hcl")
}
```

## read_terragrunt_config

```hcl
# Read and parse another Terragrunt config file
locals {
  env_vars    = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  region_vars = read_terragrunt_config(find_in_parent_folders("region.hcl"))

  # Access the locals block from the read file
  environment = local.env_vars.locals.environment
  aws_region  = local.region_vars.locals.aws_region
}
```

```hcl
# environments/prod/env.hcl
locals {
  environment    = "prod"
  aws_region     = "us-east-1"
  aws_account_id = "123456789012"
  vpc_cidr       = "10.0.0.0/16"
}
```

## get_env

```hcl
locals {
  # Read environment variable with a default fallback
  image_tag    = get_env("IMAGE_TAG", "latest")
  deploy_role  = get_env("DEPLOY_ROLE_ARN", "arn:aws:iam::123456789012:role/deployer")

  # Fail if variable is not set (no default = error if missing)
  github_token = get_env("GITHUB_TOKEN")
}
```

## get_aws_account_id

```hcl
locals {
  # Dynamically read the current AWS account ID
  account_id = get_aws_account_id()
}

remote_state {
  backend = "s3"
  config = {
    bucket = "tofu-state-${local.account_id}"
    key    = "${path_relative_to_include()}/terraform.tfstate"
    region = "us-east-1"
  }
}
```

## get_aws_caller_identity_arn and get_aws_caller_identity_user_id

```hcl
locals {
  caller_arn     = get_aws_caller_identity_arn()
  caller_user_id = get_aws_caller_identity_user_id()
}

# Use caller identity for tagging
inputs = {
  deployed_by = local.caller_arn
}
```

## get_terragrunt_dir and get_parent_terragrunt_dir

```hcl
locals {
  # Absolute path to the directory containing this terragrunt.hcl
  module_dir = get_terragrunt_dir()

  # Absolute path to the root include's directory
  root_dir   = get_parent_terragrunt_dir("root")
}

# Reference files relative to the current module directory
inputs = {
  config_file = "${local.module_dir}/config.json"
}
```

## path_relative_to_include

```hcl
remote_state {
  backend = "s3"
  config = {
    bucket = "my-state-bucket"
    # Returns path like "environments/prod/networking"
    key    = "${path_relative_to_include()}/terraform.tfstate"
    region = "us-east-1"
  }
}
```

## get_path_to_repo_root and get_repo_root

```hcl
locals {
  # Get the git repository root (walks up to find .git)
  repo_root = get_repo_root()
}

terraform {
  # Reference modules relative to the repo root
  source = "${local.repo_root}//modules/vpc"
}
```

## run_cmd for Dynamic Values

```hcl
locals {
  # Run a shell command and capture output as a string
  git_sha      = run_cmd("git", "rev-parse", "--short", "HEAD")
  latest_ami   = run_cmd("aws", "ssm", "get-parameter",
    "--name", "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-x86_64",
    "--query", "Parameter.Value",
    "--output", "text"
  )
}

inputs = {
  ami_id    = local.latest_ami
  version   = local.git_sha
}
```

## Combining Read Functions

```hcl
# terragrunt.hcl for a service module
locals {
  env_vars   = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  env        = local.env_vars.locals

  account_id = get_aws_account_id()
  region     = local.env.aws_region
  image_tag  = get_env("IMAGE_TAG", "latest")
  repo_root  = get_repo_root()
}

include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "${local.repo_root}//modules/ecs-service"
}

inputs = {
  environment   = local.env.environment
  image         = "${local.account_id}.dkr.ecr.${local.region}.amazonaws.com/api:${local.image_tag}"
  cluster_name  = "main-${local.env.environment}"
}
```

## Conclusion

Terragrunt's read functions reduce the need for hard-coded values and wrapper scripts to inject context into configurations. `read_terragrunt_config` enables a clean hierarchy of configuration files, `get_aws_account_id` removes hard-coded account IDs, and `run_cmd` provides an escape hatch for any data source that doesn't have a built-in function.
