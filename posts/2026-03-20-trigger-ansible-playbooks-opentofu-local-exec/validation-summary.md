# Validation Summary: How to Trigger Ansible Playbooks from OpenTofu local-exec

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu `local-exec` provisioner
- OpenTofu `remote-exec` provisioner
- OpenTofu `terraform_data` resource
- Ansible / `ansible-playbook`
- AWS provider resources

## Sources Consulted
- OpenTofu `local-exec` provisioner documentation: https://opentofu.org/docs/language/resources/provisioners/local-exec/
- OpenTofu provisioner syntax, destroy-time provisioners, `self`, and `on_failure`: https://opentofu.org/docs/language/resources/provisioners/syntax/
- OpenTofu provisioner connection settings: https://opentofu.org/docs/language/resources/provisioners/connection/
- OpenTofu `remote-exec` provisioner documentation: https://opentofu.org/docs/language/resources/provisioners/remote-exec/
- OpenTofu provisioners without a resource: https://opentofu.org/docs/language/resources/provisioners/null_resource/
- OpenTofu `terraform_data` managed resource documentation: https://opentofu.org/docs/language/resources/tf-data/
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible inventory documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible configuration settings for `ANSIBLE_HOST_KEY_CHECKING`: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- HashiCorp AWS provider `aws_instance` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- HashiCorp AWS provider `aws_db_instance` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- HashiCorp AWS provider `aws_elasticache_replication_group` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/elasticache_replication_group.html.markdown
- HashiCorp AWS provider `aws_lb_target_group` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb_target_group.html.markdown

## Issues Found
- The description said `local-exec` can trigger Ansible after resources are created or modified. OpenTofu creation-time provisioners run on creation, not ordinary updates, so this was changed to created or replaced.
- The examples used the older `null_resource` + `triggers` pattern. Current OpenTofu documentation recommends `terraform_data` for provisioners without another logical resource, so the examples now use `terraform_data` and `triggers_replace`.
- The `configure_app` example passed several values to Ansible but only included some of them in the rerun trigger set. Added the remaining passed values to `triggers_replace` so changes to those inputs cause Ansible to rerun.
- The destroy-time provisioner example used `self.triggers`, which applies to `null_resource`. Updated it for `terraform_data` by storing destroy-time values in `input` and referencing `self.output`.
- The section heading used `when = "destroy"`, while OpenTofu documents `when = destroy` as the keyword form. Updated the heading to match the documented syntax.
- The conclusion referred to the `local-exec` + `null_resource` pattern and the `triggers` map. Updated it to `terraform_data` and `triggers_replace`.

## Review Notes
The Ansible command flags shown (`-i`, `--private-key`, `-u`, and `--extra-vars` / `-e`) match current Ansible documentation. The inline inventory examples are valid because Ansible accepts a comma-separated host list for `-i`. OpenTofu documentation still recommends provisioners only as a last resort; the post already frames this pattern as appropriate for tightly coupled initial bootstrapping.
