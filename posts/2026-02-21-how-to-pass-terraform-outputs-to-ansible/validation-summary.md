# Validation Summary: How to Pass Terraform Outputs to Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform output values
- Terraform state JSON
- Ansible playbooks
- Ansible group_vars
- Ansible dynamic inventory scripts
- Ansible lookup plugins
- Consul KV

## Sources Consulted
- Terraform output command: https://developer.hashicorp.com/terraform/cli/commands/output
- Terraform show command: https://developer.hashicorp.com/terraform/cli/commands/show
- Ansible inventory and group_vars documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible dynamic inventory script documentation: https://docs.ansible.com/projects/ansible-core/2.17/dev_guide/developing_inventory.html
- Ansible run_once behavior: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_strategies.html
- Ansible include_vars module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible set_fact module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible pipe lookup plugin: https://docs.ansible.com/projects/ansible-core/2.13/collections/ansible/builtin/pipe_lookup.html
- Ansible community.general.consul_kv lookup plugin: https://docs.ansible.com/projects/ansible/latest/collections/community/general/consul_kv_lookup.html
- Terraform Consul provider consul_keys resource: https://registry.terraform.io/providers/hashicorp/consul/latest/docs/resources/keys

## Issues Found
- The Mermaid diagram listed "Terraform Provider for Ansible" and "Consul/Vault", but the post's methods cover the Ansible pipe lookup plugin and Consul. Updated the diagram labels to match the actual methods.
- The shared state store method was titled "Consul or SSM" and the comparison table listed "Consul/SSM", but the code only demonstrates Consul. Updated those labels to "Consul" to avoid implying an SSM example is present.
- The dynamic inventory script created an "ungrouped" group only when needed and did not include it under "all". Ansible's dynamic inventory guidance says inventory scripts should include an "ungrouped" group for hosts not in other groups. Added "ungrouped" to the initial inventory and to the "all" children list.

## Review Notes
- Terraform was not installed in the workspace, so Terraform CLI behavior was verified against official HashiCorp documentation rather than local `terraform --help` output.
- Ansible was not installed in the workspace, so Ansible module and lookup behavior was verified against official Ansible documentation rather than local `ansible-doc` output.
- The Terraform `-json` and `-raw` output modes display sensitive outputs in plain text. The examples remain technically correct, but production use should account for secret handling.
