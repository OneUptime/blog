# Validation Summary: How to Use Ansible After Terraform for Configuration Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI and outputs
- Terraform AWS provider resources
- Ansible dynamic inventory
- Ansible playbooks and roles
- Ansible built-in modules
- Ansible configuration
- Python JSON scripting
- AWS EC2, RDS, ElastiCache, S3, and Load Balancing

## Sources Consulted
- Terraform CLI `output` command reference: https://developer.hashicorp.com/terraform/cli/commands/output
- Terraform output values tutorial: https://developer.hashicorp.com/terraform/tutorials/configuration-language/outputs
- Terraform AWS provider `aws_elasticache_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_cluster
- Ansible dynamic inventory development documentation: https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_inventory.html
- Ansible `ansible.builtin.import_playbook` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_playbook_module.html
- Ansible `ansible.builtin.wait_for_connection` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/wait_for_connection_module.html
- Ansible `ansible.builtin.wait_for` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible `ansible.builtin.apt` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.posix.sysctl` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/sysctl_module.html
- Ansible `ansible.builtin.service_facts` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible `ansible.builtin.env` lookup documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/env_lookup.html
- Ansible configuration settings reference: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html

## Issues Found
- The Terraform output export command wrote to `../ansible/group_vars/all/terraform.json`, but the inventory script reads `terraform/outputs.json`. Changed the command to `terraform output -json > outputs.json` so the generated file matches the script.
- The dynamic inventory placed shared Terraform outputs directly under `all.vars`, while later playbooks referenced `shared_resources.rds_endpoint` and `shared_resources.redis_endpoint`. Changed the inventory generator to expose `shared_resources` as a nested variable.
- The dynamic inventory did not list generated groups under `all.children`. Added each generated group to `all.children`, matching Ansible's documented dynamic inventory structure.
- The `site.yml` example used `ansible.builtin.import_playbook` alongside `name` as if it were a normal play. Changed the example to top-level playbook imports, which is the documented usage.
- The `APP_VERSION` expression used `default('latest')`, but Ansible's environment lookup returns an empty string for an unset variable. Changed it to `default('latest', true)` so the fallback is actually used.
- The `ansible.cfg` snippet was marked with a YAML code fence. Changed the fence to `ini` to match Ansible configuration file syntax.

## Review Notes
The examples are illustrative and assume Ubuntu-style SSH users, Debian-family package management, existing Ansible roles, and reachable private addresses for app and database hosts. The `ansible.posix.sysctl` task requires the `ansible.posix` collection to be available.
