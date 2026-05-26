# Validation Summary: How to Use Ansible Inventory Caching for Dynamic Inventories

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible inventory plugins
- Ansible cache plugins
- AWS EC2 dynamic inventory
- Azure Resource Manager dynamic inventory
- Redis and memcached cache backends
- GitLab CI/CD
- Bash

## Sources Consulted
- Ansible Core cache plugin documentation: https://docs.ansible.com/projects/ansible-core/devel/plugins/cache.html
- Ansible inventory plugin documentation: https://docs.ansible.com/projects/ansible/7/plugins/inventory.html
- amazon.aws.aws_ec2 inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- azure.azcollection.azure_rm inventory plugin documentation: https://docs.ansible.com/ansible/latest/collections/azure/azcollection/azure_rm_inventory.html
- ansible.builtin collection plugin index: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/index.html
- community.general.yaml cache plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/yaml_cache.html
- community.general.redis cache plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/redis_cache.html
- community.general.memcached cache plugin documentation: https://docs.ansible.com/ansible/latest/collections/community/general/memcached_cache.html
- kubernetes.core.k8s inventory plugin removal notice: https://docs.ansible.com/ansible/latest/collections/kubernetes/core/k8s_inventory.html

## Issues Found
- Corrected the statement that each inventory plugin must opt in through its own config file. Ansible can enable inventory caching through `[inventory]` settings in `ansible.cfg`, with plugin-level settings used when per-source overrides are needed.
- Changed the YAML cache plugin example from `ansible.builtin.yaml` to `community.general.yaml`, because current `ansible.builtin` cache plugins include `jsonfile` and `memory`, not a YAML cache plugin.
- Updated the Redis connection example to include the empty password field in the documented `host:port:db:password` format.
- Added the `python-memcached` dependency for the memcached cache plugin.
- Replaced the `kubernetes.core.k8s` inventory example because that inventory plugin has been removed in current `kubernetes.core` releases. The example now uses `azure.azcollection.azure_rm`, which supports the same inventory cache options.
- Fixed the GitLab CI example. `ANSIBLE_INVENTORY_CACHE` is a boolean toggle, so the cache path now uses `ANSIBLE_INVENTORY_CACHE_CONNECTION`, with `ANSIBLE_INVENTORY_CACHE_PLUGIN` set explicitly.
- Adjusted the cache file section to avoid relying on exact jsonfile cache filenames or layout, since Ansible documents cache plugin storage as an internal implementation detail.
- Quoted the `basename "$f"` argument in the Bash helper script.

## Review Notes
The local environment did not have Ansible installed, so CLI behavior was verified against official Ansible documentation rather than local `ansible-doc` or `--help` output.
