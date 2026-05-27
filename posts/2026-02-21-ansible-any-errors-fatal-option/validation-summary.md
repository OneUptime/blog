# Validation Summary: How to Use the any_errors_fatal Option in Ansible Playbooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible error handling
- `any_errors_fatal`
- `max_fail_percentage`
- Ansible blocks and rescue sections
- Ansible `serial` and `run_once`
- Ansible built-in modules: `command`, `service`, `apt`, `uri`, `assert`

## Sources Consulted
- Ansible Community Documentation: Error handling in playbooks, including `any_errors_fatal` and `max_fail_percentage` - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible Community Documentation: Blocks and error handling with `rescue` - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_blocks.html
- Ansible Community Documentation: Controlling playbook execution, strategies, `serial`, and `run_once` - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible Community Documentation: `ansible.builtin.uri` module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible Community Documentation: `ansible.builtin.apt` module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible Community Documentation: `ansible.builtin.service` module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_module.html

## Issues Found
- The post described `any_errors_fatal` as stopping execution "immediately." Official Ansible documentation says Ansible finishes the fatal task on all hosts in the current batch, then stops the play on all hosts and skips subsequent tasks and plays. Updated the description, explanation, flowchart, comparison section, and block-level example wording to reflect batch behavior.
- The database migration section implied that adding `any_errors_fatal` fully fixes partial schema changes. It prevents later tasks from running after a failure, but it does not roll back changes already completed on other hosts in the current batch. Updated the wording to say it prevents later tasks from running.
- The cluster upgrade example was labeled "upgrades all nodes or none" and said the entire operation stops. With `serial: 1`, earlier batches can already have completed before a later node fails, and Ansible does not automatically roll those nodes back. Updated the label and explanation to say the rollout stops before later batches and that completed earlier batches are not rolled back automatically.
- The rescue-block section implied that `any_errors_fatal` triggers and then rescue cleanup still runs. Official block documentation says rescue runs when a block task returns `failed`; if rescue succeeds, Ansible treats the rescued task as successful for the run and it does not trigger `any_errors_fatal`. Updated the explanation accordingly.

## Review Notes
The examples use short module names such as `service`, `apt`, and `uri`. Current Ansible documentation recommends fully qualified collection names for clarity, but the short names remain valid for built-in modules. The post does not pin an Ansible version, so the review used the latest official Ansible community documentation available on 2026-05-27.
