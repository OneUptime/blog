# Validation Summary: How to Use Template Directives in OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- HCL string templates
- Template directives (`%{if}`, `%{for}`)
- OpenTofu `templatefile()` function
- AWS provider `aws_instance` user data
- cloud-init
- YAML
- Shell scripts
- nginx configuration

## Sources Consulted
- OpenTofu Strings and Templates documentation: https://opentofu.org/docs/language/expressions/strings/
- OpenTofu `templatefile()` function documentation: https://opentofu.org/docs/language/functions/templatefile/
- OpenTofu Conditional Expressions documentation: https://opentofu.org/docs/language/expressions/conditionals/
- HashiCorp AWS provider `aws_instance` resource documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- cloud-init package update and package install examples: https://docs.cloud-init.io/en/latest/reference/yaml_examples/package_update_upgrade.html
- cloud-init `runcmd` examples: https://docs.cloud-init.io/en/latest/reference/yaml_examples/boot_cmds.html

## Issues Found
- The whitespace stripping example used `%{~for ...~}` and `%{~endfor~}`. A leading strip marker before `for` can consume the newline before the directive, which can concatenate `enabled_features:` with the first list item. Changed the example to `%{for feature in var.features~}` and `%{endfor~}` so the directive-line newlines are stripped while preserving the intended YAML line break.
- The inline string example said template directives work in regular strings, but the code used only interpolation with a conditional expression. Changed the example to use `%{if var.is_private}private%{else}public%{endif}` so it demonstrates an actual template directive.

## Review Notes
- The remaining OpenTofu template directive, interpolation, indented heredoc, `for` with index/key, and `templatefile()` claims match the official OpenTofu documentation.
- OpenTofu's current docs recommend `*.tftpl` for template file names because editors can recognize them better. The post's `.tpl` example is still valid because OpenTofu does not require a specific extension.
- `tofu` and `terraform` were not installed in the local workspace, so validation was performed against official documentation rather than by running `tofu validate`.
