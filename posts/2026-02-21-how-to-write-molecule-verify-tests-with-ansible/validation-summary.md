# Validation Summary: How to Write Molecule Verify Tests with Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Molecule
- YAML playbooks
- Ansible verifier
- Ansible modules: package, service, stat, slurp, assert, service_facts, getent, command, wait_for, uri, include_tasks

## Sources Consulted
- Ansible Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Ansible check mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible error handling and failed_when documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- ansible.builtin.stat module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html
- ansible.builtin.assert module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- ansible.builtin.slurp module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/slurp_module.html
- ansible.builtin.service_facts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_facts_module.html
- ansible.builtin.service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- ansible.builtin.wait_for module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- ansible.builtin.getent module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/getent_module.html
- ansible.builtin.include_role module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_role_module.html

## Issues Found
- The file ownership, config ownership, and document root examples used list-form `failed_when` conditions where the intended logic was "fail if any condition is wrong." Ansible joins multiple `failed_when` list entries with implicit `and`, so those examples could pass when only one property was incorrect. Changed those examples to single expressions with explicit `or`.
- The idempotency section showed an `include_role` task inside `verify.yml` and registered its result to assert idempotency. This is not the right Molecule-level idempotency check, and task keywords on `include_role` do not behave like a direct re-run of the converge playbook. Replaced the example with Molecule's `idempotence` action in `test_sequence`, which is the documented scenario mechanism for checking that a second converge run reports no changes.

## Review Notes
Some examples are intentionally Linux/nginx-specific and may need adaptation for different distributions, service managers, or firewall implementations. The Ansible verifier itself remains valid, though Molecule documentation distinguishes older pre-ansible-native configuration from newer ansible-native workflows.
