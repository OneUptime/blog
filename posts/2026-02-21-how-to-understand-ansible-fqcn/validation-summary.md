# Validation Summary: How to Understand Ansible FQCN (Fully Qualified Collection Names)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- Ansible collections
- Fully Qualified Collection Names (FQCNs)
- ansible-core and ansible.builtin
- ansible-lint
- Ansible Galaxy collections

## Sources Consulted
- Ansible documentation: Using collections in a playbook - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_using_playbooks.html
- Ansible documentation: ansible.builtin collection index - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/index.html
- Ansible documentation: ansible.builtin.ping module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ping_module.html
- Ansible documentation: ansible.netcommon.net_ping module - https://docs.ansible.com/ansible/latest/collections/ansible/netcommon/net_ping_module.html
- Ansible documentation: cisco.ios.ping redirect - https://docs.ansible.com/ansible/latest/collections/cisco/ios/ping_module.html
- Ansible documentation: ansible.posix.seboolean module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/seboolean_module.html
- Ansible documentation: ansible.posix.firewalld module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible documentation: community.general.json_query filter - https://docs.ansible.com/projects/ansible/latest/collections/community/general/json_query_filter.html
- Ansible documentation: community.docker.docker_container module - https://docs.ansible.com/ansible/latest/collections/community/docker/docker_container_module.html
- Ansible documentation: amazon.aws.s3_bucket module - https://docs.ansible.com/ansible/latest/collections/amazon/aws/s3_bucket_module.html
- ansible-lint documentation: fqcn rule - https://docs.ansible.com/projects/lint/rules/fqcn/

## Issues Found
- The short-name resolution section implied Ansible only falls back to `ansible.builtin` after checking the play-level `collections` list. Updated it to reflect the documented default availability of `ansible.builtin` and support for older plugin paths through `ansible.legacy`, while still explaining that `collections` adds an ordered search path for unqualified module and action names.
- The ambiguity example said `community.general` has a `ping` module for network devices. Current official documentation does not show `community.general.ping`; replaced the example with `cisco.ios`, which documents a `cisco.ios.ping` redirect, and kept `ansible.builtin.ping` as the standard builtin example.
- The post used `yum` and `ansible.builtin.yum` as modern examples. Official maintained documentation lists `dnf` as the current builtin package module, while older `yum` documentation is a redirect to `ansible.builtin.dnf` in unmaintained ansible-core 2.17 docs. Updated the common-module table, migration examples, and quick reference to use `dnf` and `ansible.builtin.dnf`.
- The sample ansible-lint output used `yum`, which can trigger canonical-name concerns because it redirects to `dnf`. Changed the example to `copy` so it demonstrates the FQCN rule without relying on an older redirect.

## Review Notes
The examples use collection content that may require separate installation when running with `ansible-core` rather than the broader `ansible` package, such as `ansible.posix`, `community.general`, `community.docker`, and `amazon.aws`. The post already calls this out for `ansible.posix.seboolean`; future revisions could add a short note that most non-builtin collections shown in the quick reference follow the same installation pattern.
