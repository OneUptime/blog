# How to Use String Matching in Ansible Conditionals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Conditionals, String Matching, Jinja2

Description: Learn how to perform string matching in Ansible conditionals using filters like match, search, contains, startswith, and endswith.

---

String matching in Ansible conditionals goes far beyond simple equality checks. Whether you need to verify that a hostname follows a naming convention, parse command output for specific patterns, or validate configuration values, Ansible provides several approaches for matching strings within `when` conditions. These capabilities come from a combination of Jinja2 filters, Python string methods, and Ansible-specific test plugins.

## Basic String Comparison

The simplest form of string matching is direct equality using `==`.

```yaml
# Simple string equality check
---
- name: Basic string comparison
  hosts: all
  gather_facts: true

  tasks:
    - name: Apply Ubuntu-specific configuration
      ansible.builtin.debug:
        msg: "This is an Ubuntu system"
      when: ansible_distribution == "Ubuntu"

    - name: Apply non-Ubuntu configuration
      ansible.builtin.debug:
        msg: "This is NOT Ubuntu, it is {{ ansible_distribution }}"
      when: ansible_distribution != "Ubuntu"
```

## Using the in Operator for Substring Checks

The `in` operator checks if a string contains a substring. This is the most common string matching technique in Ansible playbooks.

```yaml
# Substring checking with the in operator
---
- name: Substring matching examples
  hosts: all
  become: true

  tasks:
    - name: Check if hostname indicates a web server
      ansible.builtin.debug:
        msg: "This host ({{ inventory_hostname }}) appears to be a web server"
      when: "'web' in inventory_hostname"

    - name: Get disk usage
      ansible.builtin.command:
        cmd: df -h /
      register: disk_usage
      changed_when: false

    - name: Warn if disk usage output contains high percentage
      ansible.builtin.debug:
        msg: "Check disk usage on {{ inventory_hostname }}"
      when: "'9' in disk_usage.stdout.split()[-2]"
```

## Using startswith and endswith

These Python string methods work directly in Jinja2 expressions and are perfect for pattern-based hostname matching or file extension checks.

```yaml
# Using startswith and endswith for string matching
---
- name: String prefix and suffix matching
  hosts: all
  gather_facts: false

  tasks:
    - name: Identify production hosts by naming convention
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} is a production host"
      when: inventory_hostname.startswith('prod-')

    - name: Identify hosts in US East region
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} is in US East"
      when: inventory_hostname.endswith('-use1')

    - name: Check file extension
      ansible.builtin.find:
        paths: /opt/app/config/
        patterns: "*.yml"
      register: yaml_files

    - name: Process YAML config files
      ansible.builtin.debug:
        msg: "Found {{ yaml_files.matched }} YAML configuration files"
      when: yaml_files.matched > 0
```

## Case-Insensitive String Matching

String comparisons in Ansible are case-sensitive by default. Use the `lower` or `upper` filters for case-insensitive matching.

```yaml
# Case-insensitive string matching
---
- name: Case insensitive comparisons
  hosts: all
  gather_facts: true

  tasks:
    - name: Check OS family regardless of case
      ansible.builtin.debug:
        msg: "This is a Debian-based system"
      when: ansible_os_family | lower == "debian"

    - name: Accept environment variable in any case
      ansible.builtin.debug:
        msg: "Running in production mode"
      when: (lookup('env', 'APP_ENV') | default('dev')) | lower == 'production'

    - name: Check if hostname contains pattern (case insensitive)
      ansible.builtin.debug:
        msg: "Database server detected"
      when: "'db' in inventory_hostname | lower"
```

## Using Jinja2 String Filters

Ansible has access to all Jinja2 string filters, which can be used to transform strings before comparison.

```yaml
# String transformation filters for matching
---
- name: String filter matching
  hosts: all
  gather_facts: true

  tasks:
    - name: Check if hostname matches after replacing hyphens
      ansible.builtin.debug:
        msg: "Normalized hostname: {{ inventory_hostname | replace('-', '_') }}"
      when: "'web_server' in inventory_hostname | replace('-', '_')"

    - name: Trim whitespace before comparing
      ansible.builtin.command:
        cmd: cat /etc/app/version.txt
      register: version_file
      changed_when: false
      ignore_errors: true

    - name: Check version after trimming
      ansible.builtin.debug:
        msg: "Running version 2.x"
      when:
        - version_file is success
        - version_file.stdout | trim is version('2.0', '>=')
        - version_file.stdout | trim is version('3.0', '<')

    - name: Split string and check parts
      ansible.builtin.set_fact:
        hostname_parts: "{{ inventory_hostname.split('-') }}"

    - name: Identify server role from hostname
      ansible.builtin.debug:
        msg: "Server role is {{ hostname_parts[0] }}"
      when: hostname_parts | length >= 2
```

## Matching Against Multiple Strings

When you need to check a string against multiple possible values, you have several options.

```yaml
# Multiple string matching patterns
---
- name: Match against multiple values
  hosts: all
  gather_facts: true

  vars:
    supported_distros:
      - Ubuntu
      - Debian
      - CentOS
      - Rocky

  tasks:
    # Using the in operator with a list
    - name: Check if distro is supported
      ansible.builtin.debug:
        msg: "{{ ansible_distribution }} is supported"
      when: ansible_distribution in supported_distros

    # Using or for a few specific values
    - name: Check for specific distro versions
      ansible.builtin.debug:
        msg: "Running a well-known LTS release"
      when: >
        ansible_distribution_release == 'focal' or
        ansible_distribution_release == 'jammy' or
        ansible_distribution_release == 'noble'

    # Using regex_search for pattern matching
    - name: Match hostname against a naming pattern
      ansible.builtin.debug:
        msg: "Host matches naming convention"
      when: inventory_hostname is regex('^(web|api|worker)-[a-z]+-\d+$')
```

## Matching Command Output Lines

When a command returns multiple lines, you often need to check for specific content within that output.

```yaml
# Matching within multi-line command output
---
- name: Parse multi-line output
  hosts: all
  become: true

  tasks:
    - name: Get list of enabled services
      ansible.builtin.command:
        cmd: systemctl list-unit-files --state=enabled --no-legend
      register: enabled_services
      changed_when: false

    - name: Check if firewalld is enabled
      ansible.builtin.debug:
        msg: "firewalld is enabled on this system"
      when: "'firewalld' in enabled_services.stdout"

    - name: Check specific service in stdout_lines
      ansible.builtin.debug:
        msg: "sshd is enabled"
      when: enabled_services.stdout_lines | select('match', '.*sshd.*') | list | length > 0

    - name: Get network interfaces
      ansible.builtin.command:
        cmd: ip addr show
      register: network_info
      changed_when: false

    - name: Check if specific IP is assigned
      ansible.builtin.debug:
        msg: "Found target IP address on this host"
      when: "'10.0.1.' in network_info.stdout"
```

## String Length Checks

Sometimes you need to verify that a string meets length requirements, such as validating passwords or configuration values.

```yaml
# String length validation
---
- name: Validate string lengths
  hosts: localhost
  gather_facts: false

  vars:
    db_password: "short"
    api_key: "abc123def456ghi789jkl012mno345"

  tasks:
    - name: Validate password length
      ansible.builtin.fail:
        msg: "Database password must be at least 12 characters (currently {{ db_password | length }})"
      when: db_password | length < 12

    - name: Validate API key format
      ansible.builtin.fail:
        msg: "API key must be exactly 30 characters"
      when: api_key | length != 30

    - name: Check that hostname is not too long
      ansible.builtin.debug:
        msg: "Hostname '{{ inventory_hostname }}' length is acceptable ({{ inventory_hostname | length }} chars)"
      when: inventory_hostname | length <= 63
```

## String Type Checks

You can verify the type or format of string content using built-in Python string methods.

```yaml
# String content type validation
---
- name: Validate string content types
  hosts: localhost
  gather_facts: false

  vars:
    port_number: "8080"
    server_name: "web-server-01"
    version_tag: "v2.5.1"

  tasks:
    - name: Verify port is numeric
      ansible.builtin.debug:
        msg: "Port {{ port_number }} is a valid number"
      when: port_number | string | regex_search('^\d+$')

    - name: Check if version tag starts with v
      ansible.builtin.debug:
        msg: "Version tag format is correct"
      when:
        - version_tag.startswith('v')
        - version_tag[1:] is version('0.0.1', '>=')

    - name: Validate hostname contains only allowed characters
      ansible.builtin.fail:
        msg: "Server name contains invalid characters"
      when: server_name is not regex('^[a-z0-9\-]+$')
```

## Empty String Checks

Checking for empty or undefined strings is a common need, especially when dealing with optional variables.

```yaml
# Empty and undefined string handling
---
- name: Handle empty strings
  hosts: localhost
  gather_facts: false

  vars:
    required_var: "some value"
    optional_var: ""

  tasks:
    - name: Check if required variable has content
      ansible.builtin.fail:
        msg: "required_var must not be empty"
      when: required_var | length == 0

    - name: Handle optional variable
      ansible.builtin.debug:
        msg: "Optional var is set to: {{ optional_var }}"
      when:
        - optional_var is defined
        - optional_var | length > 0

    - name: Use default when variable is empty
      ansible.builtin.debug:
        msg: "Using value: {{ optional_var | default('fallback_value', true) }}"
```

The second parameter `true` in `default('fallback_value', true)` is important. It makes the default filter also apply to empty strings, not just undefined variables.

## Performance Tips

When working with string matching in Ansible, keep these tips in mind. Direct string comparison (`==`) is fastest. The `in` operator for substring checks is very efficient. Regular expressions (covered in a separate post) are the most powerful but also the slowest. Use the simplest matching approach that gets the job done.

String matching is a cornerstone of Ansible conditional logic. By combining these techniques, you can write playbooks that parse real system output, validate inputs, and make intelligent decisions based on text content from any source.
