# How to Use the vars_from Parameter in Ansible Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Roles, Variables, Configuration Management

Description: Learn how to use the vars_from parameter in Ansible roles to load different variable files for different environments and scenarios.

---

Ansible roles have a `vars/main.yml` file that gets loaded automatically when the role runs. But sometimes you need different sets of variables depending on the context. Maybe you want one set of variables for Debian systems and another for RedHat. Or perhaps your staging and production environments need different tuning parameters that go beyond what `defaults/main.yml` can handle. The `vars_from` parameter lets you tell Ansible to load a specific variable file from the role's `vars/` directory instead of (or in addition to) the default `main.yml`.

## How vars_from Works

When you use `vars_from`, Ansible loads the specified file from the role's `vars/` directory. These variables have the same precedence as normal role vars, which is higher than `defaults/main.yml`, group vars, and host vars. This makes them appropriate for values that should be authoritative for a given context.

Here is the basic syntax:

```yaml
# Load vars/production.yml instead of (or alongside) vars/main.yml
- hosts: webservers
  tasks:
    - name: Include nginx role with production variables
      ansible.builtin.include_role:
        name: nginx
        vars_from: production.yml
```

## Setting Up a Role with Multiple Variable Files

Let's build a practical example. Consider an Nginx role that needs different configuration values depending on the target OS and the deployment environment.

First, the directory structure:

```
roles/nginx/
  tasks/
    main.yml
  vars/
    main.yml           # Common variables loaded by default
    debian.yml         # Debian-specific paths and packages
    redhat.yml         # RedHat-specific paths and packages
    production.yml     # Production tuning parameters
    staging.yml        # Staging tuning parameters
  defaults/
    main.yml           # User-overridable defaults
  templates/
    nginx.conf.j2
  handlers/
    main.yml
```

Here is what each variable file contains:

```yaml
# roles/nginx/vars/main.yml
# Variables that apply in all contexts
nginx_user: www-data
nginx_pid_file: /run/nginx.pid
nginx_error_log: /var/log/nginx/error.log
nginx_access_log: /var/log/nginx/access.log
```

```yaml
# roles/nginx/vars/debian.yml
# Debian/Ubuntu specific values
nginx_package_name: nginx
nginx_config_dir: /etc/nginx
nginx_default_site: /etc/nginx/sites-enabled/default
nginx_service_name: nginx
nginx_modules_dir: /usr/lib/nginx/modules
```

```yaml
# roles/nginx/vars/redhat.yml
# RHEL/CentOS/Rocky specific values
nginx_package_name: nginx
nginx_config_dir: /etc/nginx
nginx_default_site: /etc/nginx/conf.d/default.conf
nginx_service_name: nginx
nginx_modules_dir: /usr/lib64/nginx/modules
```

```yaml
# roles/nginx/vars/production.yml
# Production performance tuning
nginx_worker_processes: "{{ ansible_processor_vcpus }}"
nginx_worker_connections: 4096
nginx_keepalive_timeout: 30
nginx_client_max_body_size: "100m"
nginx_gzip: "on"
nginx_gzip_comp_level: 6
nginx_proxy_cache_path: /var/cache/nginx
nginx_rate_limit: "10r/s"
```

```yaml
# roles/nginx/vars/staging.yml
# Staging - lower resource usage, more verbose logging
nginx_worker_processes: 2
nginx_worker_connections: 512
nginx_keepalive_timeout: 65
nginx_client_max_body_size: "50m"
nginx_gzip: "off"
nginx_gzip_comp_level: 1
nginx_proxy_cache_path: ""
nginx_rate_limit: "100r/s"
```

## Loading OS-Specific Variables Automatically

A very common pattern is to auto-detect the OS and load the right variable file. You can do this inside the role's `tasks/main.yml`:

```yaml
# roles/nginx/tasks/main.yml
# Load OS-specific variables automatically
- name: Load OS-specific variables
  ansible.builtin.include_vars: "{{ ansible_os_family | lower }}.yml"

- name: Install nginx
  ansible.builtin.package:
    name: "{{ nginx_package_name }}"
    state: present

- name: Deploy nginx configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: "{{ nginx_config_dir }}/nginx.conf"
    owner: root
    group: root
    mode: '0644'
  notify: restart nginx

- name: Remove default site configuration
  ansible.builtin.file:
    path: "{{ nginx_default_site }}"
    state: absent
  notify: restart nginx

- name: Ensure nginx is running
  ansible.builtin.systemd:
    name: "{{ nginx_service_name }}"
    state: started
    enabled: yes
```

This pattern uses `include_vars` within the role rather than `vars_from` on the caller side. The advantage is that the role handles its own OS detection transparently.

## Using vars_from from the Playbook

When the decision about which variables to load belongs to the playbook (not the role), use `vars_from` on the `include_role` call:

```yaml
# deploy-production.yml
# Deploy to production with production-tuned variables
- hosts: webservers
  become: yes
  tasks:
    - name: Configure nginx with production settings
      ansible.builtin.include_role:
        name: nginx
        vars_from: production.yml

# deploy-staging.yml
# Deploy to staging with relaxed settings
- hosts: staging_webservers
  become: yes
  tasks:
    - name: Configure nginx with staging settings
      ansible.builtin.include_role:
        name: nginx
        vars_from: staging.yml
```

## Using vars_from with Dynamic Values

You can compute the variable filename dynamically:

```yaml
# deploy.yml
# Automatically pick the right variable file based on the environment
- hosts: webservers
  become: yes
  tasks:
    - name: Configure nginx for the target environment
      ansible.builtin.include_role:
        name: nginx
        vars_from: "{{ deploy_environment }}.yml"
```

Run it like this:

```bash
# Load production.yml from the role's vars/ directory
ansible-playbook deploy.yml -e "deploy_environment=production"

# Load staging.yml instead
ansible-playbook deploy.yml -e "deploy_environment=staging"
```

This pattern is clean because you add new environments simply by creating a new variable file in the role. No playbook changes needed.

## Combining vars_from with tasks_from

You can use both parameters together:

```yaml
# Run only the backup tasks with production-specific backup settings
- hosts: webservers
  become: yes
  tasks:
    - name: Run backup with production retention settings
      ansible.builtin.include_role:
        name: nginx
        tasks_from: backup.yml
        vars_from: production.yml
```

This is useful when a role has both multiple task entry points and multiple variable contexts.

## Variable Precedence Considerations

Remember that variables loaded via `vars_from` have the same precedence as role vars. This is higher than:

- Role defaults
- Inventory variables (group_vars, host_vars)
- Play vars

And lower than:

- Task vars
- Extra vars (`-e` on the command line)

This means if you set `nginx_worker_connections: 2048` in `group_vars/webservers.yml` and the role's `vars/production.yml` sets it to `4096`, the role vars will win. This is intentional for `vars/` files because they represent values that should not be casually overridden.

If you want the user to be able to override the values easily, put them in `defaults/main.yml` instead of `vars/`. Use `vars/` only for values that are genuinely tied to a specific context and should not be changed from outside.

## Fallback Pattern with vars_from

If you want to gracefully handle cases where the variable file might not exist, combine this with a fallback:

```yaml
# roles/nginx/tasks/main.yml
# Try to load environment-specific vars, fall back to defaults
- name: Load environment variables with fallback
  ansible.builtin.include_vars: "{{ item }}"
  with_first_found:
    - files:
        - "{{ deploy_environment }}.yml"
        - "default.yml"
      paths:
        - "{{ role_path }}/vars"
```

This tries to load the environment-specific file first. If it does not exist, it loads `default.yml` instead. No error, no failure.

## Practical Tips

Keep your `vars/main.yml` small. Put only truly universal values there. Use named variable files for anything context-specific. Name the files descriptively so that someone browsing the role directory immediately understands what each file is for. Avoid creating too many variable files. If you have `production.yml`, `staging.yml`, `dev.yml`, `qa.yml`, `uat.yml`, and `perf.yml` that all differ by just two or three values, consider using a single file with conditionals or moving those values to `defaults/main.yml` where they can be overridden by inventory variables.
