# Validation Summary: How to Benchmark Ansible Playbook Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible configuration
- Ansible callback plugins
- Bash scripting
- Python JSON parsing and statistics
- GitHub Actions workflows

## Sources Consulted
- Ansible callback plugins documentation: https://docs.ansible.com/ansible/latest/plugins/callback.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- ansible.posix.profile_tasks callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- ansible.posix.timer callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/timer_callback.html
- Ansible playbook strategy documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_strategies.html
- ansible.builtin.host_pinned strategy documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/host_pinned_strategy.html
- GitHub actions/upload-artifact documentation: https://github.com/actions/upload-artifact

## Issues Found
- The callback examples enabled `profile_tasks,timer` by short name. Current Ansible documentation identifies these as `ansible.posix.profile_tasks` and `ansible.posix.timer`, so the examples now use those FQCNs and mention the callback names before the first script.
- The `compare-benchmarks.sh` example opened `sys.argv[1]` and `sys.argv[2]` but did not pass the shell arguments to Python. Changed the heredoc invocation to `python3 - "$FILE_A" "$FILE_B" << 'PYTHON'`.
- The GitHub Actions workflow used `actions/upload-artifact@v3`, which is deprecated. Updated it to `actions/upload-artifact@v7`, matching the current action README examples.
- The statistical benchmark generated invalid Python for more than one duration because Bash expanded `TIMES` as a space-separated list inside `[...]`. Added `TIMES_CSV=$(IFS=,; echo "${TIMES[*]}")` and used that comma-separated value in the Python list.

## Review Notes
The benchmark playbook intentionally uses Debian-oriented commands such as `dpkg`; that is acceptable for a controlled benchmark target but should be adapted for non-Debian hosts. Ansible was not installed in the local workspace, so validation used official documentation and shell/Python syntax review rather than executing the playbooks end to end.
