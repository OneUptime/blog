# Validation Summary: How to Use the abspath Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform filesystem functions (`abspath`, `pathexpand`)
- Terraform path references (`path.module`, `path.root`, `path.cwd`)
- Terraform provisioners (`local-exec`)
- Terraform Docker provider
- Terraform Local provider

## Sources Consulted
- HashiCorp Terraform `abspath` function documentation: https://developer.hashicorp.com/terraform/language/functions/abspath
- HashiCorp Terraform `pathexpand` function documentation: https://developer.hashicorp.com/terraform/language/functions/pathexpand
- HashiCorp Terraform named value references documentation: https://developer.hashicorp.com/terraform/language/expressions/references
- HashiCorp Terraform CLI `-chdir` documentation: https://developer.hashicorp.com/terraform/cli/commands
- HashiCorp Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- Kreuzwerker Docker provider `docker_container` resource documentation: https://registry.terraform.io/providers/kreuzwerker/docker/latest/docs/resources/container
- HashiCorp Local provider `local_file` resource documentation: https://registry.terraform.io/providers/hashicorp/local/latest/docs/resources/file

## Issues Found
- The post implied that using `abspath("scripts/deploy.py")` makes the path deterministic regardless of where Terraform is run. This was inaccurate because official Terraform documentation says relative paths passed to `abspath` are joined with the current working directory, not the module directory. Updated the `local-exec` examples to combine `abspath` with `path.module`.
- The Docker volume example used `abspath("./app-data")`, which has the same working-directory dependency. Updated it to use a module-relative host path via `path.module`.
- The `-chdir` explanation said `abspath(path.root)` and `abspath(".")` can differ when using `-chdir`. Terraform CLI documentation states that `-chdir` changes Terraform's working directory before the subcommand runs, while `path.cwd` preserves the original directory. Updated the example and explanation to include `path.cwd` as the value that can differ.
- The summary overgeneralized that converting relative paths to absolute paths makes file references work regardless of where Terraform is invoked. Revised it to clarify that this reliability comes from combining `abspath` with `path.module` or `path.root` where appropriate.

## Review Notes
Terraform was not installed in the local environment, so snippets were reviewed against official documentation rather than validated with `terraform validate`.
