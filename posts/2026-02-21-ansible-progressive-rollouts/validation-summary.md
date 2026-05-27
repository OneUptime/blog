# Validation Summary: How to Implement Progressive Rollouts with Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible rolling updates with `serial`
- Ansible error handling with `block` and `rescue`
- Ansible built-in modules: `uri`, `copy`, `unarchive`, `slurp`, `pause`, `service`, `command`, `debug`, `fail`, `set_fact`
- Community Docker Ansible modules: `docker_image`, `docker_container`
- Load balancer coordination during deployments
- Canary and progressive rollout deployment patterns

## Sources Consulted
- Ansible documentation: Controlling playbook execution, strategies, and `serial` batches: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible documentation: Special variables including `ansible_play_batch`, `ansible_play_hosts`, and `ansible_play_hosts_all`: https://docs.ansible.com/ansible/latest/reference_appendices/special_variables.html
- Ansible documentation: Error handling in playbooks and `max_fail_percentage`: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible documentation: Blocks, `rescue`, and failed task handling: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_blocks.html
- Ansible documentation: `ansible.builtin.uri` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible documentation: `ansible.builtin.pause` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/pause_module.html
- Ansible documentation: `ansible.builtin.slurp` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/slurp_module.html
- Ansible documentation: `ansible.builtin.file` lookup plugin: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/file_lookup.html
- Ansible documentation: `ansible.builtin.unarchive` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/unarchive_module.html
- Ansible Community Docker documentation: `community.docker.docker_image` module: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_image_module.html
- Ansible Community Docker documentation: `community.docker.docker_container` module: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_container_module.html

## Issues Found
- The basic rollout's batch-start message used `ansible_play_hosts` where it was describing the current serial batch. Changed it to `ansible_play_batch`, which Ansible documents as the active hosts in the current serial-limited batch.
- The rollback example used `lookup('file', '/opt/app/current-version.txt')` to read the previous version. Ansible file lookups read from the controller filesystem, not the managed host, so the rollback version could be wrong or missing. Replaced it with a `slurp` pre-task that reads `/opt/app/current-version.txt` from each managed host, then sets `previous_version` from that remote content.
- The rollback example had a comment and task name saying it recorded the current version, but the task wrote `new_version` to `deploying-version.txt`. Updated the wording to say it records the deploying version.
- The manual approval prompt used `ansible_play_hosts` when listing the hosts in the completed batch. Changed it to `ansible_play_batch`.
- The manual approval condition attempted to convert `ansible_play_batch` to an integer. That variable is a list, so the condition would not correctly mean "first two batches." Changed it to check the batch length for the canary and small-batch sizes shown in the example.
- The monitoring example attempted arithmetic on `ansible_play_batch` as if it were a number. Changed it to use `ansible_play_batch | length` and renamed the metric to `ansible_rollout_batch_percent` so the value matches what the expression reports.

## Review Notes
The Docker examples use short module names (`docker_image`, `docker_container`). Current Ansible documentation recommends fully qualified collection names such as `community.docker.docker_image` and `community.docker.docker_container` to avoid ambiguity, and the `community.docker` collection must be installed because these modules are not part of `ansible-core`. The short names may still work in environments with the collection installed.
