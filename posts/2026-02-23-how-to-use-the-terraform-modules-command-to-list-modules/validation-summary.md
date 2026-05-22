# Validation Summary: How to Use the terraform modules Command to List Modules

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform modules
- Terraform state
- Terraform graph output
- Terraform plan JSON UI output
- HCP Terraform / Terraform Enterprise module registry API
- Bash and Python scripting

## Sources Consulted
- HashiCorp Developer: `terraform modules` command reference, https://developer.hashicorp.com/terraform/cli/commands/modules
- HashiCorp Developer: Terraform CLI overview, https://developer.hashicorp.com/terraform/cli/commands
- HashiCorp Developer: `terraform providers` command reference, https://developer.hashicorp.com/terraform/cli/commands/providers
- HashiCorp Developer: `terraform graph` command reference, https://developer.hashicorp.com/terraform/cli/commands/graph
- HashiCorp Developer: `terraform state list` command reference, https://developer.hashicorp.com/terraform/cli/commands/state/list
- HashiCorp Developer: `terraform state show` command reference, https://developer.hashicorp.com/terraform/cli/commands/state/show
- HashiCorp Developer: `terraform plan` command reference, https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Developer: Machine-readable UI output reference, https://developer.hashicorp.com/terraform/internals/machine-readable-ui
- HashiCorp Developer: Dependency lock file reference, https://developer.hashicorp.com/terraform/language/files/dependency-lock
- HashiCorp Developer: Module block reference, https://developer.hashicorp.com/terraform/language/block/module
- HashiCorp Developer: Registry modules API reference for Terraform Enterprise, https://developer.hashicorp.com/terraform/enterprise/api-docs/private-registry/modules
- HashiCorp Developer: Terraform Registry API reference, https://developer.hashicorp.com/terraform/registry/api-docs

## Issues Found
- The post stated that Terraform does not have a single command to list modules. This is outdated for Terraform v1.10.0 and later, which includes `terraform modules`. I updated the introduction, first section, and conclusion to describe `terraform modules` and `terraform modules -json`.
- The post led with `.terraform/modules/modules.json` as the most direct option. I changed this to the current `terraform modules` command and kept `modules.json` as an installed-module manifest available after initialization.
- The `terraform graph` section said the graph includes all modules and showed a filtered DOT file named `modules-only.dot`. Terraform graph primarily represents resource and data dependency ordering, and grepping graph output does not create a valid standalone DOT graph. I clarified the wording and changed the filtered output file to `module-addresses.txt`.
- The post claimed registry module versions are tracked in `.terraform.lock.hcl`. Terraform's dependency lock file currently tracks only provider dependencies, not remote module version selections. I corrected this to recommend the module `version` argument and `terraform modules -json`.
- The HCP Terraform module version API example used an invalid `/api/v2/organizations/.../registry-modules/private/...` path for a specific module. I changed it to the documented private registry endpoint `/api/registry/v1/modules/:namespace/:name/:provider/versions`.

## Review Notes
Terraform is not installed in this workspace, so CLI behavior was validated against current official HashiCorp Developer documentation rather than local `terraform -help` output.
