# How to Automate IPv6 Firewall Rule Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Firewall, Automation, Python, Ip6tables, nftables, Ansible

Description: Automate IPv6 firewall rule deployment using Ansible and Python scripts, including rule generation from policy models and idempotent deployment with nftables.

## Introduction

Managing ip6tables or nftables rules manually on many servers is fragile. Automation with Ansible and YAML policy definitions for nftables enables consistent, auditable firewall state across your entire fleet.

## Step 1: nftables IPv6 Policy Definition

```yaml
# policies/ipv6_firewall.yml

firewall:
  name: ipv6_host_firewall
  tables:
    - name: filter
      family: ip6
      chains:
        - name: input
          type: filter
          hook: input
          priority: 0
          policy: drop
          rules:
            - comment: "Allow loopback"
              iifname: lo
              action: accept
            - comment: "Allow established connections"
              ct_state: [established, related]
              action: accept
            - comment: "Allow ICMPv6 (required for IPv6)"
              protocol: icmpv6
              action: accept
            - comment: "Allow SSH from management subnet"
              src: "2001:db8:100::/48"
              dport: 22
              protocol: tcp
              action: accept
            - comment: "Allow HTTPS"
              dport: 443
              protocol: tcp
              action: accept
```

## Step 2: Python Policy to nftables Converter

```python
# scripts/generate_nftables.py
import yaml

def generate_nftables_conf(policy_file: str) -> str:
    with open(policy_file) as f:
        policy = yaml.safe_load(f)

    lines = []
    for table in policy["firewall"]["tables"]:
        lines.append(f"destroy table {table['family']} {table['name']}")
        lines.append(f"table {table['family']} {table['name']} {{")

        for chain in table["chains"]:
            lines.append(f"  chain {chain['name']} {{")
            lines.append(f"    type {chain['type']} hook {chain['hook']} "
                        f"priority {chain['priority']}; policy {chain['policy']};")

            for rule in chain.get("rules", []):
                parts = []
                protocol = rule.get("protocol")
                if "iifname" in rule:
                    parts.append(f"iifname {rule['iifname']}")
                if "ct_state" in rule:
                    states = ",".join(rule["ct_state"])
                    parts.append(f"ct state {states}")
                if protocol and not ("dport" in rule and protocol in {"tcp", "udp"}):
                    parts.append(f"meta l4proto {protocol}")
                if "src" in rule:
                    parts.append(f"ip6 saddr {rule['src']}")
                if "dport" in rule:
                    if protocol not in {"tcp", "udp"}:
                        raise ValueError("dport requires protocol tcp or udp")
                    parts.append(f"{protocol} dport {rule['dport']}")
                parts.append(rule["action"])
                if "comment" in rule:
                    comment = rule["comment"].replace('"', '\\"')
                    parts.append(f'comment "{comment}"')
                lines.append(f"    {' '.join(parts)}")

            lines.append("  }")
        lines.append("}")

    return "\n".join(lines)

if __name__ == "__main__":
    conf = generate_nftables_conf("policies/ipv6_firewall.yml")
    print(conf)
    with open("/tmp/nftables_ipv6.conf", "w") as f:
        f.write(conf)
```

## Step 3: Ansible Playbook for Deployment

```yaml
# playbooks/deploy_ipv6_firewall.yml
---
- name: Deploy IPv6 Firewall Rules
  hosts: web_servers
  become: true

  tasks:
    - name: Generate nftables configuration
      command: python3 scripts/generate_nftables.py
      args:
        chdir: "{{ playbook_dir }}/.."
      delegate_to: localhost
      run_once: true

    - name: Copy nftables config
      copy:
        src: /tmp/nftables_ipv6.conf
        dest: /etc/nftables.d/ipv6.conf
        validate: "nft -c -f %s"  # Validate before installing

    - name: Apply nftables rules
      command: nft -f /etc/nftables.d/ipv6.conf

    - name: Verify IPv6 firewall rules are active
      command: nft list table ip6 filter
      register: nft_output

    - name: Check SSH rule is present
      assert:
        that:
          - "'22' in nft_output.stdout"
        fail_msg: "SSH rule not found in nftables output"

    - name: Save rules for persistence
      shell: nft list ruleset > /etc/nftables.conf
```

## Step 4: ip6tables Alternative

```bash
#!/bin/bash
# scripts/deploy_ip6tables.sh

# Flush existing IPv6 rules
ip6tables -F
ip6tables -X

# Default policies
ip6tables -P INPUT DROP
ip6tables -P FORWARD DROP
ip6tables -P OUTPUT ACCEPT

# Allow loopback
ip6tables -A INPUT -i lo -j ACCEPT

# Allow established
ip6tables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow ICMPv6 (essential for IPv6)
ip6tables -A INPUT -p ipv6-icmp -j ACCEPT

# Allow SSH from management subnet
ip6tables -A INPUT -s 2001:db8:100::/48 -p tcp --dport 22 -j ACCEPT

# Allow HTTPS
ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT

# Save
ip6tables-save > /etc/ip6tables.rules
echo "IPv6 firewall rules deployed"
```

## Step 5: Compliance Audit

```python
# scripts/audit_ipv6_firewall.py
import subprocess

def audit_nftables_ipv6() -> dict:
    """Check if required IPv6 firewall rules are present."""
    result = subprocess.run(
        ["nft", "list", "table", "ip6", "filter"],
        capture_output=True, text=True
    )

    required_rules = {
        "icmpv6_allowed": "ipv6-icmp" in result.stdout or "icmpv6" in result.stdout,
        "ssh_allowed": "22" in result.stdout,
        "established_allowed": "established" in result.stdout,
        "default_drop": "policy drop" in result.stdout,
    }

    return required_rules

audit = audit_nftables_ipv6()
for rule, present in audit.items():
    status = "PASS" if present else "FAIL"
    print(f"{rule}: {status}")
```

## Conclusion

IPv6 firewall automation with nftables and Ansible enables consistent, version-controlled security policies. Generate nftables configuration from YAML policy definitions, validate before applying with `nft -c -f`, and audit compliance post-deployment. ICMPv6 rules are mandatory - never block all ICMPv6. Monitor firewall health and rule changes with OneUptime to detect unauthorized modifications.
