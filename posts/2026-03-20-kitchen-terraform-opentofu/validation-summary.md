# Validation Summary: How to Use Kitchen-Terraform with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Kitchen-Terraform
- Test Kitchen
- Chef InSpec
- Ruby and Bundler
- GitHub Actions
- HCL

## Sources Consulted
- Kitchen-Terraform documentation: https://newcontext-oss.github.io/kitchen-terraform/
- Kitchen-Terraform archived repository: https://github.com/newcontext-oss/kitchen-terraform
- Kitchen-Terraform gemspec: https://github.com/newcontext-oss/kitchen-terraform/blob/main/kitchen-terraform.gemspec
- Kitchen-Terraform configurable client source: https://github.com/newcontext-oss/kitchen-terraform/blob/main/lib/kitchen/terraform/config_attribute/client.rb
- Kitchen-Terraform InSpec input handling: https://github.com/newcontext-oss/kitchen-terraform/blob/main/lib/kitchen/terraform/inspec_options_factory.rb
- Kitchen-Terraform system configuration docs/source: https://github.com/newcontext-oss/kitchen-terraform/blob/main/lib/kitchen/terraform/config_attribute/systems.rb
- Test Kitchen repository and configuration behavior: https://github.com/test-kitchen/test-kitchen
- OpenTofu CLI command reference: https://opentofu.org/docs/cli/commands/
- OpenTofu native testing command: https://opentofu.org/docs/cli/commands/test/
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- Chef InSpec inputs: https://docs.chef.io/inspec/6.8/profiles/inputs/
- Chef InSpec `inspec.yml` metadata: https://docs.chef.io/inspec/7.0/profiles/inspec_yml/
- Chef Workstation deprecation note for `attribute()` to `input()`: https://docs.chef.io/workstation/cookstyle/cops/inspec_deprecations_attributehelper/
- OpenTofu setup action: https://github.com/opentofu/setup-opentofu
- GitHub Actions checkout action: https://github.com/actions/checkout
- Ruby setup action: https://github.com/ruby/setup-ruby
- Official random provider docs: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/pet

## Issues Found
- The original post did not describe Kitchen-Terraform at all. It was a generic OpenTofu `init`/`plan`/`apply` deployment guide, so I replaced the implementation details with an actual Kitchen-Terraform workflow using `kitchen.yml`, an InSpec profile, and `bundle exec kitchen test`.
- The original description and introduction claimed Kitchen-Terraform worked with multiple testing frameworks. Kitchen-Terraform's verifier integrates with InSpec, so I corrected the wording to Test Kitchen and InSpec.
- The original prerequisites omitted Ruby, Bundler, and the Kitchen-Terraform gem. I added the missing setup and aligned the prerequisites with the current gem requirements.
- The original configuration examples were unrelated to Kitchen-Terraform. I replaced them with a minimal OpenTofu example and a Test Kitchen configuration that uses `transport.client: tofu`, which is how Kitchen-Terraform can invoke OpenTofu.
- The original GitHub Actions workflow was a generic plan/apply pipeline and used outdated action versions. I replaced it with a workflow that sets up Ruby, installs OpenTofu with `opentofu/setup-opentofu@v2`, and runs `bundle exec kitchen test`.
- The original troubleshooting guidance recommended `tofu refresh`, which OpenTofu documents as deprecated. I replaced that guidance with Test Kitchen diagnostics and workflow-specific checks.
- The original post did not mention that Kitchen-Terraform is archived. I added that caveat and noted that native `tofu test` is the better choice for new OpenTofu projects.

## Review Notes
- Validation was documentation-based. The review environment did not have `ruby`, `bundle`, or `tofu` installed, so I could not execute the example locally.
- Kitchen-Terraform is archived and intended mainly for maintaining existing workflows. Future content on new OpenTofu testing setups should prefer native `tofu test` where possible.
