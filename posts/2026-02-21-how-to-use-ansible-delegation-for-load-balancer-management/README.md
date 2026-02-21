# How to Use Ansible Delegation for Load Balancer Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Load Balancer, Delegation, Deployment

Description: Learn how to use Ansible delegation to manage load balancers during rolling deployments for zero-downtime updates.

---

Rolling deployments with zero downtime require careful coordination between your application servers and your load balancer. You need to drain a server, wait for active connections to finish, deploy the update, verify it works, then re-enable traffic. Ansible's `delegate_to` makes this orchestration straightforward by letting you run load balancer commands from a play that targets your application servers.

## The Rolling Deployment Pattern

The core pattern is simple: for each server, remove it from the load balancer pool, update it, verify it, then add it back. Using `serial: 1` ensures you update one server at a time.

```yaml
# rolling-deploy.yml - Zero-downtime rolling deployment
---
- name: Rolling deployment with load balancer management
  hosts: webservers
  serial: 1
  order: sorted            # Process hosts in a predictable order
  vars:
    app_version: "2.1.0"
    drain_timeout: 30
  tasks:
    - name: Disable server in HAProxy
      ansible.builtin.shell: |
        echo "set server web_backend/{{ inventory_hostname }} state drain" | \
          socat stdio /var/run/haproxy/admin.sock
      delegate_to: "{{ groups['loadbalancers'][0] }}"

    - name: Wait for connections to drain
      ansible.builtin.shell: |
        # Poll until active sessions reach 0
        for i in $(seq 1 {{ drain_timeout }}); do
          SESSIONS=$(echo "show stat" | socat stdio /var/run/haproxy/admin.sock | \
            grep "web_backend,{{ inventory_hostname }}" | cut -d, -f5)
          if [ "$SESSIONS" = "0" ]; then
            echo "Drained"
            exit 0
          fi
          sleep 1
        done
        echo "Drain timeout reached, proceeding anyway"
      delegate_to: "{{ groups['loadbalancers'][0] }}"
      changed_when: false

    - name: Deploy application update
      ansible.builtin.apt:
        name: "myapp={{ app_version }}"
        state: present
      become: true

    - name: Restart application
      ansible.builtin.systemd:
        name: myapp
        state: restarted
      become: true

    - name: Wait for application health check
      ansible.builtin.uri:
        url: "http://{{ ansible_host }}:8080/health"
        status_code: 200
      register: health
      retries: 20
      delay: 3
      until: health.status == 200
      delegate_to: localhost

    - name: Re-enable server in HAProxy
      ansible.builtin.shell: |
        echo "set server web_backend/{{ inventory_hostname }} state ready" | \
          socat stdio /var/run/haproxy/admin.sock
      delegate_to: "{{ groups['loadbalancers'][0] }}"

    - name: Verify server is receiving traffic
      ansible.builtin.shell: |
        # Check that the server has active sessions within 30 seconds
        for i in $(seq 1 30); do
          STATUS=$(echo "show stat" | socat stdio /var/run/haproxy/admin.sock | \
            grep "web_backend,{{ inventory_hostname }}" | cut -d, -f18)
          if [ "$STATUS" = "UP" ]; then
            echo "Server is UP and receiving traffic"
            exit 0
          fi
          sleep 1
        done
        echo "WARNING: Server not marked as UP yet"
        exit 1
      delegate_to: "{{ groups['loadbalancers'][0] }}"
```

## Managing Multiple Load Balancers

In a high-availability setup, you have multiple load balancers. You need to update all of them for each server change.

```yaml
# multi-lb-deploy.yml - Managing multiple load balancers
---
- name: Rolling deployment with multiple load balancers
  hosts: webservers
  serial: 1
  tasks:
    - name: Disable server on ALL load balancers
      ansible.builtin.shell: |
        echo "set server web_backend/{{ inventory_hostname }} state drain" | \
          socat stdio /var/run/haproxy/admin.sock
      delegate_to: "{{ item }}"
      loop: "{{ groups['loadbalancers'] }}"

    - name: Wait for connections to drain on all LBs
      ansible.builtin.shell: |
        sleep 15
        SESSIONS=$(echo "show stat" | socat stdio /var/run/haproxy/admin.sock | \
          grep "web_backend,{{ inventory_hostname }}" | cut -d, -f5)
        echo "Active sessions on {{ item }}: $SESSIONS"
      delegate_to: "{{ item }}"
      loop: "{{ groups['loadbalancers'] }}"
      changed_when: false

    - name: Deploy update
      ansible.builtin.copy:
        src: "/releases/myapp-{{ version }}/"
        dest: /opt/myapp/
      become: true

    - name: Restart service
      ansible.builtin.systemd:
        name: myapp
        state: restarted
      become: true

    - name: Verify health
      ansible.builtin.uri:
        url: "http://{{ ansible_host }}:8080/health"
        status_code: 200
      register: health
      retries: 20
      delay: 3
      until: health.status == 200
      delegate_to: localhost

    - name: Re-enable server on ALL load balancers
      ansible.builtin.shell: |
        echo "set server web_backend/{{ inventory_hostname }} state ready" | \
          socat stdio /var/run/haproxy/admin.sock
      delegate_to: "{{ item }}"
      loop: "{{ groups['loadbalancers'] }}"
```

## NGINX Load Balancer Management

If you use NGINX as your load balancer, the approach differs because NGINX does not have a runtime API by default. You need to update the configuration and reload.

```yaml
# nginx-lb-deploy.yml - Rolling deployment with NGINX load balancer
---
- name: Deploy with NGINX load balancer
  hosts: webservers
  serial: 1
  tasks:
    - name: Mark server as down in NGINX upstream config
      ansible.builtin.lineinfile:
        path: /etc/nginx/conf.d/upstream.conf
        regexp: "server {{ ansible_host }}:8080"
        line: "    server {{ ansible_host }}:8080 down;  # Marked down for deployment"
      delegate_to: "{{ item }}"
      loop: "{{ groups['loadbalancers'] }}"
      become: true

    - name: Reload NGINX to apply changes
      ansible.builtin.systemd:
        name: nginx
        state: reloaded
      delegate_to: "{{ item }}"
      loop: "{{ groups['loadbalancers'] }}"
      become: true

    - name: Wait for active connections to finish
      ansible.builtin.pause:
        seconds: 15

    - name: Deploy application update
      ansible.builtin.copy:
        src: /releases/latest/
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
      retries: 20
      delay: 3
      until: health.status == 200
      delegate_to: localhost

    - name: Re-enable server in NGINX upstream config
      ansible.builtin.lineinfile:
        path: /etc/nginx/conf.d/upstream.conf
        regexp: "server {{ ansible_host }}:8080"
        line: "    server {{ ansible_host }}:8080;  # Active"
      delegate_to: "{{ item }}"
      loop: "{{ groups['loadbalancers'] }}"
      become: true

    - name: Reload NGINX
      ansible.builtin.systemd:
        name: nginx
        state: reloaded
      delegate_to: "{{ item }}"
      loop: "{{ groups['loadbalancers'] }}"
      become: true
```

## AWS ALB/ELB Management

For AWS load balancers, you use the AWS modules delegated to localhost (since they call the AWS API):

```yaml
# aws-alb-deploy.yml - Rolling deployment with AWS ALB
---
- name: Deploy with AWS ALB management
  hosts: webservers
  serial: 1
  vars:
    target_group_arn: "arn:aws:elasticloadbalancing:us-east-1:123456789:targetgroup/web-tg/abcdef"
    region: us-east-1
  tasks:
    - name: Deregister instance from ALB target group
      community.aws.elb_target:
        target_group_arn: "{{ target_group_arn }}"
        target_id: "{{ ec2_instance_id }}"
        state: absent
        region: "{{ region }}"
        deregister_unused: true
      delegate_to: localhost

    - name: Wait for deregistration and connection draining
      community.aws.elb_target_info:
        target_group_arn: "{{ target_group_arn }}"
        region: "{{ region }}"
      register: tg_health
      delegate_to: localhost
      until: >
        tg_health.targets | selectattr('target.id', 'equalto', ec2_instance_id) | list | length == 0
      retries: 30
      delay: 10

    - name: Deploy application
      ansible.builtin.apt:
        name: "myapp={{ version }}"
        state: present
      become: true

    - name: Restart application
      ansible.builtin.systemd:
        name: myapp
        state: restarted
      become: true

    - name: Wait for local health check
      ansible.builtin.uri:
        url: "http://localhost:8080/health"
        status_code: 200
      retries: 20
      delay: 5
      register: health
      until: health.status == 200

    - name: Register instance back with ALB target group
      community.aws.elb_target:
        target_group_arn: "{{ target_group_arn }}"
        target_id: "{{ ec2_instance_id }}"
        target_port: 8080
        state: present
        region: "{{ region }}"
      delegate_to: localhost

    - name: Wait for ALB health check to pass
      community.aws.elb_target_info:
        target_group_arn: "{{ target_group_arn }}"
        region: "{{ region }}"
      register: tg_health
      delegate_to: localhost
      until: >
        (tg_health.targets | selectattr('target.id', 'equalto', ec2_instance_id) |
         selectattr('target_health.state', 'equalto', 'healthy') | list | length) > 0
      retries: 30
      delay: 10
```

## Rollback on Failure

Always include rollback logic in your load balancer management playbooks. If the deployment fails, re-enable the server with the old version rather than leaving it out of the pool.

```yaml
# lb-rollback.yml - Deployment with rollback protection
---
- name: Safe rolling deployment
  hosts: webservers
  serial: 1
  tasks:
    - name: Deploy with load balancer safety
      block:
        - name: Drain from load balancer
          ansible.builtin.shell: |
            echo "set server web/{{ inventory_hostname }} state drain" | \
              socat stdio /var/run/haproxy/admin.sock
          delegate_to: "{{ groups['loadbalancers'][0] }}"

        - name: Wait for drain
          ansible.builtin.pause:
            seconds: 15

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

        - name: Verify health
          ansible.builtin.uri:
            url: "http://{{ ansible_host }}:8080/health"
          register: health
          retries: 10
          delay: 5
          until: health.status == 200
          delegate_to: localhost

      rescue:
        - name: Deployment failed - re-enable server with old version
          ansible.builtin.debug:
            msg: "ROLLBACK: Re-enabling {{ inventory_hostname }} on load balancer with previous version"

      always:
        - name: Ensure server is enabled in load balancer
          ansible.builtin.shell: |
            echo "set server web/{{ inventory_hostname }} state ready" | \
              socat stdio /var/run/haproxy/admin.sock
          delegate_to: "{{ groups['loadbalancers'][0] }}"
```

## Summary

Load balancer management through Ansible delegation is the foundation of zero-downtime deployments. The pattern is consistent regardless of your load balancer technology: drain, wait, deploy, verify, re-enable. Use `delegate_to` with your load balancer host for HAProxy and NGINX, or `delegate_to: localhost` for cloud load balancers that use API calls. Always include rollback logic in the `rescue` block and re-enable the server in the `always` block to prevent accidentally leaving servers out of the pool.
