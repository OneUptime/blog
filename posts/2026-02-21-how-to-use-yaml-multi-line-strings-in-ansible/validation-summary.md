# Validation Summary: How to Use YAML Multi-Line Strings in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- YAML block scalars
- Ansible playbooks
- Ansible built-in modules
- community.general Ansible collection
- Jinja2 expressions in Ansible
- Bash shell scripts
- Nginx configuration snippets

## Sources Consulted
- YAML 1.2.2 Specification, Block Scalar Styles and Chomping: https://yaml.org/spec/1.2.2/
- Ansible conditionals documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_conditionals.html
- ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- ansible.builtin.shell module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/shell_module.html
- ansible.builtin.template module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- ansible.builtin.uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- ansible.builtin.cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- ansible.builtin.hostname module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/hostname_module.html
- community.general.timezone module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/timezone_module.html
- community.general.ufw module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/ufw_module.html

## Issues Found
- The post said `bad_example:|` causes a YAML parse error. In YAML, the missing space means it is parsed as plain scalar text rather than as a mapping key with a block scalar value. Updated the explanation to describe the actual parsing behavior.
- The indentation indicator description implied YAML simply strips that number of spaces from every line. The YAML specification defines the indicator as the block scalar content indentation level. Updated the wording and example so the preserved indentation is accurate.
- The nginx `copy.content` example used `{{ server_name }}` inside `ansible.builtin.copy`. Ansible's copy module documentation recommends using `ansible.builtin.template` for content that contains variables. Replaced the variable with static example content.
- The inline Jinja2 example used Jinja template syntax inside `ansible.builtin.copy.content`, which the copy module documentation warns against for templated content. Reworked the example as static file content while preserving the literal-block YAML demonstration.
- The infrastructure workflow used `ansible.builtin.timezone`, but the timezone module is provided by `community.general.timezone` in current Ansible documentation. Updated the module FQCN.
- Several generated phrases referred to YAML multi-line syntax as "this module." Updated those references to "this syntax."

## Review Notes
- Most YAML block scalar explanations and Ansible module parameters were technically correct after the fixes.
- The full workflow examples are illustrative and may still need environment-specific adjustments, such as platform-specific service names or required collections, before use in production.
