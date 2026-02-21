# How to Use Ansible to Manage PM2 Node.js Processes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, PM2, Node.js, Process Management, DevOps

Description: Learn how to install PM2, deploy Node.js applications, and manage process lifecycles with Ansible for reliable production Node.js deployments.

---

PM2 is the de facto process manager for Node.js applications in production. It handles process spawning, automatic restarts on crash, log management, cluster mode for multi-core utilization, and zero-downtime reloads. While Ansible does not have a built-in PM2 module, managing PM2 through the `command` and `shell` modules works well and can be wrapped into reusable roles.

In this guide, I will walk through setting up PM2 with Ansible, deploying applications, managing the process lifecycle, and integrating with systemd for boot persistence.

## Installing Node.js and PM2

First, set up the environment.

Install Node.js via NodeSource and PM2 globally:

```yaml
---
- name: Install Node.js and PM2
  hosts: app_servers
  become: yes
  tasks:
    - name: Install NodeSource repository
      ansible.builtin.shell: |
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
      args:
        creates: /etc/apt/sources.list.d/nodesource.list

    - name: Install Node.js
      ansible.builtin.apt:
        name: nodejs
        state: present
        update_cache: yes

    - name: Install PM2 globally
      ansible.builtin.npm:
        name: pm2
        global: yes
        state: present

    - name: Verify PM2 installation
      ansible.builtin.command: pm2 --version
      register: pm2_version
      changed_when: false

    - name: Show PM2 version
      ansible.builtin.debug:
        msg: "PM2 version: {{ pm2_version.stdout }}"
```

## PM2 Ecosystem File

PM2 uses an ecosystem file to define application configurations. This is the preferred way to manage PM2 applications because it provides a single source of truth for all process settings.

Deploy a PM2 ecosystem configuration file:

```yaml
- name: Deploy PM2 ecosystem file
  ansible.builtin.template:
    src: ecosystem.config.js.j2
    dest: "{{ app_dir }}/ecosystem.config.js"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0644'
```

The ecosystem template:

```javascript
// roles/pm2_app/templates/ecosystem.config.js.j2
module.exports = {
  apps: [
{% for app in pm2_apps %}
    {
      name: '{{ app.name }}',
      script: '{{ app.script }}',
      cwd: '{{ app.cwd | default(app_dir) }}',
      instances: {{ app.instances | default(1) }},
      exec_mode: '{{ app.exec_mode | default("fork") }}',
      max_memory_restart: '{{ app.max_memory | default("512M") }}',
      env: {
        NODE_ENV: '{{ app.node_env | default("production") }}',
{% if app.env is defined %}
{% for key, value in app.env.items() %}
        {{ key }}: '{{ value }}',
{% endfor %}
{% endif %}
      },
      // Logging
      log_file: '/var/log/pm2/{{ app.name }}-combined.log',
      out_file: '/var/log/pm2/{{ app.name }}-out.log',
      error_file: '/var/log/pm2/{{ app.name }}-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Restart behavior
      max_restarts: {{ app.max_restarts | default(10) }},
      min_uptime: '{{ app.min_uptime | default("5s") }}',
      restart_delay: {{ app.restart_delay | default(4000) }},
      // Watch (only for development)
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git'],
    },
{% endfor %}
  ]
};
```

## Starting Applications

Use the ecosystem file to start all defined applications.

Start PM2 applications from the ecosystem file:

```yaml
- name: Create PM2 log directory
  ansible.builtin.file:
    path: /var/log/pm2
    state: directory
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0755'

- name: Start applications with PM2
  ansible.builtin.command: "pm2 start {{ app_dir }}/ecosystem.config.js"
  become: yes
  become_user: "{{ app_user }}"
  register: pm2_start
  changed_when: "'[PM2]' in pm2_start.stdout"
```

## Managing the Process Lifecycle

Common PM2 operations through Ansible:

```yaml
# Stop a specific application
- name: Stop the API server
  ansible.builtin.command: "pm2 stop api-server"
  become: yes
  become_user: "{{ app_user }}"

# Restart a specific application
- name: Restart the API server
  ansible.builtin.command: "pm2 restart api-server"
  become: yes
  become_user: "{{ app_user }}"

# Reload with zero downtime (cluster mode only)
- name: Zero-downtime reload
  ansible.builtin.command: "pm2 reload api-server"
  become: yes
  become_user: "{{ app_user }}"

# Delete a process from PM2
- name: Remove old worker from PM2
  ansible.builtin.command: "pm2 delete old-worker"
  become: yes
  become_user: "{{ app_user }}"
  ignore_errors: yes

# Restart all applications
- name: Restart all PM2 processes
  ansible.builtin.command: "pm2 restart all"
  become: yes
  become_user: "{{ app_user }}"
```

## Zero-Downtime Deployments

PM2's reload command in cluster mode gives you zero-downtime deployments. It restarts workers one at a time, waiting for each new worker to be ready before killing the old one.

Deploy and reload with zero downtime:

```yaml
---
- name: Zero-downtime deployment
  hosts: app_servers
  become: yes

  vars:
    app_user: nodeapp
    app_dir: /opt/myapp

  tasks:
    - name: Pull latest code
      ansible.builtin.git:
        repo: "{{ git_repo }}"
        dest: "{{ app_dir }}"
        version: "{{ deploy_version }}"
        force: yes
      become_user: "{{ app_user }}"

    - name: Install dependencies
      ansible.builtin.command: npm ci --production
      args:
        chdir: "{{ app_dir }}"
      become_user: "{{ app_user }}"

    - name: Deploy ecosystem file
      ansible.builtin.template:
        src: ecosystem.config.js.j2
        dest: "{{ app_dir }}/ecosystem.config.js"
        owner: "{{ app_user }}"

    - name: Check if PM2 processes exist
      ansible.builtin.command: "pm2 jlist"
      become_user: "{{ app_user }}"
      register: pm2_list
      changed_when: false

    - name: Reload if processes exist (zero downtime)
      ansible.builtin.command: "pm2 reload {{ app_dir }}/ecosystem.config.js"
      become_user: "{{ app_user }}"
      when: pm2_list.stdout != '[]'

    - name: Start if no processes exist
      ansible.builtin.command: "pm2 start {{ app_dir }}/ecosystem.config.js"
      become_user: "{{ app_user }}"
      when: pm2_list.stdout == '[]'
```

## Integrating PM2 with systemd

PM2 can generate a systemd startup script so your processes survive reboots.

Configure PM2 to start on boot:

```yaml
- name: Generate PM2 startup script
  ansible.builtin.command: "pm2 startup systemd -u {{ app_user }} --hp /home/{{ app_user }}"
  register: pm2_startup

- name: Execute the startup command
  ansible.builtin.command: "{{ pm2_startup.stdout_lines[-1] }}"
  when: "'sudo' in pm2_startup.stdout"

- name: Save current PM2 process list
  ansible.builtin.command: pm2 save
  become: yes
  become_user: "{{ app_user }}"
```

The `pm2 startup` command generates a systemd unit file and provides a sudo command to install it. The `pm2 save` command dumps the current process list so PM2 can restore it on boot.

## Monitoring PM2 Processes

Check process status and health through Ansible:

```yaml
- name: Get PM2 process list as JSON
  ansible.builtin.command: pm2 jlist
  become: yes
  become_user: "{{ app_user }}"
  register: pm2_json
  changed_when: false

- name: Parse PM2 process info
  ansible.builtin.set_fact:
    pm2_processes: "{{ pm2_json.stdout | from_json }}"

- name: Report process status
  ansible.builtin.debug:
    msg: |
      Process: {{ item.name }}
      Status: {{ item.pm2_env.status }}
      PID: {{ item.pid }}
      Memory: {{ (item.monit.memory / 1048576) | round(1) }} MB
      CPU: {{ item.monit.cpu }}%
      Restarts: {{ item.pm2_env.restart_time }}
      Uptime: {{ item.pm2_env.pm_uptime }}
  loop: "{{ pm2_processes }}"
  loop_control:
    label: "{{ item.name }}"

- name: Alert on errored processes
  ansible.builtin.debug:
    msg: "WARNING: {{ item.name }} is in error state with {{ item.pm2_env.restart_time }} restarts"
  loop: "{{ pm2_processes }}"
  loop_control:
    label: "{{ item.name }}"
  when: item.pm2_env.status == 'errored'
```

## Log Management

Manage PM2 logs through Ansible:

```yaml
# Set up log rotation
- name: Deploy PM2 log rotation config
  ansible.builtin.copy:
    dest: /etc/logrotate.d/pm2
    content: |
      /var/log/pm2/*.log {
          daily
          rotate 14
          compress
          delaycompress
          missingok
          notifempty
          copytruncate
      }
    mode: '0644'

# Flush logs
- name: Flush all PM2 logs
  ansible.builtin.command: pm2 flush
  become: yes
  become_user: "{{ app_user }}"

# Install pm2-logrotate module
- name: Install PM2 logrotate module
  ansible.builtin.command: pm2 install pm2-logrotate
  become: yes
  become_user: "{{ app_user }}"

- name: Configure PM2 logrotate
  ansible.builtin.command: "pm2 set pm2-logrotate:{{ item.key }} {{ item.value }}"
  become: yes
  become_user: "{{ app_user }}"
  loop:
    - { key: "max_size", value: "50M" }
    - { key: "retain", value: "14" }
    - { key: "compress", value: "true" }
    - { key: "rotateInterval", value: "0 0 * * *" }
```

## Complete Deployment Role

Here is a full role that handles the complete PM2 lifecycle.

Role defaults:

```yaml
# roles/pm2_app/defaults/main.yml
---
app_user: nodeapp
app_group: nodeapp
app_dir: /opt/myapp
node_env: production
pm2_apps:
  - name: api
    script: server.js
    instances: max
    exec_mode: cluster
    max_memory: "512M"
```

Role tasks:

```yaml
# roles/pm2_app/tasks/main.yml
---
- name: Deploy application code
  ansible.builtin.git:
    repo: "{{ git_repo }}"
    dest: "{{ app_dir }}"
    version: "{{ app_version }}"
  become_user: "{{ app_user }}"
  register: code_deploy

- name: Install Node.js dependencies
  ansible.builtin.command: npm ci --production
  args:
    chdir: "{{ app_dir }}"
  become_user: "{{ app_user }}"
  when: code_deploy.changed

- name: Deploy ecosystem file
  ansible.builtin.template:
    src: ecosystem.config.js.j2
    dest: "{{ app_dir }}/ecosystem.config.js"
    owner: "{{ app_user }}"
  register: ecosystem_changed

- name: Start or reload PM2 processes
  ansible.builtin.command: "pm2 startOrReload {{ app_dir }}/ecosystem.config.js"
  become_user: "{{ app_user }}"
  when: code_deploy.changed or ecosystem_changed.changed

- name: Save PM2 process list
  ansible.builtin.command: pm2 save
  become_user: "{{ app_user }}"
  when: code_deploy.changed or ecosystem_changed.changed

- name: Verify processes are running
  ansible.builtin.command: pm2 jlist
  become_user: "{{ app_user }}"
  register: pm2_verify
  changed_when: false

- name: Check all processes are online
  ansible.builtin.assert:
    that:
      - "item.pm2_env.status == 'online'"
    fail_msg: "{{ item.name }} is not online (status: {{ item.pm2_env.status }})"
  loop: "{{ pm2_verify.stdout | from_json }}"
  loop_control:
    label: "{{ item.name }}"
```

## Summary

While Ansible does not have a native PM2 module, managing PM2 through `command` tasks wrapped in roles works well in practice. The key pieces are: use ecosystem files for consistent process configuration, use `pm2 reload` for zero-downtime deployments in cluster mode, use `pm2 startup` and `pm2 save` for boot persistence, and parse `pm2 jlist` output for monitoring and health checks. For teams running Node.js in production, combining Ansible for infrastructure and deployment with PM2 for process management gives you a reliable and automatable stack.
