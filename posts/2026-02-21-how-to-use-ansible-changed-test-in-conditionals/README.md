# How to Use Ansible changed Test in Conditionals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Conditionals, Automation, DevOps

Description: Learn how to use the Ansible changed test in conditionals to trigger tasks only when previous tasks actually modified the system state.

---

When you run Ansible playbooks, not every task actually changes something on the target system. Some tasks report "ok" because the desired state already exists, while others report "changed" because they had to modify something. The `changed` test lets you react to those state changes by conditionally running follow-up tasks only when a previous task actually made a modification.

This is a pattern I use constantly in production playbooks. Think about restarting a service only when its configuration file was updated, or sending a notification only when a deployment actually pushed new code. The `changed` test makes these workflows clean and reliable.

## How the changed Test Works

Every Ansible task returns a result object that includes a `changed` property. When you register a variable from a task, you can test that variable with the `is changed` filter (or its older equivalent `|changed`). If the task reported a change, the test evaluates to `true`.

Here is a simple example that restarts nginx only when the config file is updated.

```yaml
# Playbook that updates nginx config and conditionally restarts
---
- name: Configure nginx
  hosts: webservers
  become: true

  tasks:
    - name: Deploy nginx configuration
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
        owner: root
        group: root
        mode: '0644'
      register: nginx_config

    - name: Restart nginx if config changed
      ansible.builtin.service:
        name: nginx
        state: restarted
      when: nginx_config is changed
```

In this playbook, the `register: nginx_config` directive captures the result of the template task. The second task checks `nginx_config is changed` and only runs the restart if the template module actually wrote a new version of the file.

## Using changed with Multiple Tasks

You can register variables from multiple tasks and combine the changed tests using logical operators.

```yaml
# Restart the app only if either the binary or the config changed
---
- name: Deploy application
  hosts: app_servers
  become: true

  tasks:
    - name: Copy application binary
      ansible.builtin.copy:
        src: myapp
        dest: /usr/local/bin/myapp
        mode: '0755'
      register: app_binary

    - name: Deploy application config
      ansible.builtin.template:
        src: myapp.conf.j2
        dest: /etc/myapp/myapp.conf
      register: app_config

    - name: Restart application
      ansible.builtin.systemd:
        name: myapp
        state: restarted
        daemon_reload: true
      when: app_binary is changed or app_config is changed
```

This pattern prevents unnecessary restarts. If you run the playbook and neither the binary nor the config has changed, the restart task gets skipped entirely.

## The Difference Between is changed and Handlers

You might wonder why not just use handlers for this. Handlers are great for simple "restart on change" scenarios, but the `changed` test gives you more flexibility.

Here is where the `changed` test shines over handlers:

1. You can combine multiple conditions (changed plus other checks)
2. You can use it in the middle of a task list, not just at the end of a play
3. You can apply more complex logic around the change detection

```yaml
# Example showing conditional logic beyond what handlers offer
---
- name: Deploy with conditional rollback
  hosts: app_servers
  become: true

  tasks:
    - name: Deploy new configuration
      ansible.builtin.template:
        src: app.conf.j2
        dest: /etc/app/app.conf
      register: config_deploy

    - name: Validate configuration syntax
      ansible.builtin.command:
        cmd: /usr/local/bin/app --validate-config
      when: config_deploy is changed
      register: config_validation
      ignore_errors: true

    - name: Rollback configuration if validation failed
      ansible.builtin.copy:
        src: /etc/app/app.conf.bak
        dest: /etc/app/app.conf
        remote_src: true
      when:
        - config_deploy is changed
        - config_validation is defined
        - config_validation.rc != 0

    - name: Reload application with new config
      ansible.builtin.systemd:
        name: app
        state: reloaded
      when:
        - config_deploy is changed
        - config_validation.rc == 0
```

In this example, we deploy a config, validate it if it changed, roll back if validation fails, and only reload if everything passed. This kind of sequential decision-making is hard to express with handlers alone.

## Using is not changed

The inverse test `is not changed` (or `is not changed`) is equally useful. You can use it to run tasks only when nothing was modified.

```yaml
# Log a message when the system is already in the desired state
---
- name: Check system state
  hosts: all
  become: true

  tasks:
    - name: Ensure package is installed
      ansible.builtin.apt:
        name: curl
        state: present
      register: curl_install

    - name: Report that system was already configured
      ansible.builtin.debug:
        msg: "curl was already installed, no changes needed"
      when: curl_install is not changed

    - name: Report that system was updated
      ansible.builtin.debug:
        msg: "curl was just installed"
      when: curl_install is changed
```

## Working with Loops and changed

When a task runs in a loop, the registered variable contains a `results` list. You need to handle this differently.

```yaml
# Register results from a loop and check for changes
---
- name: Manage multiple services
  hosts: all
  become: true

  vars:
    config_files:
      - src: redis.conf.j2
        dest: /etc/redis/redis.conf
        service: redis
      - src: memcached.conf.j2
        dest: /etc/memcached.conf
        service: memcached

  tasks:
    - name: Deploy service configurations
      ansible.builtin.template:
        src: "{{ item.src }}"
        dest: "{{ item.dest }}"
      loop: "{{ config_files }}"
      register: service_configs

    - name: Restart services that had config changes
      ansible.builtin.service:
        name: "{{ item.item.service }}"
        state: restarted
      loop: "{{ service_configs.results }}"
      when: item is changed
```

The key detail here is that `service_configs.results` is a list of individual task results. Each element in that list has its own `changed` status, and you can check each one in the follow-up loop.

## Combining changed with Other Tests

You can combine the `changed` test with other conditions for precise control.

```yaml
# Only restart during maintenance windows and when config changed
---
- name: Safe deployment
  hosts: production
  become: true

  vars:
    maintenance_window: true

  tasks:
    - name: Update application config
      ansible.builtin.template:
        src: app.conf.j2
        dest: /etc/app/app.conf
      register: app_config

    - name: Restart application (only during maintenance)
      ansible.builtin.systemd:
        name: app
        state: restarted
      when:
        - app_config is changed
        - maintenance_window | bool

    - name: Queue restart for next maintenance window
      ansible.builtin.lineinfile:
        path: /var/log/pending_restarts.txt
        line: "app - config changed at {{ ansible_date_time.iso8601 }}"
        create: true
      when:
        - app_config is changed
        - not (maintenance_window | bool)
```

## Common Pitfalls

One mistake I see often is checking `changed` on a task that has `check_mode: true` or when running the entire playbook in check mode. In check mode, tasks report what they *would* change but do not actually change anything. The `changed` status in check mode reflects the predicted outcome, not what actually happened.

Another pitfall is forgetting to register the variable. If you forget `register:`, there is nothing to test against, and your conditional will fail with an undefined variable error.

Finally, be careful with `command` and `shell` modules. These always report `changed: true` unless you set `changed_when` to override the default behavior.

```yaml
# Fix the always-changed problem with command module
- name: Check application version
  ansible.builtin.command:
    cmd: /usr/local/bin/app --version
  register: app_version
  changed_when: false  # This command never changes anything

- name: Run migration if needed
  ansible.builtin.command:
    cmd: /usr/local/bin/app migrate
  when: "'1.0'" not in app_version.stdout
```

The `changed` test is one of those Ansible features that seems simple but enables sophisticated deployment workflows. Once you start using it consistently, your playbooks become both safer and more efficient because they only perform actions when there is actually something to do.
