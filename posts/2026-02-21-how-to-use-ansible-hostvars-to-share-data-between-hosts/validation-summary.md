# Validation Summary: How to Use Ansible hostvars to Share Data Between Hosts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible magic variables (`hostvars`, `groups`)
- Ansible facts and fact gathering
- Ansible registered variables and `set_fact`
- Jinja2 templates and filters
- Dynamic inventory, including AWS EC2 inventory groups
- HAProxy configuration templating

## Sources Consulted
- Ansible Community Documentation: Discovering variables, facts, and magic variables - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible Community Documentation: Using variables and variable scope - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible Community Documentation: Special variables - https://docs.ansible.com/ansible/latest/reference_appendices/special_variables.html
- Ansible Community Documentation: `ansible.builtin.extract` filter - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/extract_filter.html
- Ansible Community Documentation: AWS EC2 dynamic inventory plugin - https://docs.ansible.com/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- Ansible Community Documentation: AWS EC2 dynamic inventory guide - https://docs.ansible.com/ansible/latest/collections/amazon/aws/docsite/aws_ec2_guide.html

## Issues Found
- The post used legacy top-level injected fact names such as `ansible_default_ipv4` and `ansible_os_family` in `hostvars`. These work only when fact injection is enabled. Updated the examples to use the currently documented `ansible_facts` structure, such as `hostvars['db-01']['ansible_facts']['default_ipv4']['address']`, which is the more accurate and portable form.
- The explanation said `hostvars` contains facts only after facts have been gathered. Updated it to mention cached facts as well, matching the Ansible documentation.
- The introduction to `hostvars` said each entry contains variables set during the play. Clarified that `hostvars` maps host-level variables, such as inventory variables, gathered facts, registered task outputs, and `set_fact` values, because play-level variables are not host-specific and are not mapped into `hostvars`.
- The AWS dynamic inventory example used the group `tag_Role_app` without noting that this group must be created by the inventory plugin's keyed group configuration. Updated the comment to make that assumption explicit.

## Review Notes
Ansible was not installed in the local workspace, so `ansible-playbook --syntax-check` could not be run. The snippets were reviewed against official Ansible documentation for current variable, fact, filter, and dynamic inventory behavior.
