# How to Fix ansible-lint Task Naming Warnings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, ansible-lint, Naming Conventions, Best Practices

Description: Fix all types of ansible-lint task naming warnings including missing names, casing issues, template usage in names, and prefix requirements.

---

Task naming warnings are among the most frequent ansible-lint findings. They might seem like nitpicking, but consistent task names make your playbook output readable, your logs searchable, and your team's code reviews smoother. When you run a playbook, the task names are what scroll across your terminal. Good names tell you exactly what is happening at each step.

Let us go through every task naming rule in ansible-lint and how to fix violations for each one.

## name[missing]: All Tasks Should Be Named

This is the most basic naming rule. Every task must have a `name` field.

**The problem:**

```yaml
# Tasks without names - hard to read in output
---
- hosts: webservers
  tasks:
    - ansible.builtin.apt:
        name: nginx
        state: present

    - ansible.builtin.systemd:
        name: nginx
        state: started
        enabled: true

    - ansible.builtin.copy:
        src: nginx.conf
        dest: /etc/nginx/nginx.conf
```

When you run this, the output shows module names instead of meaningful descriptions:

```
TASK [ansible.builtin.apt] ******************
TASK [ansible.builtin.systemd] **************
TASK [ansible.builtin.copy] *****************
```

**The fix:**

```yaml
# Every task gets a descriptive name
---
- hosts: webservers
  tasks:
    - name: Install nginx web server
      ansible.builtin.apt:
        name: nginx
        state: present

    - name: Start and enable nginx service
      ansible.builtin.systemd:
        name: nginx
        state: started
        enabled: true

    - name: Deploy nginx configuration file
      ansible.builtin.copy:
        src: nginx.conf
        dest: /etc/nginx/nginx.conf
```

Now the output tells you what each step does:

```
TASK [Install nginx web server] *************
TASK [Start and enable nginx service] *******
TASK [Deploy nginx configuration file] ******
```

## name[casing]: Task Names Should Start with an Uppercase Letter

ansible-lint expects task names to start with a capital letter. This is a readability convention.

**The problem:**

```yaml
# Lowercase task names
---
- name: configure webservers
  hosts: webservers
  tasks:
    - name: install nginx
      ansible.builtin.apt:
        name: nginx
        state: present

    - name: copy the config file
      ansible.builtin.copy:
        src: nginx.conf
        dest: /etc/nginx/nginx.conf

    - name: restart nginx
      ansible.builtin.systemd:
        name: nginx
        state: restarted
```

**The fix:**

```yaml
# Capitalize the first letter of each task name
---
- name: Configure webservers
  hosts: webservers
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present

    - name: Copy the config file
      ansible.builtin.copy:
        src: nginx.conf
        dest: /etc/nginx/nginx.conf

    - name: Restart nginx
      ansible.builtin.systemd:
        name: nginx
        state: restarted
```

Note: Play names follow the same rule.

## name[template]: Task Names Should Not Use Jinja2 Templates

Putting variables in task names makes the output inconsistent across different runs and hosts. It also makes searching logs harder because the task name changes based on variable values.

**The problem:**

```yaml
# Variable templates in task names
---
- name: Deploy application
  hosts: appservers
  tasks:
    - name: "Install {{ app_name }} version {{ app_version }}"
      ansible.builtin.apt:
        name: "{{ app_name }}={{ app_version }}"
        state: present

    - name: "Create user {{ app_user }}"
      ansible.builtin.user:
        name: "{{ app_user }}"
        state: present

    - name: "Deploy config to {{ inventory_hostname }}"
      ansible.builtin.template:
        src: app.conf.j2
        dest: "/etc/{{ app_name }}/app.conf"
```

**The fix:**

```yaml
# Static task names with descriptive text
---
- name: Deploy application
  hosts: appservers
  tasks:
    - name: Install the application package
      ansible.builtin.apt:
        name: "{{ app_name }}={{ app_version }}"
        state: present

    - name: Create the application service user
      ansible.builtin.user:
        name: "{{ app_user }}"
        state: present

    - name: Deploy application configuration file
      ansible.builtin.template:
        src: app.conf.j2
        dest: "/etc/{{ app_name }}/app.conf"
```

If you absolutely need dynamic information in the output, use the `ansible.builtin.debug` module before or after the task to print the details:

```yaml
    - name: Show deployment details
      ansible.builtin.debug:
        msg: "Deploying {{ app_name }} version {{ app_version }}"

    - name: Install the application package
      ansible.builtin.apt:
        name: "{{ app_name }}={{ app_version }}"
        state: present
```

## name[play]: Play Names Must Follow Rules

Play names follow the same rules as task names: they must exist, start with a capital letter, and avoid templates.

**The problem:**

```yaml
# Bad play names
---
- hosts: webservers  # No name at all
  tasks: []

- name: "deploy to {{ env }}"  # Template in name
  hosts: webservers
  tasks: []

- name: webserver setup  # Lowercase
  hosts: webservers
  tasks: []
```

**The fix:**

```yaml
# Proper play names
---
- name: Configure web servers
  hosts: webservers
  tasks: []

- name: Deploy application to environment
  hosts: webservers
  tasks: []

- name: Set up web server base configuration
  hosts: webservers
  tasks: []
```

## Writing Good Task Names

Beyond just satisfying the linter, here are guidelines for writing genuinely useful task names.

### Use Action Verbs

Start with what the task does:

```yaml
# Good action verbs in task names
- name: Install PostgreSQL client packages
- name: Create application database
- name: Configure log rotation for nginx
- name: Enable and start the monitoring agent
- name: Remove temporary build artifacts
- name: Validate SSL certificate expiration
```

### Be Specific, Not Generic

```yaml
# Bad: too generic
- name: Copy file
- name: Run command
- name: Install package

# Good: specific about what and where
- name: Copy TLS certificate to nginx ssl directory
- name: Run database migration script
- name: Install Redis server package
```

### Keep Names Under 50-60 Characters

Long task names wrap in terminal output and become hard to read:

```yaml
# Too long
- name: Install and configure the prometheus node exporter monitoring agent with custom textfile collector

# Better: concise but clear
- name: Install prometheus node exporter with textfile collector
```

### Use Consistent Patterns

Pick a naming pattern for your team and stick with it. Here is one approach:

```yaml
# Pattern: [Action] [Object] [Details]
- name: Install nginx web server
- name: Install PostgreSQL 15 client
- name: Create application database schema
- name: Deploy nginx virtual host configuration
- name: Start and enable systemd timer for backups
- name: Remove outdated package cache
```

## Bulk Fixing Naming Issues

For large codebases, here is a strategy to fix naming issues efficiently:

```bash
# Find all unnamed tasks
grep -n "^\s*- \(ansible\.\|community\.\|amazon\.\)" --include="*.yml" -r .

# Find tasks with lowercase names
grep -n "^\s*- name: [a-z]" --include="*.yml" -r .

# Find tasks with Jinja2 in names
grep -n '^\s*- name:.*{{' --include="*.yml" -r .
```

## Handler Naming

Handlers follow the same rules as tasks. Name them descriptively:

```yaml
# handlers/main.yml - Well-named handlers
---
- name: Restart nginx web server
  ansible.builtin.systemd:
    name: nginx
    state: restarted

- name: Reload nginx configuration
  ansible.builtin.systemd:
    name: nginx
    state: reloaded

- name: Restart PostgreSQL database service
  ansible.builtin.systemd:
    name: postgresql
    state: restarted
```

Make sure the handler name matches the `notify` directive in your tasks:

```yaml
# tasks/main.yml - notify must match handler name exactly
- name: Deploy nginx configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
  notify: Reload nginx configuration
```

## Suppressing Naming Warnings When Needed

Sometimes a naming rule genuinely does not work for a specific situation. Use inline `noqa` comments for those cases:

```yaml
# When you truly need a template in the name for loop clarity
- name: "Create virtual host for {{ item.domain }}"  # noqa: name[template]
  ansible.builtin.template:
    src: vhost.conf.j2
    dest: "/etc/nginx/sites-available/{{ item.domain }}.conf"
  loop: "{{ virtual_hosts }}"
```

But try to avoid this. In most cases, you can write a static name that is clear enough without the variable.

Task naming is one of those small things that compounds over time. When every task has a clear, consistent name, running playbooks becomes informative rather than mysterious, and searching through logs becomes straightforward instead of frustrating.
