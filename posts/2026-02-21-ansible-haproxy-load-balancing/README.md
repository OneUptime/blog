# How to Use Ansible with HAProxy for Load Balancing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, HAProxy, Load Balancing, High Availability

Description: Deploy and configure HAProxy load balancers with Ansible for HTTP and TCP load balancing with health checks and SSL termination.

---

HAProxy is a high-performance load balancer used in production by major companies. Ansible can install HAProxy, configure frontends and backends, manage SSL certificates, and update backend server lists dynamically.

## Installing HAProxy

```yaml
# roles/haproxy/tasks/main.yml
---
- name: Add HAProxy PPA
  ansible.builtin.apt_repository:
    repo: "ppa:vbernat/haproxy-{{ haproxy_major_version }}"
    state: present

- name: Install HAProxy
  ansible.builtin.apt:
    name: "haproxy={{ haproxy_version }}*"
    state: present
    update_cache: true

- name: Deploy HAProxy configuration
  ansible.builtin.template:
    src: haproxy.cfg.j2
    dest: /etc/haproxy/haproxy.cfg
    mode: '0644'
    validate: "haproxy -c -f %s"
  notify: reload haproxy

- name: Deploy SSL certificates
  ansible.builtin.copy:
    content: "{{ ssl_certificate_content }}"
    dest: "/etc/haproxy/certs/{{ domain }}.pem"
    mode: '0600'
  no_log: true
  notify: reload haproxy

- name: Ensure HAProxy is running
  ansible.builtin.service:
    name: haproxy
    state: started
    enabled: true
```

## HAProxy Configuration Template

```
# roles/haproxy/templates/haproxy.cfg.j2
global
    maxconn {{ haproxy_maxconn | default(50000) }}
    log /dev/log local0
    stats socket /var/run/haproxy.sock mode 660 level admin

defaults
    mode http
    timeout connect 5s
    timeout client 30s
    timeout server 30s
    option httplog
    option dontlognull

frontend http_front
    bind *:80
    redirect scheme https code 301 if !{ ssl_fc }

frontend https_front
    bind *:443 ssl crt /etc/haproxy/certs/
    default_backend app_servers

    # Health check endpoint
    acl is_health path /haproxy-health
    http-request return status 200 if is_health

backend app_servers
    balance {{ haproxy_balance | default('roundrobin') }}
    option httpchk GET /health
    http-check expect status 200

{% for host in groups['app_servers'] %}
    server {{ host }} {{ hostvars[host].ansible_host }}:{{ app_port }} check inter 5s fall 3 rise 2
{% endfor %}

listen stats
    bind *:{{ haproxy_stats_port | default(8404) }}
    stats enable
    stats uri /stats
    stats auth {{ haproxy_stats_user }}:{{ haproxy_stats_password }}
```

## Dynamic Backend Updates

```yaml
# tasks/haproxy-update-backends.yml
---
- name: Update HAProxy backend servers
  ansible.builtin.template:
    src: haproxy.cfg.j2
    dest: /etc/haproxy/haproxy.cfg
    validate: "haproxy -c -f %s"
  notify: reload haproxy

- name: Alternatively use runtime API for zero-downtime changes
  ansible.builtin.command:
    cmd: 'echo "set server app_servers/{{ item.name }} state {{ item.state }}" | socat stdio /var/run/haproxy.sock'
  loop: "{{ backend_changes }}"
  changed_when: true
```

## Key Takeaways

HAProxy with Ansible gives you automated, validated load balancer configuration. Use templates to generate HAProxy configs from your Ansible inventory. Validate configuration before applying changes. Use the runtime socket API for zero-downtime backend changes. This approach ensures your load balancer configuration stays in sync with your application servers automatically.

## Common Use Cases

Here are several practical scenarios where this module proves essential in real-world playbooks.

### Infrastructure Provisioning Workflow

```yaml
# Complete workflow incorporating this module
- name: Infrastructure provisioning
  hosts: all
  become: true
  gather_facts: true
  tasks:
    - name: Gather system information
      ansible.builtin.setup:
        gather_subset:
          - hardware
          - network

    - name: Display system summary
      ansible.builtin.debug:
        msg: >-
          Host {{ inventory_hostname }} has
          {{ ansible_memtotal_mb }}MB RAM,
          {{ ansible_processor_vcpus }} vCPUs,
          running {{ ansible_distribution }} {{ ansible_distribution_version }}

    - name: Install required packages
      ansible.builtin.package:
        name:
          - curl
          - wget
          - git
          - vim
          - htop
          - jq
        state: present

    - name: Configure system timezone
      ansible.builtin.timezone:
        name: "{{ system_timezone | default('UTC') }}"

    - name: Configure hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"

    - name: Update /etc/hosts
      ansible.builtin.lineinfile:
        path: /etc/hosts
        regexp: '^127\.0\.1\.1'
        line: "127.0.1.1 {{ inventory_hostname }}"

    - name: Configure SSH hardening
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^PasswordAuthentication', line: 'PasswordAuthentication no' }
      notify: restart sshd

    - name: Configure firewall rules
      community.general.ufw:
        rule: allow
        port: "{{ item }}"
        proto: tcp
      loop:
        - "22"
        - "80"
        - "443"

    - name: Enable firewall
      community.general.ufw:
        state: enabled
        policy: deny

  handlers:
    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted
```

### Integration with Monitoring

```yaml
# Using gathered facts to configure monitoring thresholds
- name: Configure monitoring based on system specs
  hosts: all
  become: true
  tasks:
    - name: Set monitoring thresholds based on hardware
      ansible.builtin.template:
        src: monitoring_config.yml.j2
        dest: /etc/monitoring/config.yml
      vars:
        memory_warning_threshold: "{{ (ansible_memtotal_mb * 0.8) | int }}"
        memory_critical_threshold: "{{ (ansible_memtotal_mb * 0.95) | int }}"
        cpu_warning_threshold: 80
        cpu_critical_threshold: 95

    - name: Register host with monitoring system
      ansible.builtin.uri:
        url: "https://monitoring.example.com/api/hosts"
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
          ip_address: "{{ ansible_default_ipv4.address }}"
          os: "{{ ansible_distribution }}"
          memory_mb: "{{ ansible_memtotal_mb }}"
          cpus: "{{ ansible_processor_vcpus }}"
        headers:
          Authorization: "Bearer {{ monitoring_api_token }}"
        status_code: [200, 201, 409]
```

### Error Handling Patterns

```yaml
# Robust error handling with this module
- name: Robust task execution
  hosts: all
  tasks:
    - name: Attempt primary operation
      ansible.builtin.command: /opt/app/primary-task.sh
      register: primary_result
      failed_when: false

    - name: Handle primary failure with fallback
      ansible.builtin.command: /opt/app/fallback-task.sh
      when: primary_result.rc != 0
      register: fallback_result

    - name: Report final status
      ansible.builtin.debug:
        msg: >-
          Task completed via {{ 'primary' if primary_result.rc == 0 else 'fallback' }} path.
          Return code: {{ primary_result.rc if primary_result.rc == 0 else fallback_result.rc }}

    - name: Fail if both paths failed
      ansible.builtin.fail:
        msg: "Both primary and fallback operations failed"
      when:
        - primary_result.rc != 0
        - fallback_result is defined
        - fallback_result.rc != 0
```

### Scheduling and Automation

```yaml
# Set up scheduled compliance scans using cron
- name: Configure automated scans
  hosts: all
  become: true
  tasks:
    - name: Create scan script
      ansible.builtin.copy:
        dest: /opt/scripts/compliance_scan.sh
        mode: '0755'
        content: |
          #!/bin/bash
          cd /opt/ansible
          ansible-playbook playbooks/validate.yml -i inventory/ > /var/log/compliance_scan.log 2>&1
          EXIT_CODE=$?
          if [ $EXIT_CODE -ne 0 ]; then
            curl -X POST https://hooks.example.com/alert \
              -H "Content-Type: application/json" \
              -d "{\"text\":\"Compliance scan failed on $(hostname)\"}"
          fi
          exit $EXIT_CODE

    - name: Schedule weekly compliance scan
      ansible.builtin.cron:
        name: "Weekly compliance scan"
        minute: "0"
        hour: "3"
        weekday: "1"
        job: "/opt/scripts/compliance_scan.sh"
        user: ansible
```

