# Validation Summary: How to Fix Ansible Indentation Error in YAML

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ansible playbooks
- YAML syntax and indentation
- ansible-playbook CLI
- ansible-lint
- GNU grep and sed commands
- Ansible built-in modules
- community.general Ansible collection modules

## Sources Consulted
- Ansible YAML Syntax documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/YAMLSyntax.html
- ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- ansible-lint syntax-check rule: https://docs.ansible.com/projects/lint/rules/syntax-check/
- ansible.builtin.lineinfile documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- ansible.builtin.hostname documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- ansible.builtin.uri documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- ansible.builtin.cron documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- ansible.builtin.service documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- community.general.timezone documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- community.general.ufw documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- YAML 1.2 specification: https://yaml.org/spec/1.2.0/

## Issues Found
- The list indentation "wrong" example used an indentationless sequence that is valid YAML. Changed the example so the task item is genuinely outside the `tasks` key.
- The post referred to indentation as "this module" in the use-case section and comments. Reworded those phrases to refer to proper YAML indentation.
- The infrastructure workflow used `ansible.builtin.timezone`, which is not the correct current FQCN. Changed it to `community.general.timezone`, matching the official collection documentation.
- The SSH service handler hard-coded `sshd`, which is incorrect on Debian-family systems where the service is commonly `ssh`. Updated the service name to use `ssh` on Debian and `sshd` otherwise.
- The error-handling example registered `fallback_result` but would stop immediately if the fallback command failed, preventing the final failure task from running. Added `failed_when: false` to the fallback task so the explicit final failure condition can evaluate.

## Review Notes
The YAML snippets parse successfully with PyYAML after the fixes. Ansible tooling was not installed locally, so module and CLI behavior was checked against official Ansible documentation. The `grep -P` and `sed -i` commands are valid on GNU systems; portability to BSD/macOS tools may require different flags.
