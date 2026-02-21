# How to Use Ansible Playbook Environment Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Environment Variables, Playbook, Configuration

Description: Learn how to set and manage environment variables in Ansible playbooks at the play, task, and role level for application configuration.

---

Many applications and commands rely on environment variables for configuration. Database connection strings, API keys, proxy settings, and PATH modifications are commonly passed through the environment. Ansible provides the `environment` keyword to set these variables at various levels in your playbook, giving you fine-grained control over the execution environment of your tasks.

## Setting Environment Variables at the Task Level

The most specific way to set environment variables is on individual tasks.

```yaml
# task-level-env.yml - sets environment variables per task
---
- name: Configure application
  hosts: appservers
  become: yes

  tasks:
    - name: Run database migration
      command: python manage.py migrate
      args:
        chdir: /var/www/myapp
      environment:
        DATABASE_URL: "postgresql://myapp:secret@db01:5432/myapp_prod"
        DJANGO_SETTINGS_MODULE: "myapp.settings.production"
        PYTHONPATH: "/var/www/myapp"

    - name: Collect static files
      command: python manage.py collectstatic --noinput
      args:
        chdir: /var/www/myapp
      environment:
        DJANGO_SETTINGS_MODULE: "myapp.settings.production"
        STATIC_ROOT: "/var/www/static"
```

The environment variables are only set for the duration of that specific task. They do not persist on the remote host and do not affect other tasks.

## Setting Environment Variables at the Play Level

If multiple tasks need the same environment variables, set them at the play level to avoid repetition.

```yaml
# play-level-env.yml - sets environment variables for all tasks in the play
---
- name: Deploy Java application
  hosts: appservers
  become: yes

  environment:
    JAVA_HOME: /usr/lib/jvm/java-17-openjdk-amd64
    MAVEN_OPTS: "-Xmx512m -XX:MaxPermSize=128m"
    APP_PROFILE: production

  tasks:
    - name: Build application
      command: mvn clean package -DskipTests
      args:
        chdir: /opt/myapp

    - name: Run application tests
      command: mvn test
      args:
        chdir: /opt/myapp

    - name: Deploy artifact
      copy:
        src: /opt/myapp/target/myapp.jar
        dest: /var/www/myapp/myapp.jar
        remote_src: yes
```

Every task in this play inherits the `JAVA_HOME`, `MAVEN_OPTS`, and `APP_PROFILE` environment variables.

## Setting Environment Variables at the Block Level

You can also scope environment variables to a block of tasks.

```yaml
# block-level-env.yml - sets environment for a group of related tasks
---
- name: Build and deploy
  hosts: appservers
  become: yes

  tasks:
    - name: System preparation
      apt:
        name:
          - build-essential
          - python3-dev
        state: present

    - block:
        - name: Install Python dependencies
          pip:
            requirements: /opt/myapp/requirements.txt
            virtualenv: /opt/myapp/venv

        - name: Run tests
          command: pytest
          args:
            chdir: /opt/myapp

        - name: Build wheel
          command: python setup.py bdist_wheel
          args:
            chdir: /opt/myapp
      environment:
        VIRTUAL_ENV: /opt/myapp/venv
        PATH: "/opt/myapp/venv/bin:{{ ansible_env.PATH }}"
        PIP_NO_CACHE_DIR: "1"
```

The environment variables only apply to the three tasks inside the block.

## Using Variables in Environment Settings

You can use Ansible variables and facts to build environment values dynamically.

```yaml
# dynamic-env.yml - constructs environment values from variables
---
- name: Configure with dynamic environment
  hosts: appservers
  become: yes

  vars:
    db_host: db01.example.com
    db_port: 5432
    db_name: myapp_production
    db_user: myapp
    redis_url: "redis://redis01.example.com:6379/0"

  environment:
    DATABASE_URL: "postgresql://{{ db_user }}@{{ db_host }}:{{ db_port }}/{{ db_name }}"
    REDIS_URL: "{{ redis_url }}"
    HOSTNAME: "{{ inventory_hostname }}"
    INSTANCE_IP: "{{ ansible_default_ipv4.address }}"

  tasks:
    - name: Run application setup
      command: /opt/myapp/setup.sh

    - name: Start application
      command: /opt/myapp/start.sh
```

## Storing Environment in Variables Files

For cleaner playbooks, define environment dictionaries in variable files and reference them.

```yaml
# group_vars/appservers.yml - environment defined in group vars
---
app_environment:
  DATABASE_URL: "postgresql://myapp@db01:5432/myapp_prod"
  REDIS_URL: "redis://redis01:6379/0"
  SECRET_KEY: "{{ vault_secret_key }}"
  LOG_LEVEL: "INFO"
  ALLOWED_HOSTS: "*.example.com"

proxy_environment:
  http_proxy: "http://proxy.example.com:3128"
  https_proxy: "http://proxy.example.com:3128"
  no_proxy: "localhost,127.0.0.1,.example.com"
```

```yaml
# playbook.yml - references the environment dictionary
---
- name: Deploy application
  hosts: appservers
  become: yes

  tasks:
    - name: Run application with app environment
      command: /opt/myapp/run.sh
      environment: "{{ app_environment }}"

    - name: Download external dependency through proxy
      get_url:
        url: https://artifacts.example.com/myapp-libs.tar.gz
        dest: /tmp/myapp-libs.tar.gz
      environment: "{{ proxy_environment }}"
```

## Merging Environment Dictionaries

When you need to combine multiple environment sources, use the Jinja2 `combine` filter.

```yaml
# merge-env.yml - merges multiple environment dictionaries
---
- name: Deploy with merged environments
  hosts: appservers
  become: yes

  vars:
    base_env:
      LOG_LEVEL: INFO
      TZ: UTC
    app_env:
      DATABASE_URL: "postgresql://db01/myapp"
      SECRET_KEY: "mysecret"
    deploy_env:
      DEPLOY_VERSION: "2.5.0"
      DEPLOYED_BY: "ansible"

  tasks:
    - name: Run deployment script
      command: /opt/deploy.sh
      environment: "{{ base_env | combine(app_env) | combine(deploy_env) }}"
```

The resulting environment will have all variables from all three dictionaries.

## Proxy Configuration Pattern

One of the most common uses of the `environment` keyword is configuring HTTP proxies. Many corporate environments require proxy settings for outbound connections.

```yaml
# proxy-aware.yml - handles proxy settings consistently
---
- name: Install packages behind a proxy
  hosts: all
  become: yes

  vars:
    proxy_env:
      http_proxy: "http://proxy.corp.example.com:3128"
      https_proxy: "http://proxy.corp.example.com:3128"
      no_proxy: "localhost,127.0.0.1,10.0.0.0/8,.corp.example.com"

  tasks:
    - name: Update apt cache
      apt:
        update_cache: yes
      environment: "{{ proxy_env }}"

    - name: Install packages
      apt:
        name:
          - curl
          - wget
          - git
        state: present
      environment: "{{ proxy_env }}"

    - name: Download application tarball
      get_url:
        url: https://releases.example.com/myapp-2.5.0.tar.gz
        dest: /tmp/myapp.tar.gz
      environment: "{{ proxy_env }}"

    - name: Run local task (no proxy needed)
      copy:
        src: files/app.conf
        dest: /etc/myapp/app.conf
```

## Setting Persistent Environment Variables

The `environment` keyword in Ansible only affects the current task execution. It does not set permanent environment variables on the remote host. If you need persistent environment variables, write them to a file.

```yaml
# persistent-env.yml - writes environment variables to a file for persistence
---
- name: Set persistent environment variables
  hosts: appservers
  become: yes

  vars:
    app_env_vars:
      DATABASE_URL: "postgresql://db01/myapp"
      REDIS_URL: "redis://redis01:6379/0"
      LOG_LEVEL: "INFO"

  tasks:
    # Write to /etc/environment for system-wide persistence
    - name: Set system-wide environment variables
      lineinfile:
        path: /etc/environment
        regexp: "^{{ item.key }}="
        line: "{{ item.key }}={{ item.value }}"
      loop: "{{ app_env_vars | dict2items }}"

    # Or write to a systemd service override for service-specific vars
    - name: Create systemd environment file
      copy:
        content: |
          {% for key, value in app_env_vars.items() %}
          {{ key }}={{ value }}
          {% endfor %}
        dest: /etc/myapp/environment
        mode: '0600'

    # Reference it in the systemd service
    - name: Configure systemd to use environment file
      lineinfile:
        path: /etc/systemd/system/myapp.service.d/override.conf
        regexp: '^EnvironmentFile='
        line: "EnvironmentFile=/etc/myapp/environment"
        create: yes
      notify: Reload systemd

  handlers:
    - name: Reload systemd
      systemd:
        daemon_reload: yes
```

## Execution Environment Flow

Here is how Ansible applies environment variables during task execution.

```mermaid
flowchart TD
    A[Task Execution Begins] --> B{Play-level environment?}
    B -->|Yes| C[Start with play environment]
    B -->|No| D[Start with empty environment]
    C --> E{Block-level environment?}
    D --> E
    E -->|Yes| F[Merge/override with block environment]
    E -->|No| G[Keep current environment]
    F --> H{Task-level environment?}
    G --> H
    H -->|Yes| I[Merge/override with task environment]
    H -->|No| J[Use current environment]
    I --> K[Execute task with final environment]
    J --> K
```

Task-level settings override block-level, which override play-level. The more specific scope wins.

## Security Note

Be careful about putting sensitive values like database passwords and API keys directly in playbooks. Use Ansible Vault to encrypt sensitive environment values.

```yaml
# Use vault-encrypted variables for secrets
- name: Run with encrypted secrets
  command: /opt/myapp/start.sh
  environment:
    DATABASE_URL: "{{ vault_database_url }}"
    API_KEY: "{{ vault_api_key }}"
```

The `environment` keyword is a straightforward way to control the execution context of your tasks. Whether you need proxy settings, application configuration, or PATH modifications, it provides clean, scoped environment management without permanently altering the remote hosts.
