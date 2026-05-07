# How to Test IPv6 Connectivity with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, IPv6, Testing, Connectivity, Automation, Network Diagnostics

Description: A guide to using Ansible playbooks to systematically test IPv6 connectivity across managed hosts, including ping, DNS, HTTP, and traceroute checks.

Ansible can automate IPv6 connectivity testing across large server fleets, providing consistent, repeatable network diagnostics that would take hours to run manually.

## Test 1: ICMP Ping6 Connectivity

```yaml
# test-ping6.yml - Test IPv6 reachability to specified targets

---
- name: Test IPv6 ICMP connectivity
  hosts: all
  gather_facts: false

  vars:
    ping_targets:
      - address: "2001:4860:4860::8888"
        name: "Google Public DNS"
      - address: "2606:4700:4700::1111"
        name: "Cloudflare DNS"
      - address: "::1"
        name: "Loopback"

  tasks:
    - name: Ping each IPv6 target
      ansible.builtin.command:
        cmd: "ping -6 -c 3 -W 5 {{ item.address }}"
      register: ping_results
      loop: "{{ ping_targets }}"
      changed_when: false
      failed_when: false

    - name: Report ping results
      ansible.builtin.debug:
        msg: >
          {{ item.item.name }} ({{ item.item.address }}):
          {{ 'REACHABLE' if item.rc == 0 else 'UNREACHABLE' }}
      loop: "{{ ping_results.results }}"
```

## Test 2: IPv6 DNS Resolution

```yaml
# test-dns6.yml - Test IPv6 DNS lookups
---
- name: Test IPv6 DNS resolution
  hosts: all
  gather_facts: false

  tasks:
    - name: Test AAAA record resolution
      ansible.builtin.command:
        cmd: "dig +short {{ item }} AAAA"
      register: dns_results
      loop:
        - "google.com"
        - "cloudflare.com"
        - "ipv6.google.com"
      changed_when: false

    - name: Assert AAAA records are returned
      ansible.builtin.assert:
        that:
          - item.stdout | length > 0
          - "':' in item.stdout"
        fail_msg: "No AAAA record for {{ item.item }}"
        success_msg: "AAAA record for {{ item.item }}: {{ item.stdout }}"
      loop: "{{ dns_results.results }}"
```

## Test 3: IPv6 HTTP/HTTPS Connectivity

```yaml
# test-http6.yml - Test HTTP connectivity over IPv6
---
- name: Test IPv6 HTTP/HTTPS connectivity
  hosts: all
  gather_facts: false

  tasks:
    - name: Test HTTP over IPv6
      ansible.builtin.uri:
        url: "{{ item }}"
        status_code: 200
        timeout: 10
      register: http_results
      loop:
        - "https://ipv6.google.com"
        - "http://[::1]/"    # Loopback HTTP (if web server is running)
      changed_when: false
      failed_when: false

    - name: Report HTTP IPv6 results
      ansible.builtin.debug:
        msg: "{{ item.item }}: {{ item.status | default('FAILED') }}"
      loop: "{{ http_results.results }}"
```

## Test 4: IPv6 Traceroute

```yaml
# test-traceroute6.yml - Trace IPv6 path to a target
---
- name: Trace IPv6 path to a target
  hosts: all
  gather_facts: false

  tasks:
    - name: Traceroute to IPv6 target
      ansible.builtin.command:
        cmd: "traceroute -6 -n -m 15 -q 1 2001:4860:4860::8888"
      register: traceroute_result
      changed_when: false
      failed_when: false
      timeout: 30

    - name: Display traceroute output
      ansible.builtin.debug:
        var: traceroute_result.stdout_lines
```

## Test 5: Full Connectivity Report

```yaml
# ipv6-connectivity-report.yml - Generate a full report
---
- name: Generate IPv6 connectivity report
  hosts: all
  gather_facts: true

  tasks:
    - name: Ping Google Public DNS over IPv6
      ansible.builtin.command:
        cmd: "ping -6 -c 3 -W 5 2001:4860:4860::8888"
      register: ping_google
      changed_when: false
      failed_when: false

    - name: Look up AAAA records for google.com
      ansible.builtin.command:
        cmd: "dig +short google.com AAAA"
      register: aaaa_lookup
      changed_when: false
      failed_when: false

    - name: Collect all IPv6 test results
      ansible.builtin.set_fact:
        connectivity_report:
          hostname: "{{ inventory_hostname }}"
          ipv6_addresses: "{{ ansible_all_ipv6_addresses | default([]) }}"
          ping_google: "{{ 'OK' if (ping_google.rc | default(1)) == 0 else 'FAIL' }}"
          dns_ok: "{{ 'OK' if (aaaa_lookup.stdout | default('') | length) > 0 else 'FAIL' }}"

    - name: Write report to local file
      ansible.builtin.copy:
        content: "{{ ansible_play_hosts_all | map('extract', hostvars, 'connectivity_report') | list | to_nice_json }}"
        dest: "/tmp/ipv6-connectivity-report.json"
      delegate_to: localhost
      run_once: true
```

## Run All Tests

```bash
# Run connectivity tests across all hosts
ansible-playbook test-ping6.yml test-dns6.yml test-http6.yml test-traceroute6.yml -i inventory.ini

# Generate a full report
ansible-playbook ipv6-connectivity-report.yml -i inventory.ini
cat /tmp/ipv6-connectivity-report.json
```

Ansible-based IPv6 connectivity testing provides a fast, fleet-wide view of network health that can be scheduled as a periodic audit job in AWX or integrated into post-deployment verification workflows.
