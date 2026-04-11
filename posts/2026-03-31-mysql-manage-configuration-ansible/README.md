# How to Manage MySQL Configuration with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Ansible, Configuration Management, Automation, DevOps

Description: Use Ansible to manage MySQL configuration files, apply tuning parameters, and enforce consistent settings across all database servers.

---

## Configuration Management vs. Deployment

Managing MySQL configuration is a continuous task, distinct from initial deployment. As your application grows, you tune `innodb_buffer_pool_size`, adjust `max_connections`, enable new logging settings, or apply security hardening. Doing this manually across multiple servers is error-prone. Ansible lets you codify these changes, test them in staging, and roll them out consistently.

## Organizing Configuration Variables

Use Ansible group variables to manage environment-specific settings:

```yaml
# group_vars/mysql_servers/main.yml
mysql_config:
  mysqld:
    bind_address: "0.0.0.0"
    max_connections: 300
    innodb_buffer_pool_size: "2G"
    innodb_log_file_size: "512M"
    slow_query_log: "ON"
    slow_query_log_file: "/var/log/mysql/slow.log"
    long_query_time: 1
    log_error: "/var/log/mysql/error.log"
    log_bin: "/var/log/mysql/mysql-bin.log"
    expire_logs_days: 7
    sync_binlog: 1
    innodb_flush_log_at_trx_commit: 1
```

```yaml
# group_vars/mysql_primary/main.yml
# Override settings for primary servers only
mysql_config_overrides:
  mysqld:
    read_only: "OFF"
    log_replica_updates: "ON"
```

## Configuration Template

```text
# templates/mysqld.cnf.j2
[mysqld]
{% for key, value in mysql_config.mysqld.items() %}
{{ key | replace('_', '-') }} = {{ value }}
{% endfor %}
```

## Playbook to Apply Configuration

```yaml
# playbooks/mysql_config.yml
---
- name: Manage MySQL configuration
  hosts: mysql_servers
  become: true

  pre_tasks:
    - name: Merge base and override configuration
      set_fact:
        mysql_config: "{{ mysql_config | combine(mysql_config_overrides | default({}), recursive=True) }}"

  tasks:
    - name: Deploy MySQL configuration file
      template:
        src: templates/mysqld.cnf.j2
        dest: /etc/mysql/mysql.conf.d/mysqld.cnf
        owner: root
        group: root
        mode: '0644'
        validate: 'mysqld --defaults-file=%s --validate-config'
      register: mysql_config_changed

    - name: Restart MySQL if configuration changed
      service:
        name: mysql
        state: restarted
      when: mysql_config_changed.changed

    - name: Wait for MySQL to be available
      wait_for:
        host: 127.0.0.1
        port: 3306
        timeout: 30
      when: mysql_config_changed.changed

    - name: Verify configuration was applied
      community.mysql.mysql_variables:
        variable: max_connections
        login_user: root
        login_unix_socket: /var/run/mysqld/mysqld.sock
      register: conn_setting

    - name: Fail if configuration not applied
      fail:
        msg: "max_connections is {{ conn_setting.msg }}, expected {{ mysql_config.mysqld.max_connections }}"
      when: conn_setting.msg | int != mysql_config.mysqld.max_connections | int
```

## Applying Dynamic Variables Without Restart

Some MySQL variables can be changed at runtime without a restart:

```yaml
    - name: Apply dynamic variables without restart
      community.mysql.mysql_variables:
        variable: "{{ item.key }}"
        value: "{{ item.value }}"
        mode: global
        login_user: root
        login_unix_socket: /var/run/mysqld/mysqld.sock
      loop:
        - { key: 'max_connections', value: '400' }
        - { key: 'slow_query_log', value: 'ON' }
        - { key: 'long_query_time', value: '1' }
```

## Rolling Configuration Updates

For production, roll out configuration changes server by server:

```yaml
# playbooks/mysql_rolling_config.yml
---
- name: Rolling MySQL configuration update
  hosts: mysql_replicas
  become: true
  serial: 1
  max_fail_percentage: 0

  tasks:
    - name: Apply configuration changes
      include_tasks: tasks/apply_mysql_config.yml

- name: Update primary last
  hosts: mysql_primary
  become: true
  tasks:
    - name: Apply configuration changes
      include_tasks: tasks/apply_mysql_config.yml
```

## Summary

Ansible simplifies MySQL configuration management by centralizing tuning parameters in group variables, using Jinja2 templates to generate consistent configuration files, and applying changes with validation and verification steps. Rolling deployment strategies ensure configuration changes are tested on replicas before being applied to the primary, minimizing risk during updates.
