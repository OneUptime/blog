# How to Use the run_once Directive in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Playbooks, Task Execution, DevOps

Description: Learn how to use the run_once directive in Ansible to execute tasks on only one host in a group, perfect for database migrations and one-time setup.

---

When a playbook targets multiple hosts, every task runs on every host by default. But some tasks should only run once, regardless of how many hosts are in the play. Database migrations, shared cache initialization, one-time API calls, and cluster setup commands are examples where running on every host would be redundant or harmful. The `run_once` directive tells Ansible to execute a task on just one host and skip it on all the others.

## Basic Usage

Add `run_once: true` to any task:

```yaml
# basic-run-once.yml - Database migration runs on one host only
---
- name: Deploy application to web cluster
  hosts: webservers  # 10 servers
  become: yes

  tasks:
    - name: Deploy application code
      copy:
        src: files/myapp.tar.gz
        dest: /opt/myapp/
      # Runs on ALL 10 servers

    - name: Run database migration
      command: /opt/myapp/bin/migrate --apply
      run_once: true  # Only runs on the FIRST host in the group
      register: migration_result

    - name: Display migration result on all hosts
      debug:
        msg: "Migration output: {{ migration_result.stdout }}"
      # The register variable is available on ALL hosts

    - name: Restart application
      systemd:
        name: myapp
        state: restarted
      # Runs on ALL 10 servers
```

## Which Host Runs the Task?

By default, `run_once` executes the task on the first host in the play's host list. You can control which host runs it using `delegate_to`:

```yaml
# specify-host.yml - Control which host runs the task
---
- name: Deploy with specific run_once host
  hosts: webservers
  become: yes

  tasks:
    # Runs on the first host in the webservers group
    - name: Run schema migration (default host)
      command: /opt/myapp/bin/migrate
      run_once: true

    # Runs on the database server specifically
    - name: Seed initial data
      command: psql -d myapp -f /opt/seeds/initial-data.sql
      run_once: true
      delegate_to: db1.example.com
      become_user: postgres

    # Runs on localhost (the Ansible controller)
    - name: Send deployment notification
      uri:
        url: https://hooks.slack.com/services/T00/B00/xxx
        method: POST
        body_format: json
        body:
          text: "Deployment to {{ ansible_play_hosts | length }} servers complete"
      run_once: true
      delegate_to: localhost
```

## How run_once Interacts with register

When a `run_once` task registers a variable, that variable is available on ALL hosts in the play, not just the one that ran the task. Ansible copies the result to every host's variable scope:

```yaml
# register-sharing.yml - Register from run_once is shared
---
- name: Demonstrate run_once register sharing
  hosts: webservers

  tasks:
    - name: Get the latest release version
      uri:
        url: https://api.github.com/repos/myorg/myapp/releases/latest
        return_content: yes
      register: release_info
      run_once: true
      # Only one API call, but release_info is available on all hosts

    - name: Display release on all hosts
      debug:
        msg: "Latest version: {{ (release_info.content | from_json).tag_name }}"
      # This runs on ALL hosts and can access release_info

    - name: Download the release on all hosts
      get_url:
        url: "{{ (release_info.content | from_json).assets[0].browser_download_url }}"
        dest: /tmp/myapp-latest.tar.gz
      # All hosts use the version info from the single API call
```

## Common Use Cases

### Database Migrations

The most frequent use case. You only want one migration to run at a time:

```yaml
# db-migration.yml - Single migration across a cluster
---
- name: Deploy and migrate
  hosts: app_servers
  become: yes
  serial: 5

  tasks:
    - name: Deploy new code to all servers
      unarchive:
        src: "files/myapp-{{ version }}.tar.gz"
        dest: /opt/myapp

    - name: Apply database migrations
      command: /opt/myapp/bin/migrate --apply --verbose
      run_once: true
      register: migrate_output
      changed_when: "'Applied' in migrate_output.stdout"

    - name: Verify migration
      command: /opt/myapp/bin/migrate --check
      run_once: true
      changed_when: false
      register: migration_status

    - name: Fail if migration is incomplete
      fail:
        msg: "Migration verification failed: {{ migration_status.stdout }}"
      when: "'up to date' not in migration_status.stdout"
      run_once: true

    - name: Restart application on all servers
      systemd:
        name: myapp
        state: restarted
```

### Shared Resource Initialization

```yaml
# init-shared-resources.yml - Initialize shared resources once
---
- name: Initialize shared storage and cache
  hosts: app_cluster
  become: yes

  tasks:
    - name: Create shared directory structure on NFS
      file:
        path: "{{ item }}"
        state: directory
        mode: '0775'
        owner: appuser
        group: appgroup
      loop:
        - /mnt/shared/uploads
        - /mnt/shared/cache
        - /mnt/shared/logs
      run_once: true  # All nodes share this NFS mount

    - name: Initialize Redis cache schema
      command: redis-cli -h redis.example.com SCRIPT LOAD "{{ lookup('file', 'scripts/cache-init.lua') }}"
      run_once: true
      changed_when: false

    - name: Warm up shared cache
      command: /opt/myapp/bin/cache-warmup
      run_once: true
      async: 300
      poll: 10
```

### Notifications and Reporting

```yaml
# deployment-notify.yml - Send one notification for the whole deployment
---
- name: Deploy and notify
  hosts: all
  become: yes

  tasks:
    - name: Deploy application
      copy:
        src: files/myapp.jar
        dest: /opt/myapp/myapp.jar
      notify: Restart application

    - name: Notify Slack about deployment start
      uri:
        url: "{{ slack_webhook }}"
        method: POST
        body_format: json
        body:
          text: "Deployment started to {{ ansible_play_hosts | length }} servers"
      run_once: true
      delegate_to: localhost
      changed_when: false

  post_tasks:
    - name: Notify Slack about deployment completion
      uri:
        url: "{{ slack_webhook }}"
        method: POST
        body_format: json
        body:
          text: "Deployment complete on all {{ ansible_play_hosts | length }} servers"
      run_once: true
      delegate_to: localhost
      changed_when: false

  handlers:
    - name: Restart application
      systemd:
        name: myapp
        state: restarted
```

## run_once with serial

When you use `serial`, the play runs in batches. An important detail: `run_once` executes once PER SERIAL BATCH, not once for the entire playbook:

```yaml
# run-once-serial.yml - run_once behavior with serial batches
---
- name: Rolling deployment
  hosts: webservers  # 20 servers
  serial: 5          # 4 batches of 5

  tasks:
    - name: This runs ONCE PER BATCH (4 times total)
      debug:
        msg: "Starting batch deployment"
      run_once: true

    - name: Deploy code
      copy:
        src: files/app.jar
        dest: /opt/myapp/
```

If you need a task to truly run only once across all serial batches, use a flag:

```yaml
# true-run-once.yml - Run once across all serial batches
---
- name: Truly run once across serial batches
  hosts: webservers
  serial: 5

  tasks:
    - name: Run migration only on the very first batch
      command: /opt/myapp/bin/migrate
      run_once: true
      when: ansible_play_batch | first == inventory_hostname
      # Only the first host of the first batch runs this
```

## run_once with Conditionals

You can combine `run_once` with `when` conditions:

```yaml
# conditional-run-once.yml - Conditional one-time execution
---
- name: Conditional initialization
  hosts: app_servers
  become: yes

  tasks:
    - name: Check if database exists
      command: psql -lqt
      register: db_list
      run_once: true
      delegate_to: db1.example.com
      become_user: postgres
      changed_when: false

    - name: Create database if it does not exist
      command: createdb myapp
      run_once: true
      delegate_to: db1.example.com
      become_user: postgres
      when: "'myapp' not in db_list.stdout"

    - name: Load initial schema
      command: psql -d myapp -f /opt/schema/initial.sql
      run_once: true
      delegate_to: db1.example.com
      become_user: postgres
      when: "'myapp' not in db_list.stdout"
```

## run_once with Blocks

Apply `run_once` to a block to run a group of related tasks on a single host:

```yaml
# run-once-block.yml - Block-level run_once
---
- name: Initialize cluster
  hosts: cluster_nodes
  become: yes

  tasks:
    - name: Cluster initialization tasks
      run_once: true
      block:
        - name: Initialize cluster configuration
          command: /opt/cluster/bin/init-config

        - name: Create cluster token
          command: /opt/cluster/bin/create-token
          register: cluster_token

        - name: Store token in shared location
          copy:
            content: "{{ cluster_token.stdout }}"
            dest: /mnt/shared/cluster-token
            mode: '0600'

    - name: Join cluster on all nodes
      command: /opt/cluster/bin/join --token {{ cluster_token.stdout }}
```

## Summary

The `run_once` directive is perfect for tasks that should execute on a single host: database migrations, shared resource initialization, API calls, and notifications. The registered variables from `run_once` tasks are shared across all hosts in the play. Use `delegate_to` to control which host runs the task, and be aware that `run_once` executes once per serial batch, not once per playbook. For truly global one-time execution with serial, add additional conditional logic.
