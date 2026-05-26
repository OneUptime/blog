# Validation Summary: How to Fix Ansible Playbook Performance Degradation Over Time

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbooks
- Ansible configuration (`ansible.cfg`)
- Ansible fact gathering and fact caching
- Ansible callback plugins
- Ansible strategy plugins
- SSH connection multiplexing and pipelining
- Mitogen for Ansible
- `ansible.builtin` modules
- `community.general` modules

## Sources Consulted
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible cache plugins and fact caching: https://docs.ansible.com/projects/ansible/latest/plugins/cache.html
- Ansible callback plugins: https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- `ansible.posix.profile_tasks` callback: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- Ansible strategy plugins: https://docs.ansible.com/projects/ansible/latest/plugins/strategy.html
- Ansible playbook strategies and forks: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_strategies.html
- `ansible.builtin.ssh` connection plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible asynchronous actions and polling: https://docs.ansible.com/ansible/3/user_guide/playbooks_async.html
- `ansible.builtin.apt` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- `ansible.builtin.command` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- `ansible.builtin.setup` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- `community.general.timezone` module: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- `community.general.ufw` module: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Mitogen for Ansible documentation: https://mitogen.networkgenomics.com/ansible_detailed.html

## Issues Found
- The callback configuration used short names for `profile_tasks`, `profile_roles`, and `timer`. Updated examples to use the documented `ansible.posix.*` FQCNs so they are correct for current collection-based Ansible installs.
- The timing explanation implied all enabled callbacks show every task duration. Clarified that `profile_tasks` provides task timings, while `timer` and `profile_roles` provide total play and role timing.
- The async example described async as generally moving slow tasks to async execution. Clarified that `async` with a positive `poll` value is mainly useful for long-running tasks that may hit connection timeouts.
- The pipelining advice omitted the documented `requiretty` caveat for sudo-based privilege escalation. Added a brief note.
- The Mitogen snippet claimed significant speedups unconditionally. Added a compatibility caveat because Mitogen is a third-party strategy plugin and should be tested against the Ansible version in use.
- The infrastructure example used `ansible.builtin.timezone`, but the timezone module is provided by `community.general.timezone` in current Ansible documentation. Updated the FQCN.
- The infrastructure example defaulted the SSH service handler to `sshd`, which is not correct for Debian/Ubuntu-style targets implied by the APT and UFW examples. Changed it to a configurable service name with a Debian/Ubuntu-friendly default.
- Several “Common Use Cases” lines referred to “this module,” but the post is not about a module. Updated those phrases to refer to playbook performance techniques.

## Review Notes
Local `ansible` and `ansible-doc` commands were not available in the workspace, so verification was performed against official Ansible documentation and Mitogen documentation. The “50-80%” performance improvement claim is plausible as a broad outcome statement but depends heavily on inventory size, network latency, task mix, and whether fact caching/pipelining are applicable.
