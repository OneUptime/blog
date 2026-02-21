# How to Use Ansible to Set User Environment Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Linux, Environment Variables, User Management

Description: Learn how to set and manage user environment variables with Ansible using profile files, PAM, systemd, and per-session configuration.

---

Environment variables shape how applications behave on Linux. A database connection string, an API key path, a log level setting, a Java heap size - these are all commonly configured through environment variables. Managing them consistently across servers and users is important, and Ansible gives you several ways to do it depending on where and when you need the variables available.

## Where Environment Variables Live

Linux loads environment variables from multiple places, and the order matters:

```mermaid
flowchart TD
    A[System Boot] --> B[/etc/environment]
    B --> C[/etc/profile]
    C --> D[/etc/profile.d/*.sh]
    D --> E[~/.bash_profile or ~/.profile]
    E --> F[~/.bashrc]
    F --> G[Application-specific env files]
    G --> H[User Session Ready]
```

Each level can add or override variables from previous levels.

## Setting System-Wide Environment Variables

For variables that should be available to all users, use `/etc/environment`:

```yaml
# system-wide-env.yml - Set system-wide environment variables
- name: Set system-wide environment variables
  hosts: all
  become: yes
  tasks:
    - name: Set LANG in /etc/environment
      ansible.builtin.lineinfile:
        path: /etc/environment
        regexp: '^LANG='
        line: 'LANG=en_US.UTF-8'

    - name: Set EDITOR in /etc/environment
      ansible.builtin.lineinfile:
        path: /etc/environment
        regexp: '^EDITOR='
        line: 'EDITOR=vim'

    - name: Set custom application path
      ansible.builtin.lineinfile:
        path: /etc/environment
        regexp: '^APP_CONFIG_DIR='
        line: 'APP_CONFIG_DIR=/etc/myapp'
```

Note: `/etc/environment` uses `KEY=value` format without `export`. It is read by PAM, not the shell, so it works for all login methods including SSH and GUI.

## Using /etc/profile.d/ for Shell Variables

For variables that need shell features (like variable expansion), use `/etc/profile.d/`:

```yaml
# profile-d-env.yml - Set environment variables via profile.d
- name: Configure environment variables via profile.d
  hosts: all
  become: yes
  tasks:
    - name: Create custom profile script
      ansible.builtin.copy:
        dest: /etc/profile.d/custom-env.sh
        content: |
          # Custom environment variables - managed by Ansible
          export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
          export PATH="${JAVA_HOME}/bin:${PATH}"
          export MAVEN_HOME=/opt/maven
          export PATH="${MAVEN_HOME}/bin:${PATH}"
          export GOPATH="/home/${USER}/go"
          export PATH="${GOPATH}/bin:${PATH}"
        mode: '0644'
        owner: root
        group: root
```

Scripts in `/etc/profile.d/` are sourced for every login shell session. They support full bash syntax including variable expansion and conditionals.

## Setting Per-User Environment Variables

To set variables for a specific user, modify their shell profile:

```yaml
# user-env-vars.yml - Set per-user environment variables
- name: Set environment variables for specific users
  hosts: all
  become: yes
  tasks:
    # Add variables to user's .bashrc
    - name: Set NODE_ENV for deploy user
      ansible.builtin.lineinfile:
        path: /home/deploy/.bashrc
        regexp: '^export NODE_ENV='
        line: 'export NODE_ENV=production'
        owner: deploy
        group: deploy
        create: yes

    - name: Set application variables for deploy user
      ansible.builtin.blockinfile:
        path: /home/deploy/.bashrc
        marker: "# {mark} ANSIBLE MANAGED - Application Environment"
        block: |
          export APP_PORT=8080
          export APP_LOG_LEVEL=info
          export APP_DB_HOST=db.internal.example.com
          export APP_CACHE_TTL=3600
        owner: deploy
        group: deploy
```

The `blockinfile` module is useful when you have multiple related variables. It wraps them in marker comments so they can be updated as a group.

## Using .bash_profile vs .bashrc

The distinction between these files matters:

- **~/.bash_profile** (or ~/.profile): Loaded for login shells (SSH, console login)
- **~/.bashrc**: Loaded for interactive non-login shells (opening a terminal in a GUI)

Most distributions have `.bash_profile` source `.bashrc`, so putting variables in `.bashrc` usually covers both cases. But if you want to be thorough:

```yaml
# profile-setup.yml - Ensure proper shell profile chain
- name: Set up shell profile properly
  hosts: all
  become: yes
  tasks:
    # Ensure .bash_profile sources .bashrc
    - name: Ensure .bash_profile sources .bashrc
      ansible.builtin.lineinfile:
        path: "/home/{{ item }}/.bash_profile"
        line: '[ -f ~/.bashrc ] && source ~/.bashrc'
        create: yes
        owner: "{{ item }}"
        group: "{{ item }}"
      loop:
        - deploy
        - appuser

    # Put environment variables in .bashrc
    - name: Set environment variables in .bashrc
      ansible.builtin.blockinfile:
        path: "/home/{{ item.user }}/.bashrc"
        marker: "# {mark} ANSIBLE MANAGED - {{ item.label }}"
        block: "{{ item.content }}"
        owner: "{{ item.user }}"
        group: "{{ item.user }}"
      loop:
        - user: deploy
          label: "deploy env"
          content: |
            export DEPLOY_ENV=production
            export DEPLOY_REGION=us-east-1
        - user: appuser
          label: "app env"
          content: |
            export APP_HOME=/opt/myapp
            export APP_CONFIG=${APP_HOME}/config
```

## Setting Environment Variables for systemd Services

Services managed by systemd need their environment set differently:

```yaml
# systemd-env.yml - Environment variables for systemd services
- name: Configure environment for systemd services
  hosts: all
  become: yes
  tasks:
    # Method 1: Environment file
    - name: Create environment file for the application
      ansible.builtin.copy:
        dest: /etc/myapp/env
        content: |
          # Application environment - managed by Ansible
          NODE_ENV=production
          PORT=8080
          DB_HOST=db.internal.example.com
          DB_PORT=5432
          DB_NAME=myapp
          LOG_LEVEL=info
          CACHE_REDIS_URL=redis://cache.internal:6379
        mode: '0640'
        owner: root
        group: myapp

    # Reference the env file in the systemd unit
    - name: Create systemd service with environment file
      ansible.builtin.copy:
        dest: /etc/systemd/system/myapp.service
        content: |
          [Unit]
          Description=My Application
          After=network.target

          [Service]
          Type=simple
          User=myapp
          Group=myapp
          EnvironmentFile=/etc/myapp/env
          ExecStart=/opt/myapp/bin/start
          Restart=always

          [Install]
          WantedBy=multi-user.target
        mode: '0644'
      notify: reload systemd

    # Method 2: Inline environment in systemd override
    - name: Create systemd override with inline environment
      ansible.builtin.file:
        path: /etc/systemd/system/myapp.service.d
        state: directory
        mode: '0755'

    - name: Add environment override
      ansible.builtin.copy:
        dest: /etc/systemd/system/myapp.service.d/environment.conf
        content: |
          [Service]
          Environment="SECRET_KEY=supersecretvalue"
          Environment="API_TOKEN=abc123def456"
        mode: '0640'
      notify: reload systemd

  handlers:
    - name: reload systemd
      ansible.builtin.systemd:
        daemon_reload: yes
```

## Using Ansible Variables as Environment Variables

You can pass Ansible variables directly as environment variables in tasks:

```yaml
# ansible-env.yml - Use environment directive in tasks
- name: Run tasks with specific environment
  hosts: all
  become: yes
  tasks:
    - name: Run database migration
      ansible.builtin.command: "/opt/app/bin/migrate"
      environment:
        DATABASE_URL: "postgres://user:pass@db:5432/myapp"
        RAILS_ENV: production
        DISABLE_DATABASE_ENVIRONMENT_CHECK: "1"

    - name: Build application
      ansible.builtin.command: "npm run build"
      args:
        chdir: /opt/app
      environment:
        NODE_ENV: production
        CI: "true"
        NODE_OPTIONS: "--max-old-space-size=4096"
```

The `environment` directive sets variables only for that specific task. They do not persist.

## Managing Environment Variables with Templates

For complex environment configurations, use Jinja2 templates:

```yaml
# template-env.yml - Use templates for environment files
- name: Deploy environment file from template
  hosts: all
  become: yes
  vars:
    app_config:
      port: 8080
      db_host: "{{ db_server_address }}"
      db_port: 5432
      db_name: myapp
      log_level: "{{ 'debug' if env == 'development' else 'info' }}"
      workers: "{{ ansible_processor_vcpus * 2 }}"
  tasks:
    - name: Deploy environment file
      ansible.builtin.template:
        src: templates/app.env.j2
        dest: /etc/myapp/app.env
        owner: myapp
        group: myapp
        mode: '0640'
      notify: restart myapp
```

The template file (`templates/app.env.j2`):

```
# Application Environment - Generated by Ansible
# Do not edit manually
PORT={{ app_config.port }}
DB_HOST={{ app_config.db_host }}
DB_PORT={{ app_config.db_port }}
DB_NAME={{ app_config.db_name }}
LOG_LEVEL={{ app_config.log_level }}
WORKERS={{ app_config.workers }}
HOSTNAME={{ inventory_hostname }}
```

## Setting Variables for Multiple Users from Data

Manage environment variables for multiple users efficiently:

```yaml
# multi-user-env.yml - Set env vars for multiple users
- name: Configure environment for multiple users
  hosts: all
  become: yes
  vars:
    user_environments:
      - user: alice
        vars:
          EDITOR: vim
          PYTHONPATH: /opt/python/lib
      - user: bob
        vars:
          EDITOR: nano
          GOPATH: /home/bob/go
      - user: deploy
        vars:
          AWS_DEFAULT_REGION: us-east-1
          ANSIBLE_HOST_KEY_CHECKING: "False"
  tasks:
    - name: Set environment variables for each user
      ansible.builtin.blockinfile:
        path: "/home/{{ item.user }}/.bashrc"
        marker: "# {mark} ANSIBLE MANAGED ENVIRONMENT"
        block: |
          {% for key, value in item.vars.items() %}
          export {{ key }}={{ value }}
          {% endfor %}
        owner: "{{ item.user }}"
        group: "{{ item.user }}"
        create: yes
      loop: "{{ user_environments }}"
      loop_control:
        label: "{{ item.user }}"
```

## Removing Environment Variables

To remove a variable, use `state: absent` with `lineinfile`:

```yaml
# remove-env-var.yml - Remove environment variables
- name: Remove obsolete environment variables
  hosts: all
  become: yes
  tasks:
    - name: Remove OLD_VAR from /etc/environment
      ansible.builtin.lineinfile:
        path: /etc/environment
        regexp: '^OLD_VAR='
        state: absent

    - name: Remove deprecated block from user bashrc
      ansible.builtin.blockinfile:
        path: /home/deploy/.bashrc
        marker: "# {mark} ANSIBLE MANAGED - deprecated vars"
        state: absent
```

## Best Practices

1. **Use `/etc/environment`** for variables needed by all users and services. It is the most universal method.

2. **Use `/etc/profile.d/`** for variables that need shell features like PATH manipulation.

3. **Use systemd `EnvironmentFile`** for service-specific variables. Do not rely on user profile files for services.

4. **Never put secrets in profile files**. Use Ansible Vault, environment files with restricted permissions, or a secrets manager.

5. **Use `blockinfile` for groups of related variables**. It keeps them organized and makes updates clean.

6. **Set restrictive permissions on environment files** that contain sensitive data. Use `0640` and set the group to the application user's group.

7. **Document what each variable does**. Add comments above each variable or group of variables. Future you will appreciate it.

Environment variable management with Ansible is about choosing the right method for the right context. System-wide variables go in `/etc/environment`, user-specific ones go in profile files, and service-specific ones go in systemd environment files.
