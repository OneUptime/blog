# How to Use Ansible package_facts Module to Get Installed Packages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Package Management, Facts, System Administration

Description: Learn how to use the Ansible package_facts module to discover installed packages and their versions on managed hosts for compliance and auditing.

---

Knowing what software is installed on your servers is fundamental for security auditing, compliance checks, and deployment decisions. The `ansible.builtin.package_facts` module collects a list of all installed packages on a managed host and makes that data available as Ansible facts. You can then use this information to check versions, verify required software is present, or generate software inventory reports.

## How package_facts Works

Unlike standard fact gathering (which runs the setup module), package information is not collected by default. You need to explicitly call the `package_facts` module as a task. Once called, it populates `ansible_facts['packages']` with a dictionary keyed by package name.

```yaml
# basic-package-facts.yml
# Gathers and displays package information
---
- name: Gather package facts
  hosts: all
  become: yes
  tasks:
    - name: Collect installed package facts
      ansible.builtin.package_facts:
        manager: auto

    - name: Show total number of installed packages
      ansible.builtin.debug:
        msg: "Total packages installed: {{ ansible_facts['packages'] | length }}"

    - name: Check if nginx is installed
      ansible.builtin.debug:
        msg: "nginx version: {{ ansible_facts['packages']['nginx'][0]['version'] }}"
      when: "'nginx' in ansible_facts['packages']"
```

The `manager: auto` parameter tells the module to detect the package manager automatically. It supports apt, rpm, pacman, and pip.

## Package Facts Data Structure

Each entry in `ansible_facts['packages']` is a list (because multiple versions of a package can be installed). Each item in the list is a dictionary with details about that package.

```yaml
# inspect-package-structure.yml
# Shows the detailed structure of package facts
---
- name: Inspect package facts structure
  hosts: all
  become: yes
  tasks:
    - name: Gather package facts
      ansible.builtin.package_facts:
        manager: auto

    - name: Show detailed info for a specific package
      ansible.builtin.debug:
        var: ansible_facts['packages']['openssl']
      when: "'openssl' in ansible_facts['packages']"
```

For a Debian/Ubuntu system, a package entry looks like this:

```json
{
  "openssl": [
    {
      "name": "openssl",
      "version": "3.0.2",
      "release": "0ubuntu1.12",
      "epoch": null,
      "arch": "amd64",
      "source": "apt"
    }
  ]
}
```

For RHEL/CentOS, it looks slightly different:

```json
{
  "openssl": [
    {
      "name": "openssl",
      "version": "3.0.7",
      "release": "25.el9_3",
      "epoch": 1,
      "arch": "x86_64",
      "source": "rpm"
    }
  ]
}
```

## Checking if Specific Packages Are Installed

A common use case is verifying that required packages are present.

```yaml
# check-required-packages.yml
# Verifies that required packages are installed
---
- name: Verify required packages
  hosts: appservers
  become: yes
  vars:
    required_packages:
      - python3
      - git
      - curl
      - openssl
      - nginx
  tasks:
    - name: Gather package facts
      ansible.builtin.package_facts:
        manager: auto

    - name: Check each required package
      ansible.builtin.debug:
        msg: "{{ item }}: {{ 'INSTALLED (' + ansible_facts['packages'][item][0]['version'] + ')' if item in ansible_facts['packages'] else 'MISSING' }}"
      loop: "{{ required_packages }}"

    - name: Fail if any required packages are missing
      ansible.builtin.fail:
        msg: "Missing required packages: {{ missing_packages | join(', ') }}"
      vars:
        missing_packages: "{{ required_packages | difference(ansible_facts['packages'].keys() | list) }}"
      when: missing_packages | length > 0
```

## Checking Package Versions

Version checks are essential for security compliance and ensuring compatibility.

```yaml
# check-package-versions.yml
# Validates that packages meet minimum version requirements
---
- name: Validate package versions
  hosts: all
  become: yes
  vars:
    version_requirements:
      openssl:
        min_version: "3.0.0"
      python3:
        min_version: "3.8"
      git:
        min_version: "2.30"
  tasks:
    - name: Gather package facts
      ansible.builtin.package_facts:
        manager: auto

    - name: Check package versions
      ansible.builtin.assert:
        that:
          - item.key in ansible_facts['packages']
          - ansible_facts['packages'][item.key][0]['version'] is version(item.value.min_version, '>=')
        fail_msg: >
          {{ item.key }}: installed version
          {{ ansible_facts['packages'][item.key][0]['version'] | default('NOT INSTALLED') }}
          does not meet minimum {{ item.value.min_version }}
        success_msg: >
          {{ item.key }}: {{ ansible_facts['packages'][item.key][0]['version'] }} >= {{ item.value.min_version }}
      loop: "{{ version_requirements | dict2items }}"
      loop_control:
        label: "{{ item.key }}"
```

## Security Vulnerability Scanning

Check for packages with known vulnerabilities by comparing installed versions.

```yaml
# security-check.yml
# Checks for packages with known vulnerable versions
---
- name: Check for vulnerable packages
  hosts: all
  become: yes
  vars:
    vulnerable_packages:
      - name: openssl
        vulnerable_versions: ["1.1.1", "1.1.1a", "1.1.1b"]
        cve: "CVE-2023-XXXX"
      - name: curl
        max_safe_version: "7.88.0"
        cve: "CVE-2023-YYYY"
  tasks:
    - name: Gather package facts
      ansible.builtin.package_facts:
        manager: auto

    - name: Check for vulnerable openssl
      ansible.builtin.debug:
        msg: "WARNING: {{ item.name }} version {{ ansible_facts['packages'][item.name][0]['version'] }} may be vulnerable ({{ item.cve }})"
      loop: "{{ vulnerable_packages }}"
      when:
        - item.name in ansible_facts['packages']
        - item.vulnerable_versions is defined
        - ansible_facts['packages'][item.name][0]['version'] in item.vulnerable_versions
      loop_control:
        label: "{{ item.name }}"
```

## Generating Software Inventory Reports

Create a comprehensive software inventory across all managed hosts.

```yaml
# software-inventory.yml
# Generates a software inventory report for auditing
---
- name: Generate software inventory
  hosts: all
  become: yes
  tasks:
    - name: Gather package facts
      ansible.builtin.package_facts:
        manager: auto

    - name: Generate inventory report
      ansible.builtin.template:
        src: software-inventory.txt.j2
        dest: "/tmp/inventory-{{ inventory_hostname }}.txt"
      delegate_to: localhost
```

```jinja2
{# templates/software-inventory.txt.j2 #}
{# Software inventory report for compliance auditing #}
Software Inventory Report
Host: {{ inventory_hostname }}
Date: {{ ansible_date_time.iso8601 }}
Total Packages: {{ ansible_facts['packages'] | length }}
================================================================

{% for pkg_name in ansible_facts['packages'] | sort %}
{% for pkg in ansible_facts['packages'][pkg_name] %}
{{ "%-40s" | format(pkg_name) }} {{ "%-20s" | format(pkg.version) }} {{ pkg.arch | default('') }}
{% endfor %}
{% endfor %}
```

## Comparing Packages Across Hosts

You can use `hostvars` to compare package versions across multiple hosts.

```yaml
# compare-packages.yml
# Compares specific package versions across all hosts
---
- name: Gather package facts from all hosts
  hosts: all
  become: yes
  tasks:
    - name: Gather package facts
      ansible.builtin.package_facts:
        manager: auto

- name: Compare packages on localhost
  hosts: localhost
  gather_facts: no
  vars:
    packages_to_compare:
      - openssl
      - python3
      - git
      - nginx
  tasks:
    - name: Show package comparison
      ansible.builtin.debug:
        msg: >
          {{ item.1 }} on {{ item.0 }}:
          {{ hostvars[item.0]['ansible_facts']['packages'][item.1][0]['version']
             if item.1 in hostvars[item.0]['ansible_facts']['packages']
             else 'NOT INSTALLED' }}
      loop: "{{ groups['all'] | product(packages_to_compare) | list }}"
      loop_control:
        label: "{{ item.0 }}/{{ item.1 }}"
```

## Using package_facts with pip Packages

The module also supports gathering Python pip packages.

```yaml
# pip-packages.yml
# Gathers both system and pip package facts
---
- name: Gather all package types
  hosts: all
  become: yes
  tasks:
    - name: Gather system packages
      ansible.builtin.package_facts:
        manager: auto

    - name: Show system package count
      ansible.builtin.debug:
        msg: "System packages: {{ ansible_facts['packages'] | length }}"

    - name: Gather pip packages separately
      ansible.builtin.package_facts:
        manager: pip
      ignore_errors: yes

    - name: Show pip package details
      ansible.builtin.debug:
        msg: "{{ item.key }}: {{ item.value[0].version }}"
      loop: "{{ ansible_facts['packages'] | dict2items }}"
      when: item.value[0].source | default('') == 'pip'
      loop_control:
        label: "{{ item.key }}"
```

## Conditional Tasks Based on Installed Packages

Make deployment decisions based on what is already installed.

```yaml
# conditional-deploy.yml
# Adapts deployment based on what packages are already present
---
- name: Deploy with awareness of installed packages
  hosts: appservers
  become: yes
  tasks:
    - name: Gather package facts
      ansible.builtin.package_facts:
        manager: auto

    - name: Use existing PostgreSQL client if installed
      ansible.builtin.set_fact:
        db_client: "psql"
      when: "'postgresql-client' in ansible_facts['packages'] or 'postgresql' in ansible_facts['packages']"

    - name: Install PostgreSQL client if not present
      ansible.builtin.package:
        name: postgresql-client
        state: present
      when: "'postgresql-client' not in ansible_facts['packages'] and 'postgresql' not in ansible_facts['packages']"

    - name: Skip Java install if already present
      ansible.builtin.debug:
        msg: "Java already installed: {{ ansible_facts['packages']['java-17-openjdk-headless'][0]['version'] }}"
      when: "'java-17-openjdk-headless' in ansible_facts['packages']"
```

## Filtering Packages

When you only care about certain packages, filter the dictionary to reduce noise.

```yaml
# filter-packages.yml
# Filters package list to show only security-relevant packages
---
- name: Show security-relevant packages
  hosts: all
  become: yes
  vars:
    security_packages:
      - openssl
      - openssh-server
      - openssh-client
      - libssl3
      - ca-certificates
      - gnupg
      - sudo
  tasks:
    - name: Gather package facts
      ansible.builtin.package_facts:
        manager: auto

    - name: Display security-relevant packages
      ansible.builtin.debug:
        msg: "{{ item }}: {{ ansible_facts['packages'][item][0]['version'] }}"
      loop: "{{ security_packages }}"
      when: item in ansible_facts['packages']
```

## Summary

The `package_facts` module bridges the gap between your Ansible automation and the actual state of installed software. Use it for compliance auditing (verifying required packages and versions), security scanning (checking for vulnerable versions), deployment decisions (adapting behavior based on what is installed), and inventory reporting (documenting what runs where). Unlike standard fact gathering, you need to call `package_facts` explicitly as a task, but once called, the data integrates seamlessly with Ansible's variable system for conditionals, templates, and assertions.
