# How to Use Regex in Ansible Conditionals with match and search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Regex, Conditionals, Jinja2, Automation

Description: Learn how to use regex_match and regex_search in Ansible when conditionals for pattern matching in strings and command output.

---

Regular expressions give you the most powerful string matching capabilities in Ansible. While simple substring checks with `in` handle many cases, regex is what you need when the pattern is complex or variable. Ansible provides two main regex tools for conditionals: the `match` test (which anchors to the start of the string) and the `search` test (which looks anywhere in the string). Understanding the difference between these two is critical to getting your conditionals right.

## match vs search: The Key Difference

The `match` test checks if a regex matches at the **beginning** of the string. The `search` test checks if the regex matches **anywhere** in the string. This distinction trips up a lot of people.

```yaml
# Demonstrate the difference between match and search
---
- name: match vs search comparison
  hosts: localhost
  gather_facts: false

  vars:
    test_string: "server-web-prod-01"

  tasks:
    # match checks from the beginning of the string
    - name: match anchors to the start
      ansible.builtin.debug:
        msg: "Starts with 'server'"
      when: test_string is match('server')
      # This WILL match because the string starts with "server"

    - name: match fails for middle patterns
      ansible.builtin.debug:
        msg: "This will NOT appear"
      when: test_string is match('web')
      # This will NOT match because "web" is not at the start

    # search looks anywhere in the string
    - name: search finds patterns anywhere
      ansible.builtin.debug:
        msg: "Contains 'web' somewhere"
      when: test_string is search('web')
      # This WILL match because "web" exists in the string

    - name: search also works at the start
      ansible.builtin.debug:
        msg: "Contains 'server' somewhere"
      when: test_string is search('server')
      # This also matches
```

## The regex Test

Ansible also provides a `regex` test which behaves like `search` by default but can be configured.

```yaml
# Using the regex test
---
- name: Regex test examples
  hosts: localhost
  gather_facts: false

  vars:
    hostname: "web-prod-us-east-01"

  tasks:
    - name: Match hostname naming convention
      ansible.builtin.debug:
        msg: "Hostname follows naming convention"
      when: hostname is regex('^(web|api|db)-(prod|staging|dev)-[a-z]+-[a-z]+-\d{2}$')

    - name: Extract region from hostname
      ansible.builtin.debug:
        msg: "Host is in a US region"
      when: hostname is regex('us-(east|west|central)')
```

## Validating IP Addresses

Regex is perfect for validating IP addresses and network-related strings.

```yaml
# Validate IP addresses with regex
---
- name: IP address validation
  hosts: all
  gather_facts: true

  tasks:
    - name: Check if the default IPv4 is in a private range
      ansible.builtin.debug:
        msg: "{{ ansible_default_ipv4.address }} is in the 10.x.x.x range"
      when: ansible_default_ipv4.address is match('10\.\d+\.\d+\.\d+')

    - name: Validate IP format from variable
      ansible.builtin.fail:
        msg: "Invalid IP address format: {{ custom_ip | default('not set') }}"
      when:
        - custom_ip is defined
        - custom_ip is not regex('^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$')

    - name: Check if host is in a specific subnet
      ansible.builtin.debug:
        msg: "Host is in the 192.168.1.x subnet"
      when: ansible_default_ipv4.address is match('192\.168\.1\.')
```

## Parsing Command Output with Regex

Real-world playbooks often need to parse command output. Regex conditionals make this manageable.

```yaml
# Parse version strings from command output
---
- name: Version checking with regex
  hosts: all
  become: true

  tasks:
    - name: Get Java version
      ansible.builtin.command:
        cmd: java -version
      register: java_version
      changed_when: false
      failed_when: false

    - name: Check for Java 11+
      ansible.builtin.debug:
        msg: "Java 11 or newer detected"
      when:
        - java_version is success
        - java_version.stderr is search('version "(1[1-9]|[2-9]\d)\.')

    - name: Check for old Java 8
      ansible.builtin.debug:
        msg: "WARNING: Running Java 8, consider upgrading"
      when:
        - java_version is success
        - java_version.stderr is search('version "1\.8\.')

    - name: Get Python version
      ansible.builtin.command:
        cmd: python3 --version
      register: python_version
      changed_when: false
      failed_when: false

    - name: Verify Python 3.8+
      ansible.builtin.debug:
        msg: "Python version is acceptable: {{ python_version.stdout }}"
      when:
        - python_version is success
        - python_version.stdout is regex('Python 3\.(8|9|1[0-9]|[2-9]\d)')
```

## Using Regex with Hostname Patterns

When managing large fleets, hostname conventions encode information about the server. Regex lets you decode that.

```yaml
# Hostname-based routing with regex
---
- name: Route tasks based on hostname patterns
  hosts: all
  gather_facts: false

  tasks:
    - name: Apply web server config
      ansible.builtin.include_role:
        name: webserver
      when: inventory_hostname is match('web-')

    - name: Apply database config
      ansible.builtin.include_role:
        name: database
      when: inventory_hostname is match('db-')

    - name: Identify server number
      ansible.builtin.debug:
        msg: >
          Server number: {{ inventory_hostname | regex_search('\d+$') }}
      when: inventory_hostname is search('\d+$')

    - name: Apply region-specific settings
      ansible.builtin.include_vars:
        file: "vars/{{ region }}.yml"
      vars:
        region: "{{ inventory_hostname | regex_search('(us-east|us-west|eu-west)') }}"
      when: inventory_hostname is search('(us-east|us-west|eu-west)')
```

## Case-Insensitive Regex

By default, regex matching is case-sensitive. You can make it case-insensitive using the `(?i)` flag at the start of the pattern.

```yaml
# Case-insensitive regex matching
---
- name: Case insensitive regex
  hosts: all
  gather_facts: true

  tasks:
    - name: Check OS (case insensitive)
      ansible.builtin.debug:
        msg: "Running on a Debian-family system"
      when: ansible_os_family is regex('(?i)debian')

    - name: Match environment tag regardless of case
      ansible.builtin.debug:
        msg: "Production environment detected"
      when: env_tag | default('dev') is regex('(?i)^prod(uction)?$')
```

## Regex with Captured Groups

You can use `regex_search` as a filter (not just a test) to extract captured groups from strings.

```yaml
# Extract data using regex capture groups
---
- name: Extract data with regex
  hosts: all
  become: true

  tasks:
    - name: Get nginx version
      ansible.builtin.command:
        cmd: nginx -v
      register: nginx_output
      changed_when: false
      failed_when: false

    - name: Parse major and minor version
      ansible.builtin.set_fact:
        nginx_major: "{{ nginx_output.stderr | regex_search('nginx/(\\d+)', '\\1') | first }}"
        nginx_minor: "{{ nginx_output.stderr | regex_search('nginx/\\d+\\.(\\d+)', '\\1') | first }}"
      when: nginx_output is success

    - name: Report nginx version details
      ansible.builtin.debug:
        msg: "Nginx major={{ nginx_major }}, minor={{ nginx_minor }}"
      when: nginx_major is defined

    - name: Warn about old nginx
      ansible.builtin.debug:
        msg: "Nginx version {{ nginx_major }}.{{ nginx_minor }} is outdated"
      when:
        - nginx_major is defined
        - nginx_major | int < 1 or (nginx_major | int == 1 and nginx_minor | int < 20)
```

## Validating Configuration Values

Regex is excellent for validating that configuration variables match expected formats.

```yaml
# Validate configuration with regex
---
- name: Configuration validation
  hosts: localhost
  gather_facts: false

  vars:
    app_config:
      db_host: "db-prod-01.example.com"
      api_key: "sk_live_abc123def456"
      email: "admin@example.com"
      port: "8443"
      log_level: "INFO"

  tasks:
    - name: Validate hostname format
      ansible.builtin.assert:
        that:
          - app_config.db_host is regex('^[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}$')
        fail_msg: "Invalid database hostname format"

    - name: Validate API key format
      ansible.builtin.assert:
        that:
          - app_config.api_key is regex('^sk_(live|test)_[a-zA-Z0-9]{12,}$')
        fail_msg: "API key does not match expected format (sk_live_xxx or sk_test_xxx)"

    - name: Validate email format
      ansible.builtin.assert:
        that:
          - app_config.email is regex('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        fail_msg: "Invalid email address format"

    - name: Validate port number
      ansible.builtin.assert:
        that:
          - app_config.port is regex('^\d{1,5}$')
          - app_config.port | int > 0
          - app_config.port | int < 65536
        fail_msg: "Port must be a number between 1 and 65535"

    - name: Validate log level
      ansible.builtin.assert:
        that:
          - app_config.log_level is regex('^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$')
        fail_msg: "Invalid log level. Must be DEBUG, INFO, WARNING, ERROR, or CRITICAL"
```

## Common Regex Pitfalls in Ansible

Watch out for YAML quoting issues. Backslashes in regex need careful handling in YAML.

```yaml
# Proper quoting for regex in YAML
---
- name: Regex quoting examples
  hosts: localhost
  gather_facts: false

  tasks:
    # Single quotes prevent YAML from interpreting backslashes
    - name: Use single quotes for regex (recommended)
      ansible.builtin.debug:
        msg: "Matches digit pattern"
      when: "'abc123' is regex('^[a-z]+\\d+$')"

    # You can also use the > or | YAML block styles
    - name: Block style avoids quoting issues
      ansible.builtin.debug:
        msg: "Pattern matched"
      when: >
        'server-01' is regex('^server-\d+$')
```

The most common mistake is confusing `match` and `search`. Remember: `match` is anchored to the start, `search` looks anywhere. If your regex conditional seems to work sometimes and fail other times, this is probably the cause.

Regex in Ansible conditionals gives you surgical precision when simple string operations are not enough. Use `match` when you care about what a string starts with, use `search` when you need to find a pattern anywhere, and use `regex_search` as a filter when you need to extract matched content.
