# Validation Summary: How to Pass OpenTofu Outputs to Ansible Inventory

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- OpenTofu (output blocks, templatefile, jsonencode, for-expressions, splat expressions)
- HCL2 template syntax (`%{ for ... }` directives, `${...}` interpolation)
- Ansible (static inventory in INI and JSON/YAML formats, `ansible-inventory`, `ansible-playbook`, `[group:vars]`)
- AWS provider resources: `aws_instance`, `aws_db_instance`, `aws_elasticache_replication_group`
- Bash scripting for CI/CD glue
- GNU Make

## Sources Consulted
- OpenTofu output values and templatefile docs: https://opentofu.org/docs/language/values/outputs/ and https://opentofu.org/docs/language/functions/templatefile/
- OpenTofu CLI reference for `tofu output -raw`: https://opentofu.org/docs/cli/commands/output/
- Ansible YAML inventory plugin (confirms `.json` is in default `yaml_extensions`): https://docs.ansible.com/ansible/latest/collections/ansible/builtin/yaml_inventory.html and `lib/ansible/plugins/inventory/yaml.py` in ansible/ansible
- Ansible static inventory how-to: https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html
- Terraform AWS provider — `aws_db_instance.endpoint` (returns `address:port`): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance#endpoint
- Terraform AWS provider — `aws_elasticache_replication_group.primary_endpoint_address`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group#primary_endpoint_address

## Issues Found
No technical issues found.

I specifically verified two claims I was uncertain about:

1. **Ansible accepts `.json`-extension files as static inventory** — Confirmed. Ansible's built-in YAML inventory plugin defaults `yaml_extensions` to `['.yaml', '.yml', '.json']`, and PyYAML parses JSON natively (JSON is a subset of YAML 1.2). So `ansible-inventory -i inventory/hosts.json --list` works with the structure shown.
2. **AWS provider attributes** — Both `aws_db_instance.main.endpoint` and `aws_elasticache_replication_group.main.primary_endpoint_address` are correct attribute names per the Terraform AWS provider registry docs.

The HCL `for`/object-expression syntax, splat expression `aws_instance.web[*]`, template directive syntax (`%{ for ... ~}` / `%{ endfor ~}`), `jsonencode` usage, `tofu output -raw <name>` flag, INI `[group:vars]` semantics, and Makefile recipe structure are all syntactically and semantically correct.

## Review Notes
- `aws_db_instance.<name>.endpoint` returns `address:port`, not just the hostname. The post does not misrepresent this — it just exports the value as `db_endpoint` and passes it through — but readers who want a hostname-only value should use `.address` instead. Worth a one-line clarification in a future revision but not a correctness defect.
- `sensitive = false` on the `db_endpoint` output is redundant (it's the default) but not incorrect.
- The unused index variable `i` in `for i, instance in aws_instance.web` is valid HCL but slightly noisy; a future cleanup could use `for instance in aws_instance.web` since `i` is never referenced.
- Static JSON inventory works with the built-in YAML plugin today, but this is implementation-dependent — if Ansible ever tightens the default `yaml_extensions`, readers would need to rename to `.yml` or use a dynamic inventory script. Low risk, but a caveat worth knowing.
