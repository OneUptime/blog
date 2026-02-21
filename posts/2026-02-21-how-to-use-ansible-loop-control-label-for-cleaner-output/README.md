# How to Use Ansible loop_control label for Cleaner Output

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Loops, loop_control, Output Formatting

Description: Learn how to use the label option in Ansible loop_control to produce cleaner, more readable task output when looping over complex data.

---

When you loop over complex data structures in Ansible, the default output dumps the entire data structure for every iteration. This turns your terminal into a wall of JSON that is nearly impossible to scan through. The `label` option in `loop_control` fixes this by letting you specify exactly what gets printed for each iteration.

## The Problem with Default Loop Output

Consider this task that loops over a list of dictionaries:

```yaml
# Without label: output is cluttered with full dictionary contents
- name: Configure services
  ansible.builtin.systemd:
    name: "{{ item.name }}"
    state: started
    enabled: yes
  loop:
    - name: nginx
      config_path: /etc/nginx/nginx.conf
      port: 80
      workers: 4
      ssl_enabled: true
      upstream_servers:
        - 10.0.1.10
        - 10.0.1.11
        - 10.0.1.12
    - name: postgresql
      config_path: /etc/postgresql/14/main/postgresql.conf
      port: 5432
      max_connections: 200
      shared_buffers: 256MB
      wal_level: replica
```

The output for each iteration will print the entire dictionary, including all the config details, upstream servers, and everything else. When you have 10+ items in the loop, the output becomes unmanageable.

## Adding a Label

The fix is simple. Add `loop_control` with a `label`:

```yaml
# With label: output shows only the service name
- name: Configure services
  ansible.builtin.systemd:
    name: "{{ item.name }}"
    state: started
    enabled: yes
  loop:
    - name: nginx
      config_path: /etc/nginx/nginx.conf
      port: 80
      workers: 4
      ssl_enabled: true
      upstream_servers:
        - 10.0.1.10
        - 10.0.1.11
        - 10.0.1.12
    - name: postgresql
      config_path: /etc/postgresql/14/main/postgresql.conf
      port: 5432
      max_connections: 200
      shared_buffers: 256MB
      wal_level: replica
  loop_control:
    label: "{{ item.name }}"
```

Now the output shows something like:

```
TASK [Configure services] ****
ok: [server1] => (item=nginx)
ok: [server1] => (item=postgresql)
```

Instead of dumping the entire dictionary, you see just the service name. Much cleaner.

## Label Expressions

The label is a Jinja2 expression, so you can build informative strings:

```yaml
# Show multiple attributes in the label for quick scanning
- name: Deploy applications
  ansible.builtin.template:
    src: "{{ item.template }}"
    dest: "{{ item.dest }}"
  loop:
    - { name: "api", template: "api.conf.j2", dest: "/etc/apps/api.conf", port: 8080, env: "production" }
    - { name: "web", template: "web.conf.j2", dest: "/etc/apps/web.conf", port: 3000, env: "production" }
    - { name: "worker", template: "worker.conf.j2", dest: "/etc/apps/worker.conf", port: 9090, env: "staging" }
  loop_control:
    label: "{{ item.name }} ({{ item.env }}, port {{ item.port }})"
```

Output:

```
TASK [Deploy applications] ****
changed: [server1] => (item=api (production, port 8080))
changed: [server1] => (item=web (production, port 3000))
changed: [server1] => (item=worker (staging, port 9090))
```

You get the important information at a glance without the noise.

## Using Label with dict2items

When iterating over dictionaries, label is especially useful because `dict2items` produces verbose output:

```yaml
# Clean output when iterating over dict2items
- name: Set sysctl parameters
  ansible.posix.sysctl:
    name: "{{ item.key }}"
    value: "{{ item.value }}"
    state: present
  loop: "{{ kernel_params | dict2items }}"
  loop_control:
    label: "{{ item.key }}={{ item.value }}"
  vars:
    kernel_params:
      net.core.somaxconn: 1024
      net.ipv4.tcp_max_syn_backlog: 2048
      vm.swappiness: 10
      fs.file-max: 65536
```

Output:

```
TASK [Set sysctl parameters] ****
ok: [server1] => (item=net.core.somaxconn=1024)
ok: [server1] => (item=net.ipv4.tcp_max_syn_backlog=2048)
changed: [server1] => (item=vm.swappiness=10)
ok: [server1] => (item=fs.file-max=65536)
```

## Label with Registered Variables

When looping over registered results, the data structures get even more complex. Label keeps things sane:

```yaml
# Check services and display clean results
- name: Check service status
  ansible.builtin.command: systemctl is-active {{ item }}
  loop:
    - nginx
    - postgresql
    - redis
    - memcached
  register: service_checks
  changed_when: false
  failed_when: false

- name: Show service statuses
  ansible.builtin.debug:
    msg: "{{ item.item }}: {{ item.stdout }}"
  loop: "{{ service_checks.results }}"
  loop_control:
    label: "{{ item.item }}"
```

Without the label, each iteration would print the entire registered result object, including stdout, stderr, rc, cmd, start, end, delta, and more. With the label, you just see the service name.

## Progress Indicators with Label

You can combine `label` with `index_var` and `extended` to create progress-style output:

```yaml
# Show progress counter in the label
- name: Process data files
  ansible.builtin.command: "process-data {{ item }}"
  loop:
    - /data/file1.csv
    - /data/file2.csv
    - /data/file3.csv
    - /data/file4.csv
    - /data/file5.csv
  loop_control:
    index_var: file_idx
    label: "[{{ file_idx + 1 }}/{{ 5 }}] {{ item | basename }}"
  changed_when: true
```

Output:

```
TASK [Process data files] ****
changed: [server1] => (item=[1/5] file1.csv)
changed: [server1] => (item=[2/5] file2.csv)
changed: [server1] => (item=[3/5] file3.csv)
changed: [server1] => (item=[4/5] file4.csv)
changed: [server1] => (item=[5/5] file5.csv)
```

For even better progress tracking, use extended loop variables:

```yaml
# Use extended loop info for automatic progress counting
- name: Process data files with auto count
  ansible.builtin.command: "process-data {{ item }}"
  loop:
    - /data/file1.csv
    - /data/file2.csv
    - /data/file3.csv
    - /data/file4.csv
    - /data/file5.csv
  loop_control:
    extended: true
    label: "[{{ ansible_loop.index }}/{{ ansible_loop.length }}] {{ item | basename }}"
  changed_when: true
```

This version automatically calculates the total count from the loop length.

## Conditional Label Formatting

You can use Jinja2 conditionals in the label itself:

```yaml
# Show different label content based on the item state
- name: Manage user accounts
  ansible.builtin.user:
    name: "{{ item.name }}"
    state: "{{ item.state }}"
  loop:
    - { name: "alice", state: "present", role: "admin" }
    - { name: "bob", state: "absent", role: "developer" }
    - { name: "charlie", state: "present", role: "operator" }
  loop_control:
    label: "{{ item.name }} ({{ 'REMOVING' if item.state == 'absent' else item.role }})"
```

Output:

```
TASK [Manage user accounts] ****
ok: [server1] => (item=alice (admin))
changed: [server1] => (item=bob (REMOVING))
ok: [server1] => (item=charlie (operator))
```

This immediately tells you which users are being removed versus managed.

## Label with Sensitive Data

A critical use case for `label` is hiding sensitive data from logs. When your loop items contain passwords, API keys, or tokens, the label prevents them from appearing in the output:

```yaml
# Hide sensitive data from output using label
- name: Configure database connections
  ansible.builtin.template:
    src: db.conf.j2
    dest: "/etc/myapp/databases/{{ item.name }}.conf"
    mode: '0600'
  loop:
    - { name: "primary", host: "db1.internal", user: "app", password: "s3cr3t_p@ss" }
    - { name: "replica", host: "db2.internal", user: "app_ro", password: "r3ad_0nly_p@ss" }
    - { name: "analytics", host: "db3.internal", user: "analyst", password: "an@lyt1cs_p@ss" }
  loop_control:
    label: "{{ item.name }} -> {{ item.host }}"
  no_log: false
```

The passwords exist in the data and get passed to the template, but they never appear in the terminal output. For truly sensitive operations, you should also use `no_log: true`, but `label` provides a first line of defense for keeping logs clean.

## Practical Example: Infrastructure Provisioning

Here is a complete playbook that demonstrates `label` usage across multiple tasks:

```yaml
# Provision infrastructure with clean, scannable output
- name: Infrastructure provisioning
  hosts: all
  become: yes
  vars:
    infrastructure:
      - name: web-tier
        packages: [nginx, certbot, python3-certbot-nginx]
        ports: [80, 443]
        config_files:
          - { src: "nginx.conf.j2", dest: "/etc/nginx/nginx.conf" }
          - { src: "ssl.conf.j2", dest: "/etc/nginx/conf.d/ssl.conf" }
        services: [nginx]
      - name: app-tier
        packages: [python3, python3-pip, python3-venv, supervisor]
        ports: [8080, 8081]
        config_files:
          - { src: "supervisor.conf.j2", dest: "/etc/supervisor/supervisord.conf" }
        services: [supervisor]
      - name: data-tier
        packages: [postgresql, redis-server]
        ports: [5432, 6379]
        config_files:
          - { src: "pg_hba.conf.j2", dest: "/etc/postgresql/14/main/pg_hba.conf" }
          - { src: "redis.conf.j2", dest: "/etc/redis/redis.conf" }
        services: [postgresql, redis-server]

  tasks:
    - name: Install tier packages
      ansible.builtin.apt:
        name: "{{ item.packages }}"
        state: present
      loop: "{{ infrastructure }}"
      loop_control:
        label: "{{ item.name }} ({{ item.packages | length }} packages)"

    - name: Deploy configuration files
      ansible.builtin.template:
        src: "{{ config.src }}"
        dest: "{{ config.dest }}"
      loop: "{{ infrastructure | subelements('config_files') }}"
      loop_control:
        label: "{{ item.0.name }}: {{ config.dest | basename }}"
      vars:
        config: "{{ item.1 }}"

    - name: Start services
      ansible.builtin.systemd:
        name: "{{ svc }}"
        state: started
        enabled: yes
      loop: "{{ infrastructure | subelements('services') }}"
      loop_control:
        label: "{{ item.0.name }}/{{ svc }}"
      vars:
        svc: "{{ item.1 }}"
```

Every task produces clean, informative output that tells you exactly what is happening without drowning you in data.

## Summary

The `label` option in `loop_control` is a small feature with outsized impact on playbook usability. It keeps your terminal output readable, helps you quickly identify which iterations changed or failed, and prevents sensitive data from leaking into logs. Any time you loop over a data structure more complex than a simple string, add a label. It costs one line and saves minutes of log parsing.
