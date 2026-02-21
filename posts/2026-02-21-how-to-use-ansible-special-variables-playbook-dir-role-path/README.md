# How to Use Ansible Special Variables (playbook_dir, role_path)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Special Variables, playbook_dir, role_path, Best Practices

Description: Learn how to use Ansible special variables like playbook_dir and role_path to write portable and maintainable automation code.

---

Ansible provides a set of special variables (sometimes called "magic variables") that give you information about the execution context. Two of the most useful are `playbook_dir` and `role_path`. These variables help you build file paths that work regardless of where you run the playbook from, which is critical for portable automation that works across different environments and CI/CD systems.

## What is playbook_dir?

The `playbook_dir` variable contains the absolute path to the directory where the main playbook file lives. Not the current working directory, not the directory where you ran the `ansible-playbook` command, but the directory of the playbook itself.

```yaml
# /opt/ansible/playbooks/deploy.yml
---
- name: Show playbook_dir
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Print playbook directory
      ansible.builtin.debug:
        msg: "Playbook is in: {{ playbook_dir }}"
    # Output: Playbook is in: /opt/ansible/playbooks
```

Even if you run this from `/home/user` with `ansible-playbook /opt/ansible/playbooks/deploy.yml`, the value of `playbook_dir` is `/opt/ansible/playbooks`.

## What is role_path?

The `role_path` variable contains the absolute path to the currently executing role's root directory. This is available only inside role tasks, handlers, templates, and files. It points to the role directory itself, not to a subdirectory like `tasks/` or `templates/`.

```yaml
# roles/webserver/tasks/main.yml
---
- name: Show role path
  ansible.builtin.debug:
    msg: "Role directory is: {{ role_path }}"
  # Output: Role directory is: /opt/ansible/roles/webserver

- name: Read a custom file from the role
  ansible.builtin.slurp:
    src: "{{ role_path }}/files/custom-config.txt"
  register: config_content
```

## Using playbook_dir for Relative File References

The most common use case for `playbook_dir` is referencing files relative to the playbook. This is especially important in CI/CD pipelines where the working directory might not be what you expect.

```yaml
# /opt/ansible/playbooks/setup.yml
---
- name: Setup using relative paths
  hosts: all
  gather_facts: true
  vars:
    # Build paths relative to the playbook location
    config_dir: "{{ playbook_dir }}/configs"
    scripts_dir: "{{ playbook_dir }}/scripts"
    data_dir: "{{ playbook_dir }}/../data"
  tasks:
    - name: Copy configuration files
      ansible.builtin.copy:
        src: "{{ config_dir }}/app.conf"
        dest: /etc/myapp/app.conf
        mode: '0644'
      become: true

    - name: Run setup script
      ansible.builtin.script:
        cmd: "{{ scripts_dir }}/initialize.sh"
      become: true

    - name: Load seed data
      ansible.builtin.copy:
        src: "{{ data_dir }}/seed.sql"
        dest: /tmp/seed.sql
        mode: '0644'
```

## Using role_path for Custom File Locations

While Ansible automatically searches the `files/` and `templates/` subdirectories within a role, sometimes you need to reference files outside those standard locations. `role_path` makes this possible.

```yaml
# roles/database/tasks/main.yml
---
- name: Load SQL migration files
  ansible.builtin.find:
    paths: "{{ role_path }}/migrations"
    patterns: "*.sql"
  register: migration_files

- name: Apply migrations in order
  ansible.builtin.shell:
    cmd: "psql -U {{ db_user }} -d {{ db_name }} -f {{ item.path }}"
  loop: "{{ migration_files.files | sort(attribute='path') }}"
  become: true
  become_user: postgres
  changed_when: true

- name: Include environment-specific vars
  ansible.builtin.include_vars:
    file: "{{ role_path }}/vars/{{ env_name }}.yml"
```

The directory structure for this role would look like:

```
roles/database/
  tasks/
    main.yml
  migrations/
    001_create_tables.sql
    002_add_indexes.sql
    003_seed_data.sql
  vars/
    production.yml
    staging.yml
```

## Other Important Special Variables

Beyond `playbook_dir` and `role_path`, there are several other special variables worth knowing.

```yaml
# special-vars-demo.yml - Overview of commonly used special variables
---
- name: Demonstrate special variables
  hosts: all
  gather_facts: false
  tasks:
    - name: Show execution context variables
      ansible.builtin.debug:
        msg:
          # Directory of the playbook being executed
          - "playbook_dir: {{ playbook_dir }}"
          # Name of the current inventory file
          - "inventory_dir: {{ inventory_dir }}"
          - "inventory_file: {{ inventory_file }}"
          # Current host being processed
          - "inventory_hostname: {{ inventory_hostname }}"
          # Short hostname (up to first dot)
          - "inventory_hostname_short: {{ inventory_hostname_short }}"
          # Groups this host belongs to
          - "group_names: {{ group_names }}"
          # Full groups dictionary
          - "groups keys: {{ groups.keys() | list }}"
          # All host variables
          - "ansible_check_mode: {{ ansible_check_mode }}"
          - "ansible_version: {{ ansible_version.full }}"
```

## Using inventory_dir for Shared Resources

The `inventory_dir` variable points to the directory containing your inventory file. This is useful when you keep shared resources next to your inventory.

```yaml
# Load variables stored alongside inventory
---
- name: Load site-specific variables
  hosts: all
  gather_facts: false
  tasks:
    - name: Include site variables
      ansible.builtin.include_vars:
        dir: "{{ inventory_dir }}/group_vars/all"
        extensions:
          - yml
          - yaml

    - name: Load certificates from inventory location
      ansible.builtin.copy:
        src: "{{ inventory_dir }}/certs/{{ env_name }}/server.pem"
        dest: /etc/ssl/server.pem
        mode: '0600'
      become: true
```

## Practical Example: Multi-Environment Deployment

Here is a real-world example that uses several special variables to handle a multi-environment deployment setup.

```yaml
# deploy.yml - Multi-environment deployment using special variables
---
- name: Deploy application
  hosts: app_servers
  gather_facts: true
  vars:
    # Derive environment from inventory directory name
    deploy_env: "{{ inventory_dir | basename }}"
    app_config_dir: "{{ playbook_dir }}/configs/{{ deploy_env }}"
    shared_templates: "{{ playbook_dir }}/templates"
  tasks:
    - name: Show deployment context
      ansible.builtin.debug:
        msg: >
          Deploying to {{ deploy_env }} environment.
          Config source: {{ app_config_dir }}.
          Running on {{ inventory_hostname }}.
      run_once: true

    - name: Verify config directory exists
      ansible.builtin.stat:
        path: "{{ app_config_dir }}"
      delegate_to: localhost
      register: config_check
      run_once: true

    - name: Fail if config directory is missing
      ansible.builtin.fail:
        msg: "Config directory not found: {{ app_config_dir }}"
      when: not config_check.stat.exists
      run_once: true

    - name: Deploy environment-specific configuration
      ansible.builtin.copy:
        src: "{{ app_config_dir }}/application.yml"
        dest: /opt/app/config/application.yml
        mode: '0640'
        owner: app
        group: app
      become: true
      notify: restart application

    - name: Deploy shared templates
      ansible.builtin.template:
        src: "{{ shared_templates }}/nginx-vhost.conf.j2"
        dest: /etc/nginx/sites-available/app.conf
        mode: '0644'
      become: true
      notify: reload nginx
```

The project structure for this setup:

```
project/
  deploy.yml
  configs/
    production/
      application.yml
    staging/
      application.yml
  templates/
    nginx-vhost.conf.j2
  inventories/
    production/
      hosts.yml
    staging/
      hosts.yml
```

You would run this with:

```bash
# Deploy to staging
ansible-playbook deploy.yml -i inventories/staging/hosts.yml

# Deploy to production
ansible-playbook deploy.yml -i inventories/production/hosts.yml
```

## Using role_path in Templates

You can pass `role_path` into templates through variables, which is useful when a template needs to reference other files within the role.

```yaml
# roles/app/tasks/main.yml
---
- name: Generate startup script
  ansible.builtin.template:
    src: startup.sh.j2
    dest: /opt/app/startup.sh
    mode: '0755'
  vars:
    role_base: "{{ role_path }}"
```

## Common Gotcha: playbook_dir in Imported Playbooks

When you import a playbook with `ansible.builtin.import_playbook`, the `playbook_dir` variable still points to the main playbook's directory, not the imported playbook's directory. This catches people when they have a directory structure like:

```
main.yml
sub/
  included.yml
  files/
    config.txt
```

If `main.yml` imports `sub/included.yml`, `playbook_dir` inside the imported playbook is the directory of `main.yml`, not `sub/`. Keep this in mind when building file paths in imported playbooks.

## Summary

Use `playbook_dir` when you need to reference files relative to your playbook, especially in CI/CD environments where the working directory varies. Use `role_path` when you need to access non-standard file locations within a role. Use `inventory_dir` when resources are stored alongside your inventory. These special variables are the foundation of portable Ansible code that works the same way no matter where or how it is executed.
