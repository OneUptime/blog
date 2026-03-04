# How to Use Ansible loop_control pause for Throttled Loops

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Loops, Rate Limiting, Rolling Updates

Description: Learn how to use the pause option in Ansible loop_control to add delays between loop iterations for rate-limited APIs and rolling deployments.

---

Sometimes you need to slow down your Ansible loops. Maybe you are hitting a rate-limited API. Maybe you are doing a rolling restart and need each service to stabilize before moving to the next. Maybe you are provisioning cloud resources and the provider throttles rapid requests. The `pause` option in `loop_control` adds a configurable delay between each loop iteration.

## Basic Pause Usage

The `pause` option takes a number of seconds to wait between iterations:

```yaml
# Restart services with a 10-second pause between each
- name: Rolling restart of application instances
  ansible.builtin.systemd:
    name: "{{ item }}"
    state: restarted
  loop:
    - myapp-instance-1
    - myapp-instance-2
    - myapp-instance-3
    - myapp-instance-4
  loop_control:
    pause: 10
```

Ansible restarts the first service, waits 10 seconds, restarts the second, waits 10 seconds, and so on. The pause happens AFTER each iteration except the last one.

## Why Pauses Matter

Without pauses, Ansible fires through loop iterations as fast as possible. For many tasks, that is exactly what you want. But there are specific scenarios where speed causes problems:

API rate limiting is the most common. Cloud providers like AWS, Azure, and GCP all enforce rate limits on their APIs. If your loop makes API calls faster than the limit allows, you get throttling errors or temporary bans.

Service stability is another concern. When doing rolling restarts, each service needs time to come back online and pass health checks before you restart the next one. Without a pause, you might take down all instances simultaneously.

Resource contention is the third scenario. If your loop triggers heavy operations (database migrations, large file transfers, CPU-intensive compilations), running them back to back can overwhelm the target system.

## Rolling Service Restarts

Here is a practical rolling restart pattern:

```yaml
# Rolling restart with health check validation between each service
- name: Rolling restart with stabilization pause
  hosts: app_servers
  serial: 1
  vars:
    app_services:
      - { name: "api-gateway", port: 8080, health_path: "/health" }
      - { name: "auth-service", port: 8081, health_path: "/status" }
      - { name: "data-service", port: 8082, health_path: "/ping" }
      - { name: "cache-warmer", port: 8083, health_path: "/ready" }

  tasks:
    - name: Restart services one at a time
      ansible.builtin.systemd:
        name: "{{ svc.name }}"
        state: restarted
      loop: "{{ app_services }}"
      loop_control:
        loop_var: svc
        label: "{{ svc.name }}"
        pause: 15

    - name: Verify all services are healthy after restart
      ansible.builtin.uri:
        url: "http://localhost:{{ svc.port }}{{ svc.health_path }}"
        status_code: 200
      loop: "{{ app_services }}"
      loop_control:
        loop_var: svc
        label: "{{ svc.name }}"
      register: health_results
      retries: 5
      delay: 3
      until: health_results.status == 200
```

The 15-second pause gives each service time to initialize before the next restart begins.

## Rate-Limited API Calls

When interacting with external APIs that enforce rate limits:

```yaml
# Create DNS records with pause to respect API rate limits
- name: Create DNS A records
  ansible.builtin.uri:
    url: "https://api.dns-provider.com/v1/zones/{{ zone_id }}/records"
    method: POST
    headers:
      Authorization: "Bearer {{ dns_api_token }}"
      Content-Type: "application/json"
    body_format: json
    body:
      type: A
      name: "{{ item.name }}"
      content: "{{ item.ip }}"
      ttl: 300
    status_code: 200
  loop:
    - { name: "web01", ip: "10.0.1.10" }
    - { name: "web02", ip: "10.0.1.11" }
    - { name: "web03", ip: "10.0.1.12" }
    - { name: "db01", ip: "10.0.2.10" }
    - { name: "db02", ip: "10.0.2.11" }
  loop_control:
    label: "{{ item.name }}.example.com -> {{ item.ip }}"
    pause: 2
```

A 2-second pause between DNS record creations keeps you well within most providers' rate limits.

## Cloud Resource Provisioning

Cloud APIs are particularly sensitive to rapid-fire requests:

```yaml
# Create multiple cloud instances with pause to avoid throttling
- name: Provision EC2 instances
  amazon.aws.ec2_instance:
    name: "{{ instance.name }}"
    instance_type: "{{ instance.type }}"
    image_id: "{{ base_ami }}"
    subnet_id: "{{ instance.subnet }}"
    security_group: "{{ instance.sg }}"
    key_name: "{{ ssh_key_name }}"
    state: running
    wait: yes
  loop:
    - { name: "web-01", type: "t3.medium", subnet: "subnet-abc123", sg: "sg-web" }
    - { name: "web-02", type: "t3.medium", subnet: "subnet-def456", sg: "sg-web" }
    - { name: "api-01", type: "t3.large", subnet: "subnet-abc123", sg: "sg-api" }
    - { name: "api-02", type: "t3.large", subnet: "subnet-def456", sg: "sg-api" }
    - { name: "worker-01", type: "t3.xlarge", subnet: "subnet-abc123", sg: "sg-worker" }
  loop_control:
    loop_var: instance
    label: "{{ instance.name }} ({{ instance.type }})"
    pause: 5
```

The 5-second pause prevents hitting AWS API rate limits when creating multiple instances.

## Database Migration Sequences

Running database migrations in sequence with stabilization time:

```yaml
# Run database migrations with pause for each to complete and settle
- name: Apply database migrations
  ansible.builtin.command: >
    /opt/myapp/bin/migrate
    --migration {{ item.file }}
    --database {{ item.database }}
  loop:
    - { file: "001_create_users.sql", database: "primary" }
    - { file: "002_add_indexes.sql", database: "primary" }
    - { file: "003_create_orders.sql", database: "primary" }
    - { file: "004_update_views.sql", database: "analytics" }
  loop_control:
    label: "{{ item.file }}"
    pause: 5
  changed_when: true
```

Each migration gets 5 seconds to settle before the next one starts, reducing the chance of lock contention.

## Combining Pause with Other loop_control Options

`pause` works alongside all other `loop_control` options:

```yaml
# Full loop_control with pause for controlled deployment
- name: Deploy microservices
  ansible.builtin.include_tasks: deploy-service.yml
  loop:
    - { name: "gateway", image: "gateway:2.1", replicas: 2 }
    - { name: "users", image: "users:1.5", replicas: 3 }
    - { name: "orders", image: "orders:3.0", replicas: 2 }
    - { name: "inventory", image: "inventory:1.2", replicas: 1 }
  loop_control:
    loop_var: service
    index_var: svc_idx
    label: "[{{ svc_idx + 1 }}/4] {{ service.name }}"
    pause: 30
    extended: true
```

The output shows a progress counter, and each service gets 30 seconds to stabilize before the next deployment starts.

## Dynamic Pause Duration

While `pause` accepts a static number, you can use a variable:

```yaml
# Adjust pause duration based on the environment
- name: Restart services with environment-appropriate pause
  ansible.builtin.systemd:
    name: "{{ item }}"
    state: restarted
  loop:
    - service-a
    - service-b
    - service-c
  loop_control:
    label: "{{ item }}"
    pause: "{{ 30 if environment == 'production' else 5 }}"
```

Production gets a longer pause for safety, while staging and development move faster.

## Pause vs. Throttle vs. Serial

Ansible offers several mechanisms for controlling execution speed. Understanding which to use:

`loop_control.pause` adds a delay between iterations of a single loop on a single host. Use it when you need per-item pacing.

`throttle` on a task limits how many hosts run that task in parallel. Use it for tasks that compete for shared resources (like a database):

```yaml
# Throttle limits concurrent hosts, pause limits iteration speed
- name: Run database migration
  ansible.builtin.command: /opt/migrate.sh
  throttle: 1
  changed_when: true
```

`serial` on a play limits how many hosts run the entire play at once. Use it for rolling updates across hosts:

```yaml
# serial controls how many hosts run the play simultaneously
- name: Rolling update
  hosts: web_servers
  serial: 2
  tasks:
    - name: Update application
      ansible.builtin.apt:
        name: myapp
        state: latest
```

You can combine these. For example, use `serial: 2` to update two hosts at a time, and within each host use `loop_control.pause: 10` to pace service restarts.

## Practical Example: Controlled Cluster Update

```yaml
# Update a cluster with controlled pacing at every level
- name: Controlled cluster update
  hosts: cluster_nodes
  serial: 1
  vars:
    update_services:
      - { name: "etcd", weight: "heavy", pause_time: 30 }
      - { name: "kube-apiserver", weight: "heavy", pause_time: 20 }
      - { name: "kube-scheduler", weight: "light", pause_time: 10 }
      - { name: "kube-controller-manager", weight: "light", pause_time: 10 }
      - { name: "kubelet", weight: "heavy", pause_time: 30 }

  tasks:
    - name: Drain node
      ansible.builtin.command: kubectl drain {{ inventory_hostname }} --ignore-daemonsets --delete-emptydir-data
      delegate_to: "{{ groups['control_plane'][0] }}"
      changed_when: true

    - name: Update and restart services sequentially
      ansible.builtin.systemd:
        name: "{{ svc.name }}"
        state: restarted
      loop: "{{ update_services }}"
      loop_control:
        loop_var: svc
        label: "{{ svc.name }} ({{ svc.weight }}, waiting {{ svc.pause_time }}s)"
        pause: "{{ svc.pause_time }}"

    - name: Uncordon node
      ansible.builtin.command: kubectl uncordon {{ inventory_hostname }}
      delegate_to: "{{ groups['control_plane'][0] }}"
      changed_when: true

    - name: Wait for node to become ready
      ansible.builtin.command: kubectl wait --for=condition=Ready node/{{ inventory_hostname }} --timeout=120s
      delegate_to: "{{ groups['control_plane'][0] }}"
      changed_when: false
```

This playbook updates one node at a time (`serial: 1`), restarts services sequentially with custom pause durations based on the service weight, and then verifies the node is ready before moving to the next.

## Summary

The `pause` option in `loop_control` is a simple but essential tool for any Ansible engineer working with rate-limited APIs, rolling deployments, or resource-sensitive operations. It adds a time delay between loop iterations, giving each operation time to complete and stabilize before the next one begins. Combined with `serial` for host-level pacing and `throttle` for concurrency control, it gives you complete control over the speed and safety of your automation.
