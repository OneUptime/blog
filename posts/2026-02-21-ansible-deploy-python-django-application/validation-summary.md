# Validation Summary: How to Use Ansible to Deploy a Python Django Application

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible Vault
- Django
- Python virtual environments
- Gunicorn
- systemd socket activation
- Nginx reverse proxying
- PostgreSQL client dependencies

## Sources Consulted
- Ansible community.general.django_manage module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/django_manage_module.html
- Ansible ansible.builtin.systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible ansible.builtin.pip module documentation: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/pip_module.html
- Ansible Vault documentation: https://docs.ansible.com/ansible/6/user_guide/vault.html
- Django deployment checklist: https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/
- Django django-admin and manage.py reference: https://docs.djangoproject.com/en/4.2/ref/django-admin/
- Gunicorn deployment documentation: https://docs.gunicorn.org/en/latest/deploy.html
- systemd.socket documentation: https://www.freedesktop.org/software/systemd/man/devel/systemd.socket.html

## Issues Found
- The Django management tasks used the short `django_manage` module name. Current Ansible documentation places this module in the `community.general` collection and recommends `community.general.django_manage`, so the migration, collectstatic, and superuser examples were updated to use the fully qualified collection name.
- Because `community.general.django_manage` is not included in `ansible-core`, a short prerequisite note was added for users who need to install the `community.general` collection.
- The Gunicorn service combined systemd socket activation with an explicit `--bind unix:/run/.../gunicorn.sock` option. Gunicorn's documented systemd socket activation example lets systemd create and pass the socket, so the duplicate `--bind` setting and the now-unused `gunicorn_bind` variable were removed.
- The Gunicorn socket was owned by the Django application user. Gunicorn's deployment documentation recommends making the socket accessible to the Nginx user for proxying. The socket template now sets `SocketUser=www-data`, `SocketGroup=www-data`, and `SocketMode=0660` for Ubuntu's default Nginx user.
- The Gunicorn service wrote logs to `/var/log/{{ app_name }}` without creating that directory. A task was added to create the log directory with application ownership before the service starts.

## Review Notes
The environment-file example assumes the Django project's production settings read values such as `SECRET_KEY`, `DATABASE_URL`, `STATIC_ROOT`, and `MEDIA_ROOT` from the environment. That is a common deployment pattern, but it requires corresponding settings code or a helper such as django-environ.
