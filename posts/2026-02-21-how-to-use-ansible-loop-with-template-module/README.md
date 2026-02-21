# How to Use Ansible loop with Template Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Templates, Jinja2, Configuration Management

Description: Learn how to combine Ansible loop with the template module to generate multiple configuration files from a single Jinja2 template.

---

The Ansible `template` module renders Jinja2 templates into files on your managed hosts. When you combine it with `loop`, you can generate multiple configuration files from the same template, each with different parameters. This is incredibly useful for things like virtual host configs, systemd unit files, and application configuration where the structure is the same but the values differ.

This post walks through practical examples of using `loop` with templates, from simple use cases to more complex patterns involving nested data and conditional rendering.

## The Basic Pattern

Suppose you need to create multiple Nginx virtual host files. Each one follows the same structure but has a different domain name and backend port.

The Jinja2 template uses `item` to reference the current loop value.

```jinja2
{# templates/vhost.conf.j2 #}
{# Nginx virtual host template, populated per loop iteration #}
server {
    listen 80;
    server_name {{ item.domain }};

    location / {
        proxy_pass http://127.0.0.1:{{ item.port }};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    access_log /var/log/nginx/{{ item.domain }}.access.log;
    error_log /var/log/nginx/{{ item.domain }}.error.log;
}
```

The playbook loops over a list of dictionaries.

```yaml
# deploy-vhosts.yml
# Generates Nginx vhost configs from a single template
- name: Deploy Nginx virtual hosts
  hosts: webservers
  become: true
  tasks:
    - name: Generate vhost configuration files
      ansible.builtin.template:
        src: vhost.conf.j2
        dest: "/etc/nginx/sites-available/{{ item.domain }}.conf"
        owner: root
        group: root
        mode: '0644'
      loop:
        - { domain: "api.example.com", port: 8080 }
        - { domain: "app.example.com", port: 3000 }
        - { domain: "admin.example.com", port: 9090 }
      notify: Reload Nginx

  handlers:
    - name: Reload Nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded
```

Each iteration renders the template with a different `item` and writes the output to a file named after the domain.

## Templates with Rich Data

You can pass complex dictionaries through the loop for templates that need many variables.

```yaml
# deploy-apps.yml
# Creates systemd service files for multiple applications
- name: Deploy application service files
  hosts: appservers
  become: true
  vars:
    applications:
      - name: api-service
        user: apiuser
        working_dir: /opt/api
        exec_start: /opt/api/bin/server
        port: 8080
        env_vars:
          DATABASE_URL: "postgresql://db.internal:5432/api"
          REDIS_URL: "redis://redis.internal:6379"
          LOG_LEVEL: "info"
      - name: worker-service
        user: worker
        working_dir: /opt/worker
        exec_start: /opt/worker/bin/process
        port: 0
        env_vars:
          DATABASE_URL: "postgresql://db.internal:5432/api"
          QUEUE_URL: "amqp://rabbitmq.internal:5672"
          CONCURRENCY: "4"
  tasks:
    - name: Create systemd unit files
      ansible.builtin.template:
        src: app-service.j2
        dest: "/etc/systemd/system/{{ item.name }}.service"
        mode: '0644'
      loop: "{{ applications }}"
      notify: Reload systemd
```

The corresponding template accesses nested attributes.

```jinja2
{# templates/app-service.j2 #}
{# Systemd unit file template for application services #}
[Unit]
Description={{ item.name }}
After=network.target

[Service]
Type=simple
User={{ item.user }}
WorkingDirectory={{ item.working_dir }}
ExecStart={{ item.exec_start }}
Restart=always
RestartSec=5
{% for key, value in item.env_vars.items() %}
Environment="{{ key }}={{ value }}"
{% endfor %}

[Install]
WantedBy=multi-user.target
```

The `{% for %}` block inside the template iterates over the environment variables dictionary, creating one `Environment=` line per entry.

## Loop with Different Templates

Sometimes different items need different templates. You can include the template name in the loop data.

```yaml
# multi-template.yml
# Renders different templates for different config types
- name: Deploy mixed configuration files
  hosts: all
  become: true
  vars:
    config_files:
      - template: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
        vars:
          worker_processes: 4
          worker_connections: 1024
      - template: redis.conf.j2
        dest: /etc/redis/redis.conf
        vars:
          maxmemory: "256mb"
          bind_address: "127.0.0.1"
      - template: logrotate.j2
        dest: /etc/logrotate.d/myapp
        vars:
          log_path: /var/log/myapp/*.log
          rotate_count: 7
  tasks:
    - name: Render configuration templates
      ansible.builtin.template:
        src: "{{ item.template }}"
        dest: "{{ item.dest }}"
        mode: '0644'
      loop: "{{ config_files }}"
```

Each template can access its specific variables through `item.vars`.

## Generating Files and Enabling Them

A common pattern with Nginx is to generate configs in `sites-available` and then symlink them into `sites-enabled`. You can do both with loops.

```yaml
# nginx-sites.yml
# Creates and enables Nginx site configurations
- name: Set up Nginx sites
  hosts: webservers
  become: true
  vars:
    sites:
      - api.example.com
      - app.example.com
      - docs.example.com
  tasks:
    - name: Generate site configs
      ansible.builtin.template:
        src: site.conf.j2
        dest: "/etc/nginx/sites-available/{{ item }}.conf"
        mode: '0644'
      loop: "{{ sites }}"

    - name: Enable site configs
      ansible.builtin.file:
        src: "/etc/nginx/sites-available/{{ item }}.conf"
        dest: "/etc/nginx/sites-enabled/{{ item }}.conf"
        state: link
      loop: "{{ sites }}"
      notify: Reload Nginx
```

Both tasks loop over the same list, which keeps everything in sync.

## Tracking Changes with register

When you need to know which templates actually changed (maybe to restart only affected services), capture the results.

```yaml
# track-template-changes.yml
# Renders templates and only restarts services whose config changed
- name: Deploy configs and restart changed services
  hosts: appservers
  become: true
  vars:
    service_configs:
      - { service: "nginx", template: "nginx.conf.j2", dest: "/etc/nginx/nginx.conf" }
      - { service: "redis", template: "redis.conf.j2", dest: "/etc/redis/redis.conf" }
      - { service: "app", template: "app.conf.j2", dest: "/etc/myapp/app.conf" }
  tasks:
    - name: Render configuration templates
      ansible.builtin.template:
        src: "{{ item.template }}"
        dest: "{{ item.dest }}"
        mode: '0644'
      loop: "{{ service_configs }}"
      register: template_results

    - name: Restart services with changed configs
      ansible.builtin.service:
        name: "{{ item.item.service }}"
        state: restarted
      loop: "{{ template_results.results }}"
      when: item.changed
```

This avoids unnecessary restarts. If the redis config did not change, redis keeps running without interruption.

## Using loop_var for Nested Loops

When you have a role that already uses `item`, and that role is called from a loop, you get a variable name collision. The `loop_control` parameter with `loop_var` solves this.

```yaml
# nested-templates.yml
# Uses loop_var to avoid variable collision in nested loops
- name: Deploy templates with custom loop variable
  hosts: all
  become: true
  tasks:
    - name: Generate config files
      ansible.builtin.template:
        src: "{{ config_item.template }}"
        dest: "{{ config_item.dest }}"
        mode: '0644'
      loop:
        - { template: "app.conf.j2", dest: "/etc/myapp/app.conf" }
        - { template: "db.conf.j2", dest: "/etc/myapp/db.conf" }
      loop_control:
        loop_var: config_item
```

Inside the template, you would reference `config_item` instead of `item`.

## Validating Rendered Templates

Some modules support validation. For Nginx configs, you can validate before writing.

```yaml
# validate-template.yml
# Generates Nginx config with validation before deployment
- name: Deploy validated Nginx configs
  hosts: webservers
  become: true
  tasks:
    - name: Deploy Nginx configs with validation
      ansible.builtin.template:
        src: "{{ item.template }}"
        dest: "{{ item.dest }}"
        mode: '0644'
        validate: "nginx -t -c %s"
      loop:
        - { template: "nginx-main.conf.j2", dest: "/etc/nginx/nginx.conf" }
```

The `validate` parameter runs the specified command against the rendered file before writing it to the final destination. If validation fails, the task fails and the file is not deployed.

## Conditional Template Rendering

You can combine `loop` with `when` to only render certain templates based on conditions.

```yaml
# conditional-templates.yml
# Renders templates based on host conditions
- name: Conditionally render templates
  hosts: all
  become: true
  vars:
    config_templates:
      - template: ssl.conf.j2
        dest: /etc/nginx/conf.d/ssl.conf
        condition: "{{ ssl_enabled | default(false) }}"
      - template: monitoring.conf.j2
        dest: /etc/myapp/monitoring.conf
        condition: "{{ monitoring_enabled | default(true) }}"
      - template: cache.conf.j2
        dest: /etc/myapp/cache.conf
        condition: "{{ cache_enabled | default(true) }}"
  tasks:
    - name: Render templates where conditions are met
      ansible.builtin.template:
        src: "{{ item.template }}"
        dest: "{{ item.dest }}"
        mode: '0644'
      loop: "{{ config_templates }}"
      when: item.condition | bool
```

## Summary

Combining `loop` with the `template` module is one of the most powerful patterns in Ansible. It lets you maintain a single template and generate multiple customized files from it. The key practices are: use dictionaries in your loop for rich data, store your loop data in variables or group_vars, use `register` to track changes and restart only affected services, and use `loop_control` with `loop_var` when you need to nest loops or avoid variable name collisions. This approach scales cleanly whether you are generating 3 config files or 30.
