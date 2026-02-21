# How to Use Ansible to Handle Cross-Distribution File Paths

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Linux, Cross-Platform, Configuration, File Paths

Description: Map configuration file paths across Linux distributions in Ansible to write truly portable playbooks and roles.

---

Configuration files live in different locations across Linux distributions. Apache's main config is at `/etc/apache2/apache2.conf` on Debian but `/etc/httpd/conf/httpd.conf` on RHEL. PHP's config directory is `/etc/php/8.2/` on Debian but `/etc/php.ini` on RHEL. This guide shows you how to handle these differences systematically in Ansible.

## The Problem

Every distribution has its own opinions about where config files should live:

```yaml
# This only works on Debian/Ubuntu
- name: Configure Apache
  ansible.builtin.template:
    src: apache.conf.j2
    dest: /etc/apache2/apache2.conf
```

On RHEL, the file is at `/etc/httpd/conf/httpd.conf`. On SUSE, it is `/etc/apache2/httpd.conf`.

## Path Variable Files

Create distribution-specific path mappings:

```yaml
# vars/paths_debian.yml
paths:
  apache:
    main_config: /etc/apache2/apache2.conf
    conf_dir: /etc/apache2/conf-available
    sites_dir: /etc/apache2/sites-available
    mods_dir: /etc/apache2/mods-available
    log_dir: /var/log/apache2
    document_root: /var/www/html
  nginx:
    main_config: /etc/nginx/nginx.conf
    conf_dir: /etc/nginx/conf.d
    sites_dir: /etc/nginx/sites-available
    log_dir: /var/log/nginx
  ssh:
    config: /etc/ssh/sshd_config
    config_dir: /etc/ssh/sshd_config.d
  php:
    ini_file: /etc/php/8.2/fpm/php.ini
    fpm_config: /etc/php/8.2/fpm/pool.d/www.conf
    fpm_service: php8.2-fpm
  mysql:
    config: /etc/mysql/mysql.conf.d/mysqld.cnf
    data_dir: /var/lib/mysql
  cron:
    spool_dir: /var/spool/cron/crontabs
  syslog:
    config: /etc/rsyslog.conf
    conf_dir: /etc/rsyslog.d
```

```yaml
# vars/paths_redhat.yml
paths:
  apache:
    main_config: /etc/httpd/conf/httpd.conf
    conf_dir: /etc/httpd/conf.d
    sites_dir: /etc/httpd/conf.d
    mods_dir: /etc/httpd/conf.modules.d
    log_dir: /var/log/httpd
    document_root: /var/www/html
  nginx:
    main_config: /etc/nginx/nginx.conf
    conf_dir: /etc/nginx/conf.d
    sites_dir: /etc/nginx/conf.d
    log_dir: /var/log/nginx
  ssh:
    config: /etc/ssh/sshd_config
    config_dir: /etc/ssh/sshd_config.d
  php:
    ini_file: /etc/php.ini
    fpm_config: /etc/php-fpm.d/www.conf
    fpm_service: php-fpm
  mysql:
    config: /etc/my.cnf.d/mysql-server.cnf
    data_dir: /var/lib/mysql
  cron:
    spool_dir: /var/spool/cron
  syslog:
    config: /etc/rsyslog.conf
    conf_dir: /etc/rsyslog.d
```

## Using Path Variables

```yaml
---
- name: Configure web server across distributions
  hosts: web_servers
  become: true

  pre_tasks:
    - name: Load OS-specific paths
      ansible.builtin.include_vars: "paths_{{ ansible_os_family | lower }}.yml"

  tasks:
    - name: Deploy Apache main configuration
      ansible.builtin.template:
        src: apache.conf.j2
        dest: "{{ paths.apache.main_config }}"
        mode: '0644'

    - name: Deploy virtual host
      ansible.builtin.template:
        src: vhost.conf.j2
        dest: "{{ paths.apache.sites_dir }}/myapp.conf"
        mode: '0644'

    - name: Check Apache logs
      ansible.builtin.command: "tail -5 {{ paths.apache.log_dir }}/error_log"
      register: apache_errors
      changed_when: false
```

## Templates That Adapt

Your templates can also reference the path variables:

```
# apache.conf.j2 - Works across distributions
ServerRoot "{{ paths.apache.main_config | dirname | dirname }}"

ErrorLog "{{ paths.apache.log_dir }}/error_log"
CustomLog "{{ paths.apache.log_dir }}/access_log" combined

IncludeOptional {{ paths.apache.conf_dir }}/*.conf
```

## Handling Apache Module Differences

Debian uses `a2ensite`/`a2enmod` while RHEL loads modules from the config directory:

```yaml
    - name: Enable Apache modules (Debian)
      ansible.builtin.command: "a2enmod {{ item }}"
      loop:
        - rewrite
        - ssl
        - proxy
        - proxy_http
      when: ansible_os_family == "Debian"
      notify: restart web server

    - name: Enable Apache modules (RHEL)
      ansible.builtin.copy:
        content: "LoadModule {{ item.module }} {{ item.path }}"
        dest: "{{ paths.apache.mods_dir }}/{{ item.name }}.conf"
        mode: '0644'
      loop:
        - { name: rewrite, module: rewrite_module, path: modules/mod_rewrite.so }
        - { name: ssl, module: ssl_module, path: modules/mod_ssl.so }
      when: ansible_os_family == "RedHat"
      notify: restart web server
```

## Dynamic Path Discovery

For paths that vary even within the same distribution family (like PHP versions), discover them:

```yaml
    - name: Find PHP version on Debian
      ansible.builtin.shell: php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;'
      register: php_version
      changed_when: false
      when: ansible_os_family == "Debian"

    - name: Set PHP paths dynamically
      ansible.builtin.set_fact:
        php_ini_path: "/etc/php/{{ php_version.stdout }}/fpm/php.ini"
        php_fpm_pool: "/etc/php/{{ php_version.stdout }}/fpm/pool.d/www.conf"
      when: ansible_os_family == "Debian"
```

## Role-Based Pattern

In roles, use the `vars/` directory for OS-specific overrides:

```
roles/webserver/
  vars/
    Debian.yml
    RedHat.yml
    Suse.yml
    default.yml
  templates/
    apache.conf.j2
  tasks/
    main.yml
```

```yaml
# roles/webserver/tasks/main.yml
- name: Load OS-specific paths
  ansible.builtin.include_vars: "{{ item }}"
  with_first_found:
    - "{{ ansible_distribution }}.yml"
    - "{{ ansible_os_family }}.yml"
    - "default.yml"
```

## Common Path Differences

| File | Debian/Ubuntu | RHEL/CentOS | SUSE |
|------|-------------|-------------|------|
| Apache config | /etc/apache2/apache2.conf | /etc/httpd/conf/httpd.conf | /etc/apache2/httpd.conf |
| Apache logs | /var/log/apache2/ | /var/log/httpd/ | /var/log/apache2/ |
| Nginx sites | /etc/nginx/sites-available/ | /etc/nginx/conf.d/ | /etc/nginx/vhosts.d/ |
| PHP ini | /etc/php/X.Y/fpm/php.ini | /etc/php.ini | /etc/php8/fpm/php.ini |
| MySQL config | /etc/mysql/mysql.conf.d/ | /etc/my.cnf.d/ | /etc/my.cnf.d/ |
| Cron spool | /var/spool/cron/crontabs/ | /var/spool/cron/ | /var/spool/cron/tabs/ |
| SSL certs | /etc/ssl/certs/ | /etc/pki/tls/certs/ | /etc/ssl/certs/ |
| SSL keys | /etc/ssl/private/ | /etc/pki/tls/private/ | /etc/ssl/private/ |

## Summary

Handling cross-distribution file paths follows the same pattern as packages and services: variable files per OS family. Group related paths together (apache, nginx, php, mysql) for easy reference. Use `with_first_found` for granular overrides. Combine paths, packages, and services into unified OS variable files when you need all three. This approach keeps your tasks clean and your distribution-specific details isolated in variable files.

## Common Use Cases

Here are several practical scenarios where this module proves essential in real-world playbooks.

### Infrastructure Provisioning Workflow

```yaml
# Complete workflow incorporating this module
- name: Infrastructure provisioning
  hosts: all
  become: true
  gather_facts: true
  tasks:
    - name: Gather system information
      ansible.builtin.setup:
        gather_subset:
          - hardware
          - network

    - name: Display system summary
      ansible.builtin.debug:
        msg: >-
          Host {{ inventory_hostname }} has
          {{ ansible_memtotal_mb }}MB RAM,
          {{ ansible_processor_vcpus }} vCPUs,
          running {{ ansible_distribution }} {{ ansible_distribution_version }}

    - name: Install required packages
      ansible.builtin.package:
        name:
          - curl
          - wget
          - git
          - vim
          - htop
          - jq
        state: present

    - name: Configure system timezone
      ansible.builtin.timezone:
        name: "{{ system_timezone | default('UTC') }}"

    - name: Configure hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"

    - name: Update /etc/hosts
      ansible.builtin.lineinfile:
        path: /etc/hosts
        regexp: '^127\.0\.1\.1'
        line: "127.0.1.1 {{ inventory_hostname }}"

    - name: Configure SSH hardening
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^PasswordAuthentication', line: 'PasswordAuthentication no' }
      notify: restart sshd

    - name: Configure firewall rules
      community.general.ufw:
        rule: allow
        port: "{{ item }}"
        proto: tcp
      loop:
        - "22"
        - "80"
        - "443"

    - name: Enable firewall
      community.general.ufw:
        state: enabled
        policy: deny

  handlers:
    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted
```

### Integration with Monitoring

```yaml
# Using gathered facts to configure monitoring thresholds
- name: Configure monitoring based on system specs
  hosts: all
  become: true
  tasks:
    - name: Set monitoring thresholds based on hardware
      ansible.builtin.template:
        src: monitoring_config.yml.j2
        dest: /etc/monitoring/config.yml
      vars:
        memory_warning_threshold: "{{ (ansible_memtotal_mb * 0.8) | int }}"
        memory_critical_threshold: "{{ (ansible_memtotal_mb * 0.95) | int }}"
        cpu_warning_threshold: 80
        cpu_critical_threshold: 95

    - name: Register host with monitoring system
      ansible.builtin.uri:
        url: "https://monitoring.example.com/api/hosts"
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
          ip_address: "{{ ansible_default_ipv4.address }}"
          os: "{{ ansible_distribution }}"
          memory_mb: "{{ ansible_memtotal_mb }}"
          cpus: "{{ ansible_processor_vcpus }}"
        headers:
          Authorization: "Bearer {{ monitoring_api_token }}"
        status_code: [200, 201, 409]
```

### Error Handling Patterns

```yaml
# Robust error handling with this module
- name: Robust task execution
  hosts: all
  tasks:
    - name: Attempt primary operation
      ansible.builtin.command: /opt/app/primary-task.sh
      register: primary_result
      failed_when: false

    - name: Handle primary failure with fallback
      ansible.builtin.command: /opt/app/fallback-task.sh
      when: primary_result.rc != 0
      register: fallback_result

    - name: Report final status
      ansible.builtin.debug:
        msg: >-
          Task completed via {{ 'primary' if primary_result.rc == 0 else 'fallback' }} path.
          Return code: {{ primary_result.rc if primary_result.rc == 0 else fallback_result.rc }}

    - name: Fail if both paths failed
      ansible.builtin.fail:
        msg: "Both primary and fallback operations failed"
      when:
        - primary_result.rc != 0
        - fallback_result is defined
        - fallback_result.rc != 0
```

### Scheduling and Automation

```yaml
# Set up scheduled compliance scans using cron
- name: Configure automated scans
  hosts: all
  become: true
  tasks:
    - name: Create scan script
      ansible.builtin.copy:
        dest: /opt/scripts/compliance_scan.sh
        mode: '0755'
        content: |
          #!/bin/bash
          cd /opt/ansible
          ansible-playbook playbooks/validate.yml -i inventory/ > /var/log/compliance_scan.log 2>&1
          EXIT_CODE=$?
          if [ $EXIT_CODE -ne 0 ]; then
            curl -X POST https://hooks.example.com/alert \
              -H "Content-Type: application/json" \
              -d "{\"text\":\"Compliance scan failed on $(hostname)\"}"
          fi
          exit $EXIT_CODE

    - name: Schedule weekly compliance scan
      ansible.builtin.cron:
        name: "Weekly compliance scan"
        minute: "0"
        hour: "3"
        weekday: "1"
        job: "/opt/scripts/compliance_scan.sh"
        user: ansible
```

