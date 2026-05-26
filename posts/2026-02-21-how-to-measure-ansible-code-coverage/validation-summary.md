# Validation Summary: How to Measure Ansible Code Coverage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks, roles, facts, and callback plugins
- Ansible collections and modules: ansible.builtin.apt, ansible.builtin.dnf, community.general.zypper, ansible.posix.seboolean
- Coverage.py
- pytest
- Molecule
- GitHub Actions
- Python
- YAML and ansible.cfg

## Sources Consulted
- Ansible callback plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible builtin collection index: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/index.html
- ansible.builtin.dnf module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- community.general.zypper module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/zypper_module.html
- ansible.posix.seboolean module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/seboolean_module.html
- Coverage.py Coverage class API documentation: https://coverage.readthedocs.io/en/latest/api_coverage.html
- pytest invocation documentation: https://docs.pytest.org/en/stable/how-to/usage.html
- Python unittest discovery documentation: https://docs.python.org/3/library/unittest.html
- Molecule documentation: https://ansible.readthedocs.io/projects/molecule/

## Issues Found
- The custom module coverage runner used unittest discovery, but the sample tests were pytest-style classes using pytest.raises and not unittest.TestCase subclasses. Changed the runner to call pytest.main(['tests/unit']) and added pytest to the install command.
- The callback plugin defined v2_runner_on_changed, but Ansible callback plugins receive successful changed results through v2_runner_on_ok; changed status should be checked from the result object. Updated v2_runner_on_ok to use result.is_changed() and record "changed" or "ok" accordingly, and switched the callbacks to use result.task.
- The conditional coverage playbook used ansible.builtin.yum and ansible.builtin.zypper. Current ansible-core documentation lists ansible.builtin.dnf for RedHat-family package management and community.general.zypper for SUSE/openSUSE package management. Updated the snippets accordingly.
- The CI dependency installation used ansible-core but the examples referenced ansible.posix and community.general collection modules. Added an ansible-galaxy collection install step for ansible.posix and community.general, and added pytest to the Python dependencies.

## Review Notes
- The callback-plugin approach measures task result events from executed playbook runs. It is useful for finding skipped tasks in the tested inventory matrix, but it is not a full static coverage scanner for tasks that are never reached because of tags, dynamic includes, or unexecuted playbooks.
