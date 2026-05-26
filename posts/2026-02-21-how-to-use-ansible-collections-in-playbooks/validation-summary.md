# Validation Summary: How to Use Ansible Collections in Playbooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible collections
- Ansible playbooks
- ansible-core built-in modules
- Ansible Galaxy collection requirements
- community.docker
- community.postgresql
- community.grafana
- ansible.posix firewalld
- ansible-lint FQCN rule

## Sources Consulted
- Ansible documentation: Using collections in a playbook - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_using_playbooks.html
- Ansible documentation: Installing collections - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible documentation: Module defaults - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_module_defaults.html
- Ansible documentation: ansible.builtin.dnf module and yum alias - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible documentation: ansible.builtin.yum redirect - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yum_module.html
- Ansible documentation: ansible.builtin.systemd redirect and systemd_service module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_module.html
- Ansible documentation: community.docker.docker_image module - https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_module.html
- Ansible documentation: community.docker.docker_container module - https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- Ansible documentation: community.postgresql collection index - https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/index.html
- community.postgresql collection runtime metadata - https://raw.githubusercontent.com/ansible-collections/community.postgresql/main/meta/runtime.yml
- Ansible documentation: ansible.posix.firewalld module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible documentation: community.grafana collection index - https://docs.ansible.com/projects/ansible/latest/collections/community/grafana/index.html
- community.grafana collection role source - https://github.com/ansible-collections/community.grafana
- ansible-lint documentation: fqcn rule - https://docs.ansible.com/projects/lint/rules/fqcn/

## Issues Found
- The introduction said every module shipped with Ansible core before collections. This was imprecise because pre-collection content was bundled in the monolithic Ansible package, while ansible-core is the later smaller core package. Updated the wording.
- The requirements example said it pinned exact versions, but the snippet used version ranges for some collections. Updated the wording to "version constraints" and changed the portability sentence accordingly.
- The role example used `community.grafana.grafana` with variables such as `grafana_port` and `grafana_admin_password`, which do not match the current role's documented/source variables. Updated the example to use `grafana_url`, `grafana_username`, `grafana_password`, and `grafana_folders`, and added `community.grafana` to `requirements.yml`.
- The PostgreSQL `module_defaults` example used `group/community.postgresql.postgresql`, but the collection defines the action group as `all`. Updated the example and explanation to use `group/community.postgresql.all`.

## Review Notes
The local environment does not have `ansible`, `ansible-galaxy`, or `ansible-config` installed, so CLI behavior was verified against official Ansible documentation rather than local command output. The `ansible.builtin.yum` and `ansible.builtin.systemd` examples remain valid through current redirects, though the canonical current module names are `ansible.builtin.dnf` and `ansible.builtin.systemd_service`.
