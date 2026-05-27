# Validation Summary: How to Generate Ansible Dynamic Inventory from Terraform State

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible dynamic inventory scripts
- Terraform state JSON output
- Python subprocess and JSON parsing
- AWS EC2 Terraform resources
- Ansible playbooks and modules
- `terraform-inventory`

## Sources Consulted
- Ansible dynamic inventory development documentation: https://docs.ansible.com/projects/ansible-core/2.17/dev_guide/developing_inventory.html
- Ansible `ansible-inventory` CLI documentation: https://docs.ansible.com/projects/ansible-core/devel/cli/ansible-inventory.html
- Terraform `show` command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `ansible.builtin.setup` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- `terraform-inventory` project documentation: https://github.com/adammck/terraform-inventory

## Issues Found
- The Python inventory script only scanned `state["values"]["root_module"]["resources"]`, which misses resources declared in Terraform child modules. Terraform's documented JSON values representation nests module resources recursively under `child_modules`, so I added an `iter_resources()` helper and changed the loop to walk the full module tree.
- The Python inventory script used `values.get('public_ip', values.get('private_ip'))`, which does not fall back to `private_ip` when `public_ip` exists with a null value. I changed this to `values.get('public_ip') or values.get('private_ip')`.
- The dynamic inventory object omitted the `ungrouped` group and did not add discovered hosts to `all.hosts`. Ansible's inventory script documentation says replacement inventory scripts should return an `all` group and an `ungrouped` group, so I added `ungrouped` and populated `all.hosts`.
- The Terraform subprocess call did not check the `terraform show -json` exit status before parsing stdout. I added `check=True` so Terraform command failures are surfaced instead of attempting to decode empty or invalid output.
- The provisioning example used `ansible.builtin.timezone`, but current Ansible documentation lists the timezone module as `community.general.timezone` and notes that it is not included in `ansible-core`. I updated the task to use `community.general.timezone`.

## Review Notes
Ansible and Terraform CLIs are not installed in this workspace, so I could not run `terraform show`, `ansible-inventory`, or `ansible-playbook --syntax-check` locally. I verified the embedded Python inventory script with Python AST parsing. The examples using `community.general.timezone` and `community.general.ufw` require the `community.general` collection and the relevant target-host utilities such as `ufw` and timezone tooling.
