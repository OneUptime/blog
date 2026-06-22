# Validation Summary: How to Fix 'No Hosts Matched' Errors in Ansible

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ansible playbooks
- Ansible static inventory in INI and YAML formats
- Ansible dynamic inventory scripts and inventory plugins
- Ansible host patterns, limits, and inventory inspection commands
- amazon.aws.aws_ec2 dynamic inventory plugin
- Bash CI validation script

## Sources Consulted
- Ansible documentation: Patterns: targeting hosts and groups - https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- Ansible documentation: How to build your inventory - https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible documentation: Working with dynamic inventory - https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_dynamic_inventory.html
- Ansible CLI documentation: ansible-inventory - https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html
- Ansible CLI documentation: ansible-playbook - https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible documentation: Special Variables - https://docs.ansible.com/projects/ansible/latest/reference_appendices/special_variables.html
- Ansible documentation: amazon.aws.aws_ec2 inventory plugin - https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- AWS CLI Command Reference: ec2 describe-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html

## Issues Found
- The conditional group membership YAML example defined `webservers` as a child of both `production` and `staging`. Ansible groups are global, so `staging-web1` became a member of `production`, making `production:&webservers` non-empty. Changed the example so `production` has a non-web host and `staging` has the `webservers` child group, which correctly demonstrates an empty intersection.
- The host pattern example `server[1:5]` was incorrect for matching hostnames `server1` through `server5`; bracket ranges are inventory host ranges, while pattern brackets are used for group position slicing. Replaced it with the wildcard pattern `server?`.
- The assert preflight example used `groups['webservers']`, which can fail with an undefined-key error if the group does not exist. Changed it to `groups.get('webservers', [])` so missing and empty groups are handled consistently.
- The `meta: end_play` example could not work for a zero-host play, because no tasks run when the play matches no hosts. Replaced it with a localhost preflight play that fails before the target play runs.
- The CI host count used `grep -c "hosts"`, which counts the `hosts (0):` header and warning text even when no hosts match. Replaced it with an `awk` extraction of the numeric count from the `--list-hosts` header and a default of zero.
- The AWS EC2 dynamic inventory example used the deprecated `tags` host variable in `keyed_groups`. Updated it to `ec2_tags`, which is the current field recommended by the `amazon.aws.aws_ec2` plugin documentation.

## Review Notes
The core Ansible inventory commands, `--limit` usage, host pattern union/intersection/exclusion syntax, default `all` and `ungrouped` groups, YAML/INI inventory structures, dynamic inventory script shape, and corrected `amazon.aws.aws_ec2` plugin options are consistent with current Ansible documentation. Local command verification used a temporary Ansible core 2.21.1 install under `/tmp` because Ansible was not installed in the workspace.
