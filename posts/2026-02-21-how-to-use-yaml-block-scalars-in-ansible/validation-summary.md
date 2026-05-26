# Validation Summary: How to Use YAML Block Scalars in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- YAML block scalars
- Ansible playbooks and built-in modules
- community.general.ufw
- Bash scripts
- Docker CLI commands
- Cron jobs

## Sources Consulted
- YAML 1.2.2 Specification: https://yaml.org/spec/1.2.2/
- Ansible ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible ansible.builtin.assert module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible conditionals documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_conditionals.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible ansible.builtin.uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible ansible.builtin.cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- GNU Bash shell parameter expansion documentation: https://www.gnu.org/s/bash/manual/html_node/Shell-Parameter-Expansion.html
- Docker CLI documentation for build, pull, and run: https://docs.docker.com/reference/cli/docker/build-legacy/, https://docs.docker.com/reference/cli/docker/image/pull/, https://docs.docker.com/reference/cli/docker/container/run/

## Issues Found
- The deployment script referenced `$1` before checking whether the argument was set. With `set -u`, an unset positional parameter exits immediately, so the intended error message would not run. Changed the check to use `${1:-}` before referencing `$1`.
- The Docker image references in the script were unquoted. Quoted them to preserve the image reference as a single argument after shell expansion.
- Several comments and explanatory lines described YAML block scalars as "this module." Block scalars are a YAML feature, not an Ansible module. Changed those references to "this feature."

## Review Notes
- The YAML block scalar examples match YAML chomping, folding, and indentation behavior. I also parsed all fenced YAML examples locally after the edits.
- The Ansible snippets use current FQCN-style module names. The `community.general.ufw` examples require the `community.general` collection and the target host's `ufw` package, as documented by Ansible.
