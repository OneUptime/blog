# Validation Summary: How to Use Ansible retries and delay with until Loop

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible `until`, `retries`, and `delay`
- `ansible.builtin.uri`
- `ansible.builtin.wait_for`
- `ansible.builtin.command`
- `ansible.builtin.debug`
- `ansible.builtin.set_fact`
- `community.postgresql.postgresql_query`
- `community.postgresql.postgresql_db`
- `community.postgresql.postgresql_user`
- PostgreSQL command-line readiness checks

## Sources Consulted
- Ansible documentation, "Retrying a task until a condition is met": https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_loops.html#retrying-a-task-until-a-condition-is-met
- Ansible documentation, "Error handling in playbooks": https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible documentation, `ansible.builtin.uri` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible documentation, `ansible.builtin.wait_for` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible documentation, `community.postgresql.postgresql_query` module: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_query_module.html
- Ansible documentation, `community.postgresql.postgresql_db` module: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_db_module.html
- Ansible documentation, `community.postgresql.postgresql_user` module: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_user_module.html

## Issues Found
- The default retry timing description incorrectly said 3 attempts with a 5-second delay gives about 15 seconds. Ansible runs the first attempt immediately and delays only between attempts, so this is about 10 seconds plus task execution time. Updated the explanation.
- The quick-reference wait-time examples counted one extra delay interval. Updated the examples to use `(retries - 1) * delay`.
- The progressive-delay example used `loop` and `delay: "{{ item }}"` in a way that would not provide true exponential backoff for a single retry operation. Replaced it with guidance to delegate true exponential backoff to a script or custom module.
- The payment API example claimed immediate 4xx failure and used `payment is succeeded`, which could conflict with the custom `failed_when` logic. Updated the condition to check accepted HTTP status codes directly and revised the explanation.
- The PostgreSQL examples used the deprecated `db` alias for modules where current documentation recommends `login_db`. Updated those examples to use `login_db`.

## Review Notes
The post is technically relevant and the remaining examples align with current Ansible retry behavior and documented module parameters. The examples are illustrative and depend on local services, credentials, collections, and application-specific commands being present in the user's environment.
