# How to Use Version Comparison in Ansible Conditionals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Version Comparison, Conditionals, DevOps

Description: Learn how to compare software versions in Ansible conditionals using the version test for accurate semantic version checking.

---

Comparing version strings is one of those things that looks simple until you try it. The string "2.10" is lexicographically less than "2.9" (because "1" comes before "9" in character comparison), but numerically 2.10 is greater than 2.9. Ansible solves this with the `version` test, which understands semantic versioning and compares version numbers correctly. This is essential for writing playbooks that adapt to different software versions on target systems.

## Basic Version Comparison

The `version` test takes two arguments: the version to compare against and the comparison operator.

```yaml
# Basic version comparison examples
---
- name: Version comparison basics
  hosts: all
  gather_facts: true

  tasks:
    - name: Check kernel version is at least 5.4
      ansible.builtin.debug:
        msg: "Kernel {{ ansible_kernel }} meets the minimum requirement"
      when: ansible_kernel is version('5.4', '>=')

    - name: Warn about old kernel
      ansible.builtin.debug:
        msg: "Kernel {{ ansible_kernel }} is below the recommended version"
      when: ansible_kernel is version('5.4', '<')
```

The supported comparison operators are:

- `<` or `lt` (less than)
- `<=` or `le` (less than or equal)
- `>` or `gt` (greater than)
- `>=` or `ge` (greater than or equal)
- `==` or `eq` (equal)
- `!=` or `ne` (not equal)

## Comparing Software Versions

A common use case is checking the version of installed software to decide whether to upgrade or configure differently.

```yaml
# Check installed software versions
---
- name: Software version checks
  hosts: all
  become: true

  tasks:
    - name: Get nginx version
      ansible.builtin.command:
        cmd: nginx -v
      register: nginx_ver
      changed_when: false
      failed_when: false

    - name: Parse nginx version number
      ansible.builtin.set_fact:
        nginx_version: "{{ nginx_ver.stderr | regex_search('nginx/(\\S+)', '\\1') | first }}"
      when: nginx_ver is success

    - name: Apply HTTP/3 config for nginx 1.25+
      ansible.builtin.template:
        src: nginx-http3.conf.j2
        dest: /etc/nginx/conf.d/http3.conf
      when:
        - nginx_version is defined
        - nginx_version is version('1.25.0', '>=')

    - name: Use legacy config for older nginx
      ansible.builtin.template:
        src: nginx-legacy.conf.j2
        dest: /etc/nginx/conf.d/default.conf
      when:
        - nginx_version is defined
        - nginx_version is version('1.25.0', '<')
```

## Strict vs Loose Version Comparison

The `version` test supports a `strict` parameter that enforces strict semantic versioning (MAJOR.MINOR.PATCH format). By default, comparison is loose and handles various formats.

```yaml
# Strict vs loose version comparison
---
- name: Version comparison modes
  hosts: localhost
  gather_facts: false

  tasks:
    # Loose comparison (default) handles various formats
    - name: Loose comparison with partial versions
      ansible.builtin.debug:
        msg: "Version check passed"
      when: "'2.10' is version('2.9', '>')"
      # This correctly evaluates 2.10 > 2.9

    # Strict comparison requires proper semver format
    - name: Strict semver comparison
      ansible.builtin.debug:
        msg: "Strict version check passed"
      when: "'2.10.0' is version('2.9.0', '>', strict=true)"

    # Loose handles versions with extra parts
    - name: Comparing versions with different segment counts
      ansible.builtin.debug:
        msg: "3.2.1 is greater than 3.2"
      when: "'3.2.1' is version('3.2', '>')"
```

## Version Range Checks

Often you need to check if a version falls within a specific range. Combine multiple version tests to create range checks.

```yaml
# Check version ranges
---
- name: Version range checking
  hosts: all
  become: true

  tasks:
    - name: Get Python version
      ansible.builtin.command:
        cmd: python3 --version
      register: python_out
      changed_when: false

    - name: Parse Python version
      ansible.builtin.set_fact:
        python_ver: "{{ python_out.stdout | regex_search('Python (\\S+)', '\\1') | first }}"

    # Check if Python is in the 3.8.x to 3.11.x range
    - name: Verify Python is in supported range
      ansible.builtin.debug:
        msg: "Python {{ python_ver }} is in the supported range (3.8 - 3.12)"
      when:
        - python_ver is version('3.8', '>=')
        - python_ver is version('3.13', '<')

    - name: Warn about unsupported Python
      ansible.builtin.debug:
        msg: "Python {{ python_ver }} is outside the supported range"
      when: >
        python_ver is version('3.8', '<') or
        python_ver is version('3.13', '>=')
```

## Version Comparison with Ansible Facts

Ansible gathers version information for the distribution and Python installation. These make great targets for version conditionals.

```yaml
# Using version test with gathered facts
---
- name: Fact-based version checks
  hosts: all
  gather_facts: true

  tasks:
    - name: Show distribution version
      ansible.builtin.debug:
        msg: "{{ ansible_distribution }} {{ ansible_distribution_version }}"

    - name: Apply settings for Ubuntu 22.04+
      ansible.builtin.template:
        src: ubuntu-modern.conf.j2
        dest: /etc/app/system.conf
      when:
        - ansible_distribution == "Ubuntu"
        - ansible_distribution_version is version('22.04', '>=')

    - name: Apply settings for older Ubuntu
      ansible.builtin.template:
        src: ubuntu-legacy.conf.j2
        dest: /etc/app/system.conf
      when:
        - ansible_distribution == "Ubuntu"
        - ansible_distribution_version is version('22.04', '<')

    - name: Check Ansible Python version
      ansible.builtin.debug:
        msg: "Ansible is using Python {{ ansible_python_version }}"
      when: ansible_python_version is version('3.9', '>=')
```

## Practical Example: Multi-Version Application Deployment

Here is a real-world pattern where version comparison determines the deployment strategy.

```yaml
# Deploy application based on current and target versions
---
- name: Version-aware deployment
  hosts: app_servers
  become: true

  vars:
    target_version: "3.5.2"

  tasks:
    - name: Get current application version
      ansible.builtin.command:
        cmd: /opt/app/bin/app --version
      register: current_version_raw
      changed_when: false
      failed_when: false

    - name: Set current version fact
      ansible.builtin.set_fact:
        current_version: "{{ current_version_raw.stdout | default('0.0.0') | trim }}"

    - name: Skip if already on target version
      ansible.builtin.debug:
        msg: "Already running version {{ target_version }}, nothing to do"
      when: current_version is version(target_version, '==')

    - name: Determine upgrade type
      ansible.builtin.set_fact:
        upgrade_type: >-
          {% if current_version is version('0.0.1', '<') %}fresh_install
          {% elif current_version.split('.')[0] != target_version.split('.')[0] %}major_upgrade
          {% elif current_version.split('.')[1] != target_version.split('.')[1] %}minor_upgrade
          {% else %}patch_upgrade{% endif %}
      when: current_version is version(target_version, '!=')

    - name: Run database migration for major upgrades
      ansible.builtin.command:
        cmd: /opt/app/bin/migrate --from {{ current_version }}
      when:
        - upgrade_type is defined
        - upgrade_type | trim == 'major_upgrade'

    - name: Perform rolling restart for minor/patch upgrades
      ansible.builtin.systemd:
        name: app
        state: restarted
      when:
        - upgrade_type is defined
        - upgrade_type | trim in ['minor_upgrade', 'patch_upgrade']

    - name: Run full installation for fresh installs
      ansible.builtin.include_role:
        name: app_install
      when:
        - upgrade_type is defined
        - upgrade_type | trim == 'fresh_install'
```

## Handling Non-Standard Version Formats

Not all software follows semantic versioning. Some use dates, some use build numbers, and some include prefixes like "v" or suffixes like "-beta".

```yaml
# Handle non-standard version formats
---
- name: Non-standard version handling
  hosts: all
  become: true

  tasks:
    - name: Get Docker version
      ansible.builtin.command:
        cmd: docker version --format '{{ "{{" }}.Server.Version{{ "}}" }}'
      register: docker_ver
      changed_when: false
      failed_when: false

    - name: Strip any prefix and suffix from version
      ansible.builtin.set_fact:
        # Remove 'v' prefix and anything after a hyphen (like -ce or -beta)
        clean_docker_ver: "{{ docker_ver.stdout | regex_replace('^v', '') | regex_replace('-.*$', '') }}"
      when: docker_ver is success

    - name: Check Docker version meets minimum
      ansible.builtin.assert:
        that:
          - clean_docker_ver is version('20.10', '>=')
        fail_msg: "Docker {{ clean_docker_ver }} is too old. Need 20.10+"
        success_msg: "Docker {{ clean_docker_ver }} meets requirements"
      when: clean_docker_ver is defined

    # Handle date-based versions (like Ubuntu's YY.MM format)
    - name: Compare Ubuntu version (YY.MM format)
      ansible.builtin.debug:
        msg: "Running a recent Ubuntu release"
      when:
        - ansible_distribution == "Ubuntu"
        - ansible_distribution_version is version('22.04', '>=')
```

## Version Comparison in Loops

You can use version comparison inside loops to filter lists of versions.

```yaml
# Filter versions in a loop
---
- name: Version filtering
  hosts: localhost
  gather_facts: false

  vars:
    available_versions:
      - "1.8.0"
      - "1.9.2"
      - "2.0.0"
      - "2.1.0"
      - "2.2.3"
      - "3.0.0-beta"

  tasks:
    - name: List versions that are 2.x compatible
      ansible.builtin.debug:
        msg: "Compatible version: {{ item }}"
      loop: "{{ available_versions }}"
      when:
        - item | regex_replace('-.*$', '') is version('2.0.0', '>=')
        - item | regex_replace('-.*$', '') is version('3.0.0', '<')
```

## Common Mistakes

The biggest mistake is comparing version strings with regular comparison operators like `>` or `<`. These do lexicographic comparison, which breaks on multi-digit segments. Always use the `version` test.

```yaml
# Wrong vs right version comparison
- name: WRONG - lexicographic comparison
  debug:
    msg: "This gives WRONG results"
  when: "'2.10' > '2.9'"
  # Evaluates to FALSE because '1' < '9' lexicographically

- name: RIGHT - version comparison
  debug:
    msg: "This gives CORRECT results"
  when: "'2.10' is version('2.9', '>')"
  # Evaluates to TRUE because 10 > 9 numerically
```

The `version` test is one of those Ansible features that you might not think you need until you run into a subtle bug caused by string-based version comparison. Once you start using it, you will find it indispensable for building playbooks that correctly handle the messy reality of software versioning.
