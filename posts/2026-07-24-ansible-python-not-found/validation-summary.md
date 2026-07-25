# Validation Summary: Fixing “/usr/bin/python Not Found” on New Ansible Targets

## Status

validated

## Post Type

Technical troubleshooting guide / tutorial

## Technologies Covered

- Ansible and `ansible-core`
- Python interpreter discovery
- POSIX managed nodes and remote shell connections
- Ansible inventory and `ansible.cfg`
- `ansible.builtin.ping`, `ansible.builtin.raw`, and fact gathering
- Debian APT and RPM-family DNF package management
- Ansible privilege escalation
- Managed-node Python virtual environments
- Ansible Windows and network automation

## Sources Consulted

- [Ansible: Interpreter discovery](https://docs.ansible.com/projects/ansible/latest/reference_appendices/interpreter_discovery.html)
- [Ansible: `ansible.builtin.ping` module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ping_module.html)
- [Ansible: `ansible.builtin.raw` module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html)
- [Ansible: Connection methods and details](https://docs.ansible.com/projects/ansible/latest/inventory_guide/connection_details.html)
- [Ansible: YAML inventory plugin](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yaml_inventory.html)
- [Ansible: `ansible-inventory` command reference](https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html)
- [Ansible: `ansible-config` command reference](https://docs.ansible.com/projects/ansible/latest/cli/ansible-config.html)
- [Ansible: `ansible` command reference](https://docs.ansible.com/projects/ansible/latest/cli/ansible.html)
- [Ansible: Understanding privilege escalation](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html)
- [Ansible: Releases, maintenance, and Python support matrix](https://docs.ansible.com/projects/ansible/latest/reference_appendices/release_and_maintenance.html)
- [Ansible: Ansible and Python 3](https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_python_3.html)
- [Ansible: Frequently asked questions about remote interpreters](https://docs.ansible.com/projects/ansible/latest/reference_appendices/faq.html)
- [Ansible: Managing Windows hosts](https://docs.ansible.com/projects/ansible/latest/os_guide/intro_windows.html)
- [Ansible: How network automation is different](https://docs.ansible.com/projects/ansible/latest/network/getting_started/network_differences.html)
- [DNF: Command reference](https://dnf.readthedocs.io/en/stable/command_ref.html)
- [Debian: `apt-get(8)` manual](https://manpages.debian.org/unstable/apt/apt-get.8.en.html)

## Issues Found

1. The raw-command connectivity check concluded that SSH was usable even though `raw` operates through whichever connection plugin and remote shell are configured. Changed the conclusion to verify the configured connection and remote shell instead of assuming SSH.
2. The idempotency explanation described a `test ... || install ...` expression, but the examples use an `if test ...; then ...; else ...; fi` guard. Updated the prose to describe the actual `test ...` guard.
3. The two-play example ran Debian-specific `apt-get` commands against a broadly named `new_linux` group, which could imply suitability for RPM-family hosts. Renamed the group to `new_debian` in both plays so the inventory contract matches the commands.
4. The controller check ran `python3 --version`, which can report a different interpreter from the virtual environment, pipx environment, or execution environment that actually runs Ansible. Removed that command and clarified that the `python version` line from `ansible --version` identifies Ansible's active controller runtime.
5. The network-device section used short connection plugin names. Replaced them with the current fully qualified names `ansible.netcommon.network_cli`, `ansible.netcommon.netconf`, and `ansible.netcommon.httpapi`.

## Review Notes

- The remaining commands, YAML inventory and playbook snippets, configuration keys, interpreter discovery modes, privilege-escalation explanation, Windows exception, and managed-node virtual-environment guidance match the current official documentation.
- The post correctly avoids hard-coding Python version ranges because controller and target support varies by `ansible-core` release. Readers should use the linked support matrix for their installed release.
- The DNF bootstrap shown guarantees a usable Python interpreter. Modules such as `ansible.builtin.dnf` can have additional managed-node library requirements that should be checked in the documentation for the module and distribution in use.
- All links in the post's Official Documentation section resolve to the intended current Ansible documentation pages.
