# How to Use Ansible to Configure Container Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Docker, Networking, Containers, Infrastructure

Description: Create and manage Docker container networks with Ansible for service isolation, cross-host communication, and DNS-based service discovery.

---

Container networks control how containers communicate with each other and with external systems. By default, Docker creates a bridge network, but production deployments need custom networks for security isolation, service discovery, and cross-host communication. Ansible lets you define your network topology as code and apply it consistently.

## Creating Custom Bridge Networks

```yaml
# roles/container_networks/tasks/bridge.yml
# Create isolated bridge networks for different application tiers
- name: Create application networks
  community.docker.docker_network:
    name: "{{ item.name }}"
    driver: bridge
    internal: "{{ item.internal | default(false) }}"
    ipam_config:
      - subnet: "{{ item.subnet }}"
        gateway: "{{ item.gateway }}"
    driver_options:
      com.docker.network.bridge.enable_icc: "{{ item.icc | default('true') }}"
    labels:
      environment: "{{ deploy_environment }}"
      managed_by: ansible
    state: present
  loop: "{{ docker_networks }}"
  loop_control:
    label: "{{ item.name }}"
```

```yaml
# defaults/main.yml
docker_networks:
  - name: frontend
    subnet: "172.20.0.0/24"
    gateway: "172.20.0.1"
    internal: false
  - name: backend
    subnet: "172.21.0.0/24"
    gateway: "172.21.0.1"
    internal: true
  - name: database
    subnet: "172.22.0.0/24"
    gateway: "172.22.0.1"
    internal: true
    icc: "false"
```

## Connecting Containers to Networks

```yaml
# roles/container_networks/tasks/connect.yml
# Deploy containers attached to specific networks
- name: Deploy frontend proxy
  community.docker.docker_container:
    name: nginx-proxy
    image: nginx:latest
    networks:
      - name: frontend
        ipv4_address: "172.20.0.10"
        aliases:
          - proxy
      - name: backend
    ports:
      - "80:80"
      - "443:443"
    state: started

- name: Deploy API server
  community.docker.docker_container:
    name: api-server
    image: "{{ api_image }}"
    networks:
      - name: backend
        aliases:
          - api
      - name: database
    state: started

- name: Deploy database
  community.docker.docker_container:
    name: postgres
    image: postgres:16
    networks:
      - name: database
        aliases:
          - db
    state: started
```

## DNS-Based Service Discovery

Docker's embedded DNS allows containers on the same network to find each other by name:

```yaml
# roles/container_networks/tasks/dns.yml
# Deploy containers using DNS-based service discovery
- name: Create shared service network
  community.docker.docker_network:
    name: services
    driver: bridge

- name: Deploy services with DNS aliases
  community.docker.docker_container:
    name: "{{ item.name }}"
    image: "{{ item.image }}"
    networks:
      - name: services
        aliases: "{{ item.aliases }}"
    state: started
  loop:
    - name: user-service
      image: "myapp/user-service:latest"
      aliases: ["users", "user-api"]
    - name: order-service
      image: "myapp/order-service:latest"
      aliases: ["orders", "order-api"]
```

## Network Cleanup

```yaml
# roles/container_networks/tasks/cleanup.yml
# Remove unused Docker networks
- name: Get list of networks
  ansible.builtin.command: docker network ls --format '{{ "{{" }}.Name{{ "}}" }}'
  register: existing_networks
  changed_when: false

- name: Remove unmanaged networks
  community.docker.docker_network:
    name: "{{ item }}"
    state: absent
    force: true
  loop: "{{ existing_networks.stdout_lines }}"
  when:
    - item not in ['bridge', 'host', 'none']
    - item not in (docker_networks | map(attribute='name') | list)
  loop_control:
    label: "{{ item }}"
```

## Verification

```yaml
# roles/container_networks/tasks/verify.yml
# Verify network connectivity between containers
- name: Test DNS resolution between containers
  ansible.builtin.command:
    cmd: docker exec api-server nslookup db
  register: dns_test
  changed_when: false

- name: Assert DNS resolution works
  ansible.builtin.assert:
    that:
      - dns_test.rc == 0
    fail_msg: "DNS resolution failed between api-server and db"

- name: Test network connectivity
  ansible.builtin.command:
    cmd: docker exec api-server ping -c 1 db
  register: ping_test
  changed_when: false

- name: Assert connectivity works
  ansible.builtin.assert:
    that:
      - ping_test.rc == 0
```


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


## Conclusion

Docker networks managed by Ansible give you controlled, isolated communication channels between your containers. Use separate networks for different application tiers, enable internal-only networks for sensitive services, and leverage Docker's built-in DNS for service discovery. Ansible ensures your network topology is consistently applied across all hosts and can be rebuilt from scratch at any time.
