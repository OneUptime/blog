# Validation Summary: How to Use Ansible Batch Size for Phased Rollouts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible `serial`
- Ansible failure handling with `max_fail_percentage` and `any_errors_fatal`
- Ansible magic variables
- `ansible.builtin.pause`
- `community.general.slack`

## Sources Consulted
- Ansible documentation: Controlling playbook execution, strategies, and `serial`: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible documentation: Special variables: https://docs.ansible.com/projects/ansible/latest/reference_appendices/special_variables.html
- Ansible Core documentation: Error handling in playbooks: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_error_handling.html
- Ansible documentation: `ansible.builtin.pause` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/pause_module.html
- Ansible documentation: `community.general.slack` module: https://docs.ansible.com/projects/ansible/latest/collections/community/general/slack_module.html

## Issues Found
- The post said a rollout stops if any batch fails. This was too broad without an explicit failure threshold, so it now says the rollout stops if a batch fails completely or exceeds a configured failure threshold.
- The post described `max_fail_percentage` as automatic rollback. Ansible uses this setting to abort a play after too many failures; it does not roll changes back automatically. The wording now says it stops the rollout automatically.
- The post described `ansible_play_batch` as a batch number/list index and `ansible_play_hosts` as hosts in the current batch. Official Ansible documentation defines `ansible_play_batch` as the active hosts in the current serial batch, while `ansible_play_hosts` is active hosts in the play and is not limited by `serial`. The text and debug example were corrected.
- The pause example converted `ansible_play_batch` to an integer and compared it as if it were a batch index. Since `ansible_play_batch` is a list, that condition was invalid for the described purpose. The example now relies on the pause module's documented serial behavior.
- The notification example treated `ansible_play_batch` as a batch number and calculated remaining hosts from `ansible_play_hosts_all`, which always represents all targeted hosts. The message now reports the current batch hosts and active host count accurately.

## Review Notes
The remaining batch-size examples align with Ansible's documented support for numeric, percentage, and list values for `serial`. The `community.general.slack` example requires the `community.general` collection to be available in the execution environment.
