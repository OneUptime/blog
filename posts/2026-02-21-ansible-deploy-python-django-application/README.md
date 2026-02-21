# How to Use Ansible to Deploy a Python Django Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Django, Python, Deployment, DevOps

Description: Automate Django application deployment with Ansible including database migrations, static file collection, and Gunicorn configuration.

---

Django is the go-to Python framework for building complex web applications. It comes with an ORM, admin panel, authentication system, and much more. But deploying Django properly involves multiple steps: installing dependencies, collecting static files, running migrations, configuring a WSGI server, and setting up a reverse proxy. Ansible makes all of this repeatable and reliable.

This tutorial walks through building a production-ready Ansible playbook for deploying Django applications to Ubuntu servers.

## What the Playbook Will Do

Our Ansible deployment will handle:

1. Installing system packages (Python, PostgreSQL client, Nginx)
2. Cloning the Django project from Git
3. Setting up a Python virtual environment
4. Installing Python dependencies
5. Configuring environment variables
6. Running database migrations
7. Collecting static files
8. Setting up Gunicorn as the application server
9. Configuring Nginx as the reverse proxy

## Project Structure

```
django-deploy/
  inventory/
    production.yml
  group_vars/
    all/
      vars.yml
      vault.yml
  roles/
    django_app/
      tasks/
        main.yml
      templates/
        gunicorn.service.j2
        gunicorn.socket.j2
        nginx.conf.j2
        env.j2
      handlers/
        main.yml
  deploy.yml
```

## Inventory and Variables

Define your servers and configuration variables.

```yaml
# inventory/production.yml
all:
  hosts:
    app1:
      ansible_host: 10.0.1.10
    app2:
      ansible_host: 10.0.1.11
  vars:
    ansible_user: deploy
    ansible_python_interpreter: /usr/bin/python3
```

```yaml
# group_vars/all/vars.yml - Shared configuration variables
app_name: mydjango
app_repo: https://github.com/yourorg/mydjango.git
app_branch: main
app_dir: /opt/mydjango
venv_dir: /opt/mydjango/venv
app_user: django
app_group: django
gunicorn_workers: 3
gunicorn_bind: "unix:/run/{{ app_name }}/gunicorn.sock"
server_name: mydjango.example.com
django_settings_module: mydjango.settings.production
db_host: db.example.com
db_name: mydjango
db_user: mydjango
```

Sensitive values go into an encrypted vault file:

```yaml
# group_vars/all/vault.yml (encrypted with ansible-vault)
vault_db_password: "supersecretpassword"
vault_secret_key: "django-insecure-change-this-to-something-random"
```

## The Role Tasks

Here is the main task file for the Django deployment role.

```yaml
# roles/django_app/tasks/main.yml
---
- name: Install system packages required for Django
  apt:
    name:
      - python3
      - python3-pip
      - python3-venv
      - python3-dev
      - libpq-dev
      - git
      - nginx
      - build-essential
    state: present
    update_cache: yes

- name: Create application group
  group:
    name: "{{ app_group }}"
    state: present

- name: Create application user
  user:
    name: "{{ app_user }}"
    group: "{{ app_group }}"
    home: "{{ app_dir }}"
    shell: /bin/bash
    system: yes

- name: Create application directory
  file:
    path: "{{ app_dir }}"
    state: directory
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0755'

- name: Clone the Django application repository
  git:
    repo: "{{ app_repo }}"
    dest: "{{ app_dir }}/src"
    version: "{{ app_branch }}"
    force: yes
  become_user: "{{ app_user }}"
  register: git_result
  notify: restart gunicorn

- name: Create Python virtual environment
  command: python3 -m venv {{ venv_dir }}
  args:
    creates: "{{ venv_dir }}/bin/activate"
  become_user: "{{ app_user }}"

- name: Upgrade pip in the virtual environment
  pip:
    name: pip
    state: latest
    virtualenv: "{{ venv_dir }}"
  become_user: "{{ app_user }}"

- name: Install Python dependencies
  pip:
    requirements: "{{ app_dir }}/src/requirements.txt"
    virtualenv: "{{ venv_dir }}"
  become_user: "{{ app_user }}"
  when: git_result.changed
  notify: restart gunicorn

- name: Install Gunicorn
  pip:
    name: gunicorn
    virtualenv: "{{ venv_dir }}"
  become_user: "{{ app_user }}"

- name: Deploy environment file with secrets
  template:
    src: env.j2
    dest: "{{ app_dir }}/.env"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0600'
  notify: restart gunicorn

- name: Run Django database migrations
  django_manage:
    command: migrate
    app_path: "{{ app_dir }}/src"
    virtualenv: "{{ venv_dir }}"
    settings: "{{ django_settings_module }}"
  become_user: "{{ app_user }}"
  when: git_result.changed

- name: Collect Django static files
  django_manage:
    command: collectstatic
    app_path: "{{ app_dir }}/src"
    virtualenv: "{{ venv_dir }}"
    settings: "{{ django_settings_module }}"
  become_user: "{{ app_user }}"
  when: git_result.changed

- name: Create Gunicorn runtime directory
  file:
    path: "/run/{{ app_name }}"
    state: directory
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0755'

- name: Deploy Gunicorn socket unit
  template:
    src: gunicorn.socket.j2
    dest: /etc/systemd/system/{{ app_name }}.socket
    mode: '0644'
  notify:
    - reload systemd
    - restart gunicorn socket

- name: Deploy Gunicorn service unit
  template:
    src: gunicorn.service.j2
    dest: /etc/systemd/system/{{ app_name }}.service
    mode: '0644'
  notify:
    - reload systemd
    - restart gunicorn

- name: Enable and start Gunicorn socket
  systemd:
    name: "{{ app_name }}.socket"
    enabled: yes
    state: started

- name: Deploy Nginx site configuration
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/sites-available/{{ app_name }}
    mode: '0644'
  notify: reload nginx

- name: Enable the Nginx site
  file:
    src: /etc/nginx/sites-available/{{ app_name }}
    dest: /etc/nginx/sites-enabled/{{ app_name }}
    state: link
  notify: reload nginx

- name: Remove default Nginx site
  file:
    path: /etc/nginx/sites-enabled/default
    state: absent
  notify: reload nginx
```

## Templates

The environment file template holds all Django configuration.

```bash
# roles/django_app/templates/env.j2
DJANGO_SETTINGS_MODULE={{ django_settings_module }}
SECRET_KEY={{ vault_secret_key }}
DATABASE_URL=postgres://{{ db_user }}:{{ vault_db_password }}@{{ db_host }}/{{ db_name }}
ALLOWED_HOSTS={{ server_name }}
STATIC_ROOT={{ app_dir }}/static
MEDIA_ROOT={{ app_dir }}/media
DEBUG=False
```

Gunicorn socket activation lets systemd manage the socket.

```ini
# roles/django_app/templates/gunicorn.socket.j2
[Unit]
Description={{ app_name }} gunicorn socket

[Socket]
ListenStream=/run/{{ app_name }}/gunicorn.sock
SocketUser={{ app_user }}

[Install]
WantedBy=sockets.target
```

The Gunicorn service template configures the WSGI server.

```ini
# roles/django_app/templates/gunicorn.service.j2
[Unit]
Description=Gunicorn daemon for {{ app_name }}
Requires={{ app_name }}.socket
After=network.target

[Service]
User={{ app_user }}
Group={{ app_group }}
WorkingDirectory={{ app_dir }}/src
EnvironmentFile={{ app_dir }}/.env
ExecStart={{ venv_dir }}/bin/gunicorn \
    --workers {{ gunicorn_workers }} \
    --bind {{ gunicorn_bind }} \
    --access-logfile /var/log/{{ app_name }}/access.log \
    --error-logfile /var/log/{{ app_name }}/error.log \
    {{ app_name }}.wsgi:application
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

The Nginx configuration template sets up the reverse proxy and static file serving.

```nginx
# roles/django_app/templates/nginx.conf.j2
server {
    listen 80;
    server_name {{ server_name }};
    client_max_body_size 10M;

    # Serve Django static files directly
    location /static/ {
        alias {{ app_dir }}/static/;
        expires 30d;
    }

    # Serve user-uploaded media files
    location /media/ {
        alias {{ app_dir }}/media/;
        expires 7d;
    }

    # Forward everything else to Gunicorn
    location / {
        proxy_pass http://unix:/run/{{ app_name }}/gunicorn.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Handlers

```yaml
# roles/django_app/handlers/main.yml
---
- name: reload systemd
  systemd:
    daemon_reload: yes

- name: restart gunicorn
  systemd:
    name: "{{ app_name }}"
    state: restarted

- name: restart gunicorn socket
  systemd:
    name: "{{ app_name }}.socket"
    state: restarted

- name: reload nginx
  systemd:
    name: nginx
    state: reloaded
```

## Running the Deployment

Execute the playbook with vault password:

```bash
# Deploy with vault password prompt
ansible-playbook -i inventory/production.yml deploy.yml --ask-vault-pass
```

For CI/CD pipelines, pass the vault password from a file:

```bash
# Deploy using a vault password file
ansible-playbook -i inventory/production.yml deploy.yml --vault-password-file ~/.vault_pass
```

## Adding a Pre-deployment Check

Before deploying, you might want to verify the Django configuration is valid.

```yaml
# Validate Django settings before proceeding
- name: Check Django configuration
  command: "{{ venv_dir }}/bin/python manage.py check --deploy"
  args:
    chdir: "{{ app_dir }}/src"
  become_user: "{{ app_user }}"
  environment:
    DJANGO_SETTINGS_MODULE: "{{ django_settings_module }}"
  register: django_check
  changed_when: false
```

## Creating a Superuser

If you need to create the initial admin user:

```yaml
# Create Django superuser if it does not exist
- name: Create Django superuser
  django_manage:
    command: "createsuperuser --noinput"
    app_path: "{{ app_dir }}/src"
    virtualenv: "{{ venv_dir }}"
  become_user: "{{ app_user }}"
  environment:
    DJANGO_SUPERUSER_USERNAME: admin
    DJANGO_SUPERUSER_EMAIL: admin@example.com
    DJANGO_SUPERUSER_PASSWORD: "{{ vault_admin_password }}"
  ignore_errors: yes
```

## Wrapping Up

Deploying Django with Ansible gives you a repeatable, auditable process that works the same every time. The combination of Gunicorn with socket activation and Nginx as a reverse proxy is a battle-tested production setup. The playbook handles everything from system packages to database migrations, and by using Ansible Vault for secrets, your credentials stay encrypted at rest. You can extend this with SSL configuration, Celery worker management, or Redis cache setup as your application grows.
