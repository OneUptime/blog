# How to Use the path_join Filter in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Filters, File Paths, Automation, DevOps

Description: Learn how to use the path_join filter in Ansible to safely construct file paths without worrying about trailing slashes or OS differences.

---

Building file paths by concatenating strings is error-prone. You end up with double slashes when both parts have trailing or leading slashes, missing slashes when neither does, and platform-specific bugs. The `path_join` filter in Ansible handles all of this by properly joining path components using the OS-appropriate separator.

This filter was introduced in Ansible 2.10 as part of the `ansible.builtin` collection. Before it existed, people used string concatenation with the `+` operator or the `~` operator in Jinja2, which led to inconsistent results.

## Basic Usage

```yaml
# Join path components safely
- name: Basic path join
  ansible.builtin.debug:
    msg: "{{ ['/var', 'log', 'myapp', 'app.log'] | path_join }}"
```

Output: `/var/log/myapp/app.log`

You can also pass the components as separate arguments:

```yaml
# Alternative syntax with two components
- name: Join two paths
  ansible.builtin.debug:
    msg: "{{ ('/var/log' , 'myapp') | path_join }}"
```

## Why path_join Matters

Compare these approaches:

```yaml
# The wrong way - string concatenation
- name: Concatenation problems
  ansible.builtin.debug:
    msg: |
      Double slash: {{ base_path + '/' + sub_path }}
      Missing slash: {{ base_path_no_slash + sub_path }}
  vars:
    base_path: /var/log/
    base_path_no_slash: /var/log
    sub_path: myapp/app.log

# The right way - path_join
- name: Path join handles it
  ansible.builtin.debug:
    msg: |
      With trailing slash: {{ ['/var/log/', 'myapp/app.log'] | path_join }}
      Without trailing slash: {{ ['/var/log', 'myapp/app.log'] | path_join }}
```

Both path_join examples produce the same correct result: `/var/log/myapp/app.log`. String concatenation would give you `/var/log//myapp/app.log` in the first case.

## Practical Example: Dynamic File Paths

When building paths from variables, path_join prevents slash-related bugs:

```yaml
# Build deployment paths from variables
- name: Set deployment paths
  ansible.builtin.set_fact:
    app_home: "{{ [deploy_base, app_name] | path_join }}"
    app_config: "{{ [deploy_base, app_name, 'config'] | path_join }}"
    app_logs: "{{ [log_base, app_name] | path_join }}"
    app_pid: "{{ [run_base, app_name + '.pid'] | path_join }}"
  vars:
    deploy_base: /opt/apps
    log_base: /var/log
    run_base: /var/run
    app_name: mywebapp

- name: Create directory structure
  ansible.builtin.file:
    path: "{{ item }}"
    state: directory
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0755'
  loop:
    - "{{ app_home }}"
    - "{{ app_config }}"
    - "{{ app_logs }}"
```

## Using path_join in Templates

```jinja2
{# templates/systemd_service.j2 - Build paths in systemd unit file #}
[Unit]
Description={{ app_name }} Service
After=network.target

[Service]
Type=simple
User={{ app_user }}
WorkingDirectory={{ [deploy_base, app_name] | path_join }}
ExecStart={{ [deploy_base, app_name, 'bin', 'start.sh'] | path_join }}
PIDFile={{ ['/var/run', app_name + '.pid'] | path_join }}
StandardOutput=append:{{ [log_base, app_name, 'stdout.log'] | path_join }}
StandardError=append:{{ [log_base, app_name, 'stderr.log'] | path_join }}

[Install]
WantedBy=multi-user.target
```

## Multi-Application Deployment

When deploying multiple applications, path_join keeps your path logic clean:

```yaml
# Deploy multiple applications with consistent path structure
- name: Deploy applications
  ansible.builtin.include_tasks: deploy_app.yml
  loop: "{{ applications }}"
  loop_control:
    loop_var: app
  vars:
    applications:
      - name: frontend
        version: "2.1.0"
        port: 8080
      - name: api
        version: "3.0.1"
        port: 3000
      - name: worker
        version: "1.5.0"
        port: 9090
```

```yaml
# deploy_app.yml - Reusable deployment tasks using path_join
- name: Create application directories
  ansible.builtin.file:
    path: "{{ item }}"
    state: directory
    mode: '0755'
  loop:
    - "{{ [deploy_root, app.name] | path_join }}"
    - "{{ [deploy_root, app.name, 'releases', app.version] | path_join }}"
    - "{{ [deploy_root, app.name, 'shared', 'config'] | path_join }}"
    - "{{ [deploy_root, app.name, 'shared', 'log'] | path_join }}"
    - "{{ [deploy_root, app.name, 'shared', 'tmp'] | path_join }}"

- name: Create current symlink
  ansible.builtin.file:
    src: "{{ [deploy_root, app.name, 'releases', app.version] | path_join }}"
    dest: "{{ [deploy_root, app.name, 'current'] | path_join }}"
    state: link

- name: Deploy config file
  ansible.builtin.template:
    src: "{{ app.name }}_config.j2"
    dest: "{{ [deploy_root, app.name, 'shared', 'config', 'settings.yml'] | path_join }}"
```

## Building Paths in Loops

path_join is especially useful inside loops where you construct paths from dynamic data:

```yaml
# Create user home directories and config files
- name: Set up user environments
  ansible.builtin.file:
    path: "{{ ['/home', item.name, dir] | path_join }}"
    state: directory
    owner: "{{ item.name }}"
    mode: '0755'
  loop: "{{ users | subelements('directories') }}"
  loop_control:
    label: "{{ item.0.name }}/{{ item.1 }}"
  vars:
    users:
      - name: alice
        directories: [.ssh, .config, projects]
      - name: bob
        directories: [.ssh, .config, workspace]
    dir: "{{ item.1 }}"
```

Wait, that loop structure needs adjustment with subelements:

```yaml
# Set up user directories with subelements and path_join
- name: Create user directories
  ansible.builtin.file:
    path: "{{ ['/home', item.0.name, item.1] | path_join }}"
    state: directory
    owner: "{{ item.0.name }}"
    mode: '0755'
  loop: "{{ users | subelements('directories') }}"
  loop_control:
    label: "{{ [item.0.name, item.1] | path_join }}"
  vars:
    users:
      - name: alice
        directories: [.ssh, .config, projects]
      - name: bob
        directories: [.ssh, .config, workspace]
```

## Configuration File Distribution

Distribute config files to the right locations using path_join:

```yaml
# Distribute configuration files to multiple services
- name: Deploy service configurations
  ansible.builtin.template:
    src: "{{ item.template }}"
    dest: "{{ [item.config_dir, item.filename] | path_join }}"
    owner: "{{ item.owner }}"
    mode: "{{ item.mode }}"
  loop:
    - template: nginx.conf.j2
      config_dir: /etc/nginx
      filename: nginx.conf
      owner: root
      mode: '0644'
    - template: app.yml.j2
      config_dir: /etc/myapp
      filename: config.yml
      owner: appuser
      mode: '0640'
    - template: logrotate.j2
      config_dir: /etc/logrotate.d
      filename: myapp
      owner: root
      mode: '0644'
```

## Handling Absolute Paths in Components

If any component in the list is an absolute path (starts with `/`), path_join treats it as the new root, discarding everything before it:

```yaml
# Absolute path components reset the path
- name: Absolute path handling
  ansible.builtin.debug:
    msg: |
      Relative: {{ ['/base', 'relative', 'path'] | path_join }}
      Absolute reset: {{ ['/base', '/absolute', 'path'] | path_join }}
```

Output:
```
Relative: /base/relative/path
Absolute reset: /absolute/path
```

This matches the behavior of Python's `os.path.join()`.

## Building Log Paths

```jinja2
{# templates/rsyslog.conf.j2 - Rsyslog config with dynamic log paths #}
{{ ansible_managed | comment }}

{% for app in monitored_apps %}
# {{ app.name }} logging
if $programname == '{{ app.name }}' then {{ [log_base_dir, app.name, app.name + '.log'] | path_join }}
{% endfor %}
```

## Using with Role Defaults

A clean pattern in roles is to define base paths in defaults and build full paths with path_join:

```yaml
# roles/webapp/defaults/main.yml
webapp_base_dir: /opt/webapp
webapp_log_dir: /var/log/webapp
webapp_run_dir: /var/run/webapp

# roles/webapp/tasks/main.yml
- name: Build all required paths
  ansible.builtin.set_fact:
    webapp_paths:
      binary: "{{ [webapp_base_dir, 'bin', 'webapp'] | path_join }}"
      config: "{{ [webapp_base_dir, 'config', 'app.yml'] | path_join }}"
      static: "{{ [webapp_base_dir, 'static'] | path_join }}"
      access_log: "{{ [webapp_log_dir, 'access.log'] | path_join }}"
      error_log: "{{ [webapp_log_dir, 'error.log'] | path_join }}"
      pidfile: "{{ [webapp_run_dir, 'webapp.pid'] | path_join }}"
```

## Summary

The `path_join` filter eliminates an entire class of bugs related to file path construction. No more double slashes, no more missing separators, no more worrying about whether a variable has a trailing slash. Pass a list of path components and get back a properly joined path. Use it everywhere you construct file paths from variables, especially in loops, templates, and role tasks where path components come from different sources. It is a small filter that prevents subtle, hard-to-debug issues in your file management tasks.
