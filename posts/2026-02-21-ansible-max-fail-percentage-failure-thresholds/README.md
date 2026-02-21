# How to Use Ansible max_fail_percentage for Failure Thresholds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Error Handling, Deployment Safety, Rolling Updates

Description: Configure Ansible max_fail_percentage to automatically stop playbook execution when failures exceed a threshold, preventing widespread deployment issues.

---

The `max_fail_percentage` directive tells Ansible to abort a play when the percentage of failed hosts exceeds a threshold you define. This is a safety net for rolling updates and large-scale deployments. Instead of blindly pushing a bad deploy to your entire fleet, Ansible stops when too many hosts fail, limiting the blast radius.

## Basic Usage

```yaml
# safe-deploy.yml - Stop if more than 25% of hosts fail
---
- name: Deploy application
  hosts: webservers
  max_fail_percentage: 25

  tasks:
    - name: Deploy new version
      copy:
        src: "app-v{{ version }}.tar.gz"
        dest: /opt/app/

    - name: Restart application
      service:
        name: myapp
        state: restarted

    - name: Verify health
      uri:
        url: "http://{{ ansible_host }}:8080/health"
        status_code: 200
      retries: 5
      delay: 3
      register: health
      until: health.status == 200
```

With 20 hosts and `max_fail_percentage: 25`, the play aborts if more than 5 hosts fail (25% of 20 = 5).

## How It Works

Ansible evaluates the failure percentage after each task completes across all hosts. If the cumulative failure count exceeds the threshold, the play stops immediately. Hosts that have already succeeded keep their changes, but no further tasks run on any host.

```
20 hosts, max_fail_percentage: 25 (threshold: 5 hosts)

Task 1: Install packages
  17 ok, 3 failed (15% failed - below threshold, continue)

Task 2: Deploy config
  14 ok, 2 failed (total 5 failed = 25% - AT threshold, continue)

Task 3: Restart service
  1 more fails -> total 6 failed (30% > 25% - ABORT)
  "PLAY ABORTED: max_fail_percentage (25%) exceeded"
```

## max_fail_percentage with serial

The most common pattern is combining `max_fail_percentage` with `serial` for rolling updates:

```yaml
# rolling-with-threshold.yml
---
- name: Rolling deployment with failure threshold
  hosts: webservers
  serial: 5
  max_fail_percentage: 20

  tasks:
    - name: Pull new Docker image
      docker_image:
        name: "myapp:{{ version }}"
        source: pull

    - name: Stop container
      docker_container:
        name: myapp
        state: stopped

    - name: Start new container
      docker_container:
        name: myapp
        image: "myapp:{{ version }}"
        state: started
        ports:
          - "8080:8080"

    - name: Wait for health check
      uri:
        url: "http://localhost:8080/health"
        status_code: 200
      retries: 10
      delay: 5
      register: health
      until: health.status == 200
```

With `serial: 5` and `max_fail_percentage: 20`:

- Each batch has 5 hosts
- If more than 1 host in a batch fails (20% of 5 = 1), the entire play stops
- No further batches are processed

This gives you two levels of protection:
1. Per-batch: stop if too many hosts in the current batch fail
2. Total: stop before the bad deploy reaches more hosts

## Calculating the Threshold

The threshold formula is: `max_failed_hosts = total_hosts * max_fail_percentage / 100`

With `serial`, the calculation applies to the batch size:

| Hosts | serial | max_fail_percentage | Max failures allowed |
|-------|--------|--------------------|--------------------|
| 100   | 100    | 10                 | 10                 |
| 100   | 10     | 10                 | 1                  |
| 100   | 25     | 20                 | 5                  |
| 50    | 5      | 25                 | 1                  |
| 20    | 20     | 30                 | 6                  |

Note: Ansible rounds down. With 5 hosts and `max_fail_percentage: 30`, the threshold is 1 (5 * 0.30 = 1.5, rounded down to 1). A value of 0 means any failure stops the play.

## Setting max_fail_percentage to 0

Setting it to 0 means that literally any failure will stop the play. But there is a subtlety: Ansible considers 0 as "no failures allowed," but due to how the calculation works, it actually stops after the first failure is detected:

```yaml
# zero-tolerance.yml - No failures allowed
---
- name: Critical infrastructure update
  hosts: database_servers
  serial: 1
  max_fail_percentage: 0

  tasks:
    - name: Apply database patch
      command: /opt/db/apply-patch.sh
```

For absolute zero tolerance, use `any_errors_fatal: true` instead, which provides stricter behavior.

## Practical Example: Blue-Green Deployment

```yaml
# blue-green.yml - Blue-green deployment with failure threshold
---
- name: Deploy to blue group
  hosts: webservers_blue
  serial: "50%"
  max_fail_percentage: 10

  pre_tasks:
    - name: Remove blue from load balancer
      community.general.haproxy:
        state: disabled
        backend: webservers
        host: "{{ inventory_hostname }}"
      delegate_to: lb-01

  tasks:
    - name: Deploy new version
      include_role:
        name: deploy

    - name: Verify deployment
      uri:
        url: "http://{{ ansible_host }}:8080/health"
        status_code: 200
      retries: 10
      delay: 3
      register: health_check
      until: health_check.status == 200

  post_tasks:
    - name: Add blue back to load balancer
      community.general.haproxy:
        state: enabled
        backend: webservers
        host: "{{ inventory_hostname }}"
      delegate_to: lb-01
```

If more than 10% of the blue hosts fail, the play stops before updating the remaining blue hosts. The green group continues serving all traffic.

## max_fail_percentage vs any_errors_fatal

These two settings serve different purposes:

```yaml
# max_fail_percentage: stop when too many hosts fail
- name: Tolerant play
  hosts: all
  max_fail_percentage: 25
  # Allows up to 25% of hosts to fail before stopping

# any_errors_fatal: stop on the first failure anywhere
- name: Strict play
  hosts: all
  any_errors_fatal: true
  # Any single failure stops the entire play immediately
```

Use `max_fail_percentage` when some failures are expected (network glitches, transient errors) and you only want to stop when the failure count suggests a systemic problem.

Use `any_errors_fatal` when any failure is unacceptable (database migrations, configuration changes that must be atomic).

## Combining Both Settings

You can use both together. `any_errors_fatal` takes precedence:

```yaml
- name: Strict rolling update
  hosts: webservers
  serial: 5
  max_fail_percentage: 20
  any_errors_fatal: true  # This overrides max_fail_percentage

  tasks:
    - name: Deploy
      include_role:
        name: deploy
```

In this case, `any_errors_fatal` wins and any single failure stops the play. To get different behavior per task, set `any_errors_fatal` at the task level instead.

## Reporting on Failure Threshold

Use a rescue block to take action when the threshold is hit:

```yaml
- name: Deploy with reporting
  hosts: webservers
  serial: 10
  max_fail_percentage: 20

  tasks:
    - name: Deploy and verify
      block:
        - name: Deploy application
          include_role:
            name: deploy

        - name: Verify health
          uri:
            url: "http://{{ ansible_host }}:8080/health"
            status_code: 200

      rescue:
        - name: Log failure
          debug:
            msg: "Deployment failed on {{ inventory_hostname }}"

        - name: Rollback on this host
          include_role:
            name: rollback
```

The `max_fail_percentage` setting is your automated circuit breaker. Set it on every production deployment playbook. The exact threshold depends on your redundancy model: if you can handle losing 20% of capacity, set it to 15% (below your tolerance) to catch problems before they impact service availability.
