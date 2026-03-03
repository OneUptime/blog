# How to Monitor Talos Linux Nodes with Ansible

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Ansible, Monitoring, Kubernetes, Observability

Description: Learn how to build monitoring and health checking workflows for Talos Linux clusters using Ansible playbooks and talosctl commands.

---

Monitoring Talos Linux nodes requires a different approach than monitoring traditional Linux servers. Since there is no SSH access and no ability to install monitoring agents directly on the OS, you rely on the Talos API, Kubernetes metrics, and external monitoring systems. Ansible can orchestrate health checks, collect diagnostic information, and trigger alerts across your entire cluster. This guide covers how to build effective monitoring workflows for Talos using Ansible.

## Monitoring Challenges with Talos

Traditional monitoring tools like Nagios, Zabbix, or node_exporter installed directly on the host do not work with Talos because you cannot install packages or run arbitrary processes on the OS. Talos provides its own set of monitoring capabilities through the Talos API, and Kubernetes provides additional metrics through the kubelet and the metrics server.

Your monitoring strategy for Talos should combine Talos API health checks (via `talosctl`), Kubernetes node and pod monitoring, and infrastructure-level monitoring from your cloud provider or hardware management system.

## Basic Health Check Playbook

Start with a simple playbook that checks the health of all nodes:

```yaml
# playbooks/health-check.yml
---
- name: Check Talos cluster health
  hosts: all
  gather_facts: false
  connection: local

  tasks:
    - name: Check Talos API availability
      ansible.builtin.command:
        cmd: >
          talosctl version
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --short
      register: version_check
      ignore_errors: true
      timeout: 15

    - name: Set node API status
      ansible.builtin.set_fact:
        api_status: "{{ 'up' if version_check.rc == 0 else 'down' }}"

    - name: Check node services
      ansible.builtin.command:
        cmd: >
          talosctl services
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
      register: services_check
      ignore_errors: true
      when: api_status == "up"

    - name: Check Kubernetes node readiness
      ansible.builtin.command:
        cmd: >
          kubectl get node {{ inventory_hostname }}
          -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'
      register: k8s_ready
      ignore_errors: true

    - name: Set overall node status
      ansible.builtin.set_fact:
        node_status:
          hostname: "{{ inventory_hostname }}"
          ip: "{{ node_ip }}"
          talos_api: "{{ api_status }}"
          k8s_ready: "{{ k8s_ready.stdout | default('Unknown') }}"

    - name: Display node status
      ansible.builtin.debug:
        msg: "{{ node_status }}"

- name: Generate health summary
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Compile health report
      ansible.builtin.set_fact:
        health_report: >
          Cluster Health Report
          Total nodes: {{ groups['all'] | length }}
          API reachable: {{ groups['all'] | map('extract', hostvars, 'node_status') | selectattr('talos_api', 'equalto', 'up') | list | length }}
          K8s ready: {{ groups['all'] | map('extract', hostvars, 'node_status') | selectattr('k8s_ready', 'equalto', 'True') | list | length }}

    - name: Display health report
      ansible.builtin.debug:
        msg: "{{ health_report }}"
```

## Resource Monitoring Playbook

Collect resource utilization data from all nodes:

```yaml
# playbooks/resource-monitor.yml
---
- name: Collect resource metrics from Talos nodes
  hosts: all
  gather_facts: false
  connection: local

  tasks:
    - name: Get CPU and memory usage
      ansible.builtin.command:
        cmd: >
          talosctl stats
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
      register: stats_output
      ignore_errors: true

    - name: Get disk usage
      ansible.builtin.command:
        cmd: >
          talosctl get mounts
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
      register: disk_output
      ignore_errors: true

    - name: Get system load
      ansible.builtin.command:
        cmd: >
          talosctl read /proc/loadavg
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
      register: load_output
      ignore_errors: true

    - name: Get memory information
      ansible.builtin.command:
        cmd: >
          talosctl read /proc/meminfo
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
      register: meminfo_output
      ignore_errors: true

    - name: Display resource summary for node
      ansible.builtin.debug:
        msg: |
          Node: {{ inventory_hostname }} ({{ node_ip }})
          Load: {{ load_output.stdout | default('unavailable') }}
          Stats: {{ stats_output.stdout_lines[:5] | default(['unavailable']) | join('\n') }}
```

## Service Health Monitoring

Check the status of critical Talos services:

```yaml
# playbooks/service-monitor.yml
---
- name: Monitor Talos services
  hosts: all
  gather_facts: false
  connection: local

  vars:
    critical_services:
      - apid
      - containerd
      - etcd
      - kubelet
      - machined
      - trustd

  tasks:
    - name: Get service list
      ansible.builtin.command:
        cmd: >
          talosctl services
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
      register: services_output
      ignore_errors: true

    - name: Parse service statuses
      ansible.builtin.set_fact:
        service_status: "{{ services_output.stdout | default('') }}"

    - name: Display services for node
      ansible.builtin.debug:
        msg: |
          {{ inventory_hostname }} services:
          {{ service_status }}

    - name: Check for unhealthy services
      ansible.builtin.command:
        cmd: >
          talosctl service {{ item }}
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
      register: service_check
      loop: "{{ critical_services }}"
      ignore_errors: true
      when:
        - "'controlplane' in group_names or item != 'etcd'"

    - name: Report unhealthy services
      ansible.builtin.debug:
        msg: "WARNING: {{ item.item }} may be unhealthy on {{ inventory_hostname }}"
      loop: "{{ service_check.results | default([]) }}"
      when:
        - item.rc is defined
        - item.rc != 0
```

## etcd Cluster Health Monitoring

For control plane nodes, monitor etcd health specifically:

```yaml
# playbooks/etcd-monitor.yml
---
- name: Monitor etcd cluster health
  hosts: controlplane
  gather_facts: false
  connection: local

  tasks:
    - name: Check etcd member status
      ansible.builtin.command:
        cmd: >
          talosctl etcd status
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
      register: etcd_status
      ignore_errors: true

    - name: Display etcd status
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} etcd: {{ etcd_status.stdout | default('unavailable') }}"

    - name: Check etcd member list
      ansible.builtin.command:
        cmd: >
          talosctl etcd members
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
      register: etcd_members
      ignore_errors: true
      run_once: true

    - name: Display etcd members
      ansible.builtin.debug:
        msg: "etcd members: {{ etcd_members.stdout }}"
      run_once: true

    - name: Check etcd alarms
      ansible.builtin.command:
        cmd: >
          talosctl etcd alarm list
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
      register: etcd_alarms
      ignore_errors: true
      run_once: true

    - name: Alert on etcd alarms
      ansible.builtin.debug:
        msg: "ALERT: etcd alarms detected: {{ etcd_alarms.stdout }}"
      when:
        - etcd_alarms.stdout is defined
        - etcd_alarms.stdout | length > 0
      run_once: true
```

## Diagnostic Collection Playbook

When troubleshooting, collect comprehensive diagnostics:

```yaml
# playbooks/collect-diagnostics.yml
---
- name: Collect diagnostics from Talos nodes
  hosts: all
  gather_facts: false
  connection: local

  vars:
    diag_dir: "{{ playbook_dir }}/../diagnostics/{{ ansible_date_time.date | default('latest') }}"

  tasks:
    - name: Create diagnostics directory
      ansible.builtin.file:
        path: "{{ diag_dir }}/{{ inventory_hostname }}"
        state: directory
        mode: '0700'

    - name: Collect system logs
      ansible.builtin.shell:
        cmd: >
          talosctl logs kubelet
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --tail 1000
          > {{ diag_dir }}/{{ inventory_hostname }}/kubelet.log 2>&1
      ignore_errors: true

    - name: Collect dmesg output
      ansible.builtin.shell:
        cmd: >
          talosctl dmesg
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          > {{ diag_dir }}/{{ inventory_hostname }}/dmesg.log 2>&1
      ignore_errors: true

    - name: Collect service statuses
      ansible.builtin.shell:
        cmd: >
          talosctl services
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          > {{ diag_dir }}/{{ inventory_hostname }}/services.txt 2>&1
      ignore_errors: true

    - name: Collect network information
      ansible.builtin.shell:
        cmd: >
          talosctl get addresses
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          > {{ diag_dir }}/{{ inventory_hostname }}/network.txt 2>&1
      ignore_errors: true

    - name: Report diagnostics location
      ansible.builtin.debug:
        msg: "Diagnostics saved to {{ diag_dir }}/{{ inventory_hostname }}/"
```

## Scheduled Monitoring with Cron

Set up periodic monitoring checks:

```bash
# Run health checks every 5 minutes
*/5 * * * * cd /path/to/talos-ansible && ansible-playbook -i inventory/production playbooks/health-check.yml >> /var/log/talos-health.log 2>&1

# Run resource monitoring every 15 minutes
*/15 * * * * cd /path/to/talos-ansible && ansible-playbook -i inventory/production playbooks/resource-monitor.yml >> /var/log/talos-resources.log 2>&1

# Run etcd monitoring every 10 minutes
*/10 * * * * cd /path/to/talos-ansible && ansible-playbook -i inventory/production playbooks/etcd-monitor.yml >> /var/log/talos-etcd.log 2>&1
```

## Running the Monitoring Playbooks

```bash
# Quick health check
ansible-playbook -i inventory/production playbooks/health-check.yml

# Resource monitoring
ansible-playbook -i inventory/production playbooks/resource-monitor.yml

# Service monitoring
ansible-playbook -i inventory/production playbooks/service-monitor.yml

# Collect diagnostics for troubleshooting
ansible-playbook -i inventory/production playbooks/collect-diagnostics.yml
```

Monitoring Talos Linux with Ansible provides a flexible, code-driven approach to cluster health checking. While it does not replace a proper monitoring stack like Prometheus and Grafana for continuous metrics collection, it fills the gap for on-demand health checks, diagnostic collection, and integration into existing Ansible-based operational workflows.
