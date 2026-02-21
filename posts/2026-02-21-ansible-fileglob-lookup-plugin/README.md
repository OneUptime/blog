# How to Use the Ansible fileglob Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, File Management, Automation

Description: Learn how to use the Ansible fileglob lookup plugin to match and iterate over files using glob patterns in your playbooks.

---

When you need to copy a bunch of configuration files, deploy all scripts in a directory, or process every YAML file in a folder, the `fileglob` lookup plugin is your best friend. It takes a glob pattern and returns a list of matching file paths from the Ansible controller, which you can then loop over in your tasks.

## What fileglob Does

The `fileglob` lookup plugin matches files on the Ansible controller (the machine running Ansible) using shell-style glob patterns. It returns a list of absolute file paths that match the pattern. Unlike the `find` module which searches on remote hosts, `fileglob` operates locally and is evaluated at playbook parse time.

## Basic Usage

The simplest usage matches all files with a specific extension.

This playbook copies all `.conf` files from a local directory to remote servers:

```yaml
# playbook.yml - Copy all config files to remote hosts
---
- name: Deploy configuration files
  hosts: webservers
  tasks:
    - name: Copy all config files
      ansible.builtin.copy:
        src: "{{ item }}"
        dest: /etc/myapp/conf.d/
        mode: '0644'
      loop: "{{ lookup('fileglob', 'configs/*.conf', wantlist=True) }}"
```

Note the use of `wantlist=True`. This ensures the lookup returns a proper list even if there is only one match, which is important when using `loop`.

## Glob Pattern Syntax

The `fileglob` plugin supports standard glob patterns.

Here are the patterns you can use:

```yaml
# playbook.yml - Different glob pattern examples
---
- name: Demonstrate glob patterns
  hosts: localhost
  tasks:
    # Match all .yml files in a directory
    - name: List all YAML files
      ansible.builtin.debug:
        msg: "{{ lookup('fileglob', 'templates/*.yml', wantlist=True) }}"

    # Match files starting with 'app_'
    - name: List app config files
      ansible.builtin.debug:
        msg: "{{ lookup('fileglob', 'configs/app_*', wantlist=True) }}"

    # Match single character wildcards
    - name: List numbered configs (config1.txt, config2.txt, etc.)
      ansible.builtin.debug:
        msg: "{{ lookup('fileglob', 'configs/config?.txt', wantlist=True) }}"

    # Match specific character ranges
    - name: List files starting with a-f
      ansible.builtin.debug:
        msg: "{{ lookup('fileglob', 'configs/[a-f]*.conf', wantlist=True) }}"
```

The supported patterns are:

- `*` matches any number of characters (but not `/`)
- `?` matches exactly one character
- `[abc]` matches one character from the set
- `[a-z]` matches one character from the range

Important: `fileglob` does NOT support recursive patterns like `**`. It only matches files in a single directory.

## Deploying All Files from a Directory

One of the most common uses is deploying every file in a local directory to remote hosts.

This playbook deploys all shell scripts from a scripts directory:

```yaml
# playbook.yml - Deploy all scripts to remote hosts
---
- name: Deploy utility scripts
  hosts: all
  tasks:
    - name: Ensure scripts directory exists
      ansible.builtin.file:
        path: /opt/scripts
        state: directory
        mode: '0755'

    - name: Copy all shell scripts
      ansible.builtin.copy:
        src: "{{ item }}"
        dest: /opt/scripts/
        mode: '0755'
      loop: "{{ lookup('fileglob', 'scripts/*.sh', wantlist=True) }}"

    - name: Copy all Python scripts
      ansible.builtin.copy:
        src: "{{ item }}"
        dest: /opt/scripts/
        mode: '0755'
      loop: "{{ lookup('fileglob', 'scripts/*.py', wantlist=True) }}"
```

## Using fileglob with Templates

You can also use fileglob to find and process template files.

This playbook discovers and deploys all Jinja2 templates from a directory:

```yaml
# playbook.yml - Deploy all templates dynamically
---
- name: Deploy all configuration templates
  hosts: appservers
  tasks:
    - name: Deploy all Nginx site configs
      ansible.builtin.template:
        src: "{{ item }}"
        dest: "/etc/nginx/sites-available/{{ item | basename | regex_replace('\\.j2$', '') }}"
        mode: '0644'
      loop: "{{ lookup('fileglob', 'templates/nginx/*.j2', wantlist=True) }}"
      notify: reload nginx

    - name: Enable all sites
      ansible.builtin.file:
        src: "/etc/nginx/sites-available/{{ item | basename | regex_replace('\\.j2$', '') }}"
        dest: "/etc/nginx/sites-enabled/{{ item | basename | regex_replace('\\.j2$', '') }}"
        state: link
      loop: "{{ lookup('fileglob', 'templates/nginx/*.j2', wantlist=True) }}"
      notify: reload nginx
```

The `basename` filter extracts just the filename, and `regex_replace` strips the `.j2` extension.

## Practical Example: SSL Certificate Deployment

Here is a real-world example of deploying SSL certificates that are stored locally.

```yaml
# playbook.yml - Deploy SSL certificates from local storage
---
- name: Deploy SSL certificates
  hosts: webservers
  vars:
    cert_dir: "{{ playbook_dir }}/certs/{{ inventory_hostname }}"
  tasks:
    - name: Ensure SSL directory exists
      ansible.builtin.file:
        path: /etc/ssl/private
        state: directory
        mode: '0700'

    - name: Deploy certificate files
      ansible.builtin.copy:
        src: "{{ item }}"
        dest: "/etc/ssl/certs/{{ item | basename }}"
        mode: '0644'
      loop: "{{ lookup('fileglob', cert_dir + '/*.crt', wantlist=True) }}"

    - name: Deploy private key files
      ansible.builtin.copy:
        src: "{{ item }}"
        dest: "/etc/ssl/private/{{ item | basename }}"
        mode: '0600'
      loop: "{{ lookup('fileglob', cert_dir + '/*.key', wantlist=True) }}"
```

## Combining fileglob with Conditionals

You can check whether any files match a pattern before acting on them.

This playbook only runs cleanup if there are old log files to process:

```yaml
# playbook.yml - Conditional actions based on file existence
---
- name: Process files conditionally
  hosts: localhost
  vars:
    patch_files: "{{ lookup('fileglob', 'patches/*.patch', wantlist=True) }}"
  tasks:
    - name: Show how many patches are available
      ansible.builtin.debug:
        msg: "Found {{ patch_files | length }} patches to apply"

    - name: Apply patches
      ansible.builtin.command:
        cmd: "patch -p1 < {{ item }}"
        chdir: /opt/application
      loop: "{{ patch_files }}"
      when: patch_files | length > 0
```

## Multi-Extension Matching

If you need to match files with different extensions, run multiple lookups and combine them.

This playbook collects both `.conf` and `.ini` files:

```yaml
# playbook.yml - Match multiple file extensions
---
- name: Collect configs with different extensions
  hosts: localhost
  vars:
    all_configs: "{{ lookup('fileglob', 'configs/*.conf', wantlist=True) + lookup('fileglob', 'configs/*.ini', wantlist=True) }}"
  tasks:
    - name: Show all config files
      ansible.builtin.debug:
        msg: "Config file: {{ item | basename }}"
      loop: "{{ all_configs }}"
```

## Role-Based File Discovery

Inside roles, fileglob searches relative to the role's `files` directory. This makes it perfect for roles that need to deploy variable sets of files.

```yaml
# roles/myapp/tasks/main.yml - Using fileglob inside a role
---
- name: Deploy all application config snippets
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: /etc/myapp/conf.d/
    mode: '0644'
    owner: myapp
    group: myapp
  loop: "{{ lookup('fileglob', '*.conf', wantlist=True) }}"
  notify: restart myapp

- name: Deploy all cron jobs for the application
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: /etc/cron.d/
    mode: '0644'
  loop: "{{ lookup('fileglob', 'cron/*', wantlist=True) }}"
```

The role directory structure would look like:

```
roles/myapp/
  files/
    app.conf
    logging.conf
    security.conf
    cron/
      myapp-cleanup
      myapp-report
  tasks/
    main.yml
```

## Things to Know

A few important details about `fileglob`:

1. **Controller-side only**: `fileglob` searches files on the machine running Ansible, not on the remote hosts. To search remote files, use the `find` module instead.

2. **No recursion**: Glob patterns do not descend into subdirectories. `configs/*.conf` will not match `configs/subdir/something.conf`. If you need recursion, use the `find` module or `with_filetree`.

3. **Hidden files excluded**: By default, files starting with `.` are not matched unless you explicitly include the dot in your pattern (e.g., `configs/.*`).

4. **Return order**: Files are returned in alphabetical order based on their path. If order matters for your deployment, consider naming files with numeric prefixes like `01-first.conf`, `02-second.conf`.

5. **Empty results**: If no files match the pattern, the lookup returns an empty list. Tasks with `loop` over an empty list simply skip, which is usually the behavior you want.

6. **Path resolution**: Relative paths are resolved relative to the playbook directory (or the role's `files` directory when used inside a role).

The `fileglob` lookup plugin eliminates the need to maintain hard-coded lists of files. When you add a new config file or script to your repository, it gets automatically picked up on the next playbook run without any changes to your tasks.
