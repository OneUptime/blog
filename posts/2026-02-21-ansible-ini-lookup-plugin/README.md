# How to Use the Ansible ini Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, INI Files, Configuration Management

Description: Learn how to use the Ansible ini lookup plugin to read values from INI-style configuration files directly in your playbooks and templates.

---

If you have ever worked with legacy applications or Linux system configuration, you know that INI files are everywhere. From PHP's `php.ini` to MySQL's `my.cnf` to custom application configs, the INI format remains one of the most common ways to store key-value settings. The Ansible `ini` lookup plugin lets you pull values directly from these files without writing custom parsing logic.

## What the ini Lookup Plugin Does

The `ini` lookup plugin reads values from INI-format files. It can target specific sections, handle default values, and even work with files that use different key-value separators. This is extremely useful when you need to read configuration from existing INI files and use those values in your playbook logic.

## Basic Syntax

The simplest form of the ini lookup takes a key name and a file path.

This example reads the `max_connections` value from a database config file:

```yaml
# playbook.yml - Reading a single value from an INI file
---
- name: Read database configuration
  hosts: localhost
  tasks:
    - name: Get max connections from db config
      ansible.builtin.debug:
        msg: "Max connections: {{ lookup('ini', 'max_connections', file='db.conf', section='mysqld') }}"
```

Given an INI file like this:

```ini
# db.conf - Sample MySQL-style configuration
[mysqld]
max_connections = 150
bind_address = 127.0.0.1
port = 3306

[client]
user = appuser
socket = /var/run/mysqld/mysqld.sock
```

The lookup would return `150`.

## Parameter Reference

The `ini` lookup plugin accepts several parameters that control how it reads the file.

Here is a playbook that demonstrates the key parameters:

```yaml
# playbook.yml - Demonstrating ini lookup parameters
---
- name: INI lookup parameter examples
  hosts: localhost
  tasks:
    # Read from a specific section (default is 'global')
    - name: Read from mysqld section
      ansible.builtin.debug:
        msg: "{{ lookup('ini', 'port', file='db.conf', section='mysqld') }}"

    # Provide a default value if the key is missing
    - name: Read with a default fallback
      ansible.builtin.debug:
        msg: "{{ lookup('ini', 'missing_key', file='db.conf', section='mysqld', default='not_found') }}"

    # Use a custom key-value separator (default is '=')
    - name: Read from a colon-separated file
      ansible.builtin.debug:
        msg: "{{ lookup('ini', 'hostname', file='custom.conf', type='properties') }}"

    # Read from the default (unnamed) section
    - name: Read key from global section
      ansible.builtin.debug:
        msg: "{{ lookup('ini', 'global_setting', file='app.conf') }}"
```

The most commonly used parameters are:

- **file**: Path to the INI file (relative to the playbook or absolute)
- **section**: The `[section]` to read from. Defaults to `global` (lines before any section header)
- **default**: Value to return if the key is not found. Defaults to an empty string
- **type**: Set to `properties` for Java-style properties files that use `:` as a separator
- **re**: If set to `true`, treats the key as a regular expression
- **encoding**: Character encoding of the file. Defaults to `utf-8`

## Reading Multiple Values

You can read several keys at once and store them in variables for later use.

This playbook reads multiple database settings and uses them in a template:

```yaml
# playbook.yml - Reading multiple INI values into variables
---
- name: Configure application from INI settings
  hosts: webservers
  vars:
    db_host: "{{ lookup('ini', 'bind_address', file='/etc/mysql/my.cnf', section='mysqld') }}"
    db_port: "{{ lookup('ini', 'port', file='/etc/mysql/my.cnf', section='mysqld') }}"
    db_max_conn: "{{ lookup('ini', 'max_connections', file='/etc/mysql/my.cnf', section='mysqld', default='100') }}"
  tasks:
    - name: Display database connection info
      ansible.builtin.debug:
        msg: "Connecting to {{ db_host }}:{{ db_port }} (max {{ db_max_conn }} connections)"

    - name: Template application config
      ansible.builtin.template:
        src: app_config.j2
        dest: /etc/myapp/config.yml
```

The corresponding Jinja2 template might look like this:

```yaml
# templates/app_config.j2
database:
  host: {{ db_host }}
  port: {{ db_port }}
  pool_size: {{ (db_max_conn | int) // 4 }}
```

## Working with Properties Files

Java applications often use `.properties` files that look similar to INI files but use `:` or `=` as separators and have no sections.

This example reads from a Java properties file:

```properties
# application.properties - Java-style config
database.url: jdbc:mysql://localhost:3306/mydb
database.username: appuser
database.password: secret123
server.port: 8080
```

```yaml
# playbook.yml - Reading Java properties files
---
- name: Read Java application properties
  hosts: appservers
  tasks:
    - name: Get database URL
      ansible.builtin.debug:
        msg: "DB URL: {{ lookup('ini', 'database.url', type='properties', file='application.properties') }}"

    - name: Get server port
      ansible.builtin.debug:
        msg: "Server port: {{ lookup('ini', 'server.port', type='properties', file='application.properties') }}"
```

## Using Regex to Match Keys

When key names follow a pattern, you can use the `re` parameter to match them with regular expressions.

This playbook finds all keys that start with `plugin_`:

```yaml
# playbook.yml - Using regex matching with ini lookup
---
- name: Find plugin configurations
  hosts: localhost
  tasks:
    - name: Get all plugin settings
      ansible.builtin.debug:
        msg: "{{ lookup('ini', 'plugin_.*', file='app.conf', section='plugins', re=true) }}"
```

## Practical Example: Multi-Environment Deployment

One pattern I use frequently is keeping per-environment INI files and reading from the correct one based on the target environment.

Here is the directory structure:

```
configs/
  production.ini
  staging.ini
  development.ini
```

Each INI file follows the same structure:

```ini
# configs/production.ini
[database]
host = prod-db.internal
port = 5432
name = myapp_prod
pool_size = 50

[cache]
host = prod-redis.internal
port = 6379
ttl = 3600
```

The playbook selects the right config based on a variable:

```yaml
# playbook.yml - Environment-aware INI configuration
---
- name: Deploy with environment-specific settings
  hosts: all
  vars:
    env: "{{ target_env | default('development') }}"
    config_file: "configs/{{ env }}.ini"
    db_host: "{{ lookup('ini', 'host', file=config_file, section='database') }}"
    db_port: "{{ lookup('ini', 'port', file=config_file, section='database') }}"
    db_name: "{{ lookup('ini', 'name', file=config_file, section='database') }}"
    cache_host: "{{ lookup('ini', 'host', file=config_file, section='cache') }}"
    cache_ttl: "{{ lookup('ini', 'ttl', file=config_file, section='cache') }}"
  tasks:
    - name: Show resolved configuration
      ansible.builtin.debug:
        msg: |
          Environment: {{ env }}
          Database: {{ db_host }}:{{ db_port }}/{{ db_name }}
          Cache: {{ cache_host }} (TTL: {{ cache_ttl }}s)

    - name: Deploy configuration
      ansible.builtin.template:
        src: app.conf.j2
        dest: /etc/myapp/app.conf
        mode: '0644'
```

Run it for production with:

```bash
# Deploy to production by specifying the target environment
ansible-playbook playbook.yml -e target_env=production
```

## Error Handling

If the INI file does not exist or the section/key cannot be found, the lookup will fail unless you provide a `default` value. Always set defaults for optional keys.

This example handles missing values gracefully:

```yaml
# playbook.yml - Safe INI lookups with defaults
---
- name: Safely read INI values
  hosts: localhost
  tasks:
    - name: Read optional setting with fallback
      ansible.builtin.set_fact:
        log_level: "{{ lookup('ini', 'log_level', file='app.conf', section='logging', default='INFO') }}"
        log_file: "{{ lookup('ini', 'log_file', file='app.conf', section='logging', default='/var/log/myapp/app.log') }}"

    - name: Use the resolved values
      ansible.builtin.debug:
        msg: "Logging at {{ log_level }} to {{ log_file }}"
```

## Things to Watch Out For

A few gotchas to keep in mind when using the `ini` lookup:

1. **File path resolution**: Relative paths are resolved relative to the playbook directory, not the current working directory. Use absolute paths if you need to read system config files.
2. **Whitespace handling**: The plugin strips leading and trailing whitespace from values by default. If your values contain intentional whitespace, be careful.
3. **Comments**: Lines starting with `#` or `;` are treated as comments and ignored.
4. **Section names are case-sensitive**: `[Database]` and `[database]` are different sections.
5. **Performance**: Each lookup call opens and parses the file independently. If you need many values from the same file, consider reading the file once with `slurp` and parsing it in a different way, or just accept the small overhead for cleaner code.

The `ini` lookup plugin is one of those tools that does not get a lot of attention but saves a ton of time when you are working with legacy systems or any application that still relies on INI-format configuration. Instead of writing shell scripts to grep values out of config files, you get clean, readable lookups right in your playbook.
