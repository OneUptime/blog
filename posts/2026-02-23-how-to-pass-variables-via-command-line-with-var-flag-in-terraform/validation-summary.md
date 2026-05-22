# Validation Summary: How to Pass Variables via Command Line with -var Flag in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform CLI
- Terraform input variables
- Terraform variable definition files
- Shell quoting for Bash, Zsh, PowerShell, and Windows Command Prompt
- GitHub Actions CI/CD

## Sources Consulted
- HashiCorp Terraform input variables documentation: https://developer.hashicorp.com/terraform/language/values/variables
- HashiCorp Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform apply command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- HashiCorp Terraform destroy command reference: https://developer.hashicorp.com/terraform/cli/commands/destroy
- HashiCorp Terraform import command reference: https://developer.hashicorp.com/terraform/cli/commands/import
- HashiCorp Terraform console command reference: https://developer.hashicorp.com/terraform/cli/commands/console
- HashiCorp Terraform CLI environment variables reference: https://developer.hashicorp.com/terraform/cli/config/environment-variables

## Issues Found
- Corrected the PowerShell quoting guidance. Terraform's current command-line variable documentation recommends Windows Command Prompt instead of PowerShell when passing literal quotes to Terraform, so the PowerShell complex-type example was replaced with that caveat.
- Corrected the command coverage for `-var`. The current `terraform console` command reference does not document `-var`, so the console example was removed and the command list was narrowed to planning/apply commands and `terraform import`.
- Corrected `-var` and `-var-file` precedence. Terraform processes command-line `-var` and `-var-file` options in the order provided, so the text now explains that later options override earlier options for the same variable.
- Corrected the final precedence statement. Command-line variable options have higher precedence than environment variables, while `TF_VAR_*` environment variables are checked after automatically loaded tfvars files.
- Tightened the secrets guidance. Terraform does not provide native "encrypted variable files" as a standard input mechanism, so the recommendation now points to CI/CD secret stores injecting `TF_VAR_*` values or HCP Terraform sensitive variables.

## Review Notes
The remaining Terraform examples use valid `-var` syntax for primitive and complex input variable values, and the HCL variable declarations and `.tfvars` examples are syntactically correct. The post could later mention that Terraform recommends `-var-file` for complex values to avoid shell escaping problems, but it already communicates that point in the Objects section.
