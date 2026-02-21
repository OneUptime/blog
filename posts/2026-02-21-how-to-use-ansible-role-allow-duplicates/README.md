# How to Use Ansible Role Allow Duplicates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Roles, Configuration, Automation

Description: Learn how to use the allow_duplicates setting in Ansible roles to run the same role multiple times with different parameters in a single play.

---

By default, Ansible only runs a role once per play, even if you list it multiple times. This is usually what you want. You do not want to install Nginx twice just because it appears in two dependency chains. But sometimes you genuinely need to run a role more than once with different parameters. Think about creating multiple database instances, setting up several virtual hosts through a generic role, or provisioning multiple application instances on the same server. The `allow_duplicates` setting makes this possible.

## The Default Behavior

Let's start with what happens without `allow_duplicates`:

```yaml
# This only runs the virtual_host role ONCE
- hosts: webservers
  become: yes
  roles:
    - role: virtual_host
      vars:
        vhost_name: site-a
        vhost_port: 8080
    - role: virtual_host
      vars:
        vhost_name: site-b
        vhost_port: 8081
```

Even though the role appears twice with different variables, Ansible sees it as the same role and skips the second execution. The output will show something like:

```
TASK [virtual_host : ...] ******
ok: [web01]
...
(second execution is silently skipped)
```

This is Ansible's deduplication logic. It prevents accidental double execution of roles that appear in multiple dependency chains.

## Enabling allow_duplicates

To tell Ansible that it is okay to run a role multiple times, add `allow_duplicates: true` to the role's `meta/main.yml`:

```yaml
# roles/virtual_host/meta/main.yml
# Allow this role to be applied multiple times with different parameters
allow_duplicates: true
dependencies: []
```

Now the same playbook runs the role twice:

```yaml
# Now both executions happen
- hosts: webservers
  become: yes
  roles:
    - role: virtual_host
      vars:
        vhost_name: site-a
        vhost_port: 8080
    - role: virtual_host
      vars:
        vhost_name: site-b
        vhost_port: 8081
```

Both virtual host configurations get created.

## Building a Role That Supports Duplicates

Here is a complete example of a virtual host role designed to be called multiple times:

```yaml
# roles/virtual_host/meta/main.yml
allow_duplicates: true
dependencies: []
```

```yaml
# roles/virtual_host/defaults/main.yml
vhost_name: ""
vhost_domain: ""
vhost_port: 80
vhost_root: "/var/www/{{ vhost_name }}"
vhost_ssl_enabled: false
vhost_ssl_cert: ""
vhost_ssl_key: ""
vhost_proxy_pass: ""
vhost_extra_config: ""
```

```yaml
# roles/virtual_host/tasks/main.yml
# Create a single virtual host - designed to be called multiple times
- name: Validate required parameters
  ansible.builtin.assert:
    that:
      - vhost_name | length > 0
      - vhost_domain | length > 0
    fail_msg: "vhost_name and vhost_domain are required"

- name: Create document root
  ansible.builtin.file:
    path: "{{ vhost_root }}"
    state: directory
    owner: www-data
    group: www-data
    mode: '0755'
  when: vhost_proxy_pass == ""

- name: Deploy virtual host configuration
  ansible.builtin.template:
    src: vhost.conf.j2
    dest: "/etc/nginx/sites-available/{{ vhost_name }}.conf"
    owner: root
    group: root
    mode: '0644'
  notify: reload nginx

- name: Enable virtual host
  ansible.builtin.file:
    src: "/etc/nginx/sites-available/{{ vhost_name }}.conf"
    dest: "/etc/nginx/sites-enabled/{{ vhost_name }}.conf"
    state: link
  notify: reload nginx
```

```jinja2
# roles/virtual_host/templates/vhost.conf.j2
# Virtual host for {{ vhost_domain }} - managed by Ansible
server {
    listen {{ vhost_port }};
    server_name {{ vhost_domain }};

{% if vhost_proxy_pass %}
    location / {
        proxy_pass {{ vhost_proxy_pass }};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
{% else %}
    root {{ vhost_root }};
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
{% endif %}
{{ vhost_extra_config }}
}
```

```yaml
# roles/virtual_host/handlers/main.yml
- name: reload nginx
  ansible.builtin.systemd:
    name: nginx
    state: reloaded
```

## Using the Role Multiple Times

```yaml
# deploy-vhosts.yml
- hosts: webservers
  become: yes
  roles:
    # Static marketing site
    - role: virtual_host
      vars:
        vhost_name: marketing
        vhost_domain: www.example.com
        vhost_root: /var/www/marketing

    # API reverse proxy
    - role: virtual_host
      vars:
        vhost_name: api
        vhost_domain: api.example.com
        vhost_port: 443
        vhost_proxy_pass: "http://127.0.0.1:3000"

    # Admin panel
    - role: virtual_host
      vars:
        vhost_name: admin
        vhost_domain: admin.example.com
        vhost_proxy_pass: "http://127.0.0.1:4000"

    # Documentation site
    - role: virtual_host
      vars:
        vhost_name: docs
        vhost_domain: docs.example.com
        vhost_root: /var/www/docs
```

Each invocation creates a separate virtual host configuration. Without `allow_duplicates`, only the first one would be created.

## Alternative: Using include_role in a Loop

Another approach for running a role multiple times is to use `include_role` inside a loop:

```yaml
# deploy-vhosts-loop.yml
- hosts: webservers
  become: yes
  vars:
    vhosts:
      - name: marketing
        domain: www.example.com
        root: /var/www/marketing
      - name: api
        domain: api.example.com
        proxy_pass: "http://127.0.0.1:3000"
      - name: admin
        domain: admin.example.com
        proxy_pass: "http://127.0.0.1:4000"

  tasks:
    - name: Configure all virtual hosts
      ansible.builtin.include_role:
        name: virtual_host
      vars:
        vhost_name: "{{ item.name }}"
        vhost_domain: "{{ item.domain }}"
        vhost_root: "{{ item.root | default('/var/www/' + item.name) }}"
        vhost_proxy_pass: "{{ item.proxy_pass | default('') }}"
      loop: "{{ vhosts }}"
```

This approach does not require `allow_duplicates` because `include_role` bypasses the deduplication logic. It is also more dynamic since the list of virtual hosts can come from a variable.

## Another Use Case: Multiple Database Instances

```yaml
# roles/postgresql_instance/meta/main.yml
allow_duplicates: true
dependencies: []
```

```yaml
# roles/postgresql_instance/defaults/main.yml
pg_instance_name: main
pg_instance_port: 5432
pg_instance_data_dir: "/var/lib/postgresql/data/{{ pg_instance_name }}"
pg_instance_max_connections: 100
pg_instance_shared_buffers: "256MB"
```

```yaml
# roles/postgresql_instance/tasks/main.yml
# Create and configure a single PostgreSQL instance
- name: Create data directory for instance {{ pg_instance_name }}
  ansible.builtin.file:
    path: "{{ pg_instance_data_dir }}"
    state: directory
    owner: postgres
    group: postgres
    mode: '0700'

- name: Initialize database cluster for {{ pg_instance_name }}
  ansible.builtin.command:
    cmd: "pg_ctlcluster 16 {{ pg_instance_name }} start"
    creates: "{{ pg_instance_data_dir }}/PG_VERSION"
  become_user: postgres

- name: Deploy instance configuration
  ansible.builtin.template:
    src: postgresql.conf.j2
    dest: "{{ pg_instance_data_dir }}/postgresql.conf"
  notify: "restart postgresql {{ pg_instance_name }}"
```

```yaml
# Run multiple PostgreSQL instances on one server
- hosts: database_server
  become: yes
  roles:
    - role: postgresql_instance
      vars:
        pg_instance_name: primary
        pg_instance_port: 5432
        pg_instance_shared_buffers: "4GB"
        pg_instance_max_connections: 200

    - role: postgresql_instance
      vars:
        pg_instance_name: analytics
        pg_instance_port: 5433
        pg_instance_shared_buffers: "2GB"
        pg_instance_max_connections: 50
```

## When to Use allow_duplicates

Use it when:

- Your role creates a named instance of something (virtual hosts, database instances, containers)
- Each invocation produces a different outcome based on variables
- The role is specifically designed to be called multiple times

Do not use it when:

- Your role installs a package or configures a system-wide service
- Running the role twice would cause conflicts or errors
- The role has side effects that do not stack cleanly

## Important Caveats

Handlers in a duplicated role can be tricky. If both invocations notify the same handler, it still only runs once at the end of the play. This is usually fine (you only need to reload Nginx once after configuring all virtual hosts), but be aware of it.

Variable scoping is important. Each invocation gets its own set of variables, but if you rely on registered variables or facts, later invocations can overwrite values from earlier ones. Use unique variable names or collect results into a list.

The `allow_duplicates` setting is a property of the role, not the playbook. Once you set it, any playbook using the role can invoke it multiple times. Make sure this is the behavior you actually want before enabling it, because it changes the contract of the role for all consumers.
