# How to Use Ansible Conditionals with File Content

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Conditionals, File Operations, Automation

Description: Learn how to read file content on remote hosts and use it in Ansible when conditionals for decision-making based on file data.

---

There are many situations where the next step in your playbook depends on the content of a file on the remote host. Maybe you need to check a version file before deciding whether to upgrade, read a configuration file to determine the current state, or verify that a license file contains valid data. Ansible provides several ways to read file content and use it in conditionals.

## Reading Files with the command Module

The most straightforward way to get file content is using the `command` module with `cat` or similar tools.

```yaml
# Read file content with command module
---
- name: File content conditionals
  hosts: all
  become: true

  tasks:
    - name: Read application version file
      ansible.builtin.command:
        cmd: cat /opt/app/VERSION
      register: version_file
      changed_when: false
      failed_when: false

    - name: Upgrade if version is old
      ansible.builtin.debug:
        msg: "Current version {{ version_file.stdout | trim }} needs upgrade"
      when:
        - version_file is success
        - version_file.stdout | trim is version('2.0.0', '<')

    - name: Skip if already on latest
      ansible.builtin.debug:
        msg: "Already on version {{ version_file.stdout | trim }}, no upgrade needed"
      when:
        - version_file is success
        - version_file.stdout | trim is version('2.0.0', '>=')

    - name: Handle missing version file (fresh install)
      ansible.builtin.debug:
        msg: "No version file found, performing fresh installation"
      when: version_file is failed
```

## Using the slurp Module

The `slurp` module reads file content and returns it as base64-encoded data. This is more reliable than `command` for binary-safe reading.

```yaml
# Read file content with slurp module
---
- name: Slurp-based file conditionals
  hosts: all
  become: true

  tasks:
    - name: Read configuration file
      ansible.builtin.slurp:
        src: /etc/app/config.yml
      register: config_content
      ignore_errors: true

    - name: Decode and parse config
      ansible.builtin.set_fact:
        app_config: "{{ (config_content.content | b64decode) | from_yaml }}"
      when: config_content is success

    - name: Check config values
      ansible.builtin.debug:
        msg: "Database is configured for {{ app_config.database.host }}"
      when:
        - app_config is defined
        - app_config.database is defined
        - app_config.database.host is defined

    - name: Fail if database is pointed at localhost in production
      ansible.builtin.fail:
        msg: "Production config must not use localhost for database"
      when:
        - app_config is defined
        - app_config.database.host == 'localhost'
        - "'production' in group_names"
```

## Checking File Existence with stat

Before reading file content, you often need to check if the file exists. The `stat` module provides this information along with other metadata.

```yaml
# File existence and metadata checks
---
- name: File-based conditionals with stat
  hosts: all
  become: true

  tasks:
    - name: Check for lock file
      ansible.builtin.stat:
        path: /var/lock/deployment.lock
      register: lock_file

    - name: Fail if deployment lock exists
      ansible.builtin.fail:
        msg: >
          Deployment lock file exists. Another deployment may be in progress.
          Lock file: /var/lock/deployment.lock
          {% if lock_file.stat.exists %}
          Created: {{ '%Y-%m-%d %H:%M:%S' | strftime(lock_file.stat.ctime) }}
          {% endif %}
      when: lock_file.stat.exists

    - name: Check for configuration file
      ansible.builtin.stat:
        path: /etc/app/custom.conf
      register: custom_conf

    - name: Use custom config if it exists
      ansible.builtin.copy:
        src: /etc/app/custom.conf
        dest: /etc/app/active.conf
        remote_src: true
      when: custom_conf.stat.exists

    - name: Use default config if custom does not exist
      ansible.builtin.template:
        src: default.conf.j2
        dest: /etc/app/active.conf
      when: not custom_conf.stat.exists
```

## Searching for Patterns in Files

Use the `command` module with `grep` to search for patterns in files, then make decisions based on whether the pattern was found.

```yaml
# Pattern searching in files
---
- name: File pattern-based conditionals
  hosts: all
  become: true

  tasks:
    - name: Check if SSL is enabled in config
      ansible.builtin.command:
        cmd: grep -c "ssl_enabled.*true" /etc/app/config.yml
      register: ssl_check
      changed_when: false
      failed_when: false

    - name: Verify SSL certificates exist when SSL is enabled
      ansible.builtin.stat:
        path: /etc/ssl/app/cert.pem
      register: ssl_cert
      when: ssl_check.rc == 0

    - name: Fail if SSL is enabled but cert is missing
      ansible.builtin.fail:
        msg: "SSL is enabled in config but certificate file is missing"
      when:
        - ssl_check.rc == 0
        - ssl_cert is defined
        - not ssl_cert.stat.exists

    - name: Check if specific module is loaded in config
      ansible.builtin.command:
        cmd: grep -c "^module_analytics" /etc/app/modules.conf
      register: analytics_check
      changed_when: false
      failed_when: false

    - name: Configure analytics when module is active
      ansible.builtin.template:
        src: analytics.conf.j2
        dest: /etc/app/conf.d/analytics.conf
      when: analytics_check.rc == 0
```

## Reading and Comparing Multiple Files

Sometimes you need to compare content between files, like checking if a running config matches the expected one.

```yaml
# Compare file content
---
- name: Configuration drift detection
  hosts: all
  become: true

  tasks:
    - name: Read current running config
      ansible.builtin.slurp:
        src: /etc/nginx/nginx.conf
      register: running_config

    - name: Generate expected config
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /tmp/expected_nginx.conf

    - name: Read expected config
      ansible.builtin.slurp:
        src: /tmp/expected_nginx.conf
      register: expected_config

    - name: Detect configuration drift
      ansible.builtin.set_fact:
        config_drifted: "{{ (running_config.content | b64decode) != (expected_config.content | b64decode) }}"

    - name: Report drift
      ansible.builtin.debug:
        msg: "Configuration drift detected on {{ inventory_hostname }}"
      when: config_drifted | bool

    - name: Apply corrected configuration
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      when: config_drifted | bool
      notify: reload nginx

    - name: Clean up temp file
      ansible.builtin.file:
        path: /tmp/expected_nginx.conf
        state: absent

  handlers:
    - name: reload nginx
      ansible.builtin.systemd:
        name: nginx
        state: reloaded
```

## Using the lineinfile Check Mode

You can use `lineinfile` in check mode to test if a line exists in a file without modifying it.

```yaml
# Check if line exists in file
---
- name: Line-based file checking
  hosts: all
  become: true

  tasks:
    - name: Check if swap is disabled in fstab
      ansible.builtin.command:
        cmd: grep -c "^\s*[^#].*swap" /etc/fstab
      register: swap_in_fstab
      changed_when: false
      failed_when: false

    - name: Disable swap if still in fstab
      ansible.builtin.replace:
        path: /etc/fstab
        regexp: '^([^#].*\sswap\s)'
        replace: '# \1'
      when: swap_in_fstab.rc == 0

    - name: Check if our repo is in sources list
      ansible.builtin.command:
        cmd: grep -r "repo.example.com" /etc/apt/sources.list.d/
      register: repo_check
      changed_when: false
      failed_when: false

    - name: Add our repository if missing
      ansible.builtin.apt_repository:
        repo: "deb https://repo.example.com/apt stable main"
        state: present
      when: repo_check.rc != 0
```

## Reading JSON and YAML Files

When files contain structured data, you can parse them into Ansible variables and run detailed checks.

```yaml
# Parse structured file content
---
- name: Structured file content checks
  hosts: all
  become: true

  tasks:
    # Reading a JSON config file
    - name: Read package.json
      ansible.builtin.slurp:
        src: /opt/app/package.json
      register: package_json_raw
      ignore_errors: true

    - name: Parse package.json
      ansible.builtin.set_fact:
        package_json: "{{ package_json_raw.content | b64decode | from_json }}"
      when: package_json_raw is success

    - name: Check Node.js version requirement
      ansible.builtin.debug:
        msg: "App requires Node.js {{ package_json.engines.node }}"
      when:
        - package_json is defined
        - package_json.engines is defined
        - package_json.engines.node is defined

    - name: Check for known vulnerable dependencies
      ansible.builtin.debug:
        msg: "WARNING: {{ item }} is a known vulnerable package"
      loop:
        - lodash
        - minimist
      when:
        - package_json is defined
        - package_json.dependencies is defined
        - item in package_json.dependencies

    # Reading a YAML state file
    - name: Read deployment state
      ansible.builtin.slurp:
        src: /opt/app/.deploy_state.yml
      register: deploy_state_raw
      ignore_errors: true

    - name: Parse deployment state
      ansible.builtin.set_fact:
        deploy_state: "{{ deploy_state_raw.content | b64decode | from_yaml }}"
      when: deploy_state_raw is success

    - name: Check if last deployment was successful
      ansible.builtin.fail:
        msg: >
          Last deployment failed at {{ deploy_state.last_deploy.timestamp }}.
          Reason: {{ deploy_state.last_deploy.error }}
          Resolve the previous failure before deploying again.
      when:
        - deploy_state is defined
        - deploy_state.last_deploy is defined
        - deploy_state.last_deploy.status == 'failed'
```

## File Size Checks

Use the `stat` module to make decisions based on file size.

```yaml
# File size-based conditionals
---
- name: File size checks
  hosts: all
  become: true

  tasks:
    - name: Check log file size
      ansible.builtin.stat:
        path: /var/log/app/application.log
      register: log_stat

    - name: Rotate log if over 100MB
      ansible.builtin.command:
        cmd: logrotate -f /etc/logrotate.d/app
      when:
        - log_stat.stat.exists
        - log_stat.stat.size > 104857600  # 100MB in bytes

    - name: Check database dump size for validity
      ansible.builtin.stat:
        path: /var/backups/db-latest.dump
      register: db_dump

    - name: Warn about suspiciously small backup
      ansible.builtin.debug:
        msg: >
          WARNING: Database dump is only {{ (db_dump.stat.size / 1048576) | round(1) }}MB.
          This might indicate a failed backup.
      when:
        - db_dump.stat.exists
        - db_dump.stat.size < 10485760  # Less than 10MB
```

## File Content with lookup Plugin (Control Node)

If the file is on the control node rather than the remote host, use the `file` lookup.

```yaml
# Read local file content with lookup
---
- name: Local file content checks
  hosts: all
  gather_facts: false

  tasks:
    - name: Check local deployment manifest
      ansible.builtin.set_fact:
        manifest: "{{ lookup('file', 'deploy-manifest.json') | from_json }}"

    - name: Deploy only services listed in manifest
      ansible.builtin.debug:
        msg: "Deploying {{ item.name }} version {{ item.version }}"
      loop: "{{ manifest.services }}"
      when: item.deploy | default(true) | bool
```

File content is one of the most reliable sources of truth about system state. By reading configuration files, version files, state files, and log files, your playbooks can make informed decisions about what needs to change. The key is always handling the case where the file does not exist or cannot be read, so your playbooks remain robust even when running against freshly provisioned systems.
