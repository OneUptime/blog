# Validation Summary: How to Fix ansible-lint Task Naming Warnings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-lint
- YAML playbooks
- GNU grep

## Sources Consulted
- ansible-lint name rule documentation: https://docs.ansible.com/projects/lint/rules/name/
- Ansible handler documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible ansible.builtin.systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- GNU grep manual: https://www.gnu.org/software/grep/manual/grep.html

## Issues Found
- The post claimed it covered every ansible-lint task naming rule and mentioned prefix requirements in the description, but it did not cover all current sub-rules such as `name[prefix]` and `name[unique]`. I changed the framing to "common" naming warnings so the scope is accurate without adding new sections.
- The `name[template]` section described the rule as a complete ban on Jinja2 templates in task names. Current ansible-lint documentation says templates should only be at the end of the name and that templating is discouraged. I updated the heading, explanation, and examples to match that rule.
- The play-name section said play names should avoid templates entirely. I updated it to say templates must be kept at the end if used, matching ansible-lint's `name[template]` behavior.
- The handler notification wording said `notify` must match the handler name exactly in all cases. Ansible also supports notifying handlers through `listen` topics, so I clarified that exact matching applies when notifying a handler by name.
- The inline `noqa: name[template]` example used a template at the end of the task name, which is not the current `name[template]` violation pattern. I changed the example so the template appears in the middle of the task name.

## Review Notes
The local environment did not have `ansible-lint` installed, so validation was performed against the current official ansible-lint and Ansible documentation. The Ansible module examples use valid fully qualified collection names and supported parameters. The GNU grep examples were checked against local GNU grep 3.11 syntax and the GNU grep manual.
