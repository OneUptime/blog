# How to Use Ansible to Deploy a Python Flask Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Flask, Python, Deployment, DevOps

Description: Learn how to automate the deployment of a Python Flask application using Ansible playbooks with Gunicorn and Nginx.

---

Flask is one of the most popular Python web frameworks. It is lightweight, flexible, and great for building REST APIs, microservices, and full web applications. Deploying Flask apps manually across multiple servers is tedious and error-prone. Ansible solves this by letting you define the entire deployment process as code.

In this guide, we will walk through building an Ansible playbook that installs Python, sets up a virtual environment, deploys your Flask code, configures Gunicorn as the WSGI server, and puts Nginx in front as a reverse proxy.

## Prerequisites

Before starting, you need:

- Ansible 2.9+ installed on your control node
- One or more Ubuntu 22.04 target servers
- SSH access with a user that has sudo privileges
- A Flask application in a Git repository

## Project Layout

Here is the directory structure for our Ansible project:

```
flask-deploy/
  inventory/
    hosts.yml
  roles/
    flask_app/
      tasks/
        main.yml
      templates/
        gunicorn.service.j2
        nginx.conf.j2
      handlers/
        main.yml
  deploy.yml
```

## Setting Up the Inventory

Define your target servers in the inventory file.

```yaml
# inventory/hosts.yml
all:
  hosts:
    web1:
      ansible_host: 192.168.1.10
      ansible_user: deploy
    web2:
      ansible_host: 192.168.1.11
      ansible_user: deploy
  vars:
    app_name: myflaskapp
    app_repo: https://github.com/yourorg/myflaskapp.git
    app_branch: main
    app_dir: /opt/myflaskapp
    venv_dir: /opt/myflaskapp/venv
    app_user: www-data
    app_port: 8000
    server_name: myflaskapp.example.com
```

## The Main Playbook

This is the entry point that ties everything together.

```yaml
# deploy.yml - Main playbook that orchestrates the entire deployment
---
- name: Deploy Flask Application
  hosts: all
  become: yes
  roles:
    - flask_app
```

## Role Tasks

The core of the deployment lives in the role tasks. We will break this into logical sections.

```yaml
# roles/flask_app/tasks/main.yml
---
- name: Update apt cache
  apt:
    update_cache: yes
    cache_valid_time: 3600

- name: Install system dependencies
  apt:
    name:
      - python3
      - python3-pip
      - python3-venv
      - git
      - nginx
    state: present

- name: Create application user group
  group:
    name: "{{ app_user }}"
    state: present

- name: Create application directory
  file:
    path: "{{ app_dir }}"
    state: directory
    owner: "{{ app_user }}"
    group: "{{ app_user }}"
    mode: '0755'

- name: Clone or update the Flask application from Git
  git:
    repo: "{{ app_repo }}"
    dest: "{{ app_dir }}"
    version: "{{ app_branch }}"
    force: yes
  become_user: "{{ app_user }}"
  notify: restart gunicorn

- name: Create Python virtual environment
  command: python3 -m venv {{ venv_dir }}
  args:
    creates: "{{ venv_dir }}/bin/activate"
  become_user: "{{ app_user }}"

- name: Install Python dependencies from requirements.txt
  pip:
    requirements: "{{ app_dir }}/requirements.txt"
    virtualenv: "{{ venv_dir }}"
  become_user: "{{ app_user }}"
  notify: restart gunicorn

- name: Install Gunicorn in the virtual environment
  pip:
    name: gunicorn
    virtualenv: "{{ venv_dir }}"
  become_user: "{{ app_user }}"

- name: Deploy Gunicorn systemd service file
  template:
    src: gunicorn.service.j2
    dest: /etc/systemd/system/{{ app_name }}.service
    mode: '0644'
  notify:
    - reload systemd
    - restart gunicorn

- name: Enable and start Gunicorn service
  systemd:
    name: "{{ app_name }}"
    enabled: yes
    state: started

- name: Deploy Nginx configuration
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/sites-available/{{ app_name }}
    mode: '0644'
  notify: reload nginx

- name: Enable Nginx site by creating symlink
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

## Gunicorn Systemd Service Template

This template creates a systemd unit file that manages Gunicorn as a background service.

```ini
# roles/flask_app/templates/gunicorn.service.j2
[Unit]
Description=Gunicorn instance to serve {{ app_name }}
After=network.target

[Service]
User={{ app_user }}
Group={{ app_user }}
WorkingDirectory={{ app_dir }}
Environment="PATH={{ venv_dir }}/bin"
ExecStart={{ venv_dir }}/bin/gunicorn --workers 3 --bind 0.0.0.0:{{ app_port }} wsgi:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

The `wsgi:app` part assumes your Flask app has a `wsgi.py` file with an `app` object. Adjust this to match your project structure, for example `app:create_app()` if you use a factory pattern.

## Nginx Configuration Template

Nginx sits in front of Gunicorn and handles static files, SSL termination, and request buffering.

```nginx
# roles/flask_app/templates/nginx.conf.j2
server {
    listen 80;
    server_name {{ server_name }};

    # Serve static files directly through Nginx
    location /static/ {
        alias {{ app_dir }}/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Proxy all other requests to Gunicorn
    location / {
        proxy_pass http://127.0.0.1:{{ app_port }};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
    }
}
```

## Handlers

Handlers run only when notified by a task that made changes.

```yaml
# roles/flask_app/handlers/main.yml
---
- name: reload systemd
  systemd:
    daemon_reload: yes

- name: restart gunicorn
  systemd:
    name: "{{ app_name }}"
    state: restarted

- name: reload nginx
  systemd:
    name: nginx
    state: reloaded
```

## Running the Deployment

Execute the playbook with:

```bash
# Run the full deployment against all hosts in the inventory
ansible-playbook -i inventory/hosts.yml deploy.yml
```

If you want to deploy to a specific server only:

```bash
# Target a single host
ansible-playbook -i inventory/hosts.yml deploy.yml --limit web1
```

## Adding Environment Variables

Most Flask apps need environment variables for database URLs, secret keys, and other configuration. Add a task to manage a `.env` file.

```yaml
# Task to deploy environment variables from Ansible vault
- name: Deploy environment configuration file
  template:
    src: env.j2
    dest: "{{ app_dir }}/.env"
    owner: "{{ app_user }}"
    group: "{{ app_user }}"
    mode: '0600'
  notify: restart gunicorn
```

And the corresponding template:

```bash
# roles/flask_app/templates/env.j2
FLASK_APP=wsgi.py
FLASK_ENV=production
SECRET_KEY={{ flask_secret_key }}
DATABASE_URL={{ database_url }}
```

Store sensitive values in Ansible Vault:

```bash
# Encrypt your variables file
ansible-vault encrypt inventory/group_vars/all/vault.yml
```

## Database Migration Support

If your Flask app uses Flask-Migrate or Alembic, add a migration task after the code update:

```yaml
# Run database migrations after deploying new code
- name: Run database migrations
  command: "{{ venv_dir }}/bin/flask db upgrade"
  args:
    chdir: "{{ app_dir }}"
  become_user: "{{ app_user }}"
  environment:
    FLASK_APP: wsgi.py
  when: run_migrations | default(true)
```

## Smoke Test After Deployment

It is a good practice to verify the deployment worked before moving to the next server.

```yaml
# Verify the application responds correctly after deployment
- name: Wait for application to start
  wait_for:
    port: "{{ app_port }}"
    delay: 5
    timeout: 30

- name: Check application health endpoint
  uri:
    url: "http://localhost:{{ app_port }}/health"
    status_code: 200
  register: health_check
  retries: 3
  delay: 5
```

## Serial Deployment for Zero Downtime

When deploying to multiple servers behind a load balancer, use serial deployment so not all servers go down at once.

```yaml
# deploy.yml - Deploy one server at a time
---
- name: Deploy Flask Application
  hosts: all
  become: yes
  serial: 1
  roles:
    - flask_app
```

Setting `serial: 1` means Ansible will fully deploy to one server before moving to the next. This ensures your application stays available throughout the deployment.

## Wrapping Up

With this Ansible setup, deploying a Flask application becomes a single command. The playbook handles everything from installing system packages to configuring Nginx as a reverse proxy. You get repeatable, consistent deployments across any number of servers.

The key pieces are: system package installation, Python virtual environment management, Gunicorn as the WSGI server managed by systemd, Nginx as the reverse proxy, and handler-based service restarts. From here, you can extend this with SSL/TLS configuration, monitoring integration, or blue-green deployment strategies.
