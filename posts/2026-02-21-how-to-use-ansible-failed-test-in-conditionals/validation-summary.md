# Validation Summary: How to Use Ansible failed Test in Conditionals

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible playbooks
- Ansible conditionals
- Ansible result tests
- Jinja2 test syntax
- Error handling with `ignore_errors`, `failed_when`, and block/rescue

## Sources Consulted
- Ansible `ansible.builtin.failed` test documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/failed_test.html
- Ansible playbook tests documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tests.html
- Ansible error handling documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible blocks documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible 2.4 porting guide note on `failed_when: no` and `succeeded`/`failed` tests: https://docs.ansible.com/ansible/latest/porting_guides/porting_guide_2.4.html
- Ansible `ansible.builtin.success` test documentation: https://docs.ansible.com/projects/ansible-core/2.14/collections/ansible/builtin/success_test.html
- Ansible `ansible.builtin.skipped` test documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/skipped_test.html

## Issues Found
- The post repeatedly used `failed_when: false` before later checking `result is failed`. This is incorrect in current Ansible behavior because `failed_when: false` overrides the task failure state, making `result is failed` evaluate false even for nonzero command return codes or failed module results. Replaced those examples with `ignore_errors: true` so the failed result is preserved while the play continues.
- The introduction and best-practices section incorrectly advised avoiding `ignore_errors: true` when planning to use the `failed` test. Updated the wording to explain that `ignore_errors: true` is appropriate when later conditionals need to inspect the failed result, while `failed_when` should be used for custom failure criteria.
- The decision-flow diagram incorrectly modeled `failed_when: false` as the path that preserves failed results for later handling. Updated it to show `ignore_errors: true` as the branch that allows the play to continue after a failed task.
- The skipped-task explanation said skipped tasks are neither failed nor succeeded. Official documentation is clearer that skipped tasks are not failed and should be checked with the skipped test separately. Updated the wording to avoid implying that `is succeeded` is the right discriminator for skipped results.
- The skipped-task example used an `echo` command, which could not demonstrate a failed outcome. Changed it to `/usr/bin/test -f /tmp/required-file` so the example can realistically show skipped, failed, and succeeded outcomes.
- The block/rescue rollback task name said rollback occurred when deployment was attempted, but the condition actually required `deploy_result is not failed`. Renamed the task to say rollback occurs when deployment completed.

## Review Notes
The examples now rely on `ignore_errors: true`, which can produce ignored-failure output in playbook logs. That is expected for this pattern because it preserves the registered failed status for later `is failed` conditionals. For production playbooks, authors should still prefer precise `failed_when` expressions when they want to redefine what counts as failure rather than merely continue after a real failure.
