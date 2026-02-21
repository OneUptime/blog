# How to Use Ansible Delegation with Serial Execution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Delegation, Serial, Rolling Updates

Description: Learn how to combine Ansible delegation with serial execution for controlled rolling updates across your infrastructure.

---

When you combine `delegate_to` with `serial` execution in Ansible, you get precise control over rolling updates. The `serial` keyword controls how many hosts are processed at a time, while `delegate_to` lets you coordinate with external systems (load balancers, monitoring, APIs) for each batch. Together, they enable zero-downtime deployments with proper orchestration.

## Understanding serial Execution

The `serial` keyword limits how many hosts are processed simultaneously. Without it, Ansible processes all hosts in parallel (up to the `forks` setting).

```yaml
# serial-basics.yml - Different serial strategies
---
# Process one host at a time
- name: One at a time deployment
  hosts: webservers
  serial: 1
  tasks:
    - name: Deploy
      ansible.builtin.debug:
        msg: "Deploying to {{ inventory_hostname }}"

# Process in batches of 5
- name: Batch deployment
  hosts: webservers
  serial: 5
  tasks:
    - name: Deploy
      ansible.builtin.debug:
        msg: "Deploying batch including {{ inventory_hostname }}"

# Process as a percentage of total hosts
- name: Percentage-based deployment
  hosts: webservers
  serial: "25%"
  tasks:
    - name: Deploy
      ansible.builtin.debug:
        msg: "Deploying to 25% batch including {{ inventory_hostname }}"

# Progressive batches (canary pattern)
- name: Canary deployment
  hosts: webservers
  serial:
    - 1        # First batch: 1 host (canary)
    - 5        # Second batch: 5 hosts
    - "50%"    # Remaining: 50% at a time
  tasks:
    - name: Deploy
      ansible.builtin.debug:
        msg: "Deploying to {{ inventory_hostname }}"
```

## Rolling Update with Delegation and Serial

Here is the classic rolling update pattern that combines serial processing with delegated tasks:

```yaml
# rolling-update.yml - Full rolling update with delegation
---
- name: Rolling update with zero downtime
  hosts: webservers
  serial: 1
  max_fail_percentage: 0    # Stop if ANY host fails
  tasks:
    # Phase 1: Pre-deployment checks
    - name: Verify host is healthy before starting
      ansible.builtin.uri:
        url: "http://{{ ansible_host }}:8080/health"
        status_code: 200
      delegate_to: localhost
      register: pre_check

    # Phase 2: Remove from load balancer
    - name: Drain server from load balancer
      ansible.builtin.shell: |
        echo "set server web_backend/{{ inventory_hostname }} state drain" | \
          socat stdio /var/run/haproxy/admin.sock
      delegate_to: "{{ groups['loadbalancers'][0] }}"

    - name: Wait for active connections to drain
      ansible.builtin.shell: |
        for i in $(seq 1 30); do
          SESSIONS=$(echo "show stat" | socat stdio /var/run/haproxy/admin.sock | \
            grep "web_backend,{{ inventory_hostname }}" | cut -d, -f5)
          [ "$SESSIONS" = "0" ] && exit 0
          sleep 1
        done
        exit 0  # Proceed anyway after 30 seconds
      delegate_to: "{{ groups['loadbalancers'][0] }}"
      changed_when: false

    # Phase 3: Put host in maintenance mode in monitoring
    - name: Set downtime in monitoring
      ansible.builtin.uri:
        url: "http://monitoring.internal:9090/api/v1/silence"
        method: POST
        body_format: json
        body:
          matchers:
            - name: instance
              value: "{{ inventory_hostname }}"
          startsAt: "{{ now(utc=true).isoformat() }}"
          endsAt: "{{ (now(utc=true) + timedelta(minutes=15)).isoformat() if timedelta is defined else now(utc=true).isoformat() }}"
          comment: "Rolling update in progress"
        status_code: [200, 201]
      delegate_to: localhost
      ignore_errors: true

    # Phase 4: Deploy
    - name: Stop application
      ansible.builtin.systemd:
        name: myapp
        state: stopped
      become: true

    - name: Deploy new version
      ansible.builtin.copy:
        src: "/releases/{{ version }}/"
        dest: /opt/myapp/
      become: true

    - name: Start application
      ansible.builtin.systemd:
        name: myapp
        state: started
      become: true

    # Phase 5: Verify
    - name: Wait for application to be healthy
      ansible.builtin.uri:
        url: "http://{{ ansible_host }}:8080/health"
        status_code: 200
      delegate_to: localhost
      register: health
      retries: 20
      delay: 5
      until: health.status == 200

    # Phase 6: Re-enable
    - name: Re-enable in load balancer
      ansible.builtin.shell: |
        echo "set server web_backend/{{ inventory_hostname }} state ready" | \
          socat stdio /var/run/haproxy/admin.sock
      delegate_to: "{{ groups['loadbalancers'][0] }}"

    - name: Verify server is receiving traffic
      ansible.builtin.pause:
        seconds: 10

    - name: Confirm server is healthy in load balancer
      ansible.builtin.shell: |
        echo "show stat" | socat stdio /var/run/haproxy/admin.sock | \
          grep "web_backend,{{ inventory_hostname }}" | cut -d, -f18
      register: lb_status
      delegate_to: "{{ groups['loadbalancers'][0] }}"
      changed_when: false
      failed_when: "'UP' not in lb_status.stdout"
```

## Canary Deployment Pattern

The progressive serial list enables canary deployments. Deploy to one host first, validate, then expand:

```yaml
# canary-deploy.yml - Canary deployment with validation between batches
---
- name: Canary deployment
  hosts: webservers
  serial:
    - 1        # Canary: single host
    - "25%"    # Second wave: quarter of the fleet
    - "100%"   # Final wave: rest of the fleet
  tasks:
    - name: Remove from load balancer
      ansible.builtin.shell: |
        echo "set server web/{{ inventory_hostname }} state drain" | \
          socat stdio /var/run/haproxy/admin.sock
      delegate_to: "{{ groups['loadbalancers'][0] }}"

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

    - name: Wait for health check
      ansible.builtin.uri:
        url: "http://{{ ansible_host }}:8080/health"
        status_code: 200
      register: health
      retries: 15
      delay: 5
      until: health.status == 200
      delegate_to: localhost

    - name: Re-enable in load balancer
      ansible.builtin.shell: |
        echo "set server web/{{ inventory_hostname }} state ready" | \
          socat stdio /var/run/haproxy/admin.sock
      delegate_to: "{{ groups['loadbalancers'][0] }}"

    - name: Run smoke tests against this batch
      ansible.builtin.shell: |
        /opt/tests/smoke-test.sh \
          --target {{ ansible_host }} \
          --version {{ version }}
      delegate_to: localhost
      register: smoke_test

    - name: Log batch completion
      ansible.builtin.uri:
        url: "{{ slack_webhook }}"
        method: POST
        body_format: json
        body:
          text: "Batch complete: {{ ansible_play_batch | join(', ') }} - version {{ version }}"
      delegate_to: localhost
      run_once: true
```

## Serial with Multiple Load Balancers

When you have multiple load balancers, each delegated task runs against all of them for every batch:

```yaml
# multi-lb-serial.yml - Serial deployment with multiple load balancers
---
- name: Deployment with multiple LBs
  hosts: webservers
  serial: 2
  tasks:
    - name: Drain from ALL load balancers
      ansible.builtin.shell: |
        echo "set server web/{{ inventory_hostname }} state drain" | \
          socat stdio /var/run/haproxy/admin.sock
      delegate_to: "{{ item }}"
      loop: "{{ groups['loadbalancers'] }}"

    - name: Wait for drain on all LBs
      ansible.builtin.pause:
        seconds: 15

    - name: Deploy and restart
      ansible.builtin.shell: |
        rsync -a /releases/{{ version }}/ /opt/myapp/
        systemctl restart myapp
      become: true

    - name: Verify health
      ansible.builtin.uri:
        url: "http://{{ ansible_host }}:8080/health"
        status_code: 200
      delegate_to: localhost
      retries: 20
      delay: 3
      until: health_result.status == 200
      register: health_result

    - name: Re-enable on ALL load balancers
      ansible.builtin.shell: |
        echo "set server web/{{ inventory_hostname }} state ready" | \
          socat stdio /var/run/haproxy/admin.sock
      delegate_to: "{{ item }}"
      loop: "{{ groups['loadbalancers'] }}"
```

## Handling Batch Failures

When a batch fails, you want to stop the deployment and not proceed to the next batch. The `max_fail_percentage` controls this:

```yaml
# batch-failure-handling.yml - Stop deployment on batch failure
---
- name: Deployment with strict failure handling
  hosts: webservers
  serial: 3
  max_fail_percentage: 0     # ANY failure stops the entire deployment
  tasks:
    - name: Deploy with rollback protection
      block:
        - name: Drain from LB
          ansible.builtin.shell: |
            echo "set server web/{{ inventory_hostname }} state drain" | \
              socat stdio /var/run/haproxy/admin.sock
          delegate_to: "{{ groups['loadbalancers'][0] }}"

        - name: Deploy
          ansible.builtin.copy:
            src: /releases/{{ version }}/
            dest: /opt/myapp/
          become: true

        - name: Restart
          ansible.builtin.systemd:
            name: myapp
            state: restarted
          become: true

        - name: Verify
          ansible.builtin.uri:
            url: "http://{{ ansible_host }}:8080/health"
            status_code: 200
          delegate_to: localhost
          retries: 10
          delay: 5
          register: health
          until: health.status == 200

      rescue:
        - name: Rollback this host
          ansible.builtin.shell: |
            cp -r /opt/myapp.previous/* /opt/myapp/
            systemctl restart myapp
          become: true

        - name: Signal failure
          ansible.builtin.fail:
            msg: "Deployment failed on {{ inventory_hostname }}, rolled back"

      always:
        - name: Re-enable in LB
          ansible.builtin.shell: |
            echo "set server web/{{ inventory_hostname }} state ready" | \
              socat stdio /var/run/haproxy/admin.sock
          delegate_to: "{{ groups['loadbalancers'][0] }}"
```

## Summary

Combining `serial` with `delegate_to` is the foundation of zero-downtime deployments in Ansible. Use `serial: 1` for the safest updates, progressive serial lists for canary deployments, and `max_fail_percentage` to stop deployment when things go wrong. Each batch gets full orchestration through delegation: drain from load balancer, put monitoring in maintenance, deploy, verify, re-enable. The pattern scales from simple single-LB setups to complex multi-tier, multi-LB environments.
