# Validation Summary: How to Test Custom Ansible Modules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible custom modules
- Ansible collection testing
- ansible-test
- pytest
- YAML playbook integration tests

## Sources Consulted
- Ansible Community Documentation: Add unit tests to a collection: https://docs.ansible.com/projects/ansible/latest/community/collection_contributors/collection_unit_tests.html
- Ansible Community Documentation: Unit Testing Ansible Modules: https://docs.ansible.com/projects/ansible/latest/dev_guide/testing_units_modules.html
- Ansible Community Documentation: Unit Tests: https://docs.ansible.com/projects/ansible/latest/dev_guide/testing_units.html
- Ansible Community Documentation: Integration tests: https://docs.ansible.com/projects/ansible/latest/dev_guide/testing_integration.html
- Ansible Community Documentation: Sanity Tests: https://docs.ansible.com/projects/ansible/latest/dev_guide/testing/sanity/index.html
- Ansible Community Documentation: validate-modules sanity test: https://docs.ansible.com/projects/ansible/devel/dev_guide/testing/sanity/validate-modules.html

## Issues Found
- The unit test example and pytest command used `tests/unit`, but Ansible collection unit tests are documented under `tests/units`, with module tests commonly placed in `tests/units/plugins/modules/`. Updated the code comment to `tests/units/plugins/modules/test_my_module.py` and the pytest command to `pytest tests/units/ -v`.

## Review Notes
The remaining examples are technically valid as concise patterns. The unit-test snippet is intentionally skeletal and assumes a `plugins.modules.my_module` import path available in the test environment; a real collection test may prefer the fully qualified `ansible_collections.<namespace>.<collection>.plugins.modules...` import path.
