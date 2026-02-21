# How to Use the Ansible first_found Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, Configuration Management, Multi-Platform

Description: Learn how to use the Ansible first_found lookup plugin to select the first existing file or path from a prioritized list of candidates.

---

When you manage servers running different Linux distributions, OS versions, or application environments, you often need different configuration files for each variant. The `first_found` lookup plugin lets you provide a prioritized list of file candidates and returns the first one that actually exists. This is incredibly useful for writing playbooks that work across heterogeneous infrastructure without a mess of `when` conditionals.

## What first_found Does

The `first_found` lookup takes a list of file paths and returns the first one that exists on the Ansible controller. If none of the files exist, it can either fail or return a default value. Think of it as a cascading fallback mechanism for file selection.

## Basic Usage

The simplest form provides a list of file candidates.

This playbook selects the right config file based on the OS:

```yaml
# playbook.yml - Select config file based on OS
---
- name: Deploy OS-specific configuration
  hosts: all
  tasks:
    - name: Deploy sysctl configuration
      ansible.builtin.copy:
        src: "{{ lookup('first_found', params) }}"
        dest: /etc/sysctl.d/99-custom.conf
        mode: '0644'
      vars:
        params:
          files:
            - "sysctl_{{ ansible_distribution }}_{{ ansible_distribution_major_version }}.conf"
            - "sysctl_{{ ansible_distribution }}.conf"
            - "sysctl_{{ ansible_os_family }}.conf"
            - "sysctl_default.conf"
```

If you are running this against an Ubuntu 22 server, Ansible checks for files in this order:

1. `sysctl_Ubuntu_22.conf`
2. `sysctl_Ubuntu.conf`
3. `sysctl_Debian.conf`
4. `sysctl_default.conf`

It returns the first one that exists.

## Parameter Reference

The `first_found` lookup accepts several parameters.

Here is a playbook showing the available options:

```yaml
# playbook.yml - Demonstrating first_found parameters
---
- name: first_found parameter examples
  hosts: all
  tasks:
    # Search in specific directories
    - name: Find config in multiple search paths
      ansible.builtin.copy:
        src: "{{ lookup('first_found', params) }}"
        dest: /etc/myapp/config.conf
      vars:
        params:
          files:
            - "{{ inventory_hostname }}.conf"
            - "{{ ansible_hostname }}.conf"
            - "default.conf"
          paths:
            - "configs/production"
            - "configs/shared"
            - "configs"

    # Skip if nothing found instead of failing
    - name: Optional config file
      ansible.builtin.copy:
        src: "{{ lookup('first_found', params) }}"
        dest: /etc/myapp/optional.conf
      vars:
        params:
          files:
            - "optional_{{ inventory_hostname }}.conf"
            - "optional_default.conf"
          skip: true
      when: lookup('first_found', params, errors='ignore') | length > 0
```

The key parameters are:

- **files**: List of filenames to search for
- **paths**: List of directories to search in. Each filename is checked in each path
- **skip**: If `true`, return an empty list instead of failing when nothing is found

## OS-Specific Package Installation

One of the most practical uses is handling package name differences between distributions.

This playbook includes the right variable file for each OS:

```yaml
# playbook.yml - Load OS-specific variables
---
- name: Install web server across distributions
  hosts: webservers
  pre_tasks:
    - name: Load OS-specific variables
      ansible.builtin.include_vars: "{{ lookup('first_found', params) }}"
      vars:
        params:
          files:
            - "{{ ansible_distribution | lower }}_{{ ansible_distribution_major_version }}.yml"
            - "{{ ansible_distribution | lower }}.yml"
            - "{{ ansible_os_family | lower }}.yml"
            - "default.yml"
          paths:
            - vars

  tasks:
    - name: Install web server package
      ansible.builtin.package:
        name: "{{ web_server_package }}"
        state: present

    - name: Start web server service
      ansible.builtin.service:
        name: "{{ web_server_service }}"
        state: started
        enabled: true
```

The variable files would define OS-specific names:

```yaml
# vars/ubuntu.yml
web_server_package: nginx
web_server_service: nginx
web_server_conf_dir: /etc/nginx

# vars/redhat.yml
web_server_package: nginx
web_server_service: nginx
web_server_conf_dir: /etc/nginx

# vars/default.yml
web_server_package: nginx
web_server_service: nginx
web_server_conf_dir: /etc/nginx
```

## Template Selection

You can use first_found to select templates the same way you select files.

This playbook picks the most specific template available:

```yaml
# playbook.yml - Select the most specific template
---
- name: Deploy Nginx configuration
  hosts: webservers
  tasks:
    - name: Deploy Nginx main config
      ansible.builtin.template:
        src: "{{ lookup('first_found', params) }}"
        dest: /etc/nginx/nginx.conf
        mode: '0644'
      vars:
        params:
          files:
            - "nginx_{{ inventory_hostname }}.conf.j2"
            - "nginx_{{ group_names[0] | default('all') }}.conf.j2"
            - "nginx_{{ ansible_distribution | lower }}.conf.j2"
            - "nginx_default.conf.j2"
          paths:
            - templates
      notify: reload nginx
```

## Multi-Path Search

The `paths` parameter lets you search across multiple directories. This is useful when you have a layered configuration structure.

```yaml
# playbook.yml - Search across multiple configuration layers
---
- name: Deploy with layered configuration
  hosts: all
  vars:
    env: "{{ target_env | default('development') }}"
  tasks:
    - name: Deploy application config from layered sources
      ansible.builtin.copy:
        src: "{{ lookup('first_found', params) }}"
        dest: /etc/myapp/settings.conf
        mode: '0644'
      vars:
        params:
          files:
            - "{{ inventory_hostname }}.conf"
            - "{{ group_names | first }}.conf"
            - "default.conf"
          paths:
            - "configs/{{ env }}/host-overrides"
            - "configs/{{ env }}"
            - "configs/shared"
            - "configs"
```

The search order with `paths` works like a nested loop: for each path, check each file. So the actual search order would be:

1. `configs/production/host-overrides/web01.conf`
2. `configs/production/host-overrides/webservers.conf`
3. `configs/production/host-overrides/default.conf`
4. `configs/production/web01.conf`
5. `configs/production/webservers.conf`
6. `configs/production/default.conf`
7. And so on through `configs/shared` and `configs`

## Practical Example: Multi-Distro Role

Here is a complete example of a role that installs and configures PostgreSQL across multiple Linux distributions.

```yaml
# roles/postgresql/tasks/main.yml
---
- name: Load OS-specific variables
  ansible.builtin.include_vars: "{{ lookup('first_found', params) }}"
  vars:
    params:
      files:
        - "{{ ansible_distribution | lower }}_{{ ansible_distribution_major_version }}.yml"
        - "{{ ansible_distribution | lower }}.yml"
        - "{{ ansible_os_family | lower }}.yml"
      paths:
        - vars

- name: Install PostgreSQL packages
  ansible.builtin.package:
    name: "{{ postgresql_packages }}"
    state: present

- name: Deploy pg_hba.conf
  ansible.builtin.template:
    src: "{{ lookup('first_found', params) }}"
    dest: "{{ postgresql_conf_dir }}/pg_hba.conf"
    owner: postgres
    group: postgres
    mode: '0640'
  vars:
    params:
      files:
        - "pg_hba_{{ ansible_distribution | lower }}.conf.j2"
        - "pg_hba_default.conf.j2"
      paths:
        - templates
  notify: restart postgresql

- name: Deploy postgresql.conf
  ansible.builtin.template:
    src: "{{ lookup('first_found', params) }}"
    dest: "{{ postgresql_conf_dir }}/postgresql.conf"
    owner: postgres
    group: postgres
    mode: '0644'
  vars:
    params:
      files:
        - "postgresql_{{ ansible_distribution | lower }}.conf.j2"
        - "postgresql_default.conf.j2"
      paths:
        - templates
  notify: restart postgresql
```

The variable files for each OS:

```yaml
# roles/postgresql/vars/ubuntu_22.yml
postgresql_packages:
  - postgresql-14
  - postgresql-client-14
  - postgresql-contrib-14
postgresql_conf_dir: /etc/postgresql/14/main
postgresql_service: postgresql

# roles/postgresql/vars/redhat_9.yml
postgresql_packages:
  - postgresql-server
  - postgresql-contrib
postgresql_conf_dir: /var/lib/pgsql/data
postgresql_service: postgresql
```

## Handling Missing Files Gracefully

When none of the candidates exist and you want to handle it gracefully instead of failing:

```yaml
# playbook.yml - Graceful handling of missing files
---
- name: Handle optional configurations
  hosts: all
  tasks:
    - name: Check for optional override config
      ansible.builtin.set_fact:
        override_config: "{{ lookup('first_found', params, errors='ignore') }}"
      vars:
        params:
          files:
            - "overrides/{{ inventory_hostname }}.conf"
            - "overrides/{{ group_names | first }}.conf"

    - name: Deploy override config if found
      ansible.builtin.copy:
        src: "{{ override_config }}"
        dest: /etc/myapp/overrides.conf
        mode: '0644'
      when: override_config | length > 0

    - name: Log when no override found
      ansible.builtin.debug:
        msg: "No override configuration found for {{ inventory_hostname }}, using defaults"
      when: override_config | length == 0
```

## Tips and Common Mistakes

Here are some things I have learned from using `first_found` in production:

1. **Always include a default**: Your list should end with a catch-all default file that is guaranteed to exist. Without it, the lookup fails if no specific file matches.

2. **Path resolution matters**: Relative paths in `files` are resolved relative to the playbook directory, or relative to each directory in `paths` if specified. Inside roles, they resolve relative to the role's `files` or `templates` directory.

3. **Do not confuse with with_first_found**: Older Ansible versions used `with_first_found` as a loop construct. The lookup plugin syntax with `lookup('first_found', ...)` is the modern approach and works in both `loop` and variable contexts.

4. **Debugging**: If you are not sure which file got selected, add a debug task that prints the lookup result before using it.

5. **Performance**: The lookup checks file existence on the controller at task evaluation time. For large file lists, this is still very fast since it is just `stat` calls.

The `first_found` lookup is one of those plugins that makes the difference between a playbook that only works in one environment and a playbook that gracefully handles any infrastructure you throw at it.
