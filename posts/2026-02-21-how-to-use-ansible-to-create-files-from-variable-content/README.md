# How to Use Ansible to Create Files from Variable Content

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, File Management, Automation, DevOps

Description: Learn how to dynamically create files on remote hosts using Ansible variables, templates, and the copy module with content parameter.

---

Creating files on remote hosts with dynamically generated content is one of the most common tasks you will run into when working with Ansible. Whether you need to drop a configuration snippet, generate a script on the fly, or write out structured data, Ansible gives you several clean ways to do it. This post walks through the practical approaches, starting from the simplest and building up to more advanced patterns.

## The copy Module with the content Parameter

The fastest way to create a file from a variable is the `copy` module. Most people know `copy` for transferring files from the control node, but it also accepts a `content` parameter that writes a string directly to the target path.

Here is a basic example that writes a simple string to a file:

```yaml
# Write a plain string to /etc/motd on all hosts
- name: Set message of the day
  ansible.builtin.copy:
    content: "Welcome to {{ inventory_hostname }}. Managed by Ansible.\n"
    dest: /etc/motd
    owner: root
    group: root
    mode: '0644'
```

The `content` parameter accepts Jinja2 expressions, so you can inject any variable that is in scope. This includes facts, inventory variables, registered output, and anything you defined in `vars` or `group_vars`.

## Working with Multi-line Content

For multi-line content, YAML block scalars are your best friend. The pipe character (`|`) preserves newlines, while `>` folds them. In practice, you almost always want `|` when generating config files.

This example creates a custom sudoers file from variables:

```yaml
# Generate a sudoers drop-in file with multiple lines
- name: Create sudoers file for deploy user
  ansible.builtin.copy:
    content: |
      # Managed by Ansible - do not edit manually
      {{ deploy_user }} ALL=(ALL) NOPASSWD: {{ sudo_commands | join(', ') }}
      Defaults:{{ deploy_user }} !requiretty
    dest: "/etc/sudoers.d/{{ deploy_user }}"
    owner: root
    group: root
    mode: '0440'
    validate: '/usr/sbin/visudo -cf %s'
  vars:
    deploy_user: deployer
    sudo_commands:
      - /usr/bin/systemctl restart myapp
      - /usr/bin/systemctl status myapp
```

Notice the `validate` parameter. It runs `visudo` against the file before committing it, which prevents you from locking yourself out with a broken sudoers entry.

## Using the template Module for Complex Content

When your content grows beyond a few lines or involves loops and conditionals, switch to the `template` module. Templates live in separate `.j2` files and give you the full power of Jinja2.

First, create a template file at `templates/app_config.j2`:

```jinja2
{# templates/app_config.j2 #}
# Application configuration - managed by Ansible
# Generated on {{ ansible_date_time.iso8601 }}

[database]
host = {{ db_host }}
port = {{ db_port | default(5432) }}
name = {{ db_name }}
max_connections = {{ db_max_conn | default(20) }}

[cache]
{% if cache_enabled | default(false) %}
backend = redis
host = {{ cache_host }}
port = {{ cache_port | default(6379) }}
{% else %}
backend = local
{% endif %}

[logging]
{% for handler in log_handlers | default(['console']) %}
handler.{{ loop.index }} = {{ handler }}
{% endfor %}
level = {{ log_level | default('INFO') }}
```

Then use the template in your playbook:

```yaml
# Render the app config template with variables from group_vars
- name: Deploy application configuration
  ansible.builtin.template:
    src: app_config.j2
    dest: /opt/myapp/config.ini
    owner: appuser
    group: appuser
    mode: '0640'
    backup: yes
  notify: restart myapp
```

## Creating Files from Structured Data

Sometimes you want to dump a dictionary or list directly to a file in JSON or YAML format. Ansible filters make this straightforward.

This task writes a JSON configuration file from a dictionary variable:

```yaml
# Convert a dictionary to pretty-printed JSON and write it to a file
- name: Write service discovery config as JSON
  ansible.builtin.copy:
    content: "{{ service_config | to_nice_json(indent=2) }}\n"
    dest: /etc/consul.d/service.json
    owner: consul
    group: consul
    mode: '0644'
  vars:
    service_config:
      service:
        name: web
        port: 8080
        tags:
          - production
          - v2
        check:
          http: "http://localhost:8080/health"
          interval: 10s
```

For YAML output, swap in `to_nice_yaml`:

```yaml
# Write a YAML config file from structured data
- name: Write Prometheus targets file
  ansible.builtin.copy:
    content: "{{ prometheus_targets | to_nice_yaml }}"
    dest: /etc/prometheus/targets/app_servers.yml
    owner: prometheus
    group: prometheus
    mode: '0644'
  vars:
    prometheus_targets:
      - targets:
          - "{{ ansible_host }}:9100"
          - "{{ ansible_host }}:8080"
        labels:
          env: "{{ env_name }}"
          role: webserver
```

## Building Content from Registered Variables

A powerful pattern is capturing output from one task and writing it to a file. The `register` keyword stores task results in a variable that you can reference later.

```yaml
# Capture the output of a command and save it to a file
- name: Get list of running services
  ansible.builtin.command: systemctl list-units --type=service --state=running --no-pager --no-legend
  register: running_services
  changed_when: false

- name: Write service inventory to file
  ansible.builtin.copy:
    content: |
      # Service inventory for {{ inventory_hostname }}
      # Generated: {{ ansible_date_time.iso8601 }}
      # Total running services: {{ running_services.stdout_lines | length }}

      {{ running_services.stdout }}
    dest: /var/log/service_inventory.txt
    mode: '0644'
```

## Generating Files with Loops

When you need to create multiple files from a list of variables, combine `copy` with `loop`:

```yaml
# Create multiple config files from a list of dictionaries
- name: Generate virtual host configs
  ansible.builtin.copy:
    content: |
      server {
          listen 80;
          server_name {{ item.domain }};
          root {{ item.docroot | default('/var/www/' + item.domain) }};
          access_log /var/log/nginx/{{ item.domain }}.access.log;
          error_log /var/log/nginx/{{ item.domain }}.error.log;
      }
    dest: "/etc/nginx/sites-available/{{ item.domain }}.conf"
    owner: root
    group: root
    mode: '0644'
  loop: "{{ virtual_hosts }}"
  notify: reload nginx
  vars:
    virtual_hosts:
      - domain: app.example.com
        docroot: /opt/app/public
      - domain: api.example.com
        docroot: /opt/api/public
      - domain: docs.example.com
```

## Using blockinfile for Partial File Content

If you need to insert a block of variable content into an existing file rather than replacing it entirely, `blockinfile` is the right tool:

```yaml
# Insert a managed block into an existing config file
- name: Add custom DNS entries to /etc/hosts
  ansible.builtin.blockinfile:
    path: /etc/hosts
    marker: "# {mark} ANSIBLE MANAGED - app servers"
    block: |
      {% for host in groups['app_servers'] %}
      {{ hostvars[host].ansible_host }}  {{ host }}.internal
      {% endfor %}
```

## Picking the Right Approach

Here is a quick decision guide:

- **Simple strings or short content**: Use `copy` with `content`
- **Complex logic, loops, conditionals**: Use `template` with a `.j2` file
- **Structured data (JSON/YAML)**: Use `copy` with `to_nice_json` or `to_nice_yaml` filters
- **Inserting into existing files**: Use `blockinfile`
- **Single line changes**: Use `lineinfile`

The `copy` module with `content` is idempotent out of the box. It computes a checksum and only writes when the content actually changes. The `template` module works the same way. Both support `backup: yes` if you want to keep a timestamped copy of the previous version before overwriting.

One thing to watch out for: trailing newlines. Most Linux tools expect text files to end with a newline. Adding `\n` at the end of your `content` string or using the YAML block scalar `|` (which preserves a trailing newline) keeps things consistent and avoids diff noise in subsequent runs.

With these techniques, you can handle virtually any file creation scenario in Ansible without resorting to shell commands or manual intervention.
