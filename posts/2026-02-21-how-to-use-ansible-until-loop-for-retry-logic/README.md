# How to Use Ansible until Loop for Retry Logic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Retry Logic, Loops, Error Handling

Description: Learn how to use Ansible until loops to implement retry logic for tasks that may fail temporarily due to network issues or service startup delays.

---

Not every task succeeds on the first try. Services take time to start. APIs experience transient failures. Network connections drop temporarily. Database replicas lag behind. In these situations, you need retry logic that keeps trying until a condition is met or a maximum number of attempts is exhausted. Ansible's `until` loop provides exactly this capability.

## Basic until Syntax

The `until` keyword works differently from the `loop` keyword. While `loop` iterates over a list, `until` repeats the same task until a condition becomes true:

```yaml
# Wait until a web service responds with HTTP 200
- name: Wait for application to start
  ansible.builtin.uri:
    url: http://localhost:8080/health
    status_code: 200
  register: result
  until: result.status == 200
  retries: 10
  delay: 5
```

This task calls the health endpoint, checks if the status is 200, and if not, waits 5 seconds and tries again. It will attempt this up to 10 times before giving up and failing the task.

## How until Works Internally

The flow of an `until` loop is:

1. Execute the task
2. Register the result (you must use `register` with `until`)
3. Evaluate the `until` condition against the registered result
4. If the condition is true, the task succeeds and moves on
5. If the condition is false, wait for `delay` seconds
6. Repeat from step 1
7. If `retries` is exhausted, the task fails

The default values if not specified are `retries: 3` and `delay: 5`.

## Waiting for Service Availability

The most common use case is waiting for a service to become available after starting or restarting it:

```yaml
# Start a service and wait for it to be ready
- name: Start PostgreSQL
  ansible.builtin.systemd:
    name: postgresql
    state: started

- name: Wait for PostgreSQL to accept connections
  ansible.builtin.command: pg_isready -h localhost -p 5432
  register: pg_ready
  until: pg_ready.rc == 0
  retries: 12
  delay: 5
  changed_when: false
```

After starting PostgreSQL, the playbook waits up to 60 seconds (12 retries times 5 seconds) for the database to start accepting connections.

## Waiting for API Responses

When deploying applications behind a load balancer, you might need to wait for the new version to propagate:

```yaml
# Wait for the new application version to be deployed and responding
- name: Check application version endpoint
  ansible.builtin.uri:
    url: "https://api.example.com/version"
    return_content: yes
  register: version_check
  until: >
    version_check.status == 200 and
    version_check.json.version == target_version
  retries: 20
  delay: 10
  vars:
    target_version: "2.5.0"
```

This checks both that the API is responding AND that it is running the correct version. It retries every 10 seconds for up to 200 seconds.

## Checking Command Output

You can use `until` with shell commands to wait for specific output:

```yaml
# Wait for a Kubernetes pod to be in Running state
- name: Wait for pod to be running
  ansible.builtin.command: >
    kubectl get pod myapp-pod
    -o jsonpath='{.status.phase}'
  register: pod_status
  until: pod_status.stdout == "Running"
  retries: 30
  delay: 10
  changed_when: false

# Wait for a file to appear on the filesystem
- name: Wait for lock file to be released
  ansible.builtin.stat:
    path: /var/lock/myapp.lock
  register: lock_file
  until: not lock_file.stat.exists
  retries: 60
  delay: 2
```

The first example waits up to 5 minutes for a Kubernetes pod to reach Running state. The second waits up to 2 minutes for a lock file to disappear.

## Combining until with failed_when

Sometimes you want to allow a task to "fail" during retries but still continue retrying:

```yaml
# Retry a task that might return non-zero exit codes during startup
- name: Wait for Elasticsearch cluster to be green
  ansible.builtin.uri:
    url: "http://localhost:9200/_cluster/health"
    return_content: yes
  register: es_health
  until: >
    es_health.status == 200 and
    es_health.json.status == "green"
  retries: 30
  delay: 10
  failed_when: false

- name: Verify Elasticsearch is healthy
  ansible.builtin.fail:
    msg: "Elasticsearch cluster did not reach green status within 5 minutes"
  when: >
    es_health.status != 200 or
    es_health.json.status != "green"
```

The first task retries without ever failing (due to `failed_when: false`). The second task then checks the final result and fails with a clear message if the cluster never reached green status.

## Waiting for Cloud Resources

Cloud resources often take time to provision:

```yaml
# Wait for an EC2 instance to pass status checks
- name: Launch EC2 instance
  amazon.aws.ec2_instance:
    name: "my-web-server"
    instance_type: t3.medium
    image_id: ami-0123456789abcdef0
    state: running
  register: ec2_result

- name: Wait for instance to pass status checks
  amazon.aws.ec2_instance_info:
    instance_ids:
      - "{{ ec2_result.instance_ids[0] }}"
  register: instance_info
  until: >
    instance_info.instances[0].state.name == 'running' and
    instance_info.instances[0].instance_status is defined
  retries: 40
  delay: 15
```

## Retrying Flaky Network Operations

Network operations are inherently unreliable. Use `until` to handle transient failures:

```yaml
# Download a file with retry logic for network issues
- name: Download application binary
  ansible.builtin.get_url:
    url: "https://releases.example.com/myapp-{{ version }}.tar.gz"
    dest: "/tmp/myapp-{{ version }}.tar.gz"
    checksum: "sha256:{{ expected_checksum }}"
    timeout: 30
  register: download
  until: download is succeeded
  retries: 5
  delay: 10
```

The `is succeeded` test checks if the task completed without errors. If the download fails due to a timeout or network blip, it retries up to 5 times.

## Using until with Complex Conditions

You can build sophisticated retry conditions:

```yaml
# Wait for a database migration to complete by checking a status table
- name: Check migration status
  community.postgresql.postgresql_query:
    db: myapp
    query: "SELECT status FROM migrations WHERE version = %s"
    positional_args:
      - "{{ migration_version }}"
  register: migration_result
  until: >
    migration_result.rowcount > 0 and
    migration_result.query_result[0].status == 'completed'
  retries: 60
  delay: 5
```

This queries a database every 5 seconds for up to 5 minutes, waiting for a migration record to show a "completed" status.

## Practical Example: Full Deployment with Retry Logic

Here is a complete deployment playbook that uses `until` at multiple stages:

```yaml
# Deploy application with retry logic at each critical stage
- name: Deploy application
  hosts: app_servers
  become: yes
  vars:
    app_version: "3.2.1"
    health_url: "http://localhost:8080/health"

  tasks:
    - name: Pull Docker image with retry
      community.docker.docker_image:
        name: "myregistry.com/myapp"
        tag: "{{ app_version }}"
        source: pull
      register: pull_result
      until: pull_result is succeeded
      retries: 3
      delay: 15

    - name: Stop existing container
      community.docker.docker_container:
        name: myapp
        state: stopped
      ignore_errors: yes

    - name: Start new container
      community.docker.docker_container:
        name: myapp
        image: "myregistry.com/myapp:{{ app_version }}"
        state: started
        ports:
          - "8080:8080"
        env:
          DATABASE_URL: "{{ db_url }}"

    - name: Wait for application health check
      ansible.builtin.uri:
        url: "{{ health_url }}"
        status_code: 200
        return_content: yes
      register: health
      until: health.status == 200
      retries: 20
      delay: 5

    - name: Verify application version
      ansible.builtin.uri:
        url: "http://localhost:8080/version"
        return_content: yes
      register: version_check
      until: >
        version_check.status == 200 and
        version_check.json.version == app_version
      retries: 5
      delay: 3

    - name: Register with load balancer
      ansible.builtin.uri:
        url: "https://lb.internal/api/backends"
        method: POST
        body_format: json
        body:
          host: "{{ inventory_hostname }}"
          port: 8080
        status_code: [200, 201]
      register: lb_register
      until: lb_register is succeeded
      retries: 3
      delay: 5
```

Every critical step has retry logic: pulling the image handles registry connectivity issues, the health check waits for the application to fully start, version verification confirms the right code is running, and load balancer registration handles API transience.

## Tips for Effective Retry Logic

Set realistic retry counts and delays. A total wait time of 5 minutes (60 retries at 5-second intervals, or 30 retries at 10-second intervals) is usually reasonable for services. For cloud provisioning, you might need 10-15 minutes.

Always use `changed_when: false` on check tasks that should not report changes even when they succeed.

Consider using `failed_when: false` on the retry task and adding a separate assertion task afterward. This gives you cleaner error messages.

Log what you are waiting for. Add a `debug` task before the retry to state what the playbook is waiting on, so operators watching the terminal know what is happening.

## Summary

The `until` loop in Ansible gives you retry logic for any task. Combined with `retries` to set the maximum attempts and `delay` to set the wait time between attempts, it handles transient failures, service startup delays, and eventually-consistent systems. Use it after any operation where the target might not be immediately ready, and your playbooks will be much more resilient in real-world environments.
