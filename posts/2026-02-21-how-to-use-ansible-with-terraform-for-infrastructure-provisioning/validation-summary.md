# Validation Summary: How to Use Ansible with Terraform for Infrastructure Provisioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Ansible
- AWS EC2, RDS, Elasticache, and Load Balancing resources through Terraform examples
- GitHub Actions
- Python dynamic inventory scripts
- Infrastructure as Code workflows

## Sources Consulted
- Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- Terraform `terraform_data` migration guide for `null_resource`: https://registry.terraform.io/providers/hashicorp/null/latest/docs/guides/terraform-migration
- Terraform `terraform output` command reference: https://developer.hashicorp.com/terraform/cli/commands/output
- Terraform `templatefile` function documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile
- Terraform `local_file` resource documentation: https://registry.terraform.io/providers/hashicorp/local/latest/docs/resources/file
- Terraform AWS provider `aws_elasticache_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_cluster
- Ansible dynamic inventory documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_dynamic_inventory.html
- Ansible inventory script development documentation: https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_inventory.html
- Ansible `slurp` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/slurp_module.html
- Ansible playbook strategy and `run_once` documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_strategies.html
- Ansible `amazon.aws.aws_ec2` inventory plugin documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- HashiCorp `setup-terraform` GitHub Action documentation: https://github.com/marketplace/actions/hashicorp-setup-terraform

## Issues Found
- The Terraform local execution example used `null_resource` with `triggers`. Terraform 1.4 and later provide the built-in `terraform_data` resource as the recommended replacement for new configurations, so the example was updated to use `terraform_data` with `triggers_replace`.
- The dynamic inventory section said it queried Terraform state directly and the Python docstring said it read `terraform.tfstate`, but the script actually runs `terraform output -json`. The wording and docstring were corrected to describe Terraform outputs accurately.
- The Python dynamic inventory script did not check whether `terraform output -json` succeeded before parsing stdout. `check=True` was added so command failures are surfaced instead of producing a JSON parsing failure from empty or invalid output.
- The Ansible playbook example read Terraform outputs from `{{ playbook_dir }}/../terraform/terraform_outputs.json`, which does not match the earlier exported file location under the Ansible directory. The path was corrected to `{{ playbook_dir }}/../terraform_outputs.json`.
- The Ansible output-loading pre-task runs on localhost while the play has `become: true`. `become: false` was added to the localhost tasks to avoid unnecessarily escalating local file reads and facts.

## Review Notes
- Ansible inventory scripts are still supported, but current Ansible documentation recommends inventory plugins for new dynamic inventory work where practical.
- The GitHub Actions example uses Terraform 1.7.0, which is compatible with the `terraform_data` example. Teams may still want to pin a newer supported Terraform release in real production workflows.
