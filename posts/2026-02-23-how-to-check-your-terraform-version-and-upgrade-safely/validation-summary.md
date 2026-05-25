# Validation Summary: How to Check Your Terraform Version and Upgrade Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform configuration language
- Terraform provider version constraints
- Terraform dependency lock file
- Terraform state management
- tfenv
- asdf
- Bash

## Sources Consulted
- Terraform `version` command reference: https://developer.hashicorp.com/terraform/cli/commands/version
- Terraform `init` command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform `state push` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/push
- Terraform block reference: https://developer.hashicorp.com/terraform/language/block/terraform
- Terraform dependency lock file documentation: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- Terraform version management tutorial: https://developer.hashicorp.com/terraform/tutorials/configuration-language/versions
- Terraform v1.x compatibility promises: https://developer.hashicorp.com/terraform/language/v1-compatibility-promises
- tfenv README: https://github.com/tfutils/tfenv
- asdf plugin documentation: https://asdf-vm.com/manage/plugins.html
- asdf short-name plugin index: https://github.com/asdf-vm/asdf-plugins

## Issues Found
- The `terraform version -json` example used `"outdated": true`, but Terraform's documented JSON field is `"terraform_outdated"`. Updated the JSON example to use the correct field name.
- The sample `terraform version` output pointed users to `https://www.terraform.io/downloads`, while current Terraform documentation points installation guidance to `https://developer.hashicorp.com/terraform/install`. Updated the sample output URL.
- The version-number description said Terraform "follows semantic versioning" and described patch releases as "bug fixes only." Terraform CLI v1.x is governed by HashiCorp's compatibility promises, and the docs describe patch updates as non-disruptive rather than exclusively bug fixes. Reworded this to "semantic-version-style" and softened the patch description.
- The state backup guidance said S3, GCS, and Azure Blob have versioning built in. These services support versioning, but it must be enabled/configured. Updated the sentence to avoid implying automatic protection.

## Review Notes
- Terraform was not installed in the local environment, so command behavior was verified against official HashiCorp CLI documentation rather than local `terraform --help` output.
- The specific Terraform versions in examples, such as `1.7.4` and `1.8.0`, are illustrative rather than current latest-version recommendations.
