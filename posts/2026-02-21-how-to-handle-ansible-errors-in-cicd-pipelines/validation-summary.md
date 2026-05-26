# Validation Summary: How to Handle Ansible Errors in CI/CD Pipelines

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible and ansible-playbook
- Ansible playbook error handling with block/rescue
- Ansible retry files and stdout callback configuration
- GitLab CI/CD
- GitHub Actions
- Bash pipeline exit handling
- Python JSON parsing

## Sources Consulted
- Ansible ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible configuration settings for retry files: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible inventory patterns and retry-file limit usage: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- Ansible error handling in playbooks: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible blocks and rescue documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- ansible.posix.json callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/json_callback.html
- Ansible ExitCode enum source: https://github.com/ansible/ansible/blob/devel/lib/ansible/errors/__init__.py
- Ansible TaskQueueManager return code source: https://github.com/ansible/ansible/blob/devel/lib/ansible/executor/task_queue_manager.py
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- GitHub Actions workflow syntax reference: https://docs.github.com/actions/reference/workflow-syntax-for-github-actions
- GitHub actions/upload-artifact documentation: https://github.com/actions/upload-artifact

## Issues Found
- The Ansible exit-code table treated codes as exact, non-overlapping meanings. Updated the wording and table to note that codes are broad categories, added invalid CLI option code 5, added combined host failure/unreachable code 6, and clarified that code 4 can also represent a parser error before execution.
- The shell handler did not account for exit code 5 or combined exit code 6. Added cases for those outcomes and updated the code 4 message to avoid misdiagnosing parser errors as only connectivity failures.
- The GitLab retry-file example set `ANSIBLE_RETRY_FILES_SAVE_PATH` but did not enable retry files. Current Ansible defaults retry file generation to false, so added `ANSIBLE_RETRY_FILES_ENABLED: "true"`.
- The GitLab staging job could stop before retry logic inspected the first `ansible-playbook` exit status under fail-fast shell behavior. Added `set +e` around the first run, captured `DEPLOY_EXIT`, restored `set -e`, and made the retry block exit with the original failure code when no retry file exists.
- The structured output example used the short `json` stdout callback name. Updated it to the documented fully qualified `ansible.posix.json` callback and added a note that `ansible.posix` must be installed when using `ansible-core` instead of the full `ansible` package.

## Review Notes
The remaining examples are illustrative and depend on project-specific inventories, release paths, SSH secrets, and health-check URLs. The Ansible rollback example uses documented modules and block/rescue behavior, but in a production deployment it should also account for unreachable hosts because unreachable errors do not trigger `rescue`.
