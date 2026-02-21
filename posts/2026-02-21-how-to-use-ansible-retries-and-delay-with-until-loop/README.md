# How to Use Ansible retries and delay with until Loop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Retry Logic, Error Handling, Automation

Description: Deep dive into Ansible retries and delay parameters for until loops with practical patterns for tuning retry behavior in production playbooks.

---

The `until` loop in Ansible provides retry logic, but the `retries` and `delay` parameters are what control how that retry logic behaves. Getting these parameters right is the difference between a playbook that handles transient failures gracefully and one that either gives up too quickly or wastes time waiting unnecessarily.

## Default Values

If you use `until` without specifying `retries` or `delay`, Ansible uses these defaults:

- `retries: 3` (the task runs up to 3 times total)
- `delay: 5` (5 seconds between each retry)

```yaml
# Uses default retries=3 and delay=5
- name: Check if service is up (defaults)
  ansible.builtin.uri:
    url: http://localhost:8080/health
    status_code: 200
  register: health
  until: health.status == 200
```

This gives a total window of about 15 seconds (3 attempts, 5 seconds apart). For many use cases, that is too short.

## Calculating Total Wait Time

The formula for total maximum wait time is:

```
total_wait = (retries - 1) * delay + task_execution_time * retries
```

The first attempt runs immediately (no delay before it), and there are `retries - 1` delays between attempts. Here is a quick reference:

```yaml
# 10 retries, 5 second delay = ~50 seconds max wait
retries: 10
delay: 5

# 30 retries, 10 second delay = ~300 seconds (5 minutes) max wait
retries: 30
delay: 10

# 60 retries, 5 second delay = ~300 seconds (5 minutes) max wait
retries: 60
delay: 5

# 12 retries, 30 second delay = ~360 seconds (6 minutes) max wait
retries: 12
delay: 30
```

## Choosing the Right retries and delay

The optimal values depend on what you are waiting for. Here are guidelines based on common scenarios:

For service health checks after a restart, services typically start within 10-30 seconds:

```yaml
# Wait for a service to start - moderate retry with short delay
- name: Wait for Redis to accept connections
  ansible.builtin.command: redis-cli ping
  register: redis_ping
  until: redis_ping.stdout == "PONG"
  retries: 12
  delay: 5
  changed_when: false
```

For cloud resource provisioning, VMs and load balancers can take 1-5 minutes:

```yaml
# Wait for cloud VM to be ready - longer retry with longer delay
- name: Wait for instance to be reachable
  ansible.builtin.wait_for:
    host: "{{ new_instance_ip }}"
    port: 22
    timeout: 5
  register: ssh_check
  until: ssh_check is succeeded
  retries: 24
  delay: 10
```

For database operations like replication sync, this can take minutes to hours:

```yaml
# Wait for database replication to catch up
- name: Check replication lag
  community.postgresql.postgresql_query:
    db: postgres
    query: "SELECT extract(epoch from replay_lag) as lag_seconds FROM pg_stat_replication WHERE application_name = 'replica1'"
  register: repl_lag
  until: >
    repl_lag.query_result | length > 0 and
    repl_lag.query_result[0].lag_seconds | float < 5.0
  retries: 120
  delay: 10
  changed_when: false
```

## Using Variables for Dynamic retries and delay

You can use variables to make retry parameters configurable:

```yaml
# Make retry parameters configurable per environment
- name: Wait for application health
  ansible.builtin.uri:
    url: "http://localhost:{{ app_port }}/health"
    status_code: 200
  register: health
  until: health.status == 200
  retries: "{{ health_check_retries | default(20) }}"
  delay: "{{ health_check_delay | default(10) }}"
```

Then override per environment:

```yaml
# group_vars/production.yml
health_check_retries: 30
health_check_delay: 10

# group_vars/staging.yml
health_check_retries: 10
health_check_delay: 5
```

## Handling Failures Gracefully

When all retries are exhausted, the task fails. You can handle this in several ways:

```yaml
# Option 1: Use ignore_errors and check afterward
- name: Wait for external API
  ansible.builtin.uri:
    url: "https://api.external-service.com/status"
    status_code: 200
  register: api_check
  until: api_check.status == 200
  retries: 5
  delay: 10
  ignore_errors: yes

- name: Handle API unavailability
  ansible.builtin.debug:
    msg: "External API is unavailable. Proceeding with cached data."
  when: api_check is failed

# Option 2: Use block/rescue for cleaner error handling
- name: Check dependency with fallback
  block:
    - name: Wait for primary database
      ansible.builtin.command: pg_isready -h primary.db.internal
      register: primary_check
      until: primary_check.rc == 0
      retries: 5
      delay: 5
      changed_when: false

  rescue:
    - name: Primary unavailable, switch to replica
      ansible.builtin.set_fact:
        database_host: "replica.db.internal"

    - name: Wait for replica database
      ansible.builtin.command: pg_isready -h replica.db.internal
      register: replica_check
      until: replica_check.rc == 0
      retries: 10
      delay: 5
      changed_when: false
```

## Progressive Delay Patterns

Ansible does not natively support exponential backoff, but you can simulate it with a workaround using a custom loop:

```yaml
# Simulate exponential backoff using a task loop
- name: Try API call with increasing delays
  ansible.builtin.uri:
    url: "https://api.example.com/resource"
    method: POST
    body_format: json
    body: "{{ request_body }}"
    status_code: [200, 201]
  register: api_result
  ignore_errors: yes

- name: Retry with exponential backoff if needed
  ansible.builtin.uri:
    url: "https://api.example.com/resource"
    method: POST
    body_format: json
    body: "{{ request_body }}"
    status_code: [200, 201]
  register: api_result
  until: api_result is succeeded
  retries: 5
  delay: "{{ item }}"
  loop: [2, 4, 8, 16, 32]
  when: api_result is failed
```

For most scenarios though, a fixed delay is sufficient and simpler.

## Monitoring Retry Attempts

You can add visibility into what is happening during retries:

```yaml
# Check with detailed output about what's happening during retries
- name: Wait for Elasticsearch cluster health
  ansible.builtin.uri:
    url: "http://localhost:9200/_cluster/health"
    return_content: yes
  register: es_health
  until: >
    es_health.status == 200 and
    es_health.json.status in ['green', 'yellow']
  retries: 30
  delay: 10
  failed_when: false

- name: Report cluster status
  ansible.builtin.debug:
    msg: >
      Elasticsearch cluster status: {{ es_health.json.status | default('unreachable') }},
      Nodes: {{ es_health.json.number_of_nodes | default('unknown') }},
      Active shards: {{ es_health.json.active_shards | default('unknown') }}
  when: es_health is succeeded
```

## Retry with Different Failure Conditions

You can fine-tune what counts as a "need to retry" versus "hard failure":

```yaml
# Retry on connection errors but fail immediately on 4xx errors
- name: Call payment API
  ansible.builtin.uri:
    url: "https://payments.example.com/charge"
    method: POST
    body_format: json
    body:
      amount: "{{ charge_amount }}"
      customer: "{{ customer_id }}"
    status_code: [200, 201]
  register: payment
  until: payment is succeeded
  retries: 3
  delay: 5
  failed_when: >
    payment.status is defined and
    payment.status >= 400 and
    payment.status < 500
```

This fails immediately on client errors (400-499) but retries on server errors (500+) and connection failures.

## Practical Example: Database Cluster Setup with Retries

```yaml
# Set up a database cluster with retry logic at each critical step
- name: Setup PostgreSQL cluster
  hosts: db_servers
  become: yes
  tasks:
    - name: Start PostgreSQL service
      ansible.builtin.systemd:
        name: postgresql
        state: started

    - name: Wait for PostgreSQL to accept connections
      ansible.builtin.command: pg_isready -h localhost -p 5432
      register: pg_ready
      until: pg_ready.rc == 0
      retries: 15
      delay: 4
      changed_when: false

    - name: Create application database
      community.postgresql.postgresql_db:
        name: myapp
        state: present
      become_user: postgres
      register: db_create
      until: db_create is succeeded
      retries: 3
      delay: 5

    - name: Create application user
      community.postgresql.postgresql_user:
        db: myapp
        name: appuser
        password: "{{ db_password }}"
        priv: "ALL"
        state: present
      become_user: postgres
      register: user_create
      until: user_create is succeeded
      retries: 3
      delay: 5

    - name: Run schema migration
      ansible.builtin.command: /opt/myapp/bin/migrate up
      register: migration
      until: migration.rc == 0
      retries: 5
      delay: 10
      changed_when: "'applied' in migration.stdout"

    - name: Verify database is operational
      community.postgresql.postgresql_query:
        db: myapp
        login_user: appuser
        login_password: "{{ db_password }}"
        query: "SELECT 1 as health"
      register: db_health
      until: >
        db_health is succeeded and
        db_health.query_result[0].health == 1
      retries: 5
      delay: 3
```

Each step has appropriate retry parameters. The initial connection check has more retries with shorter delay because startup is the most variable. Database creation has fewer retries since failures there are less likely to be transient. The migration step gets more time because migrations can take a while.

## Summary

The `retries` and `delay` parameters are the tuning knobs for Ansible's `until` retry logic. Set them based on what you are waiting for: short delays for quick services, longer delays for cloud provisioning, and variable parameters for environment-specific tuning. Always calculate your total maximum wait time and make sure it is reasonable for your use case. And handle the exhausted-retries case explicitly, either with `ignore_errors`, `block/rescue`, or a follow-up validation task.
