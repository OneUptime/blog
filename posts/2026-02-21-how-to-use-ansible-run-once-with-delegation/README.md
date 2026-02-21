# How to Use Ansible run_once with Delegation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Delegation, run_once, Orchestration

Description: Learn how to use run_once with delegate_to in Ansible to execute tasks exactly once during multi-host plays for database migrations and API calls.

---

The `run_once` directive tells Ansible to execute a task only once, regardless of how many hosts are in the play. When combined with `delegate_to`, it gives you precise control over where that single execution happens. This combination is essential for operations like database migrations, one-time API calls, cluster initialization, and any task that must happen exactly once during a deployment.

## How run_once Works

Without `run_once`, a task executes once per host in the play. With `run_once: true`, the task executes only for the first host in the batch, and the result is applied to all hosts.

```yaml
# run-once-basic.yml - Demonstrating run_once behavior
---
- name: Show run_once behavior
  hosts: webservers    # Assume: web1, web2, web3, web4, web5
  gather_facts: false
  tasks:
    - name: This runs on ALL 5 hosts
      ansible.builtin.debug:
        msg: "Running on {{ inventory_hostname }}"

    - name: This runs on ONLY the first host (web1)
      ansible.builtin.debug:
        msg: "Running once on {{ inventory_hostname }}"
      run_once: true
      # Output: "Running once on web1"
```

## Combining run_once with delegate_to

The real power comes from combining both. You can run a task once, on a specific host, while processing a play against many hosts.

```yaml
# run-once-delegate.yml - Run once on a specific host
---
- name: Deploy with one-time database migration
  hosts: appservers
  serial: 1
  tasks:
    - name: Run database migration (once, on the DB server)
      ansible.builtin.shell: |
        cd /opt/myapp && python3 manage.py migrate --no-input
      delegate_to: db-primary.example.com
      run_once: true
      become: true
      become_user: myapp
      # This runs exactly once on db-primary, even though
      # the play targets all appservers one at a time

    - name: Deploy application (runs on each app server)
      ansible.builtin.copy:
        src: /releases/{{ version }}/
        dest: /opt/myapp/
      become: true

    - name: Restart application (runs on each app server)
      ansible.builtin.systemd:
        name: myapp
        state: restarted
      become: true
```

## run_once with delegate_to localhost

The most common pattern is running a task once on the controller for API calls, notifications, or file operations:

```yaml
# run-once-localhost.yml - One-time operations on the controller
---
- name: Deploy with one-time notifications and API calls
  hosts: webservers
  serial: 2
  tasks:
    - name: Notify Slack about deployment start (once)
      ansible.builtin.uri:
        url: "{{ slack_webhook }}"
        method: POST
        body_format: json
        body:
          text: "Starting deployment of v{{ version }} to {{ groups['webservers'] | length }} servers"
      delegate_to: localhost
      run_once: true

    - name: Create deployment record in CMDB (once)
      ansible.builtin.uri:
        url: "http://cmdb.internal/api/deployments"
        method: POST
        body_format: json
        body:
          version: "{{ version }}"
          environment: "{{ env }}"
          hosts: "{{ groups['webservers'] }}"
          started_at: "{{ now(utc=true).isoformat() }}"
          deployer: "{{ lookup('env', 'USER') }}"
        headers:
          Authorization: "Bearer {{ cmdb_token }}"
        status_code: [200, 201]
      delegate_to: localhost
      run_once: true
      register: deployment_record

    # These run on each web server
    - name: Deploy application
      ansible.builtin.copy:
        src: /releases/{{ version }}/
        dest: /opt/myapp/
      become: true

    - name: Restart application
      ansible.builtin.systemd:
        name: myapp
        state: restarted
      become: true
```

## run_once Behavior with serial

When using `serial`, `run_once` executes the task once per batch, not once for the entire play. This is a subtle but important distinction.

```yaml
# run-once-serial-behavior.yml - run_once with serial
---
- name: Demonstrate run_once with serial
  hosts: webservers    # web1, web2, web3, web4, web5, web6
  serial: 2            # Process 2 hosts at a time
  gather_facts: false
  tasks:
    - name: This runs ONCE PER BATCH (3 times total with 6 hosts and serial 2)
      ansible.builtin.debug:
        msg: "Batch notification for {{ ansible_play_batch | join(', ') }}"
      run_once: true
      # Runs for: web1 (batch 1), web3 (batch 2), web5 (batch 3)

    - name: This runs on each host
      ansible.builtin.debug:
        msg: "Deploying to {{ inventory_hostname }}"
```

If you truly need something to run once for the entire play (not per batch), put it in a separate play or use a flag:

```yaml
# truly-run-once.yml - Ensuring a task runs only once across all batches
---
- name: One-time setup
  hosts: webservers[0]    # Target only the first host
  gather_facts: false
  tasks:
    - name: Database migration (truly once)
      ansible.builtin.shell: |
        cd /opt/myapp && python3 manage.py migrate --no-input
      delegate_to: db-primary.example.com
      become: true
      become_user: myapp

- name: Rolling deployment
  hosts: webservers
  serial: 2
  tasks:
    - name: Deploy application
      ansible.builtin.copy:
        src: /releases/{{ version }}/
        dest: /opt/myapp/
      become: true
```

## Practical Use Cases

Here are real-world scenarios where `run_once` with delegation is the right approach.

Cluster initialization:

```yaml
# cluster-init.yml - Initialize a cluster once, then configure all nodes
---
- name: Deploy Elasticsearch cluster
  hosts: elasticsearch_nodes
  tasks:
    - name: Install Elasticsearch on all nodes
      ansible.builtin.apt:
        name: elasticsearch
        state: present
      become: true

    - name: Configure Elasticsearch
      ansible.builtin.template:
        src: elasticsearch.yml.j2
        dest: /etc/elasticsearch/elasticsearch.yml
      become: true
      notify: Restart Elasticsearch

    - name: Start Elasticsearch on all nodes
      ansible.builtin.systemd:
        name: elasticsearch
        state: started
        enabled: true
      become: true

    - name: Wait for cluster to form
      ansible.builtin.uri:
        url: "http://{{ ansible_host }}:9200/_cluster/health?wait_for_status=yellow&timeout=60s"
      register: cluster_health
      retries: 10
      delay: 10
      until: cluster_health.json.status in ['yellow', 'green']
      run_once: true

    - name: Create index templates (once)
      ansible.builtin.uri:
        url: "http://{{ groups['elasticsearch_nodes'][0] }}:9200/_index_template/myapp_logs"
        method: PUT
        body_format: json
        body:
          index_patterns: ["myapp-logs-*"]
          template:
            settings:
              number_of_shards: 3
              number_of_replicas: 1
      delegate_to: localhost
      run_once: true

  handlers:
    - name: Restart Elasticsearch
      ansible.builtin.systemd:
        name: elasticsearch
        state: restarted
      become: true
```

Generating shared artifacts:

```yaml
# shared-artifact.yml - Generate an artifact once and deploy to all hosts
---
- name: Build and deploy shared configuration
  hosts: appservers
  tasks:
    - name: Generate encryption key (once, on controller)
      ansible.builtin.shell: |
        openssl rand -base64 32
      register: encryption_key
      delegate_to: localhost
      run_once: true
      changed_when: false
      no_log: true

    - name: Deploy encryption key to all hosts
      ansible.builtin.copy:
        content: "{{ encryption_key.stdout }}"
        dest: /opt/myapp/config/encryption.key
        mode: '0600'
        owner: myapp
      become: true
      no_log: true
```

## Variable Sharing with run_once

When `run_once` is used with `register`, the registered variable is available on all hosts in the play, not just the one that ran the task.

```yaml
# variable-sharing.yml - Sharing registered variables across hosts
---
- name: Gather info once, use everywhere
  hosts: appservers
  tasks:
    - name: Get the latest release version from API
      ansible.builtin.uri:
        url: "https://api.example.com/releases/latest"
        return_content: true
      register: latest_release
      delegate_to: localhost
      run_once: true

    - name: Deploy the version on every host
      ansible.builtin.debug:
        msg: "Deploying version {{ latest_release.json.version }} to {{ inventory_hostname }}"
      # latest_release is available on all hosts, even though
      # the API call only happened once

    - name: Get database connection string
      ansible.builtin.shell: |
        cat /opt/db-config/connection-string.txt
      register: db_conn
      delegate_to: db-primary.example.com
      run_once: true
      changed_when: false

    - name: Configure all app servers with DB connection
      ansible.builtin.template:
        src: db-config.yml.j2
        dest: /opt/myapp/db-config.yml
      vars:
        database_url: "{{ db_conn.stdout }}"
      become: true
```

## run_once with Conditional Logic

You can combine `run_once` with `when` to conditionally run one-time tasks:

```yaml
# conditional-run-once.yml - Conditional one-time operations
---
- name: Conditional one-time operations
  hosts: appservers
  vars:
    run_migrations: true
    clear_cache: true
  tasks:
    - name: Run migrations if needed
      ansible.builtin.shell: |
        cd /opt/myapp && ./migrate.sh
      delegate_to: db-primary.example.com
      run_once: true
      when: run_migrations | bool

    - name: Clear Redis cache if needed
      ansible.builtin.shell: |
        redis-cli -h {{ groups['cache_servers'][0] }} FLUSHDB
      delegate_to: localhost
      run_once: true
      when: clear_cache | bool

    - name: Deploy to all servers
      ansible.builtin.copy:
        src: /releases/{{ version }}/
        dest: /opt/myapp/
      become: true
```

## Common Mistakes with run_once and Delegation

Mistake 1: Using `run_once` without `delegate_to` when you need the task to run on a specific host. Without delegation, it runs on the first host in the play.

```yaml
# WRONG: Runs on web1, not on the DB server
- name: Migrate database
  ansible.builtin.shell: cd /opt/myapp && ./migrate.sh
  run_once: true
  # This runs on the first webserver, which may not have DB access

# RIGHT: Explicitly delegate to the DB server
- name: Migrate database
  ansible.builtin.shell: cd /opt/myapp && ./migrate.sh
  delegate_to: db-primary.example.com
  run_once: true
```

Mistake 2: Forgetting that `run_once` runs once per batch when using `serial`.

Mistake 3: Assuming `become` applies to the original host. With `delegate_to`, `become` applies on the delegate target.

## Summary

The `run_once` and `delegate_to` combination is essential for tasks that should happen exactly once during a multi-host play: database migrations, API registrations, cache clearing, cluster initialization, and notification sending. Remember that with `serial`, `run_once` executes once per batch. For truly one-time operations across the entire deployment, use a separate play targeting a single host. The registered variables from `run_once` tasks are shared across all hosts in the play, making it ideal for gathering shared configuration data.
