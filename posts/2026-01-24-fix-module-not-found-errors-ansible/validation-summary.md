# Validation Summary: How to Fix 'Module Not Found' Errors in Ansible

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ansible
- Ansible Galaxy
- Ansible collections
- Ansible modules and custom modules
- YAML playbooks
- Python module dependencies
- Docker, PostgreSQL, AWS, Kubernetes, and MySQL/MariaDB Ansible collections

## Sources Consulted
- Ansible Configuration Settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Installing collections: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Using collections in a playbook: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_using_playbooks.html
- ansible-galaxy CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- ansible.builtin.yum module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yum_module.html
- community.docker.docker_container module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- community.docker scenario guide: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docsite/scenario_guide.html
- community.postgresql module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_user_module.html
- amazon.aws module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- kubernetes.core module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html
- ansible.mysql module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/mysql/mysql_user_module.html

## Issues Found
- The post described FQCN use after Ansible 2.10 as required for built-in modules. Official docs recommend FQCNs for clarity and conflict avoidance, but short names for built-in modules still work. Updated the wording and heading to say FQCN is recommended.
- The `ansible.cfg` example used `collections_paths`. The current documented INI key is `collections_path`, while `ansible-config dump` exposes `COLLECTIONS_PATHS`. Updated the configuration examples and summary language.
- The Python dependency section said dependencies must be on the target host. Official module docs describe requirements as needed on the host that executes the module, which can differ depending on connection and delegation. Updated the wording.
- The PostgreSQL dependency text implied only `psycopg2`; current community.postgresql docs allow `psycopg2` or `psycopg3` for many modules. Updated the dependency map.
- The Kubernetes dependency map included `openshift`; current kubernetes.core module docs list `kubernetes` and `PyYAML` for common modules such as `k8s_info`. Updated the dependency map and quick install command.
- The MySQL dependency map referenced `community.mysql`, which is now redirected/deprecated in favor of `ansible.mysql`. Updated the collection name while preserving the PyMySQL dependency.
- The quick dependency install command omitted `botocore` for AWS modules and `PyYAML` for Kubernetes modules. Updated the command.

## Review Notes
The local environment did not have Ansible installed, so command behavior was reviewed against current official Ansible documentation rather than local CLI help. The examples are generally valid, but projects should still pin collection versions to versions compatible with their installed `ansible-core` release.
