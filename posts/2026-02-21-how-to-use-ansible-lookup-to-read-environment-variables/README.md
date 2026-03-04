# How to Use Ansible lookup to Read Environment Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup, Environment Variables, Automation

Description: A detailed guide to using the Ansible env lookup plugin to read environment variables from the control node into your playbooks and templates.

---

The `env` lookup plugin in Ansible reads environment variables from the control node (the machine running Ansible). This is one of the most practical lookup plugins because it bridges the gap between your shell environment and your Ansible variables. Whether you are pulling secrets from CI/CD pipelines, reading system paths, or integrating with external tools, the env lookup is the tool for the job.

## Basic env Lookup Syntax

The env lookup has a straightforward syntax.

```yaml
# basic-env-lookup.yml
# Reads environment variables using the lookup plugin
---
- name: Read environment variables
  hosts: localhost
  gather_facts: no
  tasks:
    - name: Read HOME directory
      ansible.builtin.debug:
        msg: "Home directory: {{ lookup('env', 'HOME') }}"

    - name: Read PATH
      ansible.builtin.debug:
        msg: "PATH: {{ lookup('env', 'PATH') }}"

    - name: Read USER
      ansible.builtin.debug:
        msg: "Current user: {{ lookup('env', 'USER') }}"

    - name: Read a custom variable
      ansible.builtin.debug:
        msg: "Deploy token: {{ lookup('env', 'DEPLOY_TOKEN') }}"
```

The lookup runs on the control node, not on remote hosts. This is a crucial distinction. If you need environment variables from a remote host, use the `ansible.builtin.command` module or facts instead.

## Using env Lookup in vars

You can use the env lookup to set play-level variables.

```yaml
# env-in-vars.yml
# Sets play variables from environment variables
---
- name: Deploy with environment-based config
  hosts: appservers
  vars:
    # Read from environment with defaults for missing values
    db_host: "{{ lookup('env', 'DB_HOST') | default('localhost', true) }}"
    db_port: "{{ lookup('env', 'DB_PORT') | default('5432', true) }}"
    db_password: "{{ lookup('env', 'DB_PASSWORD') }}"
    deploy_env: "{{ lookup('env', 'DEPLOY_ENV') | default('development', true) }}"
    api_key: "{{ lookup('env', 'API_KEY') }}"

  tasks:
    - name: Show database configuration
      ansible.builtin.debug:
        msg:
          - "DB Host: {{ db_host }}"
          - "DB Port: {{ db_port }}"
          - "Environment: {{ deploy_env }}"
```

The `default('value', true)` pattern is important. The second `true` parameter tells Jinja2 to use the default even when the variable is defined but has an empty string value. Without `true`, an empty environment variable would not trigger the default.

## Handling Missing Environment Variables

When an environment variable is not set, the env lookup returns an empty string. This can cause subtle bugs. Here is how to handle it properly.

```yaml
# handle-missing-env.yml
# Validates that required environment variables are set
---
- name: Validate environment variables
  hosts: localhost
  gather_facts: no
  vars:
    required_env_vars:
      - DB_PASSWORD
      - API_KEY
      - JWT_SECRET
      - DEPLOY_TOKEN

  tasks:
    - name: Check each required environment variable
      ansible.builtin.assert:
        that:
          - lookup('env', item) | length > 0
        fail_msg: "Required environment variable {{ item }} is not set"
        success_msg: "{{ item }} is set"
      loop: "{{ required_env_vars }}"

    - name: Proceed with deployment
      ansible.builtin.debug:
        msg: "All required environment variables are set. Proceeding."
```

You can also build a validation task that checks all variables at once.

```yaml
    - name: Check all required env vars at once
      ansible.builtin.fail:
        msg: |
          Missing required environment variables:
          {{ missing_vars | join(', ') }}

          Please set them before running this playbook:
          {% for var in missing_vars %}
          export {{ var }}=your_value
          {% endfor %}
      vars:
        missing_vars: >-
          {{
            required_env_vars
            | select('match', '.*')
            | map('community.general.from_csv', lookup_plugin='env')
            | list
          }}
      when: false  # Placeholder for demonstration
```

A simpler approach:

```yaml
    - name: Validate env vars with meaningful errors
      ansible.builtin.set_fact:
        db_password: "{{ lookup('env', 'DB_PASSWORD') }}"
      failed_when: lookup('env', 'DB_PASSWORD') == ''
```

## Using env Lookup in Templates

Environment variables from the control node can be embedded in templates.

```yaml
# env-in-templates.yml
# Uses env lookup in templates for deployment metadata
---
- name: Deploy with metadata from environment
  hosts: appservers
  become: yes
  tasks:
    - name: Deploy application with build info
      ansible.builtin.template:
        src: deploy-info.yml.j2
        dest: /opt/myapp/deploy-info.yml
        mode: '0644'
```

```jinja2
{# templates/deploy-info.yml.j2 #}
{# Deployment metadata from control node environment #}
deployment:
  version: "{{ lookup('env', 'BUILD_VERSION') | default('unknown', true) }}"
  git_commit: "{{ lookup('env', 'GIT_COMMIT') | default('unknown', true) }}"
  git_branch: "{{ lookup('env', 'GIT_BRANCH') | default('unknown', true) }}"
  build_number: "{{ lookup('env', 'BUILD_NUMBER') | default('0', true) }}"
  deployed_by: "{{ lookup('env', 'USER') }}"
  deployed_from: "{{ lookup('env', 'HOSTNAME') }}"
  deployed_at: "{{ ansible_date_time.iso8601 }}"
  ci_pipeline: "{{ lookup('env', 'CI_PIPELINE_ID') | default('manual', true) }}"
```

## Reading Multiple Environment Variables

You can read multiple environment variables efficiently.

```yaml
# multi-env-lookup.yml
# Reads multiple environment variables into a dictionary
---
- name: Read multiple env vars
  hosts: localhost
  gather_facts: no
  vars:
    env_config:
      database_url: "{{ lookup('env', 'DATABASE_URL') }}"
      redis_url: "{{ lookup('env', 'REDIS_URL') }}"
      api_base_url: "{{ lookup('env', 'API_BASE_URL') }}"
      log_level: "{{ lookup('env', 'LOG_LEVEL') | default('info', true) }}"
      workers: "{{ lookup('env', 'WORKER_COUNT') | default('4', true) }}"

  tasks:
    - name: Show all environment-based config
      ansible.builtin.debug:
        msg: "{{ item.key }}: {{ item.value if item.value else 'NOT SET' }}"
      loop: "{{ env_config | dict2items }}"
      loop_control:
        label: "{{ item.key }}"
```

## env Lookup in Conditionals

Use environment variables to control playbook flow.

```yaml
# conditional-env.yml
# Uses environment variables for conditional execution
---
- name: Conditional execution based on environment
  hosts: all
  gather_facts: no
  tasks:
    - name: Run only in CI environment
      ansible.builtin.debug:
        msg: "Running in CI mode"
      when: lookup('env', 'CI') | default(false, true) | bool

    - name: Skip in production
      ansible.builtin.debug:
        msg: "This task skips in production"
      when: lookup('env', 'DEPLOY_ENV') | default('development', true) != 'production'

    - name: Extra validation for production deployments
      ansible.builtin.pause:
        prompt: "You are deploying to PRODUCTION. Press Enter to continue or Ctrl+C to abort"
      when:
        - lookup('env', 'DEPLOY_ENV') == 'production'
        - lookup('env', 'CI') | default('') == ''
```

## Practical Example: CI/CD Pipeline Integration

Here is a complete example showing how a CI/CD pipeline passes variables through the environment.

```yaml
# ci-deploy.yml
# Complete CI/CD deployment using environment variables
---
- name: CI/CD Deployment
  hosts: "{{ lookup('env', 'TARGET_HOSTS') | default('staging', true) }}"
  become: yes
  vars:
    app_version: "{{ lookup('env', 'BUILD_VERSION') }}"
    git_sha: "{{ lookup('env', 'GIT_SHA') | default('unknown', true) }}"
    deployer: "{{ lookup('env', 'CI_COMMITTER') | default(lookup('env', 'USER'), true) }}"
    artifact_url: "{{ lookup('env', 'ARTIFACT_URL') }}"

  pre_tasks:
    - name: Validate required CI variables
      ansible.builtin.assert:
        that:
          - app_version | length > 0
          - artifact_url | length > 0
        fail_msg: >
          Missing CI environment variables.
          Required: BUILD_VERSION, ARTIFACT_URL

  tasks:
    - name: Download build artifact
      ansible.builtin.get_url:
        url: "{{ artifact_url }}"
        dest: "/opt/releases/{{ app_version }}.tar.gz"
        headers:
          Authorization: "Bearer {{ lookup('env', 'ARTIFACT_TOKEN') }}"
        mode: '0644'

    - name: Extract artifact
      ansible.builtin.unarchive:
        src: "/opt/releases/{{ app_version }}.tar.gz"
        dest: /opt/myapp/
        remote_src: yes

    - name: Update symlink to current version
      ansible.builtin.file:
        src: "/opt/myapp/{{ app_version }}"
        dest: /opt/myapp/current
        state: link

    - name: Record deployment
      ansible.builtin.copy:
        content: |
          version: {{ app_version }}
          git_sha: {{ git_sha }}
          deployed_by: {{ deployer }}
          deployed_at: {{ ansible_date_time.iso8601 }}
        dest: /opt/myapp/current/DEPLOY_INFO
        mode: '0644'

    - name: Restart application
      ansible.builtin.service:
        name: myapp
        state: restarted
```

## Using env Lookup with Proxy Configuration

A common pattern is reading proxy settings from the environment.

```yaml
# proxy-from-env.yml
# Reads proxy configuration from environment variables
---
- name: Configure hosts with proxy settings
  hosts: all
  become: yes
  vars:
    http_proxy: "{{ lookup('env', 'HTTP_PROXY') | default(lookup('env', 'http_proxy'), true) }}"
    https_proxy: "{{ lookup('env', 'HTTPS_PROXY') | default(lookup('env', 'https_proxy'), true) }}"
    no_proxy: "{{ lookup('env', 'NO_PROXY') | default(lookup('env', 'no_proxy'), true) }}"

  tasks:
    - name: Configure apt proxy if set
      ansible.builtin.copy:
        content: |
          Acquire::http::Proxy "{{ http_proxy }}";
          Acquire::https::Proxy "{{ https_proxy }}";
        dest: /etc/apt/apt.conf.d/proxy.conf
        mode: '0644'
      when:
        - http_proxy | length > 0
        - ansible_facts['os_family'] == 'Debian'
```

## Security Considerations

A few important notes about using environment variables with Ansible.

```yaml
# security-notes.yml
# Demonstrates security-aware env var handling
---
- name: Security-aware env var usage
  hosts: localhost
  gather_facts: no
  tasks:
    # GOOD: Use no_log to hide sensitive values in output
    - name: Set password from environment (hidden in logs)
      ansible.builtin.set_fact:
        db_password: "{{ lookup('env', 'DB_PASSWORD') }}"
      no_log: true

    # GOOD: Validate before using
    - name: Validate password is set
      ansible.builtin.assert:
        that: db_password | length >= 8
        fail_msg: "DB_PASSWORD must be at least 8 characters"
      no_log: true

    # BAD: Don't log sensitive values
    # - debug: msg="{{ db_password }}"  # Never do this
```

## Summary

The `env` lookup plugin bridges your shell environment with Ansible variables. Use it for reading CI/CD pipeline variables, pulling secrets without storing them in files, reading system configuration like proxy settings, and integrating with external secret management tools. Always provide defaults for optional variables, validate required ones with assertions, and use `no_log: true` for sensitive values. Remember that env lookups run on the control node only, so they reflect the environment where Ansible is running, not the remote hosts.
