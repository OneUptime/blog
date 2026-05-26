# Validation Summary: How to Use Ansible to Manage Vultr Instances

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible-core
- Ansible Galaxy collections
- Vultr Cloud
- Vultr Ansible collection (`vultr.cloud`)
- Vultr instances, SSH keys, firewall groups, block storage, startup scripts, snapshots, and VPC 2.0

## Sources Consulted
- Ansible `vultr.cloud` collection index: https://docs.ansible.com/projects/ansible/latest/collections/vultr/cloud/index.html
- Ansible `vultr.cloud.instance` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vultr/cloud/instance_module.html
- Ansible `vultr.cloud.ssh_key` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vultr/cloud/ssh_key_module.html
- Ansible `vultr.cloud.firewall_group` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vultr/cloud/firewall_group_module.html
- Ansible `vultr.cloud.firewall_rule` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vultr/cloud/firewall_rule_module.html
- Ansible `vultr.cloud.block_storage` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vultr/cloud/block_storage_module.html
- Ansible `vultr.cloud.startup_script` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vultr/cloud/startup_script_module.html
- Ansible `vultr.cloud.snapshot` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vultr/cloud/snapshot_module.html
- Ansible `vultr.cloud.vpc2` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vultr/cloud/vpc2_module.html
- Vultr API rate limit documentation: https://docs.vultr.com/support/platform/api/what-rate-limits-apply-to-the-vultr-api
- Vultr API reference: https://www.vultr.com/api/

## Issues Found
- The prerequisite listed Ansible 2.12+, but the current `vultr.cloud` collection documentation states support for ansible-core 2.11 or newer. Changed the prerequisite to `ansible-core 2.11+`.
- Firewall rules used `group` with firewall group IDs and included `action: accept`. The current `vultr.cloud.firewall_rule` module expects the firewall group name/description for `group`, and `action` is a return field rather than an input parameter. Updated the examples to use the firewall group descriptions and removed `action`.
- The block storage attachment example used `attached_to_instance: db-01`, but the module expects the server instance ID. Added a `db_instance_id` variable and used it for attachment. Also added the required present-state block storage parameters to the attachment task.
- The startup script instance example used `script_id`, but the current `vultr.cloud.instance` parameter is `startup_script`. Updated the parameter name.
- The VPC instance example used `vpc`, but the current `vultr.cloud.instance` parameter is `vpcs`, and the module documents VPC assignment by description. Updated the example accordingly.
- The teardown playbook deleted instances without `region`, but the `vultr.cloud.instance` module requires `region`. Added `region: ewr` to the deletion task.
- The API rate limit note said Vultr allows 3 requests per second. Current Vultr documentation says the API may return HTTP 429 above 30 requests per second from an originating IP address. Updated the rate limit statement.

## Review Notes
Local `ansible` and `ansible-galaxy` executables were not installed in the review environment, so command help and playbook execution could not be run locally. The review was performed against current official Ansible collection documentation and Vultr API documentation.
