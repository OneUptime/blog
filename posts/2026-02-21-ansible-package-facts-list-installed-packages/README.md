# How to Use Ansible package_facts to List Installed Packages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Package Management, System Administration, Facts

Description: Learn how to use the Ansible package_facts module to gather installed package information and use it for conditional logic, auditing, and compliance checks.

---

One of the things that makes Ansible powerful is its ability to gather facts about target systems and make decisions based on those facts. The `package_facts` module extends this capability to installed packages. It lets you query what software is installed on a system and then use that information in your playbooks for conditional logic, compliance checks, or inventory auditing.

I have found this module incredibly useful in environments where you inherit servers with unknown configurations or need to enforce software compliance policies.

## Basic Usage

The `package_facts` module populates the `ansible_facts.packages` dictionary with information about every installed package on the system.

```yaml
# Gather facts about all installed packages
- name: Gather package facts
  ansible.builtin.package_facts:
    manager: auto
```

The `manager` parameter tells Ansible which package manager to query. Setting it to `auto` lets Ansible detect the appropriate manager (apt, rpm, etc.) based on the system. You can also explicitly set it to `apt`, `rpm`, or `pacman`.

After running this task, the `ansible_facts.packages` variable contains a dictionary where keys are package names and values are lists of installed versions (a list because you can have multiple versions of the same package installed in some cases).

## Checking If a Specific Package Is Installed

The most common use case is checking whether a particular package exists on the system before performing an action.

```yaml
# Check if nginx is installed and act accordingly
- name: Gather package facts
  ansible.builtin.package_facts:
    manager: auto

- name: Display nginx version if installed
  ansible.builtin.debug:
    msg: "nginx version: {{ ansible_facts.packages['nginx'][0].version }}"
  when: "'nginx' in ansible_facts.packages"

- name: Warn if nginx is not installed
  ansible.builtin.debug:
    msg: "nginx is NOT installed on this host"
  when: "'nginx' not in ansible_facts.packages"
```

## Conditional Package Installation

You can use package facts to install packages only when certain dependencies are already present.

```yaml
# Only install a monitoring agent if the application it monitors is present
- name: Gather package facts
  ansible.builtin.package_facts:
    manager: auto

- name: Install PostgreSQL monitoring agent
  ansible.builtin.package:
    name: pg-monitor-agent
    state: present
  when: "'postgresql-15' in ansible_facts.packages or 'postgresql-14' in ansible_facts.packages"

- name: Install MySQL monitoring agent
  ansible.builtin.package:
    name: mysql-monitor-agent
    state: present
  when: "'mysql-server' in ansible_facts.packages"
```

## Security Auditing: Finding Vulnerable Packages

A practical use of `package_facts` is checking for packages with known vulnerabilities. You can compare installed versions against a list of known-bad versions.

```yaml
# Check for packages with known vulnerabilities
- name: Gather package facts
  ansible.builtin.package_facts:
    manager: auto

- name: Define vulnerable packages
  ansible.builtin.set_fact:
    vulnerable_packages:
      openssl:
        below: "3.0.8"
      curl:
        below: "7.88.0"
      sudo:
        below: "1.9.13"

- name: Check for vulnerable openssl
  ansible.builtin.debug:
    msg: >
      WARNING: openssl {{ ansible_facts.packages['openssl'][0].version }}
      is installed but version {{ vulnerable_packages.openssl.below }}
      or higher is required
  when:
    - "'openssl' in ansible_facts.packages"
    - "ansible_facts.packages['openssl'][0].version is version(vulnerable_packages.openssl.below, '<')"
```

## Listing All Installed Packages

Sometimes you just want a complete list of installed packages for inventory or documentation purposes.

```yaml
# Generate a list of all installed packages with versions
- name: Gather package facts
  ansible.builtin.package_facts:
    manager: auto

- name: Create a sorted list of installed packages
  ansible.builtin.set_fact:
    package_list: "{{ ansible_facts.packages | dict2items | map(attribute='key') | sort }}"

- name: Write package list to file
  ansible.builtin.copy:
    content: |
      # Installed packages on {{ inventory_hostname }}
      # Generated: {{ ansible_date_time.iso8601 }}
      {% for pkg in ansible_facts.packages | dict2items | sort(attribute='key') %}
      {{ pkg.key }} {{ pkg.value[0].version }}
      {% endfor %}
    dest: /tmp/installed_packages.txt
    mode: '0644'
```

## Compliance Checking: Required and Forbidden Packages

In regulated environments, you might have lists of packages that must be installed and packages that must not be installed.

```yaml
---
# playbook: compliance-check.yml
# Verify package compliance against required and forbidden lists
- hosts: all
  become: true

  vars:
    required_packages:
      - auditd
      - aide
      - rsyslog
      - firewalld
      - selinux-policy

    forbidden_packages:
      - telnet-server
      - rsh-server
      - ypserv
      - tftp-server
      - xinetd

  tasks:
    - name: Gather package facts
      ansible.builtin.package_facts:
        manager: auto

    - name: Check for missing required packages
      ansible.builtin.set_fact:
        missing_packages: "{{ required_packages | reject('in', ansible_facts.packages) | list }}"

    - name: Check for forbidden packages that are installed
      ansible.builtin.set_fact:
        found_forbidden: "{{ forbidden_packages | select('in', ansible_facts.packages) | list }}"

    - name: Report missing required packages
      ansible.builtin.debug:
        msg: "COMPLIANCE VIOLATION: Missing required packages: {{ missing_packages }}"
      when: missing_packages | length > 0

    - name: Report forbidden packages found
      ansible.builtin.debug:
        msg: "COMPLIANCE VIOLATION: Forbidden packages installed: {{ found_forbidden }}"
      when: found_forbidden | length > 0

    - name: Fail if compliance violations exist
      ansible.builtin.fail:
        msg: "Host {{ inventory_hostname }} has compliance violations"
      when: (missing_packages | length > 0) or (found_forbidden | length > 0)
```

## Comparing Package Versions Across Hosts

You can use `package_facts` in combination with host groups to compare what is installed across your fleet.

```yaml
# Gather package facts across all web servers and report discrepancies
- hosts: web_servers
  become: true
  tasks:
    - name: Gather package facts
      ansible.builtin.package_facts:
        manager: auto

    - name: Record nginx version
      ansible.builtin.set_fact:
        nginx_version: "{{ ansible_facts.packages['nginx'][0].version | default('NOT INSTALLED') }}"
      when: "'nginx' in ansible_facts.packages"

    - name: Report nginx version on each host
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }}: nginx {{ nginx_version | default('NOT INSTALLED') }}"
```

## Using Package Facts in Templates

Package facts are useful in Jinja2 templates for generating configuration files or reports.

```yaml
# Generate an HTML inventory report of installed packages
- name: Gather package facts
  ansible.builtin.package_facts:
    manager: auto

- name: Generate package inventory report
  ansible.builtin.template:
    src: package_report.html.j2
    dest: /var/www/html/package_report.html
    mode: '0644'
```

The corresponding template might look like this.

```jinja2
{# package_report.html.j2 - Package inventory report #}
<html>
<head><title>Package Inventory - {{ inventory_hostname }}</title></head>
<body>
<h1>Package Inventory for {{ inventory_hostname }}</h1>
<p>Generated: {{ ansible_date_time.iso8601 }}</p>
<p>Total packages: {{ ansible_facts.packages | length }}</p>
<table border="1">
  <tr><th>Package</th><th>Version</th><th>Source</th></tr>
  {% for name, versions in ansible_facts.packages | dictsort %}
  <tr>
    <td>{{ name }}</td>
    <td>{{ versions[0].version }}</td>
    <td>{{ versions[0].source | default('unknown') }}</td>
  </tr>
  {% endfor %}
</table>
</body>
</html>
```

## Filtering Package Facts

The `ansible_facts.packages` dictionary can be large (thousands of entries on some systems). You can filter it to focus on what matters.

```yaml
# Find all packages from a specific source/repository
- name: Gather package facts
  ansible.builtin.package_facts:
    manager: auto

- name: Find all packages from Docker repository
  ansible.builtin.set_fact:
    docker_packages: >-
      {{ ansible_facts.packages | dict2items
         | selectattr('value.0.source', 'defined')
         | selectattr('value.0.source', 'search', 'docker')
         | map(attribute='key') | list }}

- name: Show Docker-related packages
  ansible.builtin.debug:
    var: docker_packages
```

## Performance Considerations

On systems with thousands of packages, `package_facts` can take a few seconds to run. If you only need to check a specific package, you might be better off using the `command` module to query the package manager directly.

```yaml
# Faster alternative when you only need to check one package
- name: Check if httpd is installed (RHEL)
  ansible.builtin.command:
    cmd: rpm -q httpd
  register: httpd_check
  changed_when: false
  failed_when: false

- name: Act based on httpd status
  ansible.builtin.debug:
    msg: "httpd is {{ 'installed' if httpd_check.rc == 0 else 'not installed' }}"
```

But for broad auditing or multiple checks, `package_facts` is the right tool because you gather the data once and query it many times.

## Wrapping Up

The `package_facts` module is one of those tools that you do not use every day, but when you need it, nothing else will do. Whether you are running compliance audits, building inventory reports, writing conditional playbooks, or troubleshooting package conflicts across a fleet of servers, `package_facts` gives you the data you need in a format that is easy to work with in Ansible. Combine it with Jinja2 filters and conditional logic, and you have a powerful toolkit for package-level visibility across your infrastructure.
