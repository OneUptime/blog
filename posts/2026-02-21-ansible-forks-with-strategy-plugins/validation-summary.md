# Validation Summary: How to Use Ansible Forks with Strategy Plugins

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- ansible-playbook CLI
- Ansible strategy plugins: linear, free, host_pinned
- Ansible play keywords: serial and throttle
- ansible.cfg configuration
- SSH connection pipelining and ControlMaster

## Sources Consulted
- Ansible playbook strategies documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible strategy plugin documentation: https://docs.ansible.com/projects/ansible-core/devel/plugins/strategy.html
- ansible.builtin.linear strategy documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/linear_strategy.html
- ansible.builtin.free strategy documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/free_strategy.html
- ansible.builtin.host_pinned strategy documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/host_pinned_strategy.html
- ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- ansible.builtin.ssh connection documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- ansible.builtin.template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- ansible.builtin.service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html

## Issues Found
- The initial `ansible.cfg` example used an inline comment after `forks = 5`. Changed it to a separate comment line to avoid ambiguity in INI parsing.
- The control-node memory guidance gave a fixed 50-100 MB RAM estimate per fork. Replaced it with version- and workload-dependent guidance because official Ansible documentation does not define a fixed per-fork memory footprint.
- The bandwidth example described copying 50 100 MB files as needing "5 GB of bandwidth." Changed it to describe total concurrent transfer volume across concurrent connections, because bandwidth is a rate rather than a storage quantity.
- The benchmark script piped `ansible-playbook` output to `grep "Playbook run took"`, but that string is not emitted by default Ansible output. Replaced it with `/usr/bin/time -p ansible-playbook -f "$forks" site.yml`.
- The SSH tuning example overrode Ansible's documented default `ssh_args` without the default `-C` compression flag. Restored the documented default `-C -o ControlMaster=auto -o ControlPersist=60s`.

## Review Notes
The core explanation of `forks`, `linear`, `free`, `host_pinned`, `serial`, and `throttle` matches official Ansible behavior. The local environment did not have `ansible-playbook` installed, so CLI verification was done against the official Ansible documentation rather than local `--help` output.
