# Validation Summary: How to Use Ansible with JIRA for Ticketing Integration

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- Ansible playbooks and task includes
- `community.general.jira`
- Jira issue creation, comments, and workflow transitions
- Ansible facts, handlers, and common built-in modules
- `community.general.ufw`
- `community.general.timezone`
- `ansible.builtin.uri`
- `ansible.builtin.cron`

## Sources Consulted
- Ansible `community.general.jira` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/jira_module.html
- Ansible `ansible.builtin.include_tasks` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible `ansible.builtin.hostname` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Atlassian Jira Cloud basic authentication documentation: https://developer.atlassian.com/cloud/jira/service-desk/jira-rest-api-basic-authentication
- Atlassian Jira Cloud issue comments REST API documentation: https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-comments/

## Issues Found
- The infrastructure provisioning example used `ansible.builtin.timezone`, but the current fully qualified module name is `community.general.timezone`. Updated the snippet to use `community.general.timezone`.
- The full deployment playbook referenced `jira_ticket_key` in later included tasks but never set it from the ticket creation result. Added a `set_fact` task that stores `jira_ticket.meta.key` as `jira_ticket_key`.
- The full deployment playbook said it would update and close the ticket but only included the transition task. Added the `tasks/jira-update.yml` include before the transition include.
- The update task used `ansible_play_hosts | length`, which would report `1` when run from the localhost ticket-update play. Changed the update snippet to accept `servers_updated` with a fallback, and set `servers_updated` in the full playbook from the `app_servers` inventory group.
- The update task required `deploy_duration`, which was not defined in the full playbook. Added a `default('not recorded')` fallback so the example does not fail when duration tracking is omitted.
- The transition examples used literal `status` values that could be mistaken for Jira issue statuses. The Ansible module's `status` parameter is the workflow transition name, so the examples now use configurable transition variables with defaults.

## Review Notes
- The Jira transition names `Done` and `Blocked` are workflow-specific defaults in the example. Real Jira projects may need different transition names or `status_id` values.
- `community.general.jira` is part of the `community.general` collection, not `ansible-core`; users need that collection installed.
- Could not run `ansible-playbook --syntax-check` locally because `ansible-playbook` is not installed in this environment.
