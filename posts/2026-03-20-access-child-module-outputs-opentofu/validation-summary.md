# Validation Summary: How to Access Child Module Outputs in OpenTofu - Opentofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu modules and outputs
- AWS provider resources (`aws_eks_cluster`, `aws_security_group`)

## Sources Consulted
- OpenTofu Docs: Output Values - https://opentofu.org/docs/language/values/outputs/
- OpenTofu Docs: Module Blocks - https://opentofu.org/docs/language/modules/syntax/
- OpenTofu Docs: Command: output - https://opentofu.org/docs/cli/commands/output/
- OpenTofu Docs: Command: console - https://opentofu.org/docs/cli/commands/console/
- OpenTofu Docs: Creating Modules - https://opentofu.org/docs/language/modules/develop/
- Terraform Registry: `aws_eks_cluster` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster
- Terraform Registry: `aws_security_group` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group

## Issues Found
- The `aws_eks_cluster` example was missing the required `role_arn` argument. I added `role_arn = aws_iam_role.eks_cluster.arn` so the resource block matches the current AWS provider schema.
- The `tofu output` section incorrectly said the command shows "all outputs including module outputs." OpenTofu's `tofu output` command only returns root module outputs, so I corrected the section heading and comments.
- The JSON example was labeled as a way to get nested module outputs, but it only pretty-prints the root module outputs returned by `tofu output -json`. I corrected the description and turned it into a valid command example.

## Review Notes
- The post is technically correct after the fixes for standard module calls. If a module uses `count` or `for_each`, `module.<module_name>` becomes a collection rather than a single object, which changes how outputs are accessed.
- `tofu` was not installed in the workspace, so CLI verification was done against the current official OpenTofu documentation rather than local `--help` output.
