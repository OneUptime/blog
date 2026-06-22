# Validation Summary: How to Handle Ansible Facts Gathering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible facts and the setup module
- Ansible fact subsets
- Ansible fact caching
- Ansible custom local facts
- Redis and Memcached cache plugins
- YAML and shell scripting

## Sources Consulted
- Ansible documentation: ansible.builtin.setup module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible documentation: Discovering variables, facts, and magic variables - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible documentation: Cache plugins - https://docs.ansible.com/projects/ansible/latest/plugins/cache.html
- Ansible documentation: Configuration settings, DEFAULT_GATHERING - https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html#default-gathering
- Ansible documentation: ansible.builtin.jsonfile cache plugin - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/jsonfile_cache.html
- Ansible documentation: community.general.redis cache plugin - https://docs.ansible.com/projects/ansible/latest/collections/community/general/redis_cache.html
- Ansible documentation: community.general.memcached cache plugin - https://docs.ansible.com/projects/ansible/latest/collections/community/general/memcached_cache.html

## Issues Found
- The "Complete List of Fact Subsets" section was not complete compared with the current `ansible.builtin.setup` documentation, which lists many more possible `gather_subset` values. I changed the heading and reference comment to "Common Fact Subsets" so the section no longer claims to be exhaustive.
- The `!all` exclusion note was incomplete. Current Ansible documentation states that `!all` still collects the `min` subset unless `!min` is also specified. I updated the comments to explain both `!all` and `!all,!min`.
- The Redis and Memcached cache examples used short plugin names and only installed Python libraries. Current documentation places these cache plugins in the `community.general` collection and recommends FQCN usage. I updated the examples to use `community.general.redis` and `community.general.memcached`, and added `ansible-galaxy collection install community.general` before the Python library install commands.
- The benchmarking commands used `--tags full`, `--tags minimal`, and `--tags none`, but the playbook example did not define those tags. I added matching play-level tags so the benchmark commands select the intended plays.

## Review Notes
Ansible was not installed in the local environment, so CLI help output could not be checked locally. The review was completed against current official Ansible documentation. The examples rely on Ansible's default top-level fact injection behavior for variables such as `ansible_hostname`; the official docs note this can be disabled with `INJECT_FACTS_AS_VARS`, in which case users should access facts through `ansible_facts`.
