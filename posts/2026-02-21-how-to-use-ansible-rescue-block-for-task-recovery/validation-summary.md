# Validation Summary: How to Use Ansible rescue Block for Task Recovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible block/rescue error handling
- Ansible built-in modules: command, debug, get_url, unarchive, copy, uri, lineinfile, set_fact, template, systemd_service
- community.general archive module
- community.docker docker_image and docker_container modules
- Slack incoming webhooks
- PagerDuty Events API v2
- Datadog Agent installation

## Sources Consulted
- Ansible blocks documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible error handling documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_error_handling.html
- Ansible retries/until documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- ansible.builtin.systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- ansible.builtin.uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- community.general.archive module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/archive_module.html
- community.docker.docker_image module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_module.html
- community.docker.docker_container module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- Datadog Agent upgrade/install documentation: https://docs.datadoghq.com/agent/guide/upgrade/
- Slack incoming webhooks documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- PagerDuty Events API v2 documentation: https://developer.pagerduty.com/docs/events-api-v2/trigger-events/

## Issues Found
- The description of rescue behavior was too broad. Ansible rescue only runs when a task returns a failed state; invalid task definitions and unreachable hosts do not trigger rescue. Updated the explanation to include those exceptions.
- The post said a successful rescue makes the play continue "as if nothing went wrong." Ansible continues as if the task succeeded, but still reports the original failure in play recap statistics. Updated the wording.
- The rollback example used `ansible.builtin.archive`, but current Ansible documentation places `archive` in the `community.general` collection. Changed it to `community.general.archive`.
- The examples used `ansible.builtin.systemd`, which is now a backward-compatible alias for `ansible.builtin.systemd_service`. Updated examples to the current FQCN.
- The Datadog fallback example used an older S3 installer URL. Updated it to the current Datadog Agent 7 installer URL and invoked it with `bash`, matching Datadog's documented installation pattern.
- The Slack webhook payload included `channel`, but Slack incoming webhooks cannot override the channel chosen when the webhook is configured. Removed the `channel` field.

## Review Notes
All YAML code blocks parse successfully with PyYAML. `ansible-playbook --syntax-check` could not be run because Ansible is not installed in the workspace. The `community.docker.docker_image` examples remain technically valid, though current documentation recommends more specific image modules such as `community.docker.docker_image_pull` for new playbooks.
