# Validation Summary: How to Use Kitchen-Terraform for Infrastructure Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Kitchen-Terraform
- Test Kitchen
- Ruby and Bundler
- Chef InSpec
- Chef InSpec AWS resource pack
- GitHub Actions
- AWS OIDC authentication for GitHub Actions

## Sources Consulted
- Kitchen-Terraform README and configuration documentation: https://www.rubydoc.info/github/newcontext-oss/kitchen-terraform
- Kitchen-Terraform getting started guide: https://newcontext-oss.github.io/kitchen-terraform/getting_started.html
- Kitchen-Terraform driver API docs: https://www.rubydoc.info/gems/kitchen-terraform/Kitchen/Driver/Terraform
- Kitchen-Terraform verifier API docs: https://www.rubydoc.info/github/newcontext-oss/kitchen-terraform/Kitchen/Verifier/Terraform
- Kitchen-Terraform RubyGems dependency metadata: https://rubygems.org/gems/kitchen-terraform/versions/7.0.2/dependencies
- Test Kitchen CLI documentation: https://docs.chef.io/workstation/ctl_kitchen/
- Test Kitchen test lifecycle documentation: https://kitchen.ci/docs/getting-started/running-test/
- Chef InSpec inputs documentation: https://docs.chef.io/inspec/7.0/profiles/inputs/
- Chef InSpec profile dependencies documentation: https://docs.chef.io/inspec/7.0/profiles/depends/
- Chef InSpec AWS resource pack documentation: https://docs.chef.io/inspec/resource_packs/aws/
- Chef InSpec AWS resource docs for VPC, subnet, security group, and S3 bucket resources: https://docs.chef.io/inspec/resource_packs/aws/aws_vpc/, https://docs.chef.io/inspec/resource_packs/aws/aws_subnet/, https://docs.chef.io/inspec/resource_packs/aws/aws_security_group/, https://docs.chef.io/inspec/resources/aws_s3_bucket/
- Terraform test command documentation: https://developer.hashicorp.com/terraform/cli/commands/test
- Terraform tests language documentation: https://developer.hashicorp.com/terraform/language/tests
- AWS configure-aws-credentials action documentation: https://github.com/aws-actions/configure-aws-credentials
- GitHub checkout action documentation: https://github.com/actions/checkout
- HashiCorp setup-terraform action documentation: https://github.com/hashicorp/setup-terraform

## Issues Found
- The post described Kitchen-Terraform as a single plugin with three components. Updated it to describe the four Test Kitchen plugins documented by Kitchen-Terraform: driver, provisioner, transport, and verifier.
- The post did not mention that Kitchen-Terraform is deprecated in favor of Terraform's native test framework. Added a short caveat while preserving the guide's usefulness for existing InSpec-based suites.
- The `.kitchen.yml` examples placed `root_module_directory` under `driver`, which Kitchen-Terraform 7 marks as deprecated. Moved it under `transport` with `name: terraform`.
- The InSpec examples used the deprecated `attribute()` helper. Replaced those calls with the current `input()` helper.
- The GitHub Actions OIDC example used `role-to-assume` without granting `id-token: write`. Added job permissions and updated the AWS credentials action to the current documented version.
- The comparison with Terraform native tests incorrectly said native tests only check state values. Reworded it to reflect that `terraform test` runs plan/apply operations and assertions, while InSpec provides broader OS-level checks over SSH.

## Review Notes
Kitchen-Terraform 7.0.2 depends on Chef InSpec 5.x and Test Kitchen below 4.0, so the article's Ruby gem version family is consistent with the plugin's published dependencies. New Terraform projects should evaluate native `terraform test` first because Kitchen-Terraform is deprecated and archived, but the corrected examples remain valid for legacy or InSpec-heavy workflows.
