# How to Use Role Tags in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Roles, Tags, Selective Execution

Description: Learn how to apply and use tags with Ansible roles for selective task execution, faster iteration, and targeted deployments.

---

Tags in Ansible let you selectively run or skip parts of your playbook. When working with roles, tags become especially important because they let you execute just the tasks you care about without running the entire playbook. This is invaluable during development, debugging, and targeted maintenance operations. This post covers how to tag roles, tag individual tasks within roles, and use tags effectively in real-world workflows.

## Tagging an Entire Role

The simplest way to tag a role is when you list it in the `roles:` section:

```yaml
# site.yml
# Tag entire roles for selective execution
---
- hosts: all
  roles:
    - role: common
      tags: common

    - role: security
      tags:
        - security
        - hardening

    - role: nginx
      tags:
        - webserver
        - nginx

    - role: app_deploy
      tags:
        - deploy
        - app
```

Now you can run specific roles:

```bash
# Run only the security role
ansible-playbook site.yml --tags security

# Run security and deployment roles
ansible-playbook site.yml --tags "security,deploy"

# Run everything except the common role
ansible-playbook site.yml --skip-tags common
```

## Tagging Individual Tasks Within a Role

You can also tag specific tasks inside a role's `tasks/main.yml`:

```yaml
# roles/nginx/tasks/main.yml
# Individual tasks tagged for granular control
---
- name: Install Nginx
  ansible.builtin.apt:
    name: nginx
    state: present
  tags:
    - nginx_install
    - packages

- name: Deploy Nginx configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
  notify: Reload Nginx
  tags:
    - nginx_config
    - configuration

- name: Deploy virtual host configuration
  ansible.builtin.template:
    src: vhost.conf.j2
    dest: /etc/nginx/sites-available/default
  notify: Reload Nginx
  tags:
    - nginx_config
    - nginx_vhost
    - configuration

- name: Ensure Nginx is running
  ansible.builtin.service:
    name: nginx
    state: started
    enabled: yes
  tags:
    - nginx_service
    - services
```

This lets you run very specific operations:

```bash
# Only deploy configuration files, skip installation
ansible-playbook site.yml --tags nginx_config

# Only manage service state
ansible-playbook site.yml --tags services
```

## Tags with import_role vs include_role

Tags behave differently depending on whether you use `import_role` or `include_role`.

### import_role (static)

Tags propagate to all tasks inside the role automatically:

```yaml
# Tags applied to import_role work on every task in the role
- name: Deploy web server
  ansible.builtin.import_role:
    name: nginx
  tags:
    - webserver
```

Every task inside the nginx role gets the `webserver` tag. Running `--tags webserver` executes all of them.

### include_role (dynamic)

Tags on `include_role` only apply to the include task itself. To propagate tags to the role's tasks, use the `apply` keyword:

```yaml
# Tags with include_role require the apply keyword to propagate
- name: Deploy web server
  ansible.builtin.include_role:
    name: nginx
    apply:
      tags:
        - webserver
  tags:
    - webserver
```

You need the tag in both places. The outer `tags` ensures the include task itself runs when you filter by tag. The `apply.tags` ensures the tasks inside the role also get tagged.

## Special Tags: always and never

Ansible has two built-in special tags:

```yaml
# roles/common/tasks/main.yml
---
# This task always runs, even if you filter by other tags
- name: Gather custom facts
  ansible.builtin.setup:
    gather_subset: min
  tags:
    - always

# This task never runs unless you explicitly request it
- name: Wipe and reinstall packages (dangerous)
  ansible.builtin.apt:
    name: "*"
    state: latest
    force_apt_get: yes
  tags:
    - never
    - full_upgrade
```

The `always` tag means the task runs no matter what tag filter is active. The `never` tag means the task is skipped unless you explicitly pass its tag:

```bash
# The "Gather custom facts" task runs, but "Wipe and reinstall" does not
ansible-playbook site.yml --tags deploy

# Now the full_upgrade task runs because we explicitly requested it
ansible-playbook site.yml --tags full_upgrade
```

## Tag Inheritance in Role Blocks

Tags on blocks propagate to all tasks within the block:

```yaml
# roles/app_deploy/tasks/main.yml
# All tasks in this block inherit the "deploy" tag
---
- block:
    - name: Stop application
      ansible.builtin.systemd:
        name: myapp
        state: stopped

    - name: Deploy new binary
      ansible.builtin.copy:
        src: myapp
        dest: /opt/myapp/bin/myapp
        mode: '0755'

    - name: Start application
      ansible.builtin.systemd:
        name: myapp
        state: started
  tags:
    - deploy
```

## Listing Available Tags

Before running a playbook, you can see what tags are available:

```bash
# List all tags defined in the playbook and its roles
ansible-playbook site.yml --list-tags
```

Output:

```
playbook: site.yml

  play #1 (all): Configure servers
    TASK TAGS: [always, common, configuration, deploy, hardening,
                nginx, nginx_config, nginx_install, nginx_service,
                packages, security, services, webserver]
```

## Practical Tagging Strategy

Here is a tagging strategy that works well for medium to large projects:

```yaml
# site.yml
# Consistent tag taxonomy across all roles
---
- hosts: all
  roles:
    - role: common
      tags: [common, base]

    - role: security
      tags: [security]

    - role: nginx
      tags: [webserver, nginx]

    - role: app_deploy
      tags: [deploy, app]

    - role: monitoring
      tags: [monitoring, observability]
```

Within each role, use a consistent set of category tags:

```yaml
# roles/nginx/tasks/main.yml
---
- name: Install Nginx packages
  ansible.builtin.apt:
    name: nginx
    state: present
  tags:
    - install
    - packages

- name: Deploy all configuration files
  ansible.builtin.template:
    src: "{{ item.src }}"
    dest: "{{ item.dest }}"
  loop:
    - src: nginx.conf.j2
      dest: /etc/nginx/nginx.conf
    - src: vhost.conf.j2
      dest: /etc/nginx/sites-available/default
  notify: Reload Nginx
  tags:
    - configure
    - config

- name: Manage Nginx service
  ansible.builtin.service:
    name: nginx
    state: started
    enabled: yes
  tags:
    - service
    - services
```

This gives you several operational modes:

```bash
# Full run - everything
ansible-playbook site.yml

# Just install packages across all roles
ansible-playbook site.yml --tags install

# Just update configuration files
ansible-playbook site.yml --tags configure

# Only deploy the application
ansible-playbook site.yml --tags deploy

# Everything except monitoring
ansible-playbook site.yml --skip-tags monitoring
```

## Tags in Handlers

Handlers within roles also support tags, but there is a nuance. A handler only runs if:

1. It was notified by a task that actually ran and made a change
2. The handler's own tags match the current tag filter (or the handler is not tagged)

```yaml
# roles/nginx/handlers/main.yml
---
- name: Reload Nginx
  ansible.builtin.systemd:
    name: nginx
    state: reloaded
  tags:
    - webserver
    - nginx
```

If you run with `--tags configure` and a configuration task notifies "Reload Nginx", the handler will only run if its tags also match the filter. For this reason, many teams leave handlers untagged or tag them with `always`:

```yaml
# roles/nginx/handlers/main.yml
# Handlers tagged with "always" run whenever they are notified
---
- name: Reload Nginx
  ansible.builtin.systemd:
    name: nginx
    state: reloaded
  tags:
    - always
```

## Common Mistakes

1. **Inconsistent tag names.** Use a standard taxonomy (install, configure, service, deploy) across all roles.

2. **Forgetting the apply keyword with include_role.** Tags do not propagate to dynamic includes without it.

3. **Over-tagging.** Not every task needs a tag. Focus on tasks that you would reasonably want to run in isolation.

4. **Tagging handlers incorrectly.** Either leave handlers untagged or tag them with `always` to ensure they fire when notified.

## Wrapping Up

Tags give you surgical control over which parts of your playbook execute. At the role level, they let you skip or target entire roles. At the task level within roles, they let you run specific operations like "just update configs" or "just restart services." The key is to use a consistent tagging strategy across your roles, understand the difference between static and dynamic role inclusion for tag propagation, and remember that handlers need their own tag consideration. A well-tagged playbook turns a 30-minute full deployment into a 2-minute targeted operation.
