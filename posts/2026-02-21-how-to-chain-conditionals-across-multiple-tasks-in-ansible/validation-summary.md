# Validation Summary: How to Chain Conditionals Across Multiple Tasks in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible conditionals and Jinja tests
- Registered variables
- `set_fact`
- Loops and registered loop results
- `include_tasks`
- Cross-host variables with `hostvars`
- Error handling with `failed_when` and `ignore_errors`

## Sources Consulted
- Ansible conditionals documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible test plugins documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_tests.html
- Ansible loops documentation, including registered loop results and retries: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- `ansible.builtin.set_fact` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/set_fact_module.html
- `ansible.builtin.include_tasks` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- `ansible.builtin.systemd` redirect documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_module.html
- Ansible `run_once` documentation: https://docs.ansible.com/projects/ansible/2.9/user_guide/playbooks_delegation.html#run-once

## Issues Found
- The first example used `config_apply is changed` after an `ansible.builtin.command` task without defining changed behavior. Since command tasks normally report changed when they run, I added `changed_when` based on the apply command output and adjusted the explanation to say the restart happens when the apply task reports a change.
- The deployment pipeline used `current_version is failed` after setting `failed_when: false`. That task would not be marked failed even when the command returned a non-zero exit code, so fresh installs would not be detected correctly. I changed the decision facts to test `current_version.rc != 0`.
- The health check used `retries` and `delay` without an explicit `until` condition. Current Ansible can retry without `until`, but adding `until: health_check is succeeded` makes the intended polling behavior clear and compatible with older supported Ansible behavior.
- Several examples used the older `is success` test form. It is still accepted, but Ansible's current documentation recommends the correctly tensed `is succeeded`, so I updated the examples.
- The loop example used concrete service names with a generic `{{ item.item.name }} -t` validation command, which would not be valid for all listed services. I changed the example data to include an explicit `validate_cmd` per service and used that registered item field in the command task.

## Review Notes
Ansible was not installed in the local environment, so I could not run `ansible-playbook --syntax-check`. I validated the YAML code fences with Python/PyYAML and reviewed the Ansible behavior against official documentation.
