# How to Use Kitchen-Terraform with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kitchen-Terraform, Testing, Infrastructure as Code, IaC, Test-Driven Infrastructure

Description: Learn how to use Kitchen-Terraform to test OpenTofu configurations with multiple testing frameworks.

## Introduction

Kitchen-Terraform was built for Terraform and is now archived, but it can still be used with OpenTofu in existing Test Kitchen workflows. Kitchen-Terraform shells out to a configurable CLI client, so you can point the transport at the `tofu` binary and use InSpec to verify your OpenTofu configuration.

## Prerequisites

- OpenTofu v1.6+ installed
- Ruby 3.x and Bundler installed
- Basic knowledge of OpenTofu concepts
- Relevant provider credentials configured if your module uses a cloud provider

## Step 1: Set Up the Environment

```ruby
# Gemfile
source "https://rubygems.org"

gem "kitchen-terraform", "~> 7.0"
```

```bash
# Verify OpenTofu installation
tofu version

# Verify Ruby and Bundler
ruby --version
bundle --version

# Install Kitchen-Terraform and its dependencies
bundle install
```

## Step 2: Configure Your OpenTofu Project

```hcl
# main.tf
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

resource "random_pet" "name" {
  length = 2
}

output "pet_name" {
  value = random_pet.name.id
}
```

## Step 3: Implement the Core Feature

```yaml
# kitchen.yml
driver:
  name: terraform

transport:
  name: terraform
  client: tofu
  root_module_directory: .

provisioner:
  name: terraform

verifier:
  name: terraform
  systems:
    - name: local
      backend: local
      attrs_outputs:
        generated_name: pet_name
      controls:
        - generated_name

platforms:
  - name: local

suites:
  - name: default
```

```yaml
# test/integration/default/inspec.yml
name: default
inputs:
  - name: generated_name
    type: String
    required: true
```

```ruby
# test/integration/default/controls/generated_name.rb
control "generated_name" do
  title "The OpenTofu output is available to InSpec"

  describe input("generated_name") do
    it { should match(/^[a-z]+-[a-z]+$/) }
  end
end
```

```bash
# Run the full Test Kitchen lifecycle
bundle exec kitchen test
```

## Step 4: Set Up Automation

```yaml
# .github/workflows/infrastructure.yml
name: Kitchen-Terraform

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          bundler-cache: true

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v2
        with:
          tofu_wrapper: false

      - name: Run Kitchen-Terraform
        run: bundle exec kitchen test
```

## Step 5: Monitor and Verify

```bash
# List all configured instances
bundle exec kitchen list

# Create and converge the instance without destroying it
bundle exec kitchen converge default-local

# Re-run the InSpec profile
bundle exec kitchen verify default-local

# Inspect the merged Kitchen configuration
bundle exec kitchen diagnose default-local

# Destroy the test workspace when you are done
bundle exec kitchen destroy default-local
```

## Step 6: Implement Best Practices

```hcl
variable "name_length" {
  description = "Number of words in the generated name"
  type        = number
  default     = 2

  validation {
    condition     = var.name_length >= 2
    error_message = "name_length must be at least 2."
  }
}

resource "random_pet" "name" {
  length = var.name_length
}
```

## Troubleshooting

If you encounter issues:

1. Enable Test Kitchen debug logging: `bundle exec kitchen test -l debug`
2. Check the configured client: Verify that `transport.client` points to the `tofu` executable
3. Review the merged Kitchen configuration: Run `bundle exec kitchen diagnose default-local`
4. Verify provider credentials and backend access if your module provisions cloud resources

## Conclusion

You have successfully implemented Kitchen-Terraform with OpenTofu by configuring Test Kitchen to use the `tofu` CLI and verifying the resulting state with InSpec. Because Kitchen-Terraform is archived, this approach is best suited for existing Test Kitchen workflows; for new OpenTofu projects, consider the native `tofu test` command.
