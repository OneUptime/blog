# Validation Summary: Ansible raw vs. command vs. shell: Which Module Should You Use?

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible and ansible-core
- Ansible playbooks and YAML task syntax
- `ansible.builtin.raw`
- `ansible.builtin.command`
- `ansible.builtin.shell`
- `ansible.builtin.package`, `ansible.builtin.script`, and `ansible.builtin.setup`
- POSIX shells and Bash
- Debian APT
- systemd journal tools

## Sources Consulted
- [ansible.builtin.raw module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html)
- [ansible.builtin.command module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html)
- [ansible.builtin.shell module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html)
- [ansible.builtin.script module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/script_module.html)
- [ansible.builtin.package module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html)
- [ansible.builtin.setup module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html)
- [Validating tasks: check mode and diff mode](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html)
- [Error handling in playbooks](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html)
- [Using filters to manipulate data](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html)
- [Ansible interpreter discovery](https://docs.ansible.com/projects/ansible/latest/reference_appendices/interpreter_discovery.html)
- [Logging Ansible output](https://docs.ansible.com/projects/ansible/latest/reference_appendices/logging.html)
- [ansible-doc command reference](https://docs.ansible.com/projects/ansible/latest/cli/ansible-doc.html)
- [Using Ansible and Windows](https://docs.ansible.com/projects/ansible/latest/os_guide/windows_usage.html)
- [Bash Reference Manual](https://www.gnu.org/software/bash/manual/bash.pdf)
- [POSIX Shell Command Language](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)
- [Debian apt-get manual](https://manpages.debian.org/unstable/apt/apt-get.8.en.html)
- [systemd journalctl manual](https://www.freedesktop.org/software/systemd/man/255/journalctl.html)
- [GNU grep manual](https://www.gnu.org/software/grep/manual/grep.pdf)
- [GNU wc manual](https://www.gnu.org/software/coreutils/wc)

## Issues Found
- The post grouped a carefully tested `changed_when` with execution guards as a way to make a state-changing command idempotent. Changed the explanation to clarify that `changed_when` controls change reporting and handler notification; it does not prevent command execution or make the operation idempotent.
- The selection flow said any variable expansion required `shell`, which conflicted with the correctly documented `command.expand_argument_vars` behavior earlier in the post. Narrowed this to shell parameter expansion so simple `$VAR` expansion performed by `command` is not incorrectly excluded.
- The post stated broadly that `no_log: true` hides Ansible output. Clarified that it suppresses normal task output but does not protect debug output or secrets exposed through a remote process's arguments.

## Review Notes
- The examples use current module names and supported parameters. The `expand_argument_vars` statement is accurate for ansible-core 2.16 and later.
- The first pipeline example intentionally demonstrates shell syntax under the default `/bin/sh`. As the later Bash example explains, pipelines that must propagate failures from every stage need a shell with `pipefail` support and `executable: /bin/bash`.
- `ansible.builtin.package` delegates check-mode behavior to the selected underlying package-manager module, so exact prediction support remains platform-dependent.
