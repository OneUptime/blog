# Validation Summary: How to Use Ansible to Watch for File Changes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible built-in modules: stat, find, set_fact, copy, file, debug, template, cron, command, shell, slurp, package
- YAML playbooks
- Linux cron
- GNU find
- GNU sha256sum
- Bash
- AIDE

## Sources Consulted
- Ansible stat module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible find module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible check mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible shell module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html
- Ansible slurp module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/slurp_module.html
- AIDE manual: https://aide.github.io/doc/
- Debian aide(1) manual page: https://manpages.debian.org/testing/aide/aide.1.en.html
- Local GNU findutils and GNU coreutils command help/version output

## Issues Found
- The baseline-saving example wrote to `{{ playbook_dir }}/baselines/...` without ensuring that the `baselines` directory existed. Added an `ansible.builtin.file` task delegated to localhost to create the directory before the `copy` task.
- The baseline comparison example could evaluate loops against undefined variables when a saved baseline was missing. Updated the loop expressions to use defaults so subsequent tasks can safely skip.
- The file property monitoring example looped over `file_properties.results | zip(file_properties.results)` and referenced mismatched fields. Replaced it with a direct loop over `file_properties.results` and corrected the `item.item.*` and `item.stat.*` references.
- The cron section said it scheduled an Ansible run, but the example schedules a standalone shell script. Updated the sentence to accurately describe a scheduled file check.
- The directory snapshot example used `ansible.builtin.command` with raw `find` output. Updated it to use `ansible.builtin.shell` with sorted checksum output so repeated comparisons are deterministic, and added a task to create `/var/lib/snapshots`.
- The AIDE example initialized the database with `creates: /var/lib/aide/aide.db.new`, which would allow initialization to run again after the new database was moved. Changed the guard to the active database path and passed the explicit config file to `aide --init` and `aide --check`. Added a task to create the AIDE log directory before cron writes to it.

## Review Notes
The examples are now technically consistent with current Ansible module behavior and the documented AIDE commands. Some file modes and AIDE database paths remain distribution-policy examples rather than universal defaults; production playbooks should align them with the target operating system's package layout and security baseline.
