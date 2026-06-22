# Validation Summary: How to Handle Ansible Conditionals with when

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible `when` conditionals
- Jinja2 expressions, filters, and tests
- Ansible registered results
- Ansible loops, blocks, includes, and assertions
- Ansible built-in modules including `apt`, `debug`, `stat`, `template`, `command`, `service`, `user`, `file`, and `assert`

## Sources Consulted
- Ansible conditionals documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible loops documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible blocks documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_blocks.html
- Ansible version test documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/version_test.html
- Ansible tests documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tests.html
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible stat module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible assert module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible configuration reference for `ALLOW_BROKEN_CONDITIONALS`: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html#allow-broken-conditionals
- Ansible 12 porting guide, broken conditionals: https://docs.ansible.com/projects/ansible/latest/porting_guides/porting_guide_12.html#broken-conditionals
- Ansible handlers documentation, defining changed status: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html#defining-when-tasks-change
- Ansible lint `no-changed-when` rule: https://docs.ansible.com/projects/lint/rules/no-changed-when/

## Issues Found
- The "Alternative empty check" example used `when: packages is defined and packages`, which relies on the list itself as the conditional result. In current ansible-core, non-boolean conditional results are errors by default. Changed it to `packages is defined and packages | length > 0` so the condition returns a boolean.
- The complex grouped condition examples used defaulted values directly in `when` clauses. Added `| bool` to `deploy_to_staging`, `nginx_config_changed`, and `maintenance_window` so those expressions explicitly evaluate to booleans.
- The migration example checked `migration_result.changed`, but `ansible.builtin.command` cannot naturally determine whether an arbitrary command changed the system. Added a `changed_when` condition based on the command output so the subsequent conditional reflects an intentional changed status.
- The "Install packages only if defined" loop used `loop: "{{ packages }}"`. If `packages` is undefined, the loop expression fails before the per-item `when` can skip anything. Changed the loop to `{{ packages | default([]) }}` following Ansible's documented pattern for skipping a loop when the loop variable is undefined.
- The "Good example" in the common mistakes section used `when: my_var`, which can be invalid with non-boolean values in current ansible-core. Changed it to `when: my_var | bool`.

## Review Notes
- The remaining examples are broadly correct as Ansible playbook snippets, assuming the referenced variables, facts, collections, and template files exist in the user's environment.
- Several examples use legacy injected fact variable names such as `ansible_os_family`; these remain common and functional when fact injection is enabled, though Ansible's documentation often shows the `ansible_facts[...]` form.
- The `community.general.apk` example requires the `community.general` collection to be available.
