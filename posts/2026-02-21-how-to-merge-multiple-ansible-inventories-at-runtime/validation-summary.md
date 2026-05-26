# Validation Summary: How to Merge Multiple Ansible Inventories at Runtime

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Ansible inventory
- Static inventory files
- Dynamic inventory scripts
- Ansible inventory plugins
- amazon.aws.aws_ec2 inventory plugin
- ansible.builtin.constructed inventory plugin
- ansible.cfg inventory configuration
- group_vars and host_vars

## Sources Consulted
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- ansible-inventory CLI documentation: https://docs.ansible.com/projects/ansible-core/devel/cli/ansible-inventory.html
- ansible CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- ansible.builtin.constructed inventory plugin documentation: https://docs.ansible.com/projects/ansible/12/collections/ansible/builtin/constructed_inventory.html
- ansible.builtin.script inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/script_inventory.html
- amazon.aws.aws_ec2 inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- Local ansible-core 2.21.0 CLI help and inventory behavior checks

## Issues Found
- The `ansible.cfg` example showed two active `inventory` settings in the same `[defaults]` section even though they were intended as alternatives. I commented out the directory-based alternative so the snippet is a valid single-choice configuration example.
- The multiple-directory `group_vars` example said each directory's `webservers.yml` applied only to that inventory's webservers. In Ansible, `group_vars` files are loaded relative to inventory sources and merged by group name, so a later `webservers.yml` can affect the merged `webservers` group. I updated the comments and command note to describe this correctly.

## Review Notes
- The post is technically relevant and the remaining examples align with current Ansible documentation for multiple `-i` sources, inventory directories, inventory load order, variable overwrite behavior, dynamic inventory scripts, and the constructed and AWS EC2 inventory plugins.
- The local system initially did not have Ansible available on `PATH`, so I installed ansible-core 2.21.0 with `pip --user` to verify CLI availability and the `group_vars` merge behavior.
