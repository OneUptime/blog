# How to Validate IPv6 Configuration with Ansible Assertions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, IPv6, Validation, Assertions, Testing, Compliance

Description: A guide to using Ansible's assert module to validate IPv6 configuration compliance on Linux hosts and network devices.

Ansible's `assert` module transforms configuration checks into auditable validation tasks. Using assertions for IPv6 configuration ensures every host meets your networking standards before services go live.

## Basic IPv6 Address Assertions

```yaml
# validate-ipv6-address.yml - Assert IPv6 address is correctly configured

---
- name: Gather IPv6 addresses on all interfaces
  ansible.builtin.command:
    cmd: ip -6 addr show scope global
  register: ipv6_addrs
  changed_when: false

- name: Assert at least one global IPv6 address exists
  ansible.builtin.assert:
    that:
      - "'inet6' in ipv6_addrs.stdout"
    fail_msg: "{{ inventory_hostname }} has no global IPv6 address"
    success_msg: "{{ inventory_hostname }} has a global IPv6 address"

- name: Assert the expected IPv6 address is present
  vars:
    # Expected IPv6 address for this host (from inventory or group_vars)
    expected_ipv6: "{{ hostvars[inventory_hostname]['ipv6_address'] | default('') }}"
  ansible.builtin.assert:
    that:
      - "expected_ipv6 in ipv6_addrs.stdout"
    fail_msg: "Expected IPv6 {{ expected_ipv6 }} not found on {{ inventory_hostname }}"
  when: expected_ipv6 != ''
```

## sysctl Settings Compliance Assertions

```yaml
# validate-ipv6-sysctl.yml - Assert sysctl settings are correctly configured
---
- name: Read each sysctl parameter
  vars:
    # Example values for a non-router Linux host
    required_sysctl:
      - { param: "net.ipv6.conf.all.forwarding", value: "0" }
      - { param: "net.ipv6.conf.all.accept_ra", value: "1" }
  ansible.builtin.command:
    cmd: "sysctl -n {{ item.param }}"
  register: sysctl_results
  loop: "{{ required_sysctl }}"
  changed_when: false

- name: Assert each sysctl parameter has the expected value
  ansible.builtin.assert:
    that:
      - item.stdout == item.item.value
    fail_msg: >
      sysctl {{ item.item.param }} = {{ item.stdout }},
      expected {{ item.item.value }} on {{ inventory_hostname }}
    success_msg: "sysctl {{ item.item.param }} is correctly set to {{ item.item.value }}"
  loop: "{{ sysctl_results.results }}"
```

## Service Listening Assertions

```yaml
# validate-ipv6-services.yml - Assert services listen on IPv6
---
- name: Check whether IPv6 port 80 is listening
  ansible.builtin.command:
    argv:
      - ss
      - -H
      - -6
      - -tln
      - "( sport = :80 )"
  register: port_80_listener
  changed_when: false

- name: Assert IPv6 port 80 is listening
  ansible.builtin.assert:
    that:
      - port_80_listener.stdout | length > 0
    fail_msg: "No service is listening on IPv6 port 80"

- name: Check whether IPv6 port 22 is listening
  ansible.builtin.command:
    argv:
      - ss
      - -H
      - -6
      - -tln
      - "( sport = :22 )"
  register: port_22_listener
  changed_when: false

- name: Assert IPv6 port 22 is listening
  ansible.builtin.assert:
    that:
      - port_22_listener.stdout | length > 0
    fail_msg: "No service is listening on IPv6 port 22"
```

## Connectivity Assertions

```yaml
# validate-ipv6-connectivity.yml - Assert IPv6 connectivity is working
---
- name: Test IPv6 connectivity to DNS resolver
  ansible.builtin.command:
    cmd: ping -6 -c 3 -W 5 2001:4860:4860::8888
  register: ping_result
  changed_when: false
  failed_when: false

- name: Assert IPv6 external connectivity
  ansible.builtin.assert:
    that:
      - ping_result.rc == 0
    fail_msg: "Cannot reach IPv6 internet from {{ inventory_hostname }}"
    success_msg: "IPv6 external connectivity verified on {{ inventory_hostname }}"

- name: Test AAAA DNS lookup over IPv6
  ansible.builtin.command:
    cmd: dig -6 @2001:4860:4860::8888 AAAA google.com +short
  register: dns_result
  changed_when: false
  failed_when: false

- name: Assert IPv6 DNS returns AAAA records
  ansible.builtin.assert:
    that:
      - dns_result.rc == 0
      - dns_result.stdout | length > 0
      - "':' in dns_result.stdout"
    fail_msg: "IPv6 DNS lookup failed or returned no AAAA records on {{ inventory_hostname }}"
```

## Full Compliance Playbook

```yaml
# full-ipv6-audit.yml - Run all IPv6 compliance checks
---
- name: Full IPv6 Configuration Audit
  hosts: all
  become: true

  tasks:
    - name: Run IPv6 address validation
      ansible.builtin.include_tasks: validate-ipv6-address.yml

    - name: Run sysctl compliance checks
      ansible.builtin.include_tasks: validate-ipv6-sysctl.yml

    - name: Run service listening checks
      ansible.builtin.include_tasks: validate-ipv6-services.yml

    - name: Run connectivity checks
      ansible.builtin.include_tasks: validate-ipv6-connectivity.yml
```

## Run the Audit

```bash
# Run the full audit
ansible-playbook full-ipv6-audit.yml -i inventory.ini

# Generate a report from the read-only audit
ansible-playbook full-ipv6-audit.yml -i inventory.ini \
  2>&1 | tee ipv6-audit-report.txt
```

Ansible assertions provide a simple, declarative way to enforce IPv6 configuration standards across your Linux hosts and generate compliance reports without modifying any system state.
