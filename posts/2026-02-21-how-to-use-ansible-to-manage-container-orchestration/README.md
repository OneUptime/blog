# How to Use Ansible to Manage Container Orchestration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Containers, Orchestration, Docker, Kubernetes

Description: Use Ansible to manage container orchestration across Docker Swarm and Kubernetes, handling deployments, scaling, and service management.

---

Container orchestration involves managing the lifecycle, networking, and scaling of containers across a cluster of machines. While tools like Kubernetes and Docker Swarm handle the runtime orchestration, Ansible excels at provisioning the orchestration platform itself, managing its configuration, and deploying applications to it.

I have used Ansible to bootstrap Docker Swarm clusters from scratch and to manage Kubernetes deployments when Helm alone was not flexible enough for our configuration needs.

## Managing Docker Swarm with Ansible

Docker Swarm is built into Docker and is simpler to set up than Kubernetes. Ansible can initialize a Swarm cluster and manage its services.

```yaml
# roles/swarm_manager/tasks/main.yml
# Initialize Docker Swarm on the manager node
- name: Check if Swarm is already initialized
  ansible.builtin.command: docker info --format '{{ "{{" }}.Swarm.LocalNodeState{{ "}}" }}'
  register: swarm_state
  changed_when: false

- name: Initialize Docker Swarm
  ansible.builtin.command:
    cmd: docker swarm init --advertise-addr {{ ansible_default_ipv4.address }}
  when: swarm_state.stdout != 'active'
  register: swarm_init

- name: Get worker join token
  ansible.builtin.command: docker swarm join-token worker -q
  register: worker_token
  changed_when: false
  when: swarm_state.stdout == 'active' or swarm_init.changed

- name: Store join token as fact
  ansible.builtin.set_fact:
    swarm_worker_token: "{{ worker_token.stdout }}"
    swarm_manager_ip: "{{ ansible_default_ipv4.address }}"
```

```yaml
# roles/swarm_worker/tasks/main.yml
# Join worker nodes to the Docker Swarm
- name: Check current swarm membership
  ansible.builtin.command: docker info --format '{{ "{{" }}.Swarm.LocalNodeState{{ "}}" }}'
  register: swarm_status
  changed_when: false

- name: Join the Swarm cluster
  ansible.builtin.command:
    cmd: >
      docker swarm join
      --token {{ hostvars[groups['swarm_managers'][0]]['swarm_worker_token'] }}
      {{ hostvars[groups['swarm_managers'][0]]['swarm_manager_ip'] }}:2377
  when: swarm_status.stdout != 'active'
```

## Deploying Swarm Services

```yaml
# roles/swarm_services/tasks/main.yml
# Deploy services to Docker Swarm
- name: Deploy application stack
  community.docker.docker_stack:
    name: "{{ stack_name }}"
    compose:
      - "{{ stack_compose_file }}"
    state: present
  when: deploy_method == 'stack'

- name: Deploy individual service
  community.docker.docker_swarm_service:
    name: "{{ item.name }}"
    image: "{{ item.image }}"
    replicas: "{{ item.replicas | default(1) }}"
    publish:
      - published_port: "{{ item.published_port }}"
        target_port: "{{ item.target_port }}"
    networks:
      - "{{ item.network | default('app-network') }}"
    env: "{{ item.env | default({}) }}"
    limits:
      cpus: "{{ item.cpu_limit | default(0.5) }}"
      memory: "{{ item.memory_limit | default('256M') }}"
    update_config:
      parallelism: 1
      delay: 10s
      failure_action: rollback
    restart_config:
      condition: on-failure
      delay: 5s
      max_attempts: 3
  loop: "{{ swarm_services }}"
  loop_control:
    label: "{{ item.name }}"
```

## Managing Kubernetes with Ansible

For Kubernetes, the kubernetes.core collection provides comprehensive support:

```yaml
# roles/k8s_deploy/tasks/main.yml
# Deploy application to Kubernetes
- name: Create application namespace
  kubernetes.core.k8s:
    kind: Namespace
    name: "{{ k8s_namespace }}"
    state: present

- name: Deploy application
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: "{{ app_name }}"
        namespace: "{{ k8s_namespace }}"
      spec:
        replicas: "{{ app_replicas }}"
        selector:
          matchLabels:
            app: "{{ app_name }}"
        template:
          metadata:
            labels:
              app: "{{ app_name }}"
          spec:
            containers:
              - name: "{{ app_name }}"
                image: "{{ app_image }}:{{ app_version }}"
                ports:
                  - containerPort: "{{ app_port }}"
                resources:
                  requests:
                    cpu: "{{ app_cpu_request }}"
                    memory: "{{ app_memory_request }}"
                  limits:
                    cpu: "{{ app_cpu_limit }}"
                    memory: "{{ app_memory_limit }}"
                readinessProbe:
                  httpGet:
                    path: /health
                    port: "{{ app_port }}"
                  initialDelaySeconds: 10
                  periodSeconds: 5

- name: Create Service
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: v1
      kind: Service
      metadata:
        name: "{{ app_name }}"
        namespace: "{{ k8s_namespace }}"
      spec:
        selector:
          app: "{{ app_name }}"
        ports:
          - port: 80
            targetPort: "{{ app_port }}"
        type: ClusterIP

- name: Wait for deployment to be ready
  kubernetes.core.k8s_info:
    kind: Deployment
    name: "{{ app_name }}"
    namespace: "{{ k8s_namespace }}"
  register: deploy_status
  until:
    - deploy_status.resources[0].status.readyReplicas is defined
    - deploy_status.resources[0].status.readyReplicas == app_replicas
  retries: 30
  delay: 10
```

## Scaling Operations

```yaml
# playbooks/scale_service.yml
# Scale a container service up or down
- name: Scale container service
  hosts: localhost
  tasks:
    - name: Scale Kubernetes deployment
      kubernetes.core.k8s_scale:
        kind: Deployment
        name: "{{ service_name }}"
        namespace: "{{ namespace }}"
        replicas: "{{ replica_count }}"
        wait: true
        wait_timeout: 120
      when: orchestrator == 'kubernetes'

    - name: Scale Swarm service
      community.docker.docker_swarm_service:
        name: "{{ service_name }}"
        replicas: "{{ replica_count }}"
      when: orchestrator == 'swarm'
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

Ansible serves as an excellent control plane for container orchestration platforms. It can bootstrap Docker Swarm clusters, deploy Kubernetes resources, manage scaling, and handle the full application deployment lifecycle. The advantage of using Ansible is that your container orchestration configuration lives alongside your infrastructure code, reviewed and versioned together, giving you a complete picture of your system in one place.
