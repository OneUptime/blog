# Validation Summary: How to Use the Ansible lines Lookup Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible lookup plugins
- Ansible playbooks and loops
- Ansible command and copy modules
- Docker CLI formatting
- Git CLI
- GNU df
- systemctl
- kubectl

## Sources Consulted
- Ansible `ansible.builtin.lines` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lines_lookup.html
- Ansible lookup plugin guide: https://docs.ansible.com/projects/ansible/latest/plugins/lookup.html
- Ansible playbook lookup guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_lookups.html
- Ansible `ansible.builtin.pipe` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/pipe_lookup.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Docker CLI formatting documentation: https://docs.docker.com/engine/cli/formatting/
- Docker `inspect` CLI documentation: https://docs.docker.com/reference/cli/docker/inspect/
- Docker `container ls` / `ps` CLI documentation: https://docs.docker.com/reference/cli/docker/container/ls/
- Git `rev-parse` documentation: https://git-scm.com/docs/git-rev-parse
- GNU Coreutils `df` documentation: https://www.gnu.org/software/coreutils/df
- systemd `systemctl` documentation: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html

## Issues Found
- The post incorrectly stated that the `lines` lookup returns a single newline-delimited string and that callers should use `.splitlines()` for loops. Official Ansible documentation says `lines` returns stdout lines as a list, while the `lookup()` function returns a string by default unless `wantlist=True` is used. Updated the note and list examples to use `query('ansible.builtin.lines', ...)`, which is the documented shorthand for list-returning lookups.
- Several list examples used `lookup('lines', ...).splitlines()`, which would not reliably produce one loop item per command output line because `lookup()` defaults to string behavior. Replaced those examples with `query('ansible.builtin.lines', ...)`.
- The Docker `ps --format "{{.Names}}"` example embedded Docker's Go template delimiters directly inside a Jinja expression, which would be parsed incorrectly by Ansible. Updated the example to construct and shell-quote the Docker template string inside the Jinja expression.
- Examples that built shell commands from `playbook_dir` did not quote that path, which could break when the playbook path contains spaces and is inconsistent with Ansible's shell-lookup security guidance. Added the `quote` filter where `playbook_dir` is included in controller-side shell commands.
- Scalar Git metadata examples used the `lines` lookup without explicitly selecting a single line. Updated them to use `query('ansible.builtin.lines', ...) | first` so the scalar variables receive the intended first output line.
- The optional command error-handling example returned a string default for data that is treated as a list. Updated it to use `query()` and default to an empty list.

## Review Notes
Ansible was not installed in the local workspace, so local `ansible-doc` and playbook execution checks could not be run. The corrections were verified against current official Ansible, Docker, Git, GNU Coreutils, and systemd documentation.
