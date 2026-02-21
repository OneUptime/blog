# How to Implement If/Else Logic in Ansible Playbooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Playbooks, Conditionals, Automation

Description: Learn multiple ways to implement if/else branching logic in Ansible playbooks using when clauses, Jinja2 expressions, and block/rescue patterns.

---

Ansible is declarative by design, which means there is no native `if/else` statement in YAML playbook syntax the way you would find in Python or Bash. But that does not mean you cannot implement branching logic. Ansible provides several mechanisms to achieve the same result, and understanding when to use each one will make your playbooks cleaner and more maintainable.

## The when Clause as If/Else

The most common way to implement if/else in Ansible is by using two tasks with opposite `when` conditions:

```yaml
# If the OS is Debian, install with apt; otherwise, install with yum
- name: Install package on Debian
  ansible.builtin.apt:
    name: nginx
    state: present
  when: ansible_os_family == "Debian"

- name: Install package on RedHat
  ansible.builtin.yum:
    name: nginx
    state: present
  when: ansible_os_family == "RedHat"
```

This is straightforward but has a downside: if you add a third OS family later, you need to add another task. For true if/else where only two outcomes exist, this works perfectly.

## Using the Ternary Filter for Inline If/Else

For simple value assignments, the Jinja2 `ternary` filter is the closest thing to a one-line if/else:

```yaml
# Set the service name based on the OS family using ternary
- name: Set service name
  ansible.builtin.set_fact:
    web_service: "{{ 'apache2' if ansible_os_family == 'Debian' else 'httpd' }}"

# Or equivalently using the ternary filter
- name: Set service name with ternary
  ansible.builtin.set_fact:
    web_service: "{{ (ansible_os_family == 'Debian') | ternary('apache2', 'httpd') }}"
```

Both approaches produce the same result. The Jinja2 inline `if/else` syntax reads more naturally for most people, while `ternary` is useful when you already have a boolean variable.

## Multi-Way Branching with when

For scenarios with more than two branches, use multiple tasks with mutually exclusive `when` conditions:

```yaml
# Configure the package manager based on the distribution
- name: Configure apt repositories
  ansible.builtin.template:
    src: sources.list.j2
    dest: /etc/apt/sources.list
  when: ansible_pkg_mgr == "apt"

- name: Configure yum repositories
  ansible.builtin.template:
    src: yum.repos.j2
    dest: /etc/yum.repos.d/custom.repo
  when: ansible_pkg_mgr == "yum"

- name: Configure dnf repositories
  ansible.builtin.template:
    src: dnf.repos.j2
    dest: /etc/yum.repos.d/custom.repo
  when: ansible_pkg_mgr == "dnf"

- name: Configure zypper repositories
  ansible.builtin.template:
    src: zypper.repos.j2
    dest: /etc/zypp/repos.d/custom.repo
  when: ansible_pkg_mgr == "zypper"
```

This scales cleanly. Each task is self-contained and only one will execute on any given host.

## Block/Rescue as Try/Catch with If/Else

The `block` and `rescue` structure in Ansible works like try/catch in other languages. You can use it to implement "if this fails, do that instead" logic:

```yaml
# Try to pull the Docker image; if it fails, build it locally
- name: Get application container
  block:
    - name: Pull pre-built Docker image
      community.docker.docker_image:
        name: myapp
        tag: "{{ app_version }}"
        source: pull

  rescue:
    - name: Build Docker image locally since pull failed
      community.docker.docker_image:
        name: myapp
        tag: "{{ app_version }}"
        source: build
        build:
          path: /opt/myapp

  always:
    - name: Verify image exists regardless of how it was obtained
      community.docker.docker_image_info:
        name: "myapp:{{ app_version }}"
      register: image_info

    - name: Fail if image is missing
      ansible.builtin.fail:
        msg: "Could not obtain myapp image"
      when: image_info.images | length == 0
```

The `block` section runs first. If any task in it fails, execution jumps to `rescue`. The `always` section runs regardless of success or failure. This pattern is incredibly useful for handling degraded states gracefully.

## Using Jinja2 If/Else in Templates

Inside Jinja2 templates, you have full `if/elif/else` support:

```jinja2
{# Template for a database configuration file #}
[database]
{% if db_engine == 'postgresql' %}
driver = postgresql
port = 5432
socket = /var/run/postgresql/.s.PGSQL.5432
{% elif db_engine == 'mysql' %}
driver = mysql
port = 3306
socket = /var/run/mysqld/mysqld.sock
{% else %}
driver = sqlite
path = /var/lib/app/database.sqlite
{% endif %}

max_connections = {{ max_db_connections | default(100) }}
```

Templates are the right place for complex conditional content generation. If you find yourself creating multiple template files that differ only slightly, consolidate them into one template with Jinja2 conditionals.

## If/Else with set_fact and Chained Conditions

For complex decision trees, you can use `set_fact` with a series of conditions to build up a variable:

```yaml
# Determine the deployment strategy based on multiple factors
- name: Default deployment strategy
  ansible.builtin.set_fact:
    deploy_strategy: "rolling"

- name: Use blue-green for production
  ansible.builtin.set_fact:
    deploy_strategy: "blue-green"
  when: environment == "production"

- name: Use canary for high-traffic services
  ansible.builtin.set_fact:
    deploy_strategy: "canary"
  when:
    - environment == "production"
    - service_tier == "critical"
```

The last matching condition wins because `set_fact` overwrites the variable. This gives you a cascading if/elif/else pattern where more specific conditions override general ones.

## Using select with If/Else Logic

You can combine Jinja2 filters to build conditional lists:

```yaml
# Build a list of features to enable based on the environment
- name: Set enabled features
  ansible.builtin.set_fact:
    enabled_features: >-
      {{
        ['logging', 'metrics'] +
        (['debug'] if environment == 'development' else []) +
        (['alerting', 'paging'] if environment == 'production' else [])
      }}
```

This builds a list starting with common features and conditionally adding extras based on the environment. Development gets debug mode, production gets alerting and paging.

## Conditional Imports and Includes

You can conditionally include entire files of tasks:

```yaml
# Include OS-specific tasks based on the distribution
- name: Include distribution-specific tasks
  ansible.builtin.include_tasks: "{{ ansible_distribution | lower }}.yml"

# Or with explicit if/else logic
- name: Include Debian tasks
  ansible.builtin.include_tasks: debian.yml
  when: ansible_os_family == "Debian"

- name: Include RedHat tasks
  ansible.builtin.include_tasks: redhat.yml
  when: ansible_os_family == "RedHat"
```

The first approach is dynamic and automatically selects the right file. The second approach is explicit and makes it clear which files are expected. Both are valid patterns depending on your needs.

## Practical Example: Environment-Aware Deployment

Here is a complete playbook that uses multiple if/else patterns together:

```yaml
# Deploy an application with environment-specific configuration
- name: Deploy application
  hosts: app_servers
  vars:
    app_name: mywebapp
  tasks:
    - name: Determine configuration values
      ansible.builtin.set_fact:
        app_port: "{{ (environment == 'production') | ternary(443, 8080) }}"
        log_level: "{{ (environment == 'development') | ternary('debug', 'info') }}"
        replicas: "{{ (environment == 'production') | ternary(3, 1) }}"

    - name: Deploy with SSL in production
      block:
        - name: Copy SSL certificate
          ansible.builtin.copy:
            src: "certs/{{ app_name }}.pem"
            dest: "/etc/ssl/certs/{{ app_name }}.pem"

        - name: Deploy production config
          ansible.builtin.template:
            src: app-config-ssl.j2
            dest: "/etc/{{ app_name }}/config.yml"
      when: environment == "production"

    - name: Deploy without SSL in non-production
      ansible.builtin.template:
        src: app-config-basic.j2
        dest: "/etc/{{ app_name }}/config.yml"
      when: environment != "production"

    - name: Restart application
      ansible.builtin.systemd:
        name: "{{ app_name }}"
        state: restarted
```

This playbook demonstrates the ternary filter for simple value decisions, block-level when for grouped conditional tasks, and simple when for individual task conditions.

## Choosing the Right Pattern

Here is a quick decision guide:

- Simple two-way value choice: Use the `ternary` filter or inline Jinja2 `if/else`
- Two-way task execution: Use two tasks with opposite `when` conditions
- Multi-way branching: Use multiple tasks with mutually exclusive `when` conditions
- Fallback on failure: Use `block/rescue/always`
- Complex conditional content: Use Jinja2 `if/elif/else` in templates
- Cascading overrides: Use chained `set_fact` tasks with increasing specificity

Each pattern has its place. The key is matching the right tool to the complexity of your branching logic. Start simple with `when`, and only reach for more complex patterns when the simple approach becomes hard to read or maintain.
