# Validation Summary: How to Use Ansible add_host to Add Hosts Dynamically

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- ansible.builtin.add_host
- Dynamic in-memory inventory
- ansible.builtin.wait_for
- ansible.builtin.uri
- amazon.aws.ec2_instance
- Ansible delegation
- Ansible vars plugins

## Sources Consulted
- Ansible official documentation: ansible.builtin.add_host module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/add_host_module.html
- Ansible official documentation: ansible.builtin.wait_for module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible official documentation: ansible.builtin.host_group_vars vars plugin, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/host_group_vars_vars.html
- Ansible official documentation: delegation and local actions, https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible official documentation: amazon.aws.ec2_instance module, https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_module.html

## Issues Found
- The delegation section implied that `delegate_to` should be applied directly with `add_host` as the main pattern. Official Ansible documentation describes `add_host` as a controller-side inventory action that bypasses the play host loop, while delegation applies to where tasks run. I changed the example so the discovery command is delegated to the load balancer and the registered results are then passed to `add_host`.
- The common mistakes section stated that `add_host` bypasses normal inventory plugin processing and that `group_vars` and `host_vars` will not automatically apply. Official vars plugin documentation is more nuanced: `host_group_vars` loads variables from corresponding directories, and its behavior depends on inventory source paths and vars plugin timing. I replaced the absolute claim with guidance to pass critical connection variables directly through `add_host`.

## Review Notes
- The remaining examples use current Ansible FQCNs and align with the official `add_host` behavior of creating in-memory inventory entries for later plays.
- The `amazon.aws.ec2_instance` example uses placeholder AWS IDs and assumes the amazon.aws collection plus supported boto3 and botocore versions are installed.
- Dynamically added hosts still need to match any `ansible-playbook --limit` value before they are available as play targets.
