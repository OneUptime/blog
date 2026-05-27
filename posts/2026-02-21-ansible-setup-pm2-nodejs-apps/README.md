# How to Use Ansible to Set Up PM2 for Node.js Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, PM2, Node.js, Process Management, DevOps

Description: Set up PM2 process manager for Node.js applications with Ansible including cluster mode, log management, and startup scripts.

---

PM2 is the go-to process manager for Node.js applications in production. It provides process monitoring, automatic restarts on crash, cluster mode for utilizing all CPU cores, log management, and zero-downtime reloads. While you can run Node.js directly or use systemd, PM2 adds a layer of application-level process management that is specifically designed for Node.js workloads. Ansible automates the installation and configuration of PM2 across your servers.

This guide covers setting up PM2 with Ansible for single and multiple Node.js applications, including cluster mode, environment management, and monitoring.

## What PM2 Provides

- Automatic process restart on crash
- Cluster mode for multi-core utilization
- Zero-downtime reloads
- Log rotation through the pm2-logrotate module
- Process monitoring dashboard
- Startup script generation for system reboots

## Project Structure

```text
pm2-setup/
  inventory/
    hosts.yml
  group_vars/
    all.yml
  roles/
    pm2/
      tasks/
        main.yml
      templates/
        ecosystem.config.js.j2
      handlers/
        main.yml
  playbook.yml
```

## Variables

```yaml
# group_vars/all.yml

node_version: "24"
app_user: nodeapp
app_group: nodeapp

pm2_apps:
  - name: web-api
    script: server.js
    app_dir: /opt/web-api
    repo: https://github.com/yourorg/web-api.git
    branch: main
    instances: max  # Use all CPU cores
    exec_mode: cluster
    max_memory_restart: "500M"
    env:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: "postgresql://user:pass@db:5432/mydb"

  - name: worker
    script: worker.js
    app_dir: /opt/worker
    repo: https://github.com/yourorg/worker.git
    branch: main
    instances: 2
    exec_mode: fork
    max_memory_restart: "300M"
    env:
      NODE_ENV: production
      REDIS_URL: "redis://localhost:6379"

  - name: scheduler
    script: scheduler.js
    app_dir: /opt/scheduler
    repo: https://github.com/yourorg/scheduler.git
    branch: main
    instances: 1
    exec_mode: fork
    cron_restart: "0 */6 * * *"  # Restart every 6 hours
    env:
      NODE_ENV: production
```

## Role Tasks

```yaml
# roles/pm2/tasks/main.yml
---
- name: Create application group
  group:
    name: "{{ app_group }}"
    state: present

- name: Create application user
  user:
    name: "{{ app_user }}"
    group: "{{ app_group }}"
    home: "/home/{{ app_user }}"
    shell: /bin/bash
    create_home: yes

- name: Create log directory
  file:
    path: "/home/{{ app_user }}/logs"
    state: directory
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0755'

- name: Install Node.js repository
  shell: "curl -fsSL https://deb.nodesource.com/setup_{{ node_version }}.x | bash -"
  args:
    creates: /etc/apt/sources.list.d/nodesource.list

- name: Install Node.js
  apt:
    name: nodejs
    state: present
    update_cache: yes

- name: Install PM2 globally
  npm:
    name: pm2
    global: yes
    state: present

- name: Install PM2 log rotate module
  command: pm2 install pm2-logrotate
  become_user: "{{ app_user }}"
  changed_when: false

- name: Configure PM2 log rotate settings
  command: "pm2 set pm2-logrotate:{{ item.key }} {{ item.value }}"
  loop:
    - { key: "max_size", value: "50M" }
    - { key: "retain", value: "14" }
    - { key: "compress", value: "true" }
    - { key: "dateFormat", value: "YYYY-MM-DD_HH-mm-ss" }
    - { key: "rotateModule", value: "true" }
    - { key: "workerInterval", value: "30" }
  become_user: "{{ app_user }}"
  changed_when: false

- name: Clone or update application repositories
  git:
    repo: "{{ item.repo }}"
    dest: "{{ item.app_dir }}"
    version: "{{ item.branch }}"
    force: yes
  become_user: "{{ app_user }}"
  loop: "{{ pm2_apps }}"
  register: git_results

- name: Install npm dependencies for each application
  npm:
    path: "{{ item.item.app_dir }}"
    production: yes
  become_user: "{{ app_user }}"
  loop: "{{ git_results.results }}"
  when: item.changed

- name: Deploy PM2 ecosystem configuration file
  template:
    src: ecosystem.config.js.j2
    dest: "/home/{{ app_user }}/ecosystem.config.js"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0644'
  notify: reload pm2 apps

- name: Start all PM2 applications
  command: pm2 startOrReload /home/{{ app_user }}/ecosystem.config.js --update-env
  become_user: "{{ app_user }}"
  register: pm2_start
  changed_when: "'online' in pm2_start.stdout or 'reload' in pm2_start.stdout"

- name: Save PM2 process list for persistence
  command: pm2 save
  become_user: "{{ app_user }}"
  changed_when: false

- name: Generate PM2 startup script for system boot
  command: "pm2 startup systemd -u {{ app_user }} --hp /home/{{ app_user }}"
  register: pm2_startup
  changed_when: "'already' not in (pm2_startup.stdout + pm2_startup.stderr)"

- name: Verify all PM2 processes are running
  command: pm2 jlist
  become_user: "{{ app_user }}"
  register: pm2_list
  changed_when: false

- name: Display PM2 process status
  debug:
    msg: "PM2 is managing {{ (pm2_list.stdout | from_json) | length }} process(es)"
```

## PM2 Ecosystem Configuration Template

```javascript
// roles/pm2/templates/ecosystem.config.js.j2
// PM2 Ecosystem Configuration - Managed by Ansible
module.exports = {
  apps: [
{% for app in pm2_apps %}
    {
      name: {{ app.name | to_json }},
      script: {{ app.script | to_json }},
      cwd: {{ app.app_dir | to_json }},
      instances: {{ app.instances | default(1) | to_json }},
      exec_mode: {{ app.exec_mode | default("fork") | to_json }},
      max_memory_restart: {{ app.max_memory_restart | default("500M") | to_json }},
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 4000,
{% if app.cron_restart is defined %}
      cron_restart: {{ app.cron_restart | to_json }},
{% endif %}
      // Environment variables
      env: {
{% for key, value in (app.env | default({})).items() %}
        {{ key | to_json }}: {{ value | string | to_json }},
{% endfor %}
      },
      // Log configuration
      error_file: {{ ('/home/' ~ app_user ~ '/logs/' ~ app.name ~ '-error.log') | to_json }},
      out_file: {{ ('/home/' ~ app_user ~ '/logs/' ~ app.name ~ '-out.log') | to_json }},
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
{% endfor %}
  ],
};
```

## Handlers

```yaml
# roles/pm2/handlers/main.yml
---
- name: reload pm2 apps
  command: pm2 startOrReload ecosystem.config.js --update-env
  args:
    chdir: "/home/{{ app_user }}"
  become_user: "{{ app_user }}"
```

## Main Playbook

```yaml
# playbook.yml
---
- name: Set Up PM2 for Node.js Applications
  hosts: all
  become: yes
  roles:
    - pm2
```

## Zero-Downtime Deployment

PM2 supports zero-downtime reloads in cluster mode. When you deploy new code:

```yaml
# Zero-downtime deployment tasks
- name: Pull latest code
  git:
    repo: "{{ item.repo }}"
    dest: "{{ item.app_dir }}"
    version: "{{ item.branch }}"
    force: yes
  become_user: "{{ app_user }}"
  loop: "{{ pm2_apps }}"
  register: code_update
  tags: deploy

- name: Install updated dependencies
  npm:
    path: "{{ item.item.app_dir }}"
    production: yes
  become_user: "{{ app_user }}"
  loop: "{{ code_update.results }}"
  when: item.changed
  tags: deploy

- name: Reload or restart changed applications
  command: "pm2 {{ 'reload' if (item.item.exec_mode | default('fork')) == 'cluster' else 'restart' }} {{ item.item.name }} --update-env"
  become_user: "{{ app_user }}"
  loop: "{{ code_update.results }}"
  when: item.changed
  tags: deploy
```

The `pm2 reload` command can provide zero-downtime reloads for networked applications in cluster mode. Applications running in fork mode are restarted instead.

## Monitoring PM2

PM2 has a built-in monitoring dashboard:

```bash
# View running processes
pm2 list

# Real-time monitoring dashboard
pm2 monit

# View logs for all apps
pm2 logs

# View logs for a specific app
pm2 logs web-api
```

## Running the Playbook

```bash
# Set up PM2 with all configured applications
ansible-playbook -i inventory/hosts.yml playbook.yml

# Deploy only, skip initial setup
ansible-playbook -i inventory/hosts.yml playbook.yml --tags deploy
```

## Wrapping Up

PM2 is purpose-built for managing Node.js applications in production. This Ansible playbook automates the full setup: Node.js installation, PM2 configuration, ecosystem file generation, process startup, log rotation, and boot persistence. The ecosystem configuration file approach lets you define all your applications in one place, making it easy to manage multiple Node.js processes per server. Cluster mode with zero-downtime reloads means your applications stay available during deployments, which is exactly what you need in production.
