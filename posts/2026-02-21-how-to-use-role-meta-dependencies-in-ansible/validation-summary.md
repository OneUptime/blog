# Validation Summary: How to Use Role Meta Dependencies in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible roles
- Ansible role dependencies
- Ansible Galaxy
- YAML role metadata
- Ansible `include_role`

## Sources Consulted
- Ansible Community Documentation: Roles - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible Core 2.14 Documentation: Roles - https://docs.ansible.com/projects/ansible-core/2.14/playbook_guide/playbooks_reuse_roles.html
- Ansible Community Documentation: Galaxy User Guide - https://docs.ansible.com/projects/ansible/latest/galaxy/user_guide.html

## Issues Found
- The introduction said `meta/main.yml` dependencies are installed and executed by Ansible during role use. Updated it to say Ansible executes them before the role, because role installation is handled separately by `ansible-galaxy`.
- The recursive execution-order example listed `common` before `java` even though only `nginx` was described as depending on `common`. Updated the order to `java, common, nginx, firewall, webapp`.
- The duplicate dependency example used `vars:` to demonstrate distinct role invocations. Updated it to use role parameters directly, matching Ansible's documented deduplication behavior for role parameters.
- The Galaxy/Git dependency section implied Git-backed roles can simply be referenced at play execution time. Clarified that those roles must be installed with `ansible-galaxy`.
- The conditional dependency section claimed Ansible 2.14 cannot use `when` on meta dependencies and that dependencies are always executed. Updated it to match official docs: role dependencies are subject to conditionals and tag filtering.

## Review Notes
- Ansible CLI tools were not installed in the local environment, so command syntax was verified against official documentation rather than local `--help` output.
- The examples use `vars:` for passing configuration to dependent roles, which is valid, but Ansible's current docs note that `vars:` has variable-scope implications and is distinct from role parameters for deduplication behavior.
