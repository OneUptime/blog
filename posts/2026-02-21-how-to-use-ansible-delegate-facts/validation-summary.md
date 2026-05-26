# Validation Summary: How to Use Ansible delegate_facts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible task delegation with `delegate_to`
- Ansible delegated facts with `delegate_facts`
- `ansible.builtin.setup`
- `ansible.builtin.set_fact`
- `ansible.builtin.template`
- `ansible.builtin.uri`
- `ansible.builtin.shell`
- `ansible.builtin.systemd`
- AWS Ansible collections for RDS and ElastiCache
- HAProxy configuration templating

## Sources Consulted
- Ansible documentation: Controlling where tasks run: delegation and local actions - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible documentation: `ansible.builtin.setup` module - https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/setup_module.html
- Ansible documentation: `ansible.builtin.set_fact` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible documentation: Discovering variables: facts and magic variables - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible documentation: `amazon.aws.rds_instance_info` module - https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/rds_instance_info_module.html
- Ansible documentation: `community.aws.elasticache_info` module - https://docs.ansible.com/projects/ansible/latest/collections/community/aws/elasticache_info_module.html

## Issues Found
- The optional database replica expression indexed `groups['databases'][1]` before applying `default('none')`, which could fail when there is only one database host. Changed it to check the group length before reading the second host.
- The delegated `set_fact` example wrote accumulated data to one delegated monitoring host from multiple appserver task contexts. Ansible documentation notes delegated tasks still run in parallel unless controlled, so this can lose updates. Added `throttle: 1` to serialize that delegated fact update.
- The cloud example used `amazon.aws.elasticache_info`, but the current documented ElastiCache info module is `community.aws.elasticache_info`. Updated the fully qualified collection name.
- A comment said `delegate_facts` only affects `ansible_*` facts from the setup module, but the article also correctly demonstrates delegated `set_fact`. Updated the comment to clarify that `delegate_facts` affects assigned facts, not registered variables.

## Review Notes
- The central explanation of `delegate_facts: true` is accurate: by default, delegated gathered facts are assigned to the current `inventory_hostname`; setting `delegate_facts: true` assigns them to the delegated host.
- Ansible documentation warns that delegating to a host not present in inventory does not add it to inventory. The examples assume hosts such as `db.example.com` and `monitor.example.com` are valid inventory hosts or otherwise resolvable through inventory handling.
- `ansible-playbook` is not installed in this workspace, so examples were reviewed against official documentation rather than executed locally.
