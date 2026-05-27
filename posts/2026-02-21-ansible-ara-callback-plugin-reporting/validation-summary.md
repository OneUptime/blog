# Validation Summary: How to Use the Ansible ara Callback Plugin for Reporting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible callback, action, and lookup plugins
- ARA Records Ansible
- ARA CLI and ara-manage
- ARA REST API
- Django/Gunicorn deployment
- Nginx reverse proxy configuration
- Docker Compose and PostgreSQL
- GitLab CI environment variables

## Sources Consulted
- ARA official documentation: https://ara.readthedocs.io/en/latest/
- ARA Ansible plugin configuration: https://ara.readthedocs.io/en/latest/ansible-configuration.html
- ARA plugins and use cases: https://ara.readthedocs.io/en/latest/ansible-plugins-and-use-cases.html
- ARA CLI documentation: https://ara.readthedocs.io/en/latest/cli.html
- ARA API server configuration: https://ara.readthedocs.io/en/latest/api-configuration.html
- ARA API documentation: https://ara.readthedocs.io/en/latest/api-documentation.html
- ARA container image documentation: https://ara.readthedocs.io/en/latest/container-images.html
- ARA GitHub project README: https://github.com/ansible-community/ara
- Ansible callback plugin documentation: https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- Local verification with ARA 1.7.5 command help for `ara playbook prune`, `ara playbook list`, `ara task list`, and `ara result list`.

## Issues Found
- The post expanded ARA as "Ansible Run Analysis"; current official documentation defines ARA as "ARA Records Ansible." Updated the introduction.
- The introduction claimed the callback captures "every detail." Softened this to "playbook execution data" because ARA can ignore selected facts, files, and arguments by configuration.
- The `ansible.cfg` example put `database = /var/lib/ara/ansible.sqlite` under `[ara]`, but the SQLite database path is an API server setting, not an Ansible callback setting. Replaced it with `ARA_DATABASE_NAME`.
- The `ansible.cfg` example only showed callback plugins. Added optional action and lookup plugin paths and pointed readers to `python3 -m ara.setup.ansible`, which is the official helper for generating all Ansible plugin paths.
- The production setup did not align the Nginx static alias with ARA's `STATIC_ROOT` when using `/var/lib/ara` as the base directory, and it omitted the host allow-list needed when serving a Django app on `ara.example.com`. Added `ARA_BASE_DIR`, `ARA_ALLOWED_HOSTS`, an explicit WSGI application target, and corrected the static alias to `/var/lib/ara/www/static/`.

## Review Notes
The remaining commands and examples match current ARA 1.7.5 documentation or CLI help. For a production deployment, authentication, TLS, secret management, and sensitive data exclusion should be configured before exposing ARA broadly.
