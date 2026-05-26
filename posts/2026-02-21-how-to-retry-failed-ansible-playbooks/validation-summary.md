# Validation Summary: How to Retry Failed Ansible Playbooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible task retries with `until`, `retries`, and `delay`
- Ansible retry files and inventory limits
- Ansible blocks, rescue handlers, and dynamic task includes
- Bash wrapper scripting for CI/CD retries

## Sources Consulted
- Ansible playbook keywords documentation: https://docs.ansible.com/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible configuration settings for `RETRY_FILES_ENABLED` and `RETRY_FILES_SAVE_PATH`: https://docs.ansible.com/ansible/latest/reference_appendices/config.html
- Ansible `include_tasks` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible inventory pattern documentation for `--limit @file`: https://docs.ansible.com/ansible/latest/inventory_guide/intro_patterns.html
- Ansible `uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `get_url` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/get_url_module.html

## Issues Found
- The retry-files section implied that Ansible always creates `.retry` files and labeled the workflow as `--retry`. Retry file generation is controlled by `retry_files_enabled` / `ANSIBLE_RETRY_FILES_ENABLED`, and reruns use `--limit @file`. Updated the heading, explanation, command example, and wrapper script to enable retry files explicitly.
- The wrapper script stored extra arguments in a string and assumed only `.yml` playbook names. Changed it to a Bash array for safer argument handling and made the retry-file name work for other playbook extensions such as `.yaml`.
- The exponential backoff example combined `loop`, `delay`, and `until` in a way that would not produce one true exponential retry sequence. Replaced it with a shell loop that sleeps 2, 4, 8, and 16 seconds between attempts.
- The block-level retry example used `retries`, `delay`, and `until` on `include_tasks`. The `include_tasks` module does not support do-until retries. Reworked the example to include the task file in a bounded loop, use `block`/`rescue` to record success or failure, pause between attempts, and fail after all attempts are exhausted.
- The block task used Bash `source` under `ansible.builtin.shell` without specifying Bash. Added `args: executable: /bin/bash` so the example matches the shell syntax it uses.

## Review Notes
- The local environment did not have `ansible-playbook` installed, so command verification was performed against official Ansible documentation rather than local CLI help.
- The remaining examples use placeholder URLs and host groups such as `example.com`, `webservers`, and `appservers`; these are illustrative and expected to be replaced in real deployments.
