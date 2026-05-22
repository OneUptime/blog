# Validation Summary: How to Use the indent Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform string functions
- Terraform heredoc strings and templates
- YAML
- JSON
- Kubernetes manifests
- cloud-init
- Nginx configuration

## Sources Consulted
- Terraform `indent` function documentation: https://developer.hashicorp.com/terraform/language/functions/indent
- Terraform strings and templates documentation: https://developer.hashicorp.com/terraform/language/expressions/strings
- Terraform `chomp` function documentation: https://developer.hashicorp.com/terraform/language/functions/chomp
- Terraform `templatefile` function documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile
- Terraform `yamlencode` function documentation: https://developer.hashicorp.com/terraform/language/functions/yamlencode
- Kubernetes API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/
- cloud-init `runcmd` documentation: https://docs.cloud-init.io/en/latest/reference/yaml_examples/boot_cmds.html
- Nginx upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html

## Issues Found
- The YAML labels example used `indent(8, local.labels_yaml)` even though the interpolation line already provides the indentation for the first rendered line. Changed it to `indent(4, local.labels_yaml)` so all generated label lines align under `labels:`.
- The JSON-in-YAML block scalar example used `indent(8, local.app_config)`. Changed it to `indent(4, local.app_config)` so any multi-line content would align with the first rendered line.
- The cloud-init block scalar example used `indent(8, chomp(local.script_body))`, which would add extra leading spaces to every script line after the first. Changed it to `indent(4, chomp(local.script_body))`.
- The Kubernetes `ports` example used `indent(16, local.ports_yaml)`, which would over-indent subsequent `containerPort` and list item lines. Changed it to `indent(12, local.ports_yaml)` to match the literal indentation before the interpolation.
- The Nginx upstream example used `indent(8, local.upstream_entries)`, which would make later `server` lines more indented than the first. Changed it to `indent(4, local.upstream_entries)`.
- The dynamic rules example used `indent(6, chomp(local.all_rules))`, which would over-indent lines after the first rule line relative to the containing `config` block. Changed it to `indent(2, chomp(local.all_rules))`.
- The "all lines indented" mistake example prepended a newline outside the `indent` call, which would not indent the first visible line. Changed it to pass the leading newline inside the `indent` input string.

## Review Notes
Terraform's official documentation recommends `jsonencode` or `yamlencode` for generating complete JSON or YAML documents, because they avoid manual escaping and indentation mistakes. The post's manual YAML examples are acceptable for demonstrating `indent`, but future posts should mention `yamlencode` as the preferred approach for complete structured documents.
