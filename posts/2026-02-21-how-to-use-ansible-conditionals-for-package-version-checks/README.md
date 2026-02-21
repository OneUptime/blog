# How to Use Ansible Conditionals for Package Version Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Conditionals, Package Management, DevOps

Description: Learn how to use Ansible conditionals to check package versions and make smart decisions in your playbooks based on installed software versions.

---

Managing packages across a fleet of servers is one of the core jobs of any configuration management tool. But installing packages blindly without checking what version is already present can lead to broken dependencies, unnecessary upgrades, or even downtime. Ansible gives you a solid set of conditional tools to inspect package versions before taking action.

In this post, we will walk through practical patterns for using Ansible conditionals to check package versions, compare them, and decide what to do next.

## Why Version Checks Matter

Imagine you have a playbook that installs PostgreSQL 15 on your database servers. If some servers already have PostgreSQL 14 with production data, blindly upgrading could corrupt data or break application compatibility. You need to check the current version first and branch your logic accordingly.

Version checks are also critical when:

- Rolling out security patches that only apply to specific versions
- Migrating from one major version to another in a controlled fashion
- Ensuring a minimum version requirement before deploying application code
- Auditing your fleet to report which servers are running outdated software

## Gathering Package Facts

Before you can compare versions, you need to know what is installed. Ansible's `package_facts` module collects information about all installed packages on a target host.

Here is how to gather package facts and store them for later use:

```yaml
# Gather facts about all installed packages on the target host
- name: Collect package facts
  hosts: all
  tasks:
    - name: Gather package information
      ansible.builtin.package_facts:
        manager: auto

    - name: Show all installed packages
      ansible.builtin.debug:
        var: ansible_facts.packages
```

After running `package_facts`, the variable `ansible_facts.packages` becomes a dictionary keyed by package name. Each entry contains a list of installed versions (since some package managers allow multiple versions).

## Checking If a Package Is Installed

The simplest conditional checks whether a package exists at all:

```yaml
# Check if nginx is installed before attempting configuration
- name: Configure nginx only if installed
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
  when: "'nginx' in ansible_facts.packages"
```

You can also skip tasks when a package is missing:

```yaml
# Skip the task if OpenSSL is not present on the host
- name: Update OpenSSL config
  ansible.builtin.copy:
    src: openssl.cnf
    dest: /etc/ssl/openssl.cnf
  when: "'openssl' in ansible_facts.packages"
```

## Comparing Package Versions

Checking for existence is useful, but the real power comes from version comparisons. Ansible includes the `version` test (also called `version_compare` in older releases) that handles semantic versioning correctly.

Here is how to check if the installed version of a package meets a minimum requirement:

```yaml
# Ensure Python 3 is at least version 3.9 before deploying the app
- name: Gather package facts
  ansible.builtin.package_facts:
    manager: auto

- name: Check Python3 version
  ansible.builtin.debug:
    msg: "Python3 version {{ ansible_facts.packages['python3'][0].version }} is acceptable"
  when:
    - "'python3' in ansible_facts.packages"
    - "ansible_facts.packages['python3'][0].version is version('3.9', '>=')"
```

The `version` test supports these operators: `<`, `<=`, `==`, `!=`, `>=`, `>`. It also understands the `strict` parameter for strict semantic versioning comparison.

## Handling Multiple Version Comparison Scenarios

In real-world playbooks, you often need to handle several version ranges differently. Here is a complete example that branches logic based on the PostgreSQL version:

```yaml
# Branch logic depending on which PostgreSQL major version is installed
- name: Handle PostgreSQL version-specific configuration
  hosts: database_servers
  tasks:
    - name: Gather package facts
      ansible.builtin.package_facts:
        manager: auto

    - name: Set PostgreSQL version fact
      ansible.builtin.set_fact:
        pg_version: "{{ ansible_facts.packages['postgresql'][0].version }}"
      when: "'postgresql' in ansible_facts.packages"

    - name: Apply PostgreSQL 14 specific config
      ansible.builtin.template:
        src: postgresql-14.conf.j2
        dest: /etc/postgresql/14/main/postgresql.conf
      when:
        - pg_version is defined
        - "pg_version is version('14.0', '>=')"
        - "pg_version is version('15.0', '<')"

    - name: Apply PostgreSQL 15 specific config
      ansible.builtin.template:
        src: postgresql-15.conf.j2
        dest: /etc/postgresql/15/main/postgresql.conf
      when:
        - pg_version is defined
        - "pg_version is version('15.0', '>=')"
        - "pg_version is version('16.0', '<')"

    - name: Warn about unsupported PostgreSQL version
      ansible.builtin.debug:
        msg: "WARNING: PostgreSQL version {{ pg_version }} is not supported by this playbook"
      when:
        - pg_version is defined
        - "pg_version is version('14.0', '<')"
```

## Using the version Test with Strict Mode

By default, the `version` test uses loose comparison, which handles most version strings. But if your packages follow strict semver (MAJOR.MINOR.PATCH), you can enforce strict comparison:

```yaml
# Use strict semver comparison for application version checks
- name: Check application version strictly
  ansible.builtin.debug:
    msg: "App version is compatible"
  when: "app_version is version('2.1.0', '>=', strict=true)"
```

Strict mode will raise an error if the version string does not conform to semantic versioning rules, which is actually helpful for catching unexpected version formats early.

## Checking Versions Across Different Package Managers

Different Linux distributions use different package managers, and the version string format can vary. Here is a pattern that normalizes version checking across distributions:

```yaml
# Cross-platform version check for Java across different distros
- name: Cross-platform Java version check
  hosts: all
  tasks:
    - name: Gather package facts
      ansible.builtin.package_facts:
        manager: auto

    - name: Set Java package name based on OS family
      ansible.builtin.set_fact:
        java_pkg_name: >-
          {{ 'java-17-openjdk' if ansible_os_family == 'RedHat'
             else 'openjdk-17-jdk' if ansible_os_family == 'Debian'
             else 'java-17-openjdk' }}

    - name: Check if Java is installed
      ansible.builtin.set_fact:
        java_installed: "{{ java_pkg_name in ansible_facts.packages }}"

    - name: Get Java version if installed
      ansible.builtin.set_fact:
        java_version: "{{ ansible_facts.packages[java_pkg_name][0].version }}"
      when: java_installed

    - name: Install Java if missing or outdated
      ansible.builtin.package:
        name: "{{ java_pkg_name }}"
        state: latest
      when: not java_installed
```

## Using Shell Commands for Version Checks

Sometimes the package manager version does not tell you the full story. For example, you might need to check the actual binary version rather than the package version:

```yaml
# Check the actual binary version of Node.js rather than the package version
- name: Get Node.js binary version
  ansible.builtin.command: node --version
  register: node_version_output
  changed_when: false
  failed_when: false

- name: Parse Node.js version
  ansible.builtin.set_fact:
    node_version: "{{ node_version_output.stdout | regex_replace('^v', '') }}"
  when: node_version_output.rc == 0

- name: Upgrade Node.js if below version 18
  ansible.builtin.include_role:
    name: nodejs_install
  when:
    - node_version is defined
    - "node_version is version('18.0.0', '<')"
```

## Building a Version Audit Playbook

Putting it all together, here is a playbook that audits your fleet and reports version compliance:

```yaml
# Audit playbook that checks critical package versions across all hosts
- name: Package version audit
  hosts: all
  tasks:
    - name: Gather package facts
      ansible.builtin.package_facts:
        manager: auto

    - name: Define minimum required versions
      ansible.builtin.set_fact:
        required_versions:
          openssl: "1.1.1"
          openssh-server: "8.0"
          curl: "7.68"

    - name: Check each required package version
      ansible.builtin.debug:
        msg: >-
          {{ item.key }}: installed={{ ansible_facts.packages[item.key][0].version }},
          required>={{ item.value }},
          compliant={{ ansible_facts.packages[item.key][0].version is version(item.value, '>=') }}
      loop: "{{ required_versions | dict2items }}"
      when: "item.key in ansible_facts.packages"
```

## Key Takeaways

Package version checks in Ansible boil down to three steps: gather the facts with `package_facts`, access the version from `ansible_facts.packages`, and compare using the `version` test. The `version` test is powerful enough to handle loose and strict semver comparisons, and you can chain multiple conditions with `when` to build version range checks.

For production playbooks, always account for the case where a package is not installed at all, and always test your version comparison logic against the actual version strings your package manager produces. Different distributions format versions differently, and a comparison that works on Ubuntu might behave differently on CentOS.
