# Validation Summary: How to Use Ansible to Deploy Django Applications

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Ansible playbooks, inventory, handlers, modules, and CLI usage
- Python virtual environments and pip
- Django deployment, migrations, static files, and WSGI
- Gunicorn application serving
- systemd service units
- Nginx reverse proxy and static file serving
- UFW firewall configuration
- Cron scheduling

## Sources Consulted
- Ansible `ansible.builtin.pip` module documentation: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/pip_module.html
- Ansible `ansible.builtin.git` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible check and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible error handling and `changed_when` documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_error_handling.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Django WSGI deployment documentation: https://docs.djangoproject.com/en/dev/howto/deployment/wsgi/
- Django Gunicorn deployment documentation: https://docs.djangoproject.com/en/3.2/howto/deployment/wsgi/gunicorn/
- Django static files deployment documentation: https://docs.djangoproject.com/en/dev/howto/static-files/deployment/
- Django deployment checklist: https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/
- Gunicorn deployment documentation: https://gunicorn.org/deploy/
- Nginx reverse proxy documentation: https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy
- Nginx static content documentation: https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/
- systemd service and execution documentation: https://www.freedesktop.org/software/systemd/man/249/systemd.service.html and https://www.freedesktop.org/software/systemd/man/249/systemd.exec.html

## Issues Found
- The main playbook used `ansible.builtin.git` but did not install the `git` package on managed hosts. Added `git` to the system dependencies.
- The package names and Nginx site layout were Debian/Ubuntu-specific, but the text presented them generically. Clarified that the package example applies to Debian or Ubuntu servers.
- The post title and description promised database migrations and static file collection, but the playbook did neither. Added `manage.py migrate --noinput` and `manage.py collectstatic --noinput` tasks with `changed_when` handling.
- The systemd service used `python -m {{ app_name }}.main`, which is not the standard way to serve a Django application in production. Added Gunicorn installation and changed the service to run `{{ django_project }}.wsgi:application` through Gunicorn.
- The service start task could run before systemd knew about the newly copied unit file. Added `daemon_reload: true` to the start task.
- The health check could run before notified service and Nginx handlers had executed. Added a `meta: flush_handlers` task before verification.
- Static files were collected but not served by Nginx. Added a `/static/` `alias` location pointing at the configured static directory.
- The infrastructure example hard-coded `sshd`, which is incorrect on Debian/Ubuntu systems where the service is usually `ssh`. Changed the handler to select `ssh` for Debian-family systems and `sshd` otherwise.
- The cron example copied a script into `/opt/scripts` without creating that directory first. Added a directory creation task.
- The summary still said migrations were future work after they were added. Updated it to accurately describe the deployment pipeline.

## Review Notes
The corrected playbook assumes the Django project has production settings that define `STATIC_ROOT` consistently with the `static_dir` variable or read it from the deployed environment file. Local `ansible-playbook --syntax-check` could not be run because `ansible-playbook` is not installed in this workspace.
