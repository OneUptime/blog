# How to Use Ansible --start-at-task to Resume Playbooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Debugging, Playbooks, DevOps

Description: Learn how to use the Ansible start-at-task flag to resume playbook execution from a specific task after a failure.

---

When a long playbook fails somewhere in the middle, you do not always want to rerun the entire thing from the beginning. Maybe the first 30 tasks took 20 minutes and all succeeded. The `--start-at-task` flag lets you skip ahead to a specific task by name, saving significant time during development and troubleshooting.

## Basic Usage

The `--start-at-task` flag takes the exact name of the task where you want to begin execution. All tasks before it are skipped.

Suppose you have this playbook:

```yaml
# deploy-app.yml - A multi-step deployment playbook
---
- name: Deploy application
  hosts: webservers
  become: true
  tasks:
    - name: Update apt cache
      ansible.builtin.apt:
        update_cache: true
        cache_valid_time: 3600

    - name: Install system dependencies
      ansible.builtin.apt:
        name:
          - python3
          - python3-pip
          - nginx
        state: present

    - name: Create application user
      ansible.builtin.user:
        name: myapp
        system: true
        shell: /usr/sbin/nologin

    - name: Copy application files
      ansible.builtin.copy:
        src: dist/
        dest: /opt/myapp/
        owner: myapp
        group: myapp

    - name: Install Python dependencies
      ansible.builtin.pip:
        requirements: /opt/myapp/requirements.txt
        virtualenv: /opt/myapp/venv

    - name: Configure nginx virtual host
      ansible.builtin.template:
        src: nginx-vhost.j2
        dest: /etc/nginx/sites-available/myapp.conf
      notify: Reload nginx

    - name: Enable nginx virtual host
      ansible.builtin.file:
        src: /etc/nginx/sites-available/myapp.conf
        dest: /etc/nginx/sites-enabled/myapp.conf
        state: link
      notify: Reload nginx

    - name: Start application service
      ansible.builtin.systemd:
        name: myapp
        state: started
        enabled: true

  handlers:
    - name: Reload nginx
      ansible.builtin.systemd:
        name: nginx
        state: reloaded
```

If the playbook fails at "Install Python dependencies", you can fix the issue and resume from that point:

```bash
# Resume from a specific task
ansible-playbook deploy-app.yml --start-at-task="Install Python dependencies"

# The task name must match exactly (case-sensitive)
# These would NOT work:
# ansible-playbook deploy-app.yml --start-at-task="install python dependencies"
# ansible-playbook deploy-app.yml --start-at-task="Install Python"
```

## Combining with --limit

You can combine `--start-at-task` with `--limit` (and retry files) to resume from a specific task on only the failed hosts.

```bash
# Resume from a task, but only on hosts that failed last run
ansible-playbook deploy-app.yml \
  --start-at-task="Copy application files" \
  --limit @deploy-app.retry
```

## Using --list-tasks to Find Task Names

If you do not remember the exact task name, use `--list-tasks` to see all tasks in the playbook:

```bash
# List all tasks in the playbook
ansible-playbook deploy-app.yml --list-tasks

# Output:
# playbook: deploy-app.yml
#   play #1 (webservers): Deploy application   TAGS: []
#     tasks:
#       Update apt cache        TAGS: []
#       Install system dependencies     TAGS: []
#       Create application user TAGS: []
#       Copy application files  TAGS: []
#       Install Python dependencies     TAGS: []
#       Configure nginx virtual host    TAGS: []
#       Enable nginx virtual host       TAGS: []
#       Start application service       TAGS: []
```

## Behavior with Multiple Plays

When your playbook has multiple plays, `--start-at-task` searches across all plays. If the task name exists in a later play, all earlier plays are skipped entirely.

```yaml
# multi-play.yml - Playbook with multiple plays
---
- name: Configure database servers
  hosts: dbservers
  tasks:
    - name: Install PostgreSQL
      ansible.builtin.apt:
        name: postgresql
        state: present
      become: true

    - name: Configure PostgreSQL
      ansible.builtin.template:
        src: postgresql.conf.j2
        dest: /etc/postgresql/14/main/postgresql.conf
      become: true

- name: Configure application servers
  hosts: appservers
  tasks:
    - name: Install application
      ansible.builtin.copy:
        src: myapp/
        dest: /opt/myapp/

    - name: Start application
      ansible.builtin.systemd:
        name: myapp
        state: started
      become: true
```

```bash
# This skips the entire "Configure database servers" play
# and starts at "Install application" in the second play
ansible-playbook multi-play.yml --start-at-task="Install application"
```

## Interactive Step Mode with --step

Related to `--start-at-task`, the `--step` flag lets you interactively confirm each task before it runs. This is useful during development.

```bash
# Run in step mode - Ansible asks before each task
ansible-playbook deploy-app.yml --step

# Output looks like:
# Perform task: TASK: Update apt cache (N)o/(y)es/(c)ontinue: y
# Perform task: TASK: Install system dependencies (N)o/(y)es/(c)ontinue: c
```

The options are:
- `y` - run this task, then prompt for the next one
- `n` - skip this task, prompt for the next
- `c` - continue running all remaining tasks without prompting

## Combining --start-at-task with Tags

You can use both `--start-at-task` and `--tags` together. Ansible will start at the specified task but also filter by tags.

```yaml
# tagged-playbook.yml - Playbook with tagged tasks
---
- name: Full deployment
  hosts: webservers
  become: true
  tasks:
    - name: Update system packages
      ansible.builtin.apt:
        upgrade: safe
      tags: [system, packages]

    - name: Install application dependencies
      ansible.builtin.apt:
        name: [python3, nodejs]
        state: present
      tags: [app, packages]

    - name: Deploy application code
      ansible.builtin.git:
        repo: https://github.com/myorg/myapp.git
        dest: /opt/myapp
        version: "{{ app_version }}"
      tags: [app, deploy]

    - name: Run database migrations
      ansible.builtin.shell: |
        cd /opt/myapp && python3 manage.py migrate
      tags: [app, database]

    - name: Restart services
      ansible.builtin.systemd:
        name: myapp
        state: restarted
      tags: [app, services]
```

```bash
# Start at "Deploy application code" but only run tasks tagged "app"
ansible-playbook tagged-playbook.yml \
  --start-at-task="Deploy application code" \
  --tags app
```

## Practical Workflow for Debugging Failed Playbooks

Here is my typical workflow when a playbook fails and I need to fix and resume:

```bash
# Step 1: The playbook fails
ansible-playbook deploy-app.yml -e version=2.0.1
# ... fails at "Install Python dependencies"

# Step 2: Check what happened on the failed hosts
ansible webservers -m shell -a "pip3 --version" --limit @deploy-app.retry

# Step 3: Fix the issue (maybe install pip first)
ansible webservers -m apt -a "name=python3-pip state=present" -b --limit @deploy-app.retry

# Step 4: Resume from the failed task, only on failed hosts
ansible-playbook deploy-app.yml \
  -e version=2.0.1 \
  --start-at-task="Install Python dependencies" \
  --limit @deploy-app.retry

# Step 5: If it succeeds, run the full playbook to confirm idempotency
ansible-playbook deploy-app.yml -e version=2.0.1
```

## Caveats and Limitations

There are some important things to know about `--start-at-task`:

Variables set by earlier tasks (using `set_fact` or `register`) will not be available when you skip those tasks. This playbook illustrates the problem:

```yaml
# caveat-variables.yml - Demonstrating the set_fact caveat
---
- name: Show start-at-task variable caveat
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Determine deployment directory
      ansible.builtin.set_fact:
        deploy_dir: "/opt/myapp/releases/{{ lookup('pipe', 'date +%Y%m%d%H%M%S') }}"

    - name: Create deployment directory
      ansible.builtin.file:
        path: "{{ deploy_dir }}"
        state: directory
        # This will fail if you --start-at-task here
        # because deploy_dir was set by the skipped task
```

To work around this, either pass the variable on the command line or restructure your playbook so that critical variable definitions are in `vars` or `vars_files` rather than `set_fact` tasks.

```bash
# Workaround: pass the variable explicitly when resuming
ansible-playbook caveat-variables.yml \
  --start-at-task="Create deployment directory" \
  -e deploy_dir=/opt/myapp/releases/20260221120000
```

## Summary

The `--start-at-task` flag is a significant time saver during development and failure recovery. Pair it with `--limit` for targeting specific hosts, `--list-tasks` for finding exact task names, and `--step` for interactive debugging. Just be aware that skipped tasks will not set their variables, so structure your playbooks accordingly. For production use, combine this with retry files for a complete failure recovery workflow.
