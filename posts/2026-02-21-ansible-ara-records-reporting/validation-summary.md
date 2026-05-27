# Validation Summary: How to Use Ansible with ARA Records Ansible for Reporting

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ARA Records Ansible
- ARA API server and REST API
- systemd
- YAML
- Cron

## Sources Consulted
- ARA Records Ansible documentation: Ansible configuration to use ara - https://ara.readthedocs.io/en/latest/ansible-configuration.html
- ARA Records Ansible documentation: Ansible plugins and use cases - https://ara.readthedocs.io/en/latest/ansible-plugins-and-use-cases.html
- ARA Records Ansible documentation: API documentation - https://ara.readthedocs.io/en/latest/api-documentation.html
- ARA Records Ansible documentation: API server configuration - https://ara.readthedocs.io/en/latest/api-configuration.html
- ARA Records Ansible documentation: CLI and ara-manage - https://ara.readthedocs.io/en/latest/cli.html
- ARA Records Ansible FAQ - https://ara.readthedocs.io/en/latest/faq.html
- Ansible configuration settings documentation - https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible callback plugins documentation - https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- community.general.timezone module documentation - https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html

## Issues Found
- The ARA server setup started `ara-manage runserver` against `/var/lib/ara/ansible.sqlite` without ensuring the parent directory existed or running database migrations first. ARA's `ara-manage migrate` documentation states migrations need to run at least once before the API server can start, so I added a task to create `/var/lib/ara` and a migration task using the same `ARA_DATABASE_NAME` as the systemd service.
- The provisioning example used `ansible.builtin.timezone`, but current Ansible documentation lists the timezone module as `community.general.timezone`, not part of `ansible-core`. I changed the module FQCN to `community.general.timezone`.

## Review Notes
- The example uses Django's embedded `ara-manage runserver`, which ARA documents as suitable for small-scale usage. For production, ARA recommends deploying with a WSGI application server and web server.
- The ARA callback configuration and API endpoint examples match current ARA documentation for using `callback_plugins`, `api_client = http`, `api_server`, and `/api/v1/playbooks`.
