# Validation Summary: How to Gather Custom Facts in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible local facts
- Ansible `ansible.builtin.setup` module
- Ansible `ansible.builtin.file`, `copy`, `debug`, `yum`, `unarchive`, and `template` modules
- Jinja2 templating in Ansible
- Bash executable fact scripts
- Python executable fact scripts
- JSON and INI fact file formats

## Sources Consulted
- Ansible documentation: Discovering variables, facts.d or local facts - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html#facts-d-or-local-facts
- Ansible documentation: `ansible.builtin.setup` module - https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/setup_module.html
- Ansible documentation: `ansible.builtin.to_json` filter - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/to_json_filter.html
- Ansible documentation: `ansible.builtin.yum` module redirect to `ansible.builtin.dnf` - https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/yum_module.html
- Ansible documentation: `ansible.builtin.template` module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html

## Issues Found
- Clarified that Ansible local fact files in `facts.d` must use the `.fact` filename extension. The original text referred generally to files in `/etc/ansible/facts.d/`, but the official Ansible documentation requires fact file names to end with `.fact`.
- Updated the bash executable fact script to emit JSON with Python's `json.dumps` instead of interpolating shell variables directly into a JSON heredoc. Direct interpolation can produce invalid JSON if a string contains quotes, backslashes, or other JSON-significant characters.
- Updated the Jinja2 JSON fact template to use Ansible's `to_json` filter for interpolated values. This keeps the rendered fact file valid JSON when variables or lookup results contain characters that require JSON escaping.

## Review Notes
- The use of `filter: ansible_local` with `ansible.builtin.setup` is still accepted by Ansible, although current documentation lists `filter` as a list parameter and notes that a simple string remains accepted.
- `ansible.builtin.yum` is now documented as a redirect to `ansible.builtin.dnf` in current ansible-core documentation, but the example remains technically valid because the redirect is included in ansible-core.
