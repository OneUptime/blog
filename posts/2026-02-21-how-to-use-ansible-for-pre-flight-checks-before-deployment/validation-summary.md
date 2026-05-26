# Validation Summary: How to Use Ansible for Pre-Flight Checks Before Deployment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- Ansible facts, service facts, conditionals, and playbook imports
- OpenSSL certificate checks
- PostgreSQL `psql` command-line checks
- Linux system health checks

## Sources Consulted
- Ansible `ansible.builtin.assert` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible `ansible.builtin.service_facts` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible `ansible.builtin.import_playbook` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_playbook_module.html
- Ansible `ansible.builtin.wait_for` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- OpenSSL `openssl-x509` documentation: https://docs.openssl.org/3.4/man1/openssl-x509/
- PostgreSQL `psql` documentation: https://www.postgresql.org/docs/current/app-psql.html

## Issues Found
- The SSL certificate task only printed the certificate end date with `openssl x509 -enddate`; it did not verify that the certificate was not expiring soon. Changed it to use `openssl x509 -checkend` with a default 30-day threshold so the command fails when the certificate expires within the configured window.
- The service-facts example accessed `services` directly. Updated it to `ansible_facts.services`, matching the documented service facts access pattern and avoiding reliance on injected top-level fact variables.
- The DNS checks defaulted optional hosts to `localhost` and `registry.example.com`, which could produce misleading or failing checks when those variables were not configured. Changed optional DNS checks to skip empty values.
- The artifact version URL used `app_name` but only checked that `artifact_repo_url` and `app_version` were defined. Added `app_name is defined` to the task condition.
- The PostgreSQL checks parsed default formatted `psql` output, which includes headers and footers and can make numeric assertions unreliable. Added `-t -A` and simplified the assertions to parse trimmed machine-readable output.

## Review Notes
Ansible was not installed in the local environment, so the playbooks could not be executed with `ansible-playbook --syntax-check`. The Markdown YAML snippets were parsed successfully with Python's YAML parser after the fixes.
