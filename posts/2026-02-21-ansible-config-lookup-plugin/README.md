# How to Use the Ansible config Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, Configuration, Debugging

Description: Learn how to use the Ansible config lookup plugin to query Ansible configuration settings and use them dynamically in your playbooks.

---

Every Ansible installation has a configuration that controls how it behaves. From timeout values to connection settings to module paths, these settings come from multiple sources: `ansible.cfg`, environment variables, command-line options, and defaults. The `config` lookup plugin lets you query these configuration values from within your playbooks, which is useful for debugging, conditional logic, and building adaptive automation.

## What the config Lookup Does

The `config` lookup plugin retrieves the current value of Ansible configuration settings at runtime. It returns the effective value, taking into account all configuration sources (defaults, config file, environment variables, and CLI options) and their precedence.

## Basic Usage

The simplest form queries a single configuration setting.

This playbook displays several key Ansible configuration values:

```yaml
# playbook.yml - Query Ansible configuration settings
---
- name: Display Ansible configuration
  hosts: localhost
  tasks:
    - name: Show default remote user
      ansible.builtin.debug:
        msg: "Remote user: {{ lookup('config', 'DEFAULT_REMOTE_USER') }}"

    - name: Show default timeout
      ansible.builtin.debug:
        msg: "Connection timeout: {{ lookup('config', 'DEFAULT_TIMEOUT') }} seconds"

    - name: Show default module path
      ansible.builtin.debug:
        msg: "Module path: {{ lookup('config', 'DEFAULT_MODULE_PATH') }}"

    - name: Show forks setting
      ansible.builtin.debug:
        msg: "Forks: {{ lookup('config', 'DEFAULT_FORKS') }}"
```

## Common Configuration Keys

Here are some of the most frequently queried configuration settings.

This playbook demonstrates several useful config lookups:

```yaml
# playbook.yml - Query common Ansible settings
---
- name: Show common Ansible configuration values
  hosts: localhost
  tasks:
    - name: Connection settings
      ansible.builtin.debug:
        msg:
          remote_user: "{{ lookup('config', 'DEFAULT_REMOTE_USER') }}"
          remote_port: "{{ lookup('config', 'DEFAULT_REMOTE_PORT') }}"
          transport: "{{ lookup('config', 'DEFAULT_TRANSPORT') }}"
          timeout: "{{ lookup('config', 'DEFAULT_TIMEOUT') }}"

    - name: Execution settings
      ansible.builtin.debug:
        msg:
          forks: "{{ lookup('config', 'DEFAULT_FORKS') }}"
          poll_interval: "{{ lookup('config', 'DEFAULT_POLL_INTERVAL') }}"
          become_method: "{{ lookup('config', 'DEFAULT_BECOME_METHOD') }}"

    - name: Path settings
      ansible.builtin.debug:
        msg:
          roles_path: "{{ lookup('config', 'DEFAULT_ROLES_PATH') }}"
          module_path: "{{ lookup('config', 'DEFAULT_MODULE_PATH') }}"
          remote_tmp: "{{ lookup('config', 'DEFAULT_REMOTE_TMP') }}"
          local_tmp: "{{ lookup('config', 'DEFAULT_LOCAL_TMP') }}"
```

## Using config Values in Conditional Logic

You can use configuration values to make your playbooks adapt to the environment they run in.

This playbook adjusts behavior based on the configured parallelism:

```yaml
# playbook.yml - Adapt behavior based on configuration
---
- name: Adaptive deployment
  hosts: all
  vars:
    configured_forks: "{{ lookup('config', 'DEFAULT_FORKS') | int }}"
  tasks:
    - name: Display parallelism info
      ansible.builtin.debug:
        msg: "Running with {{ configured_forks }} forks across {{ ansible_play_hosts | length }} hosts"
      run_once: true

    # Add a delay between batches if forks is low
    - name: Deploy with throttle based on fork count
      ansible.builtin.copy:
        src: app.tar.gz
        dest: /tmp/app.tar.gz
      throttle: "{{ [configured_forks, 5] | min }}"

    # Warn if timeout might be too low for slow operations
    - name: Check if timeout is sufficient for large file transfers
      ansible.builtin.debug:
        msg: "WARNING: Connection timeout is only {{ lookup('config', 'DEFAULT_TIMEOUT') }}s. Consider increasing for large file transfers."
      when: (lookup('config', 'DEFAULT_TIMEOUT') | int) < 30
      run_once: true
```

## Building a Configuration Audit Playbook

One great use of the config lookup is creating an audit playbook that documents your Ansible configuration.

```yaml
# playbook.yml - Audit Ansible configuration
---
- name: Ansible configuration audit
  hosts: localhost
  gather_facts: false
  vars:
    config_items:
      - key: DEFAULT_REMOTE_USER
        description: SSH user for remote connections
      - key: DEFAULT_TIMEOUT
        description: Connection timeout in seconds
      - key: DEFAULT_FORKS
        description: Maximum parallel processes
      - key: DEFAULT_BECOME_METHOD
        description: Privilege escalation method
      - key: DEFAULT_TRANSPORT
        description: Connection transport
      - key: DEFAULT_ROLES_PATH
        description: Search path for roles
      - key: DEFAULT_STDOUT_CALLBACK
        description: Output callback plugin
      - key: DEFAULT_HASH_BEHAVIOUR
        description: How variables are merged
      - key: DEFAULT_GATHERING
        description: Fact gathering policy
      - key: RETRY_FILES_ENABLED
        description: Whether retry files are created
  tasks:
    - name: Collect configuration values
      ansible.builtin.set_fact:
        config_report: "{{ config_report | default([]) + [{'setting': item.key, 'description': item.description, 'value': lookup('config', item.key, errors='ignore') | default('N/A')}] }}"
      loop: "{{ config_items }}"

    - name: Display configuration report
      ansible.builtin.debug:
        msg: "{{ item.setting }}: {{ item.value }} ({{ item.description }})"
      loop: "{{ config_report }}"

    - name: Write configuration report to file
      ansible.builtin.copy:
        content: |
          Ansible Configuration Report
          Generated: {{ ansible_date_time.iso8601 | default(lookup('pipe', 'date -u +%Y-%m-%dT%H:%M:%SZ')) }}
          ================================
          {% for item in config_report %}
          {{ item.setting }}:
            Value: {{ item.value }}
            Description: {{ item.description }}
          {% endfor %}
        dest: ./ansible_config_report.txt
        mode: '0644'
```

## Debugging Connection Issues

When troubleshooting connectivity problems, knowing the actual configuration helps.

```yaml
# playbook.yml - Debug connection configuration
---
- name: Debug connection settings
  hosts: all
  gather_facts: false
  tasks:
    - name: Show connection parameters for this play
      ansible.builtin.debug:
        msg:
          transport: "{{ lookup('config', 'DEFAULT_TRANSPORT') }}"
          ssh_args: "{{ lookup('config', 'ANSIBLE_SSH_ARGS', errors='ignore') | default('not set') }}"
          remote_user: "{{ lookup('config', 'DEFAULT_REMOTE_USER') }}"
          remote_port: "{{ lookup('config', 'DEFAULT_REMOTE_PORT') }}"
          timeout: "{{ lookup('config', 'DEFAULT_TIMEOUT') }}"
          pipelining: "{{ lookup('config', 'ANSIBLE_PIPELINING', errors='ignore') | default('not set') }}"
      run_once: true

    - name: Test connectivity with current settings
      ansible.builtin.ping:

    - name: Report successful connection
      ansible.builtin.debug:
        msg: "Successfully connected to {{ inventory_hostname }} using {{ lookup('config', 'DEFAULT_TRANSPORT') }}"
```

## Comparing Configuration Across Environments

If you run Ansible from different machines or with different configs, you can track these differences.

```yaml
# playbook.yml - Record configuration fingerprint
---
- name: Record configuration state
  hosts: localhost
  gather_facts: true
  vars:
    important_settings:
      - DEFAULT_FORKS
      - DEFAULT_TIMEOUT
      - DEFAULT_REMOTE_USER
      - DEFAULT_BECOME_METHOD
      - DEFAULT_TRANSPORT
      - DEFAULT_GATHERING
      - DEFAULT_ROLES_PATH
  tasks:
    - name: Build configuration fingerprint
      ansible.builtin.set_fact:
        config_fingerprint: "{{ config_fingerprint | default({}) | combine({item: lookup('config', item, errors='ignore') | default('undefined')}) }}"
      loop: "{{ important_settings }}"

    - name: Save configuration fingerprint
      ansible.builtin.copy:
        content: "{{ config_fingerprint | to_nice_json }}"
        dest: "./config_fingerprint_{{ ansible_hostname }}.json"
        mode: '0644'

    - name: Display fingerprint
      ansible.builtin.debug:
        var: config_fingerprint
```

## Using config Lookup in Role Defaults

Inside roles, you can use the config lookup to set smart defaults that adapt to the controller's configuration.

```yaml
# roles/myapp/defaults/main.yml
---
# Use the Ansible-configured remote user unless overridden
app_user: "{{ lookup('config', 'DEFAULT_REMOTE_USER', errors='ignore') | default('deploy') }}"

# Scale worker threads based on fork count
worker_threads: "{{ lookup('config', 'DEFAULT_FORKS', errors='ignore') | default(5) | int }}"
```

```yaml
# roles/myapp/tasks/main.yml
---
- name: Deploy application as configured user
  ansible.builtin.debug:
    msg: "Deploying as {{ app_user }} with {{ worker_threads }} workers"

- name: Configure application worker threads
  ansible.builtin.template:
    src: worker.conf.j2
    dest: /etc/myapp/worker.conf
    mode: '0644'
```

## Error Handling

Some configuration keys might not exist in all Ansible versions. Use `errors='ignore'` to handle this.

```yaml
# playbook.yml - Safe config lookups
---
- name: Query config safely
  hosts: localhost
  tasks:
    - name: Try to get a setting that might not exist
      ansible.builtin.set_fact:
        some_setting: "{{ lookup('config', 'POSSIBLY_NEW_SETTING', errors='ignore') | default('fallback_value') }}"

    - name: Use the setting
      ansible.builtin.debug:
        msg: "Setting value: {{ some_setting }}"
```

## Tips and Notes

1. **Setting names**: Configuration setting names are the internal constant names, not the `ansible.cfg` key names. For example, the `forks` setting in `ansible.cfg` maps to `DEFAULT_FORKS`. Check the Ansible documentation or source code for the mapping.

2. **Read-only**: The config lookup only reads configuration. You cannot change Ansible configuration at runtime through this lookup.

3. **Timing**: The values reflect the configuration at the time the lookup is evaluated. If something changes the environment between tasks (unlikely but possible), the lookup will reflect the current state.

4. **Plugin configurations**: You can also query plugin-specific settings, not just core Ansible settings. The key names follow the pattern used by the plugin's configuration documentation.

5. **Version differences**: Available configuration keys vary between Ansible versions. A key that exists in Ansible 2.14 might not exist in 2.9. Always use `errors='ignore'` with a default if portability matters.

The `config` lookup plugin is primarily a debugging and introspection tool. It shines when you need to understand why Ansible is behaving a certain way, or when you want to build automation that adapts to the controller environment rather than making assumptions about it.
