# Validation Summary: How to Fix Ansible Gathering Facts Taking Too Long

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ansible playbooks
- Ansible fact gathering and the `ansible.builtin.setup` module
- Ansible fact cache plugins
- Ansible configuration (`ansible.cfg`)
- SSH multiplexing and pipelining
- Mitogen strategy plugin for Ansible
- Community Ansible collections (`community.general`)

## Sources Consulted
- Ansible `ansible.builtin.setup` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible cache plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/cache.html
- Ansible `ansible.builtin.jsonfile` cache plugin documentation: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/jsonfile_cache.html
- Ansible `community.general.redis` cache plugin documentation: https://docs.ansible.com/ansible/latest/collections/community/general/redis_cache.html
- Ansible strategy plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/strategy.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Mitogen for Ansible documentation: https://mitogen.networkgenomics.com/ansible_detailed.html

## Issues Found
- The selective fact gathering example said it gathered network and hardware facts, but the task only listed `network`. Added `hardware` and ordered `!all` / `!min` before the desired subsets to match Ansible's documented pattern for collecting only specific subsets.
- The text said `gather_subset` accepts only a short fixed list of values. Current Ansible supports many more fact subsets, so the wording now says these are common values.
- The Redis fact cache example used `fact_caching = redis`. Current Ansible documentation lists Redis as the `community.general.redis` cache plugin, so the snippet now uses the collection-qualified plugin name.
- The SSH pipelining explanation claimed it reduces SSH operations from 3 to 1. Official documentation describes the behavior more generally as avoiding separate file transfer, so the explanation was corrected and the `requiretty` privilege escalation caveat was added.
- The infrastructure provisioning example used `gather_facts: true` and then called `ansible.builtin.setup`, causing redundant fact gathering. Changed it to `gather_facts: false` and gathered only the fact subsets needed by later tasks.
- The provisioning example used `ansible.builtin.timezone`, but the current documented module is `community.general.timezone`. Updated the module name.
- The SSH service handler hardcoded `sshd`, which is incorrect on Debian/Ubuntu systems where the service is commonly named `ssh`. Updated it to select `ssh` for Debian-family hosts and `sshd` otherwise.
- The scheduled automation example copied a file into `/opt/scripts` without ensuring the directory existed. Added a `file` task to create the directory first.

## Review Notes
- Ansible is not installed in this workspace, so I could not run `ansible-playbook --syntax-check`. The snippets were reviewed against official Ansible documentation and current module/plugin names.
- The comparison table contains illustrative timing numbers. Actual speedups depend heavily on inventory size, network latency, controller resources, target hosts, SSH settings, and cache state.
- Mitogen is a third-party acceleration layer, not part of Ansible core. Users should verify compatibility with their Ansible and Python versions before enabling it.
