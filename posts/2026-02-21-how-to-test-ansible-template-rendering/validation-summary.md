# Validation Summary: How to Test Ansible Template Rendering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Jinja2 template rendering
- Jinja2
- Python
- pytest
- Molecule
- Bash
- nginx configuration validation

## Sources Consulted
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html
- Ansible check mode and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `ansible.builtin.slurp` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/slurp_module.html
- Ansible `ansible.builtin.b64decode` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/b64decode_filter.html
- Ansible `ansible.utils.ipaddr` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/utils/ipaddr_filter.html
- Molecule configuration documentation for the Ansible verifier: https://ansible.readthedocs.io/projects/molecule/configuration/
- Jinja2 API documentation: https://jinja.palletsprojects.com/en/stable/api/
- pytest documentation: https://docs.pytest.org/en/stable/
- GNU Bash filename expansion documentation: https://www.gnu.org/software/bash/manual/html_node/Filename-Expansion.html

## Issues Found
- The `ipaddr` filter example implied a generic Ansible-provided filter without noting that current documentation places `ipaddr` in the `ansible.utils` collection. Updated the surrounding text and registered both `ipaddr` and `ansible.utils.ipaddr` in the mocked Jinja environment so templates using the current fully qualified filter name can be tested.
- The `test_all_templates.sh` loop used a Bash glob that would remain literal when no matching role test files exist. Added `shopt -s nullglob` so the discovery loop correctly handles the no-match case.

## Review Notes
The offline Python/Jinja2 examples are technically valid for template unit tests, but they do not fully reproduce Ansible's templating environment. The post already covers this limitation by recommending Ansible or mocked filters for Ansible-specific behavior and Molecule for integration validation.
