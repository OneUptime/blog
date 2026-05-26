# Validation Summary: How to Use Ansible Delegation for Inventory Updates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible task delegation with `delegate_to`
- Ansible delegated facts with `delegate_facts`
- Static INI and YAML inventory files
- Host and group variable files
- Ansible inventory plugins for cloud providers
- Amazon AWS EC2 Ansible collection

## Sources Consulted
- Ansible delegation and local actions documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible implicit localhost documentation: https://docs.ansible.com/ansible/latest/inventory/implicit_localhost.html
- `ansible.builtin.add_host` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/add_host_module.html
- `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- `ansible.builtin.package` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html
- `ansible.builtin.setup` module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/setup_module.html
- `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- `ansible.builtin.known_hosts` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/known_hosts_module.html
- `amazon.aws.ec2_instance` module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- `amazon.aws.aws_ec2` inventory plugin documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- Ansible inventory plugins documentation: https://docs.ansible.com/projects/ansible-core/devel/plugins/inventory.html

## Issues Found
- The newly provisioned EC2 host example used `ansible_user: ec2-user` but installed nginx with `ansible.builtin.apt`, which only works on apt-based systems. Changed the task to use `ansible.builtin.package`, the generic package module documented for cross-platform package installation.
- The `delegate_facts` example used `delegate_facts: true` on an `ansible.builtin.command` task. Ansible documents `delegate_facts` for assigning gathered facts from delegated fact-gathering tasks, so the original example did not demonstrate the feature correctly. Changed the example to gather network facts from the load balancer with `ansible.builtin.setup`, assign them to the delegated host, and read the delegated host's address from `hostvars`.

## Review Notes
- The post correctly notes that `add_host` adds hosts to Ansible's in-memory inventory for the current playbook run rather than persistently editing inventory files.
- The post correctly warns that delegated writes to the same file can race because delegation does not change Ansible's parallel execution behavior.
- For large cloud environments, the recommendation to prefer dynamic inventory plugins is technically sound. The exact plugin configuration varies by collection and provider version.
