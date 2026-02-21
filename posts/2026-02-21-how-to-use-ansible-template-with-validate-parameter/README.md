# How to Use Ansible Template with validate Parameter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Templates, Validation, Configuration Management, DevOps

Description: Learn how to use the validate parameter with the Ansible template module to check generated config files before deploying them to production.

---

Deploying a broken configuration file can take down a service instantly. A misplaced semicolon in nginx.conf, an invalid entry in sudoers, or a malformed sshd_config can lock you out of a server entirely. The `validate` parameter on the Ansible template module runs a validation command against the generated file before it replaces the existing one. If validation fails, Ansible keeps the original file untouched and reports an error.

This is one of the most underused features of the template module, and it can save you from some serious incidents.

## How It Works

The template module generates the file to a temporary location first. When you specify a `validate` parameter, Ansible runs the validation command against the temporary file. If the command returns a zero exit code, the file is moved to the destination. If it returns non-zero, the task fails and the original file remains unchanged.

The `%s` placeholder in the validation command gets replaced with the path to the temporary file.

## Basic Syntax

```yaml
# Validate a generated config file before deploying it
- name: Deploy nginx configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    validate: 'nginx -t -c %s'
```

The `%s` is replaced with the temporary file path. Nginx's `-t` flag tests the configuration and `-c` specifies which config file to check.

## Sudoers File Validation

This is the textbook example. A broken sudoers file can prevent you from running any sudo commands, effectively locking you out:

```yaml
# ALWAYS validate sudoers files - a broken sudoers can lock you out
- name: Deploy sudoers file
  ansible.builtin.template:
    src: sudoers.j2
    dest: /etc/sudoers
    owner: root
    group: root
    mode: '0440'
    validate: 'visudo -cf %s'
```

The `visudo -cf %s` command checks the file for syntax errors without actually installing it. The `-c` flag means check-only, and `-f` specifies the file to check.

The template:

```jinja2
{# templates/sudoers.j2 - Sudoers file with validation safety net #}
# /etc/sudoers - Managed by Ansible
# This file MUST be edited with 'visudo' or validated before deployment

Defaults    env_reset
Defaults    secure_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# Root access
root    ALL=(ALL:ALL) ALL

# Admin group
%admin  ALL=(ALL) ALL

# Service accounts
{% for user in sudo_users %}
{{ user.name }}    ALL=({{ user.runas | default('ALL') }}) {{ 'NOPASSWD: ' if user.nopasswd | default(false) else '' }}{{ user.commands | default('ALL') }}
{% endfor %}
```

If your template produces invalid sudoers syntax (say, a typo in a variable), the validation catches it before the broken file hits the system.

## SSH Server Configuration

Another file where mistakes can be catastrophic:

```yaml
# Validate sshd config before deploying - a broken sshd_config can lock you out
- name: Deploy SSH server configuration
  ansible.builtin.template:
    src: sshd_config.j2
    dest: /etc/ssh/sshd_config
    owner: root
    group: root
    mode: '0600'
    validate: 'sshd -t -f %s'
  notify: restart sshd
```

The `sshd -t -f %s` command tests the configuration file for errors.

```jinja2
{# templates/sshd_config.j2 - SSH config with strict security settings #}
# SSH Server Configuration - Managed by Ansible
Port {{ sshd_port | default(22) }}
ListenAddress {{ sshd_listen_address | default('0.0.0.0') }}

# Authentication
PermitRootLogin {{ 'yes' if sshd_permit_root | default(false) else 'no' }}
PasswordAuthentication {{ 'yes' if sshd_password_auth | default(false) else 'no' }}
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys

# Security
MaxAuthTries {{ sshd_max_auth_tries | default(3) }}
ClientAliveInterval {{ sshd_client_alive_interval | default(300) }}
ClientAliveCountMax {{ sshd_client_alive_count | default(2) }}

{% if sshd_allowed_users is defined %}
AllowUsers {{ sshd_allowed_users | join(' ') }}
{% endif %}
```

## Nginx Configuration

```yaml
# Validate nginx config before reloading
- name: Deploy nginx site configuration
  ansible.builtin.template:
    src: site.conf.j2
    dest: /etc/nginx/sites-available/{{ site_name }}.conf
    validate: 'nginx -t -c %s'
  notify: reload nginx
```

Note: There is a subtlety with nginx validation. The `-c %s` tests the file as the main nginx configuration, not as an included file. For site configs that are included via `include` directives, the validation might fail because the file alone is not a complete nginx config.

A workaround is to create a wrapper validation script:

```yaml
# Use a wrapper script for validating nginx includes
- name: Deploy nginx validation script
  ansible.builtin.copy:
    content: |
      #!/bin/bash
      cp "$1" /etc/nginx/sites-available/_test.conf
      nginx -t
      result=$?
      rm -f /etc/nginx/sites-available/_test.conf
      exit $result
    dest: /usr/local/bin/validate-nginx-site.sh
    mode: '0755'

- name: Deploy site config with wrapper validation
  ansible.builtin.template:
    src: site.conf.j2
    dest: /etc/nginx/sites-available/{{ site_name }}.conf
    validate: '/usr/local/bin/validate-nginx-site.sh %s'
```

## Apache Configuration

```yaml
# Validate Apache configuration before deploying
- name: Deploy Apache virtual host
  ansible.builtin.template:
    src: vhost.conf.j2
    dest: /etc/apache2/sites-available/{{ site_name }}.conf
    validate: 'apachectl configtest'
```

Wait, there is a problem. Apache's `configtest` does not accept a file argument. It tests the entire running configuration. For Apache, you need to use `apachectl -t` or a wrapper approach similar to the nginx one above:

```yaml
# Apache validation approach using a syntax check
- name: Deploy Apache config with validation
  ansible.builtin.template:
    src: vhost.conf.j2
    dest: /etc/apache2/sites-available/{{ site_name }}.conf
    validate: 'apache2ctl -t'
```

## PHP Configuration

```yaml
# Validate PHP configuration syntax
- name: Deploy php.ini
  ansible.builtin.template:
    src: php.ini.j2
    dest: /etc/php/8.1/fpm/php.ini
    validate: 'php -r "parse_ini_file(\"%s\") or exit(1);"'
  notify: restart php-fpm
```

## Systemd Unit Files

```yaml
# Validate systemd unit file before installing
- name: Deploy systemd service
  ansible.builtin.template:
    src: myapp.service.j2
    dest: /etc/systemd/system/myapp.service
    validate: 'systemd-analyze verify %s'
  notify:
    - daemon reload
    - restart myapp
```

```jinja2
{# templates/myapp.service.j2 - Systemd service unit file #}
[Unit]
Description={{ app_name }} Service
After=network.target
{% if app_requires_db | default(false) %}
Requires=postgresql.service
After=postgresql.service
{% endif %}

[Service]
Type=simple
User={{ app_user }}
Group={{ app_group }}
WorkingDirectory={{ app_directory }}
ExecStart={{ app_directory }}/bin/start
Restart=always
RestartSec=5
Environment=NODE_ENV={{ environment }}
Environment=PORT={{ app_port }}

[Install]
WantedBy=multi-user.target
```

## YAML File Validation

For YAML configuration files, use a Python-based validator:

```yaml
# Validate YAML syntax before deploying
- name: Deploy application config
  ansible.builtin.template:
    src: app_config.yml.j2
    dest: /etc/myapp/config.yml
    validate: 'python3 -c "import yaml; yaml.safe_load(open(\"%s\"))"'
```

## JSON File Validation

```yaml
# Validate JSON syntax
- name: Deploy JSON configuration
  ansible.builtin.template:
    src: config.json.j2
    dest: /etc/myapp/config.json
    validate: 'python3 -c "import json; json.load(open(\"%s\"))"'
```

## Custom Validation Scripts

For complex validation that built-in tools cannot handle:

```yaml
# Use a custom validation script
- name: Deploy application config with custom validation
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/myapp/app.conf
    validate: '/opt/myapp/bin/validate-config %s'
```

The validation script:

```bash
#!/bin/bash
# /opt/myapp/bin/validate-config
# Validates myapp configuration file

CONFIG_FILE="$1"

# Check required keys exist
for key in database_host database_port api_key; do
    if ! grep -q "^${key}=" "$CONFIG_FILE"; then
        echo "ERROR: Missing required key: ${key}"
        exit 1
    fi
done

# Check port is a number
port=$(grep "^database_port=" "$CONFIG_FILE" | cut -d= -f2)
if ! [[ "$port" =~ ^[0-9]+$ ]]; then
    echo "ERROR: database_port must be a number, got: ${port}"
    exit 1
fi

echo "Configuration valid"
exit 0
```

## Multiple Validation Steps

If you need multiple validation checks, chain them:

```yaml
# Chain multiple validation commands
- name: Deploy config with multiple checks
  ansible.builtin.template:
    src: complex.conf.j2
    dest: /etc/myapp/complex.conf
    validate: 'bash -c "python3 -c \"import yaml; yaml.safe_load(open(\\\"$1\\\"))\" && /opt/myapp/bin/validate %s"'
```

This gets unwieldy quickly. A cleaner approach is a wrapper script:

```yaml
# Use a wrapper for multiple validation steps
- name: Create validation wrapper
  ansible.builtin.copy:
    content: |
      #!/bin/bash
      # Validate YAML syntax
      python3 -c "import yaml; yaml.safe_load(open('$1'))" || exit 1
      # Validate application-specific rules
      /opt/myapp/bin/validate "$1" || exit 1
      echo "All validations passed"
    dest: /usr/local/bin/validate-myapp-config.sh
    mode: '0755'

- name: Deploy config with wrapper validation
  ansible.builtin.template:
    src: complex.conf.j2
    dest: /etc/myapp/complex.conf
    validate: '/usr/local/bin/validate-myapp-config.sh %s'
```

## What Happens When Validation Fails

When validation fails:

1. The temporary file is deleted
2. The original destination file remains unchanged
3. The task reports a failure with the validation command's output
4. Subsequent tasks can be skipped or handled depending on your error handling strategy

```yaml
# Handle validation failure gracefully
- name: Deploy config with error handling
  block:
    - name: Deploy configuration
      ansible.builtin.template:
        src: app.conf.j2
        dest: /etc/myapp/app.conf
        validate: '/opt/myapp/bin/validate %s'
      notify: restart myapp
  rescue:
    - name: Alert on config validation failure
      ansible.builtin.debug:
        msg: "Configuration validation failed on {{ inventory_hostname }}. Original config preserved."

    - name: Send alert
      ansible.builtin.uri:
        url: "{{ slack_webhook_url }}"
        method: POST
        body_format: json
        body:
          text: "Config deployment failed on {{ inventory_hostname }} - validation error"
```

## Summary

The `validate` parameter is your safety net against deploying broken configurations. Always use it for critical system files like sudoers, sshd_config, and any file where a syntax error could cause an outage or lock you out. For files without built-in validators, write custom validation scripts. The key principle is simple: never replace a working config file with an untested one. The `validate` parameter enforces this principle automatically, and the small effort of adding it to your template tasks pays for itself the first time it catches a bad config before it hits production.
