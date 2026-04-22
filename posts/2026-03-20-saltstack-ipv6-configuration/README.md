# How to Configure IPv6 with SaltStack

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SaltStack, IPv6, Configuration Management, Salt States, Automation

Description: A guide to configuring IPv6 network settings using SaltStack states and modules, including sysctl, firewall management, and network interface configuration.

SaltStack's event-driven architecture and flexible state system make it well-suited for IPv6 configuration management at scale. Salt states are YAML-based and support Jinja2 templating for dynamic IPv6 configurations.

## Salt State File Structure

```text
/srv/
├── salt/
│   └── ipv6/
│       ├── init.sls         # Main state
│       ├── sysctl.sls       # Kernel parameters
│       ├── firewall.sls     # ip6tables rules
│       └── interfaces.sls   # Network interfaces
└── pillar/
    ├── top.sls              # Pillar target mapping
    └── ipv6.sls             # Pillar data (secrets/config)
```

## Pillar Data

```yaml
# /srv/pillar/top.sls

base:
  '*':
    - ipv6
```

```yaml
# /srv/pillar/ipv6.sls

ipv6:
  disable: false
  forwarding: false
  accept_ra: 1
  privacy:
    enabled: true
    use_tempaddr: 2
  static_addresses:
    eth0: "2001:db8::10/64"
  gateway: "2001:db8::1"
```

## Main IPv6 State

```yaml
# /srv/salt/ipv6/init.sls

include:
  - ipv6.sysctl
  - ipv6.firewall
  - ipv6.interfaces
```

## sysctl State

```yaml
# /srv/salt/ipv6/sysctl.sls

{% set ipv6 = pillar.get('ipv6', {}) %}

ipv6_sysctl_conf:
  file.managed:
    - name: /etc/sysctl.d/60-ipv6.conf
    - contents: |
        # Managed by SaltStack
        net.ipv6.conf.all.disable_ipv6 = {{ '1' if ipv6.get('disable', false) else '0' }}
        net.ipv6.conf.default.disable_ipv6 = {{ '1' if ipv6.get('disable', false) else '0' }}
        net.ipv6.conf.all.forwarding = {{ '1' if ipv6.get('forwarding', false) else '0' }}
        net.ipv6.conf.default.forwarding = {{ '1' if ipv6.get('forwarding', false) else '0' }}
        net.ipv6.conf.all.accept_ra = {{ ipv6.get('accept_ra', 1) }}
        net.ipv6.conf.all.use_tempaddr = {{ ipv6.get('privacy', {}).get('use_tempaddr', 1) }}
    - mode: '0644'
    - require_in:
      - cmd: reload_sysctl

reload_sysctl:
  cmd.run:
    - name: sysctl --system
    - onchanges:
      - file: ipv6_sysctl_conf
```

## Firewall State (ip6tables)

```yaml
# /srv/salt/ipv6/firewall.sls

ipv6tables_installed:
  pkg.installed:
    - name: iptables

# Allow loopback

ipv6_allow_loopback:
  cmd.run:
    - name: ip6tables -A INPUT -i lo -j ACCEPT
    - unless: ip6tables -C INPUT -i lo -j ACCEPT
    - require:
      - pkg: ipv6tables_installed

# Allow established
ipv6_allow_established:
  cmd.run:
    - name: ip6tables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
    - unless: ip6tables -C INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
    - require:
      - pkg: ipv6tables_installed

# Allow ICMPv6 (required for IPv6 operation)
ipv6_allow_icmpv6:
  cmd.run:
    - name: ip6tables -A INPUT -p ipv6-icmp -j ACCEPT
    - unless: ip6tables -C INPUT -p ipv6-icmp -j ACCEPT
    - require:
      - pkg: ipv6tables_installed

# Allow SSH
ipv6_allow_ssh:
  cmd.run:
    - name: ip6tables -A INPUT -p tcp --dport 22 -j ACCEPT
    - unless: ip6tables -C INPUT -p tcp --dport 22 -j ACCEPT
    - require:
      - pkg: ipv6tables_installed

# Save rules
save_ip6tables:
  cmd.run:
    - name: ip6tables-save > /etc/ip6tables.rules
    - require:
      - cmd: ipv6_allow_loopback
      - cmd: ipv6_allow_established
      - cmd: ipv6_allow_icmpv6
      - cmd: ipv6_allow_ssh
```

## Network Interface State

```yaml
# /srv/salt/ipv6/interfaces.sls

{% set ipv6 = pillar.get('ipv6', {}) %}

{% for iface, addr in ipv6.get('static_addresses', {}).items() %}
ipv6_address_{{ iface }}:
  cmd.run:
    - name: ip -6 addr add {{ addr }} dev {{ iface }}
    - unless: ip -6 addr show {{ iface }} | grep -q "{{ addr }}"

{% endfor %}

{% if ipv6.get('gateway') %}
ipv6_default_gateway:
  cmd.run:
    - name: ip -6 route add default via {{ ipv6.get('gateway') }}
    - unless: ip -6 route show default | grep -q "{{ ipv6.get('gateway') }}"
{% endif %}
```

## Applying Salt States

```bash
# Apply to all minions
salt '*' state.apply ipv6

# Apply to specific minion
salt 'webserver01' state.apply ipv6

# Test mode (show what would change)
salt '*' state.apply ipv6 test=True

# Apply with specific pillar override
salt 'webserver01' state.apply ipv6 pillar='{"ipv6": {"forwarding": true}}'

# Check IPv6 configuration
salt '*' cmd.run 'ip -6 addr show && sysctl net.ipv6.conf.all.disable_ipv6'
```

## Salt Grains for IPv6 Targeting

```bash
# Target only IPv6-enabled minions
salt -G 'ipv6:*' state.apply ipv6

# List minions with their IPv6 addresses
salt '*' grains.get ipv6

# Target by operating system for IPv6 config
salt -G 'os:Ubuntu' state.apply ipv6
```

SaltStack's event-driven remote execution and flexible state engine make it efficient for deploying IPv6 configuration changes across large fleets - states can be applied immediately to all matching minions or scheduled for maintenance windows.
