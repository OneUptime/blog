# Validation Summary: How to Optimize Ansible Loop Performance for Large Lists

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbooks and loops
- Ansible package modules: apt, dnf/yum, pip
- Ansible async and async_status
- Ansible strategy plugins: linear, free, Mitogen
- Ansible SSH pipelining and forks configuration
- Ansible callback plugins: ansible.posix.timer, ansible.posix.profile_tasks
- Jinja2 filters used by Ansible, including batch and selectattr

## Sources Consulted
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible dnf module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible pip module documentation: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/pip_module.html
- Ansible npm module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/npm_module.html
- Ansible gem module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/gem_module.html
- Ansible loop documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Ansible async documentation: https://docs.ansible.com/ansible/2.9/user_guide/playbooks_async.html
- Ansible free strategy documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/free_strategy.html
- Ansible SSH connection and pipelining documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/config.html
- Ansible callback plugin documentation: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- ansible.posix profile_tasks callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- ansible.posix timer callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/timer_callback.html
- Mitogen for Ansible documentation: https://mitogen.networkgenomics.com/ansible_detailed.html

## Issues Found
- The introduction incorrectly implied fact gathering happens during each loop iteration. Changed it to explain that fact gathering is a setup step per host when enabled.
- The apt examples and performance table described loop iterations as exact SSH round trips. Changed this to module and remote executions, which is more accurate with persistent connections and pipelining.
- The bulk apt example included `update_cache: true` while the loop example did not, so the examples were not equivalent. Removed `update_cache: true`.
- The module list incorrectly claimed `npm` and `gem` accept list values for `name`. Current documentation shows `community.general.npm` and `community.general.gem` use string `name` parameters, so the list was corrected to modules verified to accept package-name lists.
- The pipelining section gave an unsupported fixed 30-50% improvement and described a separate SSH session too specifically. Changed this to match the documented behavior: fewer connection operations and no temporary module file transfer for many Python modules, with a privilege escalation caveat.
- The Mitogen speedup range was adjusted from 2-7x to the documented 1.25-7x range, and a compatibility caveat was added because Mitogen is third-party.
- The callback plugin names were updated from short names to current `ansible.posix.timer` and `ansible.posix.profile_tasks` FQCNs.
- The sample callback output said February 21, 2026 was a Monday. It is a Saturday, so the sample dates were corrected.

## Review Notes
The remaining performance numbers are presented as rough examples, not guaranteed benchmarks. Actual timings will vary by target host, network latency, package cache state, connection plugin, privilege escalation setup, and Ansible version.
