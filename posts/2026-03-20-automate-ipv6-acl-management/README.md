# How to Automate IPv6 ACL Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, ACL, Automation, Python, Ansible, Network Security, Firewall

Description: Automate IPv6 access control list (ACL) management across network devices using Python and Ansible, including ACL generation from policy templates and idempotent deployment.

## Introduction

Managing IPv6 ACLs manually across dozens of routers is error-prone. Automation using Ansible and Jinja2 templates ensures consistent ACL deployment, version-controlled policies, and the ability to audit what's deployed.

## Step 1: Define ACL Policy in YAML

```yaml
# policies/ipv6_acl_policy.yml

acl_name: IPV6_INGRESS_FILTER
direction: ingress
interface: GigabitEthernet0/0/0/0

rules:
  - seq: 10
    action: permit
    protocol: icmpv6
    src: any
    dst: any
    remark: "Allow ICMPv6 for NDP and Path MTU"

  - seq: 20
    action: permit
    protocol: tcp
    src: "2001:db8:100::/48"
    dst: "2001:db8:200::/48"
    dst_port: 443
    remark: "Allow HTTPS from trusted subnet"

  - seq: 30
    action: permit
    protocol: tcp
    src: "2001:db8:100::/48"
    dst: "2001:db8:200::/48"
    dst_port: 22
    remark: "Allow SSH from trusted subnet"

  - seq: 9999
    action: deny
    protocol: ipv6
    src: any
    dst: any
    remark: "Explicit deny all with logging"
    log: true
```

## Step 2: Ansible Playbook

```yaml
# playbooks/deploy_ipv6_acl.yml
---
- name: Deploy IPv6 ACL Configuration
  hosts: core_routers
  gather_facts: false

  vars:
    policy_file: "../policies/ipv6_acl_policy.yml"

  tasks:
    - name: Load ACL policy
      include_vars:
        file: "{{ policy_file }}"

    - name: Generate IOS-XR ACL configuration
      template:
        src: "../templates/iosxr_ipv6_acl.j2"
        dest: "/tmp/{{ inventory_hostname }}_acl.txt"
      delegate_to: localhost
      check_mode: no

    - name: Apply ACL on IOS-XR
      cisco.iosxr.iosxr_config:
        src: "/tmp/{{ inventory_hostname }}_acl.txt"
      when: ansible_network_os == "cisco.iosxr.iosxr"

    - name: Verify ACL applied
      cisco.iosxr.iosxr_command:
        commands:
          - "show access-lists ipv6 {{ acl_name }}"
      register: acl_output
      when: ansible_network_os == "cisco.iosxr.iosxr" and not ansible_check_mode

    - name: Fail if ACL not found
      fail:
        msg: "ACL {{ acl_name }} not found after deployment"
      when: ansible_network_os == "cisco.iosxr.iosxr" and not ansible_check_mode and acl_name not in acl_output.stdout[0]
```

## Step 3: Jinja2 Template for IOS-XR

```jinja2
{# templates/iosxr_ipv6_acl.j2 #}
ipv6 access-list {{ acl_name }}
{% for rule in rules %}
 {{ rule.seq }} {{ rule.action }} {{ rule.protocol }}
 {%- if rule.src is defined %} {{ rule.src }}{% endif %}
 {%- if rule.dst is defined %} {{ rule.dst }}{% endif %}
 {%- if rule.dst_port is defined %} eq {{ rule.dst_port }}{% endif %}
 {%- if rule.log is defined and rule.log %} log{% endif %}
{% endfor %}
!
interface {{ interface }}
 ipv6 access-group {{ acl_name }} {{ direction }}
!
```

## Step 4: Python Validation Before Deployment

```python
# scripts/validate_acl_policy.py
import yaml
import ipaddress
import sys

def validate_policy(policy_file: str) -> list[str]:
    with open(policy_file) as f:
        policy = yaml.safe_load(f)

    errors = []
    for rule in policy.get("rules", []):
        for field in ["src", "dst"]:
            val = rule.get(field)
            if val and val != "any":
                try:
                    ipaddress.IPv6Network(val)
                except ValueError:
                    errors.append(
                        f"Rule {rule['seq']}: invalid IPv6 prefix '{val}'"
                    )

    return errors

if __name__ == "__main__":
    errors = validate_policy("policies/ipv6_acl_policy.yml")
    if errors:
        print("Validation FAILED:")
        for e in errors:
            print(f"  {e}")
        sys.exit(1)
    print("Policy validation passed.")
```

## Step 5: Run and Verify

```bash
# Validate policy
python3 scripts/validate_acl_policy.py

# Check mode (dry run)
ansible-playbook playbooks/deploy_ipv6_acl.yml --check --diff

# Deploy
ansible-playbook playbooks/deploy_ipv6_acl.yml

# Verify on device
ssh admin@2001:db8::1 "show access-lists ipv6 IPV6_INGRESS_FILTER"
```

## Conclusion

IPv6 ACL automation with Ansible and Jinja2 enables version-controlled, auditable policy deployment. Validate IPv6 prefixes with Python before Ansible runs to catch errors early. Use `--check --diff` for dry runs. Monitor traffic against denied ACL entries with OneUptime to detect unexpected IPv6 blocking.
