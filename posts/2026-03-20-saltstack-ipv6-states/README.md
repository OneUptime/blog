# How to Deploy IPv6 Configuration with SaltStack States

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SaltStack, IPv6, State, Pillars, Jinja2, Configuration Management

Description: A guide to deploying IPv6 configuration using SaltStack state files with Jinja2 templating, pillars for site-specific data, and execution modules for verification.

SaltStack's state system combined with Jinja2 templating and pillar data provides a powerful framework for deploying IPv6 configuration across heterogeneous environments. This guide covers advanced state patterns for production IPv6 deployments.

## Complete IPv6 State Setup

```yaml
# /srv/salt/top.sls

base:
  '*':
    - common
  'role:webserver':
    - match: grain
    - ipv6.sysctl
    - ipv6.firewall
  'role:router':
    - match: grain
    - ipv6.sysctl
    - ipv6.firewall
```

## Pillar Data for IPv6

```yaml
# /srv/pillar/top.sls

base:
  '*':
    - ipv6_common
  'host:webserver01':
    - match: grain
    - ipv6_webserver01
```

```yaml
# /srv/pillar/ipv6_common.sls
ipv6:
  enabled: true
  forwarding: false
  privacy:
    enabled: true
    use_tempaddr: 2    # prefer temporary addresses
  accept_ra: 1
  firewall:
    allow_ports: [22, 80, 443]
    allow_icmpv6: true
    default_policy: DROP
```

```yaml
# /srv/pillar/ipv6_webserver01.sls
ipv6:
  interfaces:
    eth0:
      address: "2001:db8::10/64"
      gateway: "2001:db8::1"
```

## Advanced sysctl State with Grains

```yaml
# /srv/salt/ipv6/sysctl.sls

{% set ipv6 = pillar.get('ipv6', {}) %}
{% set os_family = grains['os_family'] %}

{% if os_family == 'Debian' %}
ipv6_sysctl_dir:
  file.directory:
    - name: /etc/sysctl.d
    - makedirs: true
{% endif %}

ipv6_sysctl_config:
  file.managed:
    - name: /etc/sysctl.d/60-ipv6.conf
    - mode: '0644'
    - contents: |
        # IPv6 configuration deployed by SaltStack
        # Host: {{ grains['id'] }}
        # Environment: {{ grains.get('environment', 'production') }}

        net.ipv6.conf.all.disable_ipv6 = {{ 0 if ipv6.get('enabled', true) else 1 }}
        net.ipv6.conf.default.disable_ipv6 = {{ 0 if ipv6.get('enabled', true) else 1 }}
        net.ipv6.conf.all.forwarding = {{ 1 if ipv6.get('forwarding', false) else 0 }}
        net.ipv6.conf.default.forwarding = {{ 1 if ipv6.get('forwarding', false) else 0 }}
        net.ipv6.conf.all.accept_ra = {{ ipv6.get('accept_ra', 1) }}
        net.ipv6.conf.all.use_tempaddr = {{ ipv6.get('privacy', {}).get('use_tempaddr', 1) }}

ipv6_sysctl_reload:
  cmd.run:
    - name: sysctl --system
    - onchanges:
      - file: ipv6_sysctl_config
```

## ip6tables State with Jinja2 Loops

```yaml
# /srv/salt/ipv6/firewall.sls

{% set ipv6 = pillar.get('ipv6', {}) %}
{% set fw = ipv6.get('firewall', {}) %}

ipv6tables_loopback:
  cmd.run:
    - name: ip6tables -I INPUT 1 -i lo -j ACCEPT
    - unless: ip6tables -C INPUT -i lo -j ACCEPT

{% if fw.get('allow_icmpv6', true) %}
ipv6tables_icmpv6:
  cmd.run:
    - name: ip6tables -A INPUT -p ipv6-icmp -j ACCEPT
    - unless: ip6tables -C INPUT -p ipv6-icmp -j ACCEPT
{% endif %}

{% for port in fw.get('allow_ports', []) %}
ipv6tables_port_{{ port }}:
  cmd.run:
    - name: ip6tables -A INPUT -p tcp --dport {{ port }} -j ACCEPT
    - unless: ip6tables -C INPUT -p tcp --dport {{ port }} -j ACCEPT
{% endfor %}

ipv6tables_save:
  cmd.run:
    - name: ip6tables-save > /etc/ip6tables.rules
    - onchanges:
      - cmd: ipv6tables_loopback
{% if fw.get('allow_icmpv6', true) %}
      - cmd: ipv6tables_icmpv6
{% endif %}
{% for port in fw.get('allow_ports', []) %}
      - cmd: ipv6tables_port_{{ port }}
{% endfor %}
```

## Orchestration: Deploy IPv6 in Order

```yaml
# /srv/salt/orch/ipv6_rollout.sls

# Stage 1: Test environment
stage1_test:
  salt.state:
    - tgt: 'environment:test'
    - tgt_type: grain
    - sls:
      - ipv6.sysctl
      - ipv6.firewall
    - failhard: true

# Stage 2: Staging (only after test passes)
stage2_staging:
  salt.state:
    - tgt: 'environment:staging'
    - tgt_type: grain
    - sls:
      - ipv6.sysctl
      - ipv6.firewall
    - require:
      - salt: stage1_test

# Stage 3: Production (only after staging passes)
stage3_production:
  salt.state:
    - tgt: 'environment:production'
    - tgt_type: grain
    - sls:
      - ipv6.sysctl
      - ipv6.firewall
    - require:
      - salt: stage2_staging
```

```bash
# Run the orchestration
salt-run state.orchestrate orch.ipv6_rollout

# Monitor execution
salt-run jobs.list_jobs search_function='state.sls'
```

## Verification with Execution Modules

```bash
# Verify IPv6 sysctl on all minions
salt '*' sysctl.get net.ipv6.conf.all.disable_ipv6

# Check IPv6 addresses on all minions
salt '*' network.ip_addrs6

# Verify ip6tables rules
salt '*' cmd.run 'ip6tables -L INPUT -n | grep -c ACCEPT'

# Test IPv6 connectivity from all minions
salt '*' network.ping 2001:4860:4860::8888 return_boolean=True
```

SaltStack's combination of Jinja2 templating, grain-based targeting, and orchestration runners provides a complete framework for deploying IPv6 configuration safely across large, heterogeneous environments with staged rollout and validation.
