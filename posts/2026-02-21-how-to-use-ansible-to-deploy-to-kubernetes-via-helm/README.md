# How to Use Ansible to Deploy to Kubernetes via Helm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, Helm, DevOps, Deployment

Description: Deploy Helm charts to Kubernetes using Ansible for automated, repeatable chart installations with environment-specific value overrides.

---

Helm is the package manager for Kubernetes, and Ansible is the automation engine for infrastructure. Together, they give you versioned, repeatable Kubernetes deployments that can be customized per environment. Instead of running `helm install` commands manually, you define your chart deployments in Ansible playbooks and let the automation handle the rest.

I have used this combination to manage dozens of Helm releases across multiple clusters, with environment-specific values and automatic rollback on failure.

## Prerequisites

```bash
# Install the kubernetes.core collection which includes helm modules
ansible-galaxy collection install kubernetes.core
pip install kubernetes
```

Make sure your Ansible control node has `helm` and `kubectl` configured with cluster access.

## Basic Helm Chart Deployment

```yaml
# roles/helm_deploy/tasks/main.yml
# Deploy a Helm chart to Kubernetes
- name: Add Helm repository
  kubernetes.core.helm_repository:
    name: "{{ item.name }}"
    repo_url: "{{ item.url }}"
  loop: "{{ helm_repositories }}"

- name: Deploy Helm chart
  kubernetes.core.helm:
    name: "{{ release_name }}"
    chart_ref: "{{ chart_ref }}"
    chart_version: "{{ chart_version | default(omit) }}"
    release_namespace: "{{ namespace }}"
    create_namespace: true
    values: "{{ helm_values }}"
    wait: true
    wait_timeout: "{{ helm_timeout | default('5m0s') }}"
    atomic: true
  register: helm_result

- name: Display deployment result
  ansible.builtin.debug:
    msg: "Release {{ release_name }} deployed, revision {{ helm_result.status.revision }}"
```

## Environment-Specific Values

```yaml
# inventories/production/group_vars/k8s.yml
# Production Helm values
helm_repositories:
  - name: bitnami
    url: https://charts.bitnami.com/bitnami
  - name: ingress-nginx
    url: https://kubernetes.github.io/ingress-nginx

helm_releases:
  - name: nginx-ingress
    chart: ingress-nginx/ingress-nginx
    version: "4.8.3"
    namespace: ingress
    values:
      controller:
        replicaCount: 3
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
        service:
          type: LoadBalancer

  - name: redis
    chart: bitnami/redis
    version: "18.6.1"
    namespace: cache
    values:
      architecture: replication
      replica:
        replicaCount: 3
      auth:
        password: "{{ vault_redis_password }}"
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
```

## Multi-Release Deployment Playbook

```yaml
# playbooks/deploy_helm.yml
# Deploy all Helm releases defined in inventory
- name: Deploy Helm releases
  hosts: localhost
  connection: local
  tasks:
    - name: Add all Helm repositories
      kubernetes.core.helm_repository:
        name: "{{ item.name }}"
        repo_url: "{{ item.url }}"
      loop: "{{ helm_repositories }}"

    - name: Deploy each Helm release
      kubernetes.core.helm:
        name: "{{ item.name }}"
        chart_ref: "{{ item.chart }}"
        chart_version: "{{ item.version | default(omit) }}"
        release_namespace: "{{ item.namespace }}"
        create_namespace: true
        values: "{{ item.values | default({}) }}"
        wait: true
        atomic: true
      loop: "{{ helm_releases }}"
      loop_control:
        label: "{{ item.name }}"

    - name: Verify all releases are deployed
      kubernetes.core.helm_info:
        name: "{{ item.name }}"
        release_namespace: "{{ item.namespace }}"
      register: release_info
      loop: "{{ helm_releases }}"
      loop_control:
        label: "{{ item.name }}"

    - name: Assert all releases are deployed
      ansible.builtin.assert:
        that:
          - item.status is defined
          - item.status.status == 'deployed'
        fail_msg: "Release {{ item.item.name }} is not in deployed state"
      loop: "{{ release_info.results }}"
      loop_control:
        label: "{{ item.item.name }}"
```

## Using Values Files

```yaml
# roles/helm_deploy/tasks/with_values_file.yml
# Deploy Helm chart with a templated values file
- name: Template values file
  ansible.builtin.template:
    src: "{{ item.values_template }}"
    dest: "/tmp/helm-values-{{ item.name }}.yml"
    mode: '0600'
  loop: "{{ helm_releases }}"
  when: item.values_template is defined

- name: Deploy with values file
  kubernetes.core.helm:
    name: "{{ item.name }}"
    chart_ref: "{{ item.chart }}"
    release_namespace: "{{ item.namespace }}"
    create_namespace: true
    values_files:
      - "/tmp/helm-values-{{ item.name }}.yml"
    wait: true
    atomic: true
  loop: "{{ helm_releases }}"
  when: item.values_template is defined
```

## Helm Rollback

```yaml
# playbooks/rollback_helm.yml
# Rollback a Helm release to a previous revision
- name: Rollback Helm release
  hosts: localhost
  connection: local
  tasks:
    - name: Get release history
      kubernetes.core.helm_info:
        name: "{{ release_name }}"
        release_namespace: "{{ namespace }}"
      register: release_info

    - name: Display current revision
      ansible.builtin.debug:
        msg: "Current revision: {{ release_info.status.revision }}"

    - name: Rollback to previous revision
      ansible.builtin.command:
        cmd: "helm rollback {{ release_name }} {{ revision | default(0) }} -n {{ namespace }}"
      changed_when: true
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

Ansible and Helm together provide a powerful deployment workflow for Kubernetes. Ansible handles the orchestration, variable management, and multi-cluster coordination while Helm handles the Kubernetes resource templating and release management. Define your Helm releases in Ansible inventory variables, use environment-specific values, and let the atomic flag ensure that failed deployments automatically roll back.
