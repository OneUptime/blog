# Validation Summary: How to Pass Variables via Environment Variables (TF_VAR_) in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform input variables
- Terraform CLI environment variables
- Terraform sensitive variables and state handling
- Shell environment variables
- CI/CD configuration for GitHub Actions, GitLab CI, and Jenkins
- direnv

## Sources Consulted
- HashiCorp Terraform CLI environment variables reference: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- HashiCorp Terraform input variables documentation: https://developer.hashicorp.com/terraform/language/values/variables
- HashiCorp Terraform sensitive variables tutorial: https://developer.hashicorp.com/terraform/tutorials/configuration-language/sensitive-variables
- GitHub Actions variables documentation: https://docs.github.com/actions/how-tos/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables
- GitHub Actions secrets documentation: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
- GitLab CI/CD variables documentation: https://docs.gitlab.com/ci/variables/
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ee/ci/yaml/
- Jenkins credentials documentation: https://www.jenkins.io/doc/book/using/using-credentials/

## Issues Found
- The post said `TF_VAR_` plus `sensitive = true` means secret values are not written to any file. This was incorrect because Terraform can still store sensitive values in state and saved plan files. Updated the text to say `sensitive = true` redacts CLI output and that state and plan files must still be protected.
- The post said secrets passed with environment variables "never touch disk" and that environment variables are the safest or preferred method because values stay in memory. This was too absolute. Updated the language to say environment variables keep secrets out of committed Terraform and tfvars files, but Terraform state and plans may still contain sensitive values.
- The precedence section included an initially incorrect ordering before correcting itself. Replaced it with the official low-to-high precedence ordering: defaults, environment variables, `terraform.tfvars`, `terraform.tfvars.json`, `*.auto.tfvars`, then command-line `-var` and `-var-file` options in the order specified.

## Review Notes
Terraform was not installed in the local workspace, so CLI behavior was validated against HashiCorp's official documentation rather than local `terraform --help` output. The CI/CD snippets are structurally consistent with the referenced platform documentation, but real pipelines should also run `terraform fmt`, `terraform validate`, and platform-specific secret-scoping checks before production use.
