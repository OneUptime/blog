# Validation Summary: How to Use the map Filter in Ansible Templates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Jinja2 templates and filters
- YAML playbooks
- Ansible modules: `ansible.builtin.template`, `ansible.builtin.set_fact`, `ansible.builtin.apt`, `ansible.builtin.systemd`, `ansible.posix.authorized_key`
- Nginx and Prometheus configuration generation examples

## Sources Consulted
- Jinja Template Designer Documentation: `map`, `unique`, `truncate`, and related built-in filters: https://jinja.palletsprojects.com/en/stable/templates/
- Ansible `ansible.builtin.map` filter documentation: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/map_filter.html
- Ansible filters guide: https://docs.ansible.com/projects/ansible-core/2.19/playbook_guide/playbooks_filters.html
- Ansible templating guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_templating.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `ansible.builtin.set_fact` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible `ansible.builtin.regex_replace` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/regex_replace_filter.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.posix.authorized_key` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/authorized_key_module.html

## Issues Found
- Corrected the introductory description of `map`. The post said `map` returns a new list, but Jinja documents it as generator-comprehension-like behavior, and Ansible documents it as the Jinja built-in `map` filter.
- Refined the note about `| list`. The original wording implied that a mapped iterable generally cannot be serialized or iterated without `| list`; the corrected wording distinguishes cases that need a concrete list from filters such as `join` that can consume the iterable directly.
- Fixed a misleading Prometheus example. The `set_fact` task was named and commented as if it built `ip:port` scrape target strings, but the expression only extracted IP addresses. The task now describes and stores an IP list, while keeping the later `ip:port` loop example.
- Replaced the recommendation to use a "list comprehension" for derived `ip:port` strings. Python-style list comprehensions are not standard Jinja template syntax, so the post now recommends a loop or another transformation approach.
- Adjusted the performance section. The original statement claimed `map` is more efficient than a Jinja2 loop because it operates at the Python level. Official documentation supports the lazy iterable behavior, but not that broad performance claim, so the section now focuses on clarity and lazy evaluation until consuming filters run.

## Review Notes
Ansible was not installed in the local environment, so examples were reviewed against official documentation rather than executed with `ansible-playbook`. Jinja2 3.1.2 was available locally for spot-checking general Jinja filter behavior.
