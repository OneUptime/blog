# Validation Summary: OpenTofu vs Ansible: Infrastructure Provisioning vs Configuration Management

## Status
validated

## Post Type
Comparison guide / Reference

## Technologies Covered
- OpenTofu (HCL, `tofu` CLI, `aws_instance`, `local_file`, `templatefile`)
- Ansible (playbooks, `apt`, `copy`, `service` modules, inventories, `ansible-playbook`)
- Packer (HCL2 build blocks, `ansible` provisioner)
- AWS resources (EC2, AMIs, subnets, key pairs)

## Sources Consulted
- OpenTofu LICENSE file: https://github.com/opentofu/opentofu/blob/main/LICENSE
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu Registry API (provider count): https://api.opentofu.org/registry/docs/providers/index.json
- Ansible COPYING file: https://github.com/ansible/ansible/blob/devel/COPYING
- Ansible check mode docs: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_checkmode.html
- Packer Ansible provisioner docs: https://developer.hashicorp.com/packer/integrations/hashicorp/ansible/latest/components/provisioner/ansible

## Issues Found
- **Drift detection command for Ansible**: The comparison matrix listed `ansible --check`. While the ad-hoc `ansible` CLI does accept `-C/--check`, the documented and idiomatic command for running a playbook in check mode (which is what "drift detection" means in practice) is `ansible-playbook --check`. Updated the table accordingly.

## Review Notes
- Ansible's SPDX identifier is `GPL-3.0-or-later`. The post's "GPL 3.0" is a common shorthand and acceptable; left as-is to preserve the author's tone.
- The OpenTofu provider count claim of "3,000+ providers" is conservative — the Registry currently lists ~4,450 providers. The claim remains technically correct, but a future refresh could bump it to "4,000+".
- The Packer `ansible` provisioner block uses `playbook_file`, which matches the official required argument name.
- The `local_file` resource and `templatefile` syntax (`%{ for ip in web_servers ~}...%{ endfor ~}`) are valid OpenTofu/HCL.
- The OpenTofu HCL examples (`aws_instance`, `data.aws_ami`, outputs) are syntactically correct.
- The Ansible YAML playbook structure (`hosts`, `become`, `tasks`, `apt`/`copy`/`service` modules) is correct.
