# Validation Summary: How to Migrate from Standalone Modules to Collections in Ansible

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Ansible
- Ansible collections
- Ansible playbooks and roles
- Ansible Galaxy requirements files
- ansible-lint
- Bash, grep, sed, and find
- HashiCorp Vault lookup plugins
- Ansible filter plugins

## Sources Consulted
- Ansible latest documentation: Using collections in a playbook - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_using_playbooks.html
- Ansible 2.9 documentation: Using collections - https://docs.ansible.com/projects/ansible/2.9/user_guide/collections_using.html
- Ansible Core documentation: Ansible collection creator path - https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_collections_path.html
- Ansible builtin collection index - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/index.html
- ansible-lint FQCN rule - https://docs.ansible.com/projects/lint/rules/fqcn/
- ansible.posix collection index - https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/index.html
- community.hashi_vault.hashi_vault lookup documentation - https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/hashi_vault_lookup.html
- ansible.utils.ipaddr filter documentation - https://docs.ansible.com/projects/ansible/latest/collections/ansible/utils/ipaddr_filter.html
- ansible.builtin.include documentation - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_module.html
- amazon.aws.ec2_instance documentation - https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- amazon.aws.s3_object documentation - https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/s3_object_module.html

## Issues Found
- The introduction said the collections system was introduced in Ansible 2.9. Ansible 2.9 documented collections, while the collections keyword appeared earlier and the packaging split became standard in the 2.9/2.10 period. Updated the wording to avoid an over-specific version claim.
- The post said the `ansible` package became `ansible-core` plus individual collections. Official documentation describes the current `ansible` community package as `ansible-core` plus curated community collections. Updated the explanation.
- The audit commands used `grep` against task names and `ansible-playbook --list-tasks`, which does not reliably list module names. Replaced them with static YAML key searches and an `ansible-lint` FQCN check.
- The requirements example omitted collections used later in the post: `ansible.posix`, `ansible.utils`, and `community.hashi_vault`. Added them.
- The deprecation table implied `include_role` was a static include that should migrate to `import_role`. `include_role` remains valid and dynamic; `import_role` is the static alternative. Corrected the table.
- The bulk migration script incorrectly mapped `authorized_key`, `mount`, `synchronize`, and `sysctl` to `ansible.builtin`. These are in `ansible.posix`, so the script now handles them separately.
- The script's `find` pipeline was tightened with grouped name predicates, `-type f`, and `IFS= read -r` to avoid common path handling problems.

## Review Notes
The examples are broadly correct after the fixes. The grep-based module audit remains an approximation because YAML task parsing is context-sensitive; `ansible-lint` or a purpose-built parser is a better long-term option for large repositories.
