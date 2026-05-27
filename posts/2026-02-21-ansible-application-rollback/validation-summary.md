# Validation Summary: How to Use Ansible for Application Rollback

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and task files
- Ansible built-in modules: git, file, stat, copy, command, uri, wait_for, find, slurp, lineinfile, systemd
- Application deployment rollback with symlink-based releases
- Django database migration commands
- systemd service restarts

## Sources Consulted
- Ansible git module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible find module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible handler documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Django django-admin and manage.py documentation: https://docs.djangoproject.com/en/6.0/ref/django-admin/

## Issues Found
- The deployment snippet referenced `cleanup_releases.yml`, but the project structure did not include that file and no cleanup task implementation was shown. Removed the dangling include and the now-unused `keep_releases` variable so the example is internally consistent.
- The health-check failure path only failed when `auto_rollback_on_failure` was false. If automatic rollback was enabled but no previous release existed, the failed deployment could continue without failing the play. Updated the condition so the play fails when the deployment is unhealthy and rollback is disabled or unavailable.
- The standalone manual rollback playbook notified `restart application` but did not define a handler in that play. Added the handler to make the standalone playbook valid.

## Review Notes
YAML snippets parse successfully with PyYAML. `ansible-playbook --syntax-check` could not be run because Ansible is not installed in this workspace. The database rollback example is technically valid for Django's `migrate [app_label] [migration_name]` command shape, but real production rollback plans still need application-specific migration safety review because some migrations are not safely reversible.
