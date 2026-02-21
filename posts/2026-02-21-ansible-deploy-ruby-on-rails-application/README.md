# How to Use Ansible to Deploy a Ruby on Rails Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ruby on Rails, Deployment, Puma, DevOps

Description: Automate Ruby on Rails deployment with Ansible covering rbenv, Puma, Nginx, database migrations, and asset compilation.

---

Ruby on Rails has been a staple of web development for nearly two decades. Deploying Rails applications involves several moving parts: Ruby version management, bundle installation, database migrations, asset precompilation, a Puma application server, and an Nginx reverse proxy. Capistrano has traditionally been the deployment tool for Rails, but Ansible offers a more general-purpose approach that integrates well with your broader infrastructure automation.

This guide builds a complete Ansible playbook for deploying a Rails application to production servers.

## Prerequisites

- Ansible 2.9+ on your control node
- Ubuntu 22.04 target servers with SSH access
- A Rails application in a Git repository
- PostgreSQL database (can be on the same or a separate server)

## Project Structure

```
rails-deploy/
  inventory/
    production.yml
  group_vars/
    all/
      vars.yml
      vault.yml
  roles/
    rails_app/
      tasks/
        main.yml
        ruby.yml
        deploy.yml
        nginx.yml
      templates/
        puma.service.j2
        nginx.conf.j2
        database.yml.j2
        env.j2
      handlers/
        main.yml
  deploy.yml
```

## Variables

```yaml
# group_vars/all/vars.yml
app_name: myrailsapp
app_user: rails
app_group: rails
app_dir: /opt/myrailsapp
app_repo: https://github.com/yourorg/myrailsapp.git
app_branch: main
ruby_version: "3.2.2"
rails_env: production
server_name: myrailsapp.example.com
puma_workers: 2
puma_threads_min: 1
puma_threads_max: 5
puma_port: 3000
db_host: localhost
db_name: myrailsapp_production
db_user: myrailsapp
```

## Ruby Installation Tasks

We use rbenv to manage Ruby versions, which gives us fine-grained control.

```yaml
# roles/rails_app/tasks/ruby.yml
---
- name: Install Ruby build dependencies
  apt:
    name:
      - git
      - curl
      - autoconf
      - bison
      - build-essential
      - libssl-dev
      - libyaml-dev
      - libreadline-dev
      - zlib1g-dev
      - libncurses5-dev
      - libffi-dev
      - libgdbm-dev
      - libpq-dev
      - nodejs
      - npm
    state: present
    update_cache: yes

- name: Install Yarn package manager globally
  npm:
    name: yarn
    global: yes

- name: Clone rbenv repository
  git:
    repo: https://github.com/rbenv/rbenv.git
    dest: "/home/{{ app_user }}/.rbenv"
    version: master
  become_user: "{{ app_user }}"

- name: Clone ruby-build plugin
  git:
    repo: https://github.com/rbenv/ruby-build.git
    dest: "/home/{{ app_user }}/.rbenv/plugins/ruby-build"
    version: master
  become_user: "{{ app_user }}"

- name: Add rbenv to shell profile
  blockinfile:
    path: "/home/{{ app_user }}/.bashrc"
    block: |
      export PATH="$HOME/.rbenv/bin:$PATH"
      eval "$(rbenv init -)"
    marker: "# {mark} ANSIBLE MANAGED - rbenv"
  become_user: "{{ app_user }}"

- name: Check if Ruby version is already installed
  stat:
    path: "/home/{{ app_user }}/.rbenv/versions/{{ ruby_version }}"
  register: ruby_installed

- name: Install Ruby {{ ruby_version }} via rbenv
  shell: |
    export PATH="$HOME/.rbenv/bin:$PATH"
    eval "$(rbenv init -)"
    rbenv install {{ ruby_version }}
    rbenv global {{ ruby_version }}
  become_user: "{{ app_user }}"
  when: not ruby_installed.stat.exists

- name: Install Bundler gem
  shell: |
    export PATH="$HOME/.rbenv/bin:$PATH"
    eval "$(rbenv init -)"
    gem install bundler --no-document
  become_user: "{{ app_user }}"
  changed_when: false
```

## Application Deployment Tasks

```yaml
# roles/rails_app/tasks/deploy.yml
---
- name: Create application directory structure
  file:
    path: "{{ item }}"
    state: directory
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0755'
  loop:
    - "{{ app_dir }}"
    - "{{ app_dir }}/shared"
    - "{{ app_dir }}/shared/config"
    - "{{ app_dir }}/shared/log"
    - "{{ app_dir }}/shared/tmp"
    - "{{ app_dir }}/shared/tmp/pids"
    - "{{ app_dir }}/shared/tmp/sockets"

- name: Clone or update the Rails application
  git:
    repo: "{{ app_repo }}"
    dest: "{{ app_dir }}/current"
    version: "{{ app_branch }}"
    force: yes
  become_user: "{{ app_user }}"
  register: git_result
  notify: restart puma

- name: Deploy database configuration
  template:
    src: database.yml.j2
    dest: "{{ app_dir }}/shared/config/database.yml"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0600'

- name: Deploy environment file
  template:
    src: env.j2
    dest: "{{ app_dir }}/current/.env"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0600'
  notify: restart puma

- name: Link shared database config into the app
  file:
    src: "{{ app_dir }}/shared/config/database.yml"
    dest: "{{ app_dir }}/current/config/database.yml"
    state: link
    force: yes
  become_user: "{{ app_user }}"

- name: Install Ruby gem dependencies with Bundler
  shell: |
    export PATH="$HOME/.rbenv/bin:$PATH"
    eval "$(rbenv init -)"
    bundle install --deployment --without development test
  args:
    chdir: "{{ app_dir }}/current"
  become_user: "{{ app_user }}"
  when: git_result.changed

- name: Run database migrations
  shell: |
    export PATH="$HOME/.rbenv/bin:$PATH"
    eval "$(rbenv init -)"
    RAILS_ENV={{ rails_env }} bundle exec rails db:migrate
  args:
    chdir: "{{ app_dir }}/current"
  become_user: "{{ app_user }}"
  when: git_result.changed

- name: Precompile Rails assets
  shell: |
    export PATH="$HOME/.rbenv/bin:$PATH"
    eval "$(rbenv init -)"
    RAILS_ENV={{ rails_env }} bundle exec rails assets:precompile
  args:
    chdir: "{{ app_dir }}/current"
  become_user: "{{ app_user }}"
  when: git_result.changed
  notify: restart puma

- name: Deploy Puma systemd service
  template:
    src: puma.service.j2
    dest: /etc/systemd/system/{{ app_name }}.service
    mode: '0644'
  notify:
    - reload systemd
    - restart puma

- name: Enable and start Puma
  systemd:
    name: "{{ app_name }}"
    enabled: yes
    state: started
```

## Main Tasks Entry Point

```yaml
# roles/rails_app/tasks/main.yml
---
- include_tasks: ruby.yml
- include_tasks: deploy.yml
- include_tasks: nginx.yml
```

## Templates

Database configuration:

```yaml
# roles/rails_app/templates/database.yml.j2
production:
  adapter: postgresql
  encoding: unicode
  database: {{ db_name }}
  host: {{ db_host }}
  username: {{ db_user }}
  password: {{ vault_db_password }}
  pool: {{ puma_threads_max + 1 }}
```

Puma systemd service:

```ini
# roles/rails_app/templates/puma.service.j2
[Unit]
Description=Puma HTTP Server for {{ app_name }}
After=network.target

[Service]
Type=simple
User={{ app_user }}
Group={{ app_group }}
WorkingDirectory={{ app_dir }}/current
Environment=RAILS_ENV={{ rails_env }}
Environment=PATH=/home/{{ app_user }}/.rbenv/shims:/home/{{ app_user }}/.rbenv/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/home/{{ app_user }}/.rbenv/shims/bundle exec puma -C config/puma.rb -p {{ puma_port }}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Environment file:

```bash
# roles/rails_app/templates/env.j2
RAILS_ENV={{ rails_env }}
SECRET_KEY_BASE={{ vault_secret_key_base }}
RAILS_SERVE_STATIC_FILES=true
RAILS_LOG_TO_STDOUT=false
DATABASE_URL=postgres://{{ db_user }}:{{ vault_db_password }}@{{ db_host }}/{{ db_name }}
```

## Nginx Configuration

```yaml
# roles/rails_app/tasks/nginx.yml
---
- name: Install Nginx
  apt:
    name: nginx
    state: present

- name: Deploy Nginx site configuration
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/sites-available/{{ app_name }}
    mode: '0644'
  notify: reload nginx

- name: Enable Nginx site
  file:
    src: /etc/nginx/sites-available/{{ app_name }}
    dest: /etc/nginx/sites-enabled/{{ app_name }}
    state: link
  notify: reload nginx
```

```nginx
# roles/rails_app/templates/nginx.conf.j2
upstream {{ app_name }}_puma {
    server 127.0.0.1:{{ puma_port }};
}

server {
    listen 80;
    server_name {{ server_name }};
    root {{ app_dir }}/current/public;

    # Serve static assets directly from Nginx
    location ^~ /assets/ {
        gzip_static on;
        expires max;
        add_header Cache-Control "public, immutable";
    }

    # Try serving static files first, then proxy to Puma
    location / {
        try_files $uri @puma;
    }

    location @puma {
        proxy_pass http://{{ app_name }}_puma;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
}
```

## Handlers

```yaml
# roles/rails_app/handlers/main.yml
---
- name: reload systemd
  systemd:
    daemon_reload: yes

- name: restart puma
  systemd:
    name: "{{ app_name }}"
    state: restarted

- name: reload nginx
  systemd:
    name: nginx
    state: reloaded
```

## Running the Deployment

```bash
# Deploy the Rails application
ansible-playbook -i inventory/production.yml deploy.yml --ask-vault-pass
```

## Seed Data

For initial deployments, you might want to seed the database:

```yaml
# Seed the database on first deployment
- name: Seed the database
  shell: |
    export PATH="$HOME/.rbenv/bin:$PATH"
    eval "$(rbenv init -)"
    RAILS_ENV={{ rails_env }} bundle exec rails db:seed
  args:
    chdir: "{{ app_dir }}/current"
  become_user: "{{ app_user }}"
  when: seed_database | default(false) | bool
```

Run it with: `ansible-playbook deploy.yml -e "seed_database=true"`

## Wrapping Up

This Ansible playbook handles the complete Rails deployment pipeline: Ruby installation via rbenv, gem management with Bundler, database migrations, asset precompilation, Puma as the application server, and Nginx as the reverse proxy. Unlike Capistrano which is Ruby-specific, this Ansible approach fits naturally into your infrastructure-as-code workflow alongside server provisioning, monitoring setup, and everything else Ansible manages.
