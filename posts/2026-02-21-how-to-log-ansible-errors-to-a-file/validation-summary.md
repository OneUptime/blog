# Validation Summary: How to Log Ansible Errors to a File

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible configuration
- Ansible playbooks
- Ansible callback plugins
- Bash shell scripting
- Python callback plugin code
- JSON Lines logging
- logrotate

## Sources Consulted
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible callback plugins: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible blocks and rescue variables: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible error handling and `ignore_errors`: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible `ansible.builtin.lineinfile` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `ansible.builtin.copy` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.builtin.apt` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Python `datetime` documentation: https://docs.python.org/3.12/library/datetime.html
- GNU Coreutils manual for `tee`: https://www.gnu.org/software/coreutils/manual/coreutils.html
- GNU Grep manual: https://www.gnu.org/software/grep/manual/grep.html
- GNU sed manual: https://www.gnu.org/software/sed/manual/sed.html
- Ubuntu logrotate man page: https://manpages.ubuntu.com/manpages/jammy/man8/logrotate.8.html

## Issues Found
- The section title referred to a `no_log` pattern, but the example does not use `no_log`. Renamed it to the `register` pattern to match the implementation.
- The wrapper script used an unquoted playbook path in `basename`, which could break for paths containing spaces or shell metacharacters. Quoted the expansion.
- The callback plugin used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced it with `datetime.now(timezone.utc)` and preserved the `Z` timestamp format.
- The callback plugin created `os.path.dirname(self.log_path)` directly, which fails when the configured log path is a filename without a directory component. Changed it to use `os.path.abspath()` before deriving the directory.
- The JSONL viewing commands piped multiple JSON objects into `python3 -m json.tool`, which expects a single JSON document and fails with extra input. Replaced those examples with a short Python loop that parses and pretty-prints each JSONL line separately.

## Review Notes
The Ansible examples use current configuration keys and documented playbook features. `ansible-playbook` is not installed in this local environment, so CLI verification was performed against official Ansible documentation rather than local `ansible-doc` output.
