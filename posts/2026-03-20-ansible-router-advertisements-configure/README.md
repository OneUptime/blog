# How to Configure Router Advertisements with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, IPv6, Router Advertisement, Radvd, SLAAC, Networking

Description: A guide to deploying and configuring the Router Advertisement Daemon (radvd) on Linux using Ansible to enable SLAAC for IPv6 clients.

Router Advertisements (RAs) are ICMPv6 messages sent by routers to inform clients about IPv6 network prefixes, default gateways, and configuration methods (SLAAC vs DHCPv6). The `radvd` daemon provides this service on Linux. This guide covers deploying it with Ansible.

## Role Structure

```text
radvd-role/
├── tasks/main.yml
├── templates/radvd.conf.j2
├── handlers/main.yml
└── defaults/main.yml
```

## Default Variables

```yaml
# defaults/main.yml

---
radvd_interfaces:
  - name: "eth0"
    prefix: "2001:db8:1::/64"
    # AdvSendAdvert: send periodic RAs
    adv_send_advert: true
    # MaxRtrAdvInterval: max seconds between RAs (default 600)
    max_rtr_adv_interval: 30
    # AdvManagedFlag: advertise that addresses are available via DHCPv6
    adv_managed_flag: false
    # AdvOtherConfigFlag: advertise that other configuration is available via DHCPv6
    adv_other_config_flag: false
    # Router lifetime in seconds (0 = not a default router)
    adv_default_lifetime: 1800
    rdnss_servers:
      - "2001:4860:4860::8888"
    dnssl_search:
      - "example.com"
```

## Main Tasks

```yaml
# tasks/main.yml
---
- name: Install radvd
  ansible.builtin.package:
    name: radvd
    state: present

- name: Write radvd configuration
  ansible.builtin.template:
    src: radvd.conf.j2
    dest: /etc/radvd.conf
    owner: root
    group: root
    mode: "0644"
    validate: "radvd --configtest -C %s"  # Validate before applying
  notify: Restart radvd

- name: Enable IPv6 forwarding (required when the host is acting as an IPv6 router)
  ansible.posix.sysctl:
    name: net.ipv6.conf.all.forwarding
    value: "1"
    sysctl_set: true
    state: present
    sysctl_file: /etc/sysctl.d/99-ipv6.conf
    reload: true

- name: Enable and start radvd
  ansible.builtin.systemd:
    name: radvd
    state: started
    enabled: true
```

## radvd Configuration Template

```text
# templates/radvd.conf.j2 - Router Advertisement daemon configuration
# Managed by Ansible - do not edit manually

{% for iface in radvd_interfaces %}
interface {{ iface.name }} {
    # Send periodic unsolicited Router Advertisements
    AdvSendAdvert {{ iface.adv_send_advert | ternary('on', 'off') }};

    # Maximum interval between RAs in seconds
    MaxRtrAdvInterval {{ iface.max_rtr_adv_interval }};

    # M flag: advertise that addresses are available via DHCPv6
    AdvManagedFlag {{ iface.adv_managed_flag | ternary('on', 'off') }};

    # O flag: advertise that other configuration is available via DHCPv6
    AdvOtherConfigFlag {{ iface.adv_other_config_flag | ternary('on', 'off') }};

    # How long this router is valid as default gateway (seconds)
    AdvDefaultLifetime {{ iface.adv_default_lifetime }};

    # Advertised prefix for SLAAC
    prefix {{ iface.prefix }} {
        # Clients may use this prefix with SLAAC
        AdvOnLink on;
        AdvAutonomous on;
        AdvRouterAddr off;
    };

{% if iface.rdnss_servers is defined %}
    # Recursive DNS Server addresses (RFC 6106)
    RDNSS {% for server in iface.rdnss_servers %}{{ server }}{% if not loop.last %} {% endif %}{% endfor %} {
        AdvRDNSSLifetime 3600;
    };
{% endif %}

{% if iface.dnssl_search is defined %}
    # DNS Search List (RFC 6106)
    DNSSL {% for domain in iface.dnssl_search %}{{ domain }}{% if not loop.last %} {% endif %}{% endfor %} {
        AdvDNSSLLifetime 3600;
    };
{% endif %}
};
{% endfor %}
```

## Handler

```yaml
# handlers/main.yml
---
- name: Restart radvd
  ansible.builtin.systemd:
    name: radvd
    state: restarted
```

## Apply and Verify

```bash
ansible-playbook site.yml -i inventory.ini

# Verify radvd is running and sending RAs
ansible router-01 -m command -a "systemctl status radvd" --become

# On a client: check for a received global IPv6 address
ip -6 addr show eth0 | grep "scope global"

# Capture RA packets on the interface
sudo tcpdump -i eth0 "icmp6 and ip6[40] == 134" -n
```

Using Ansible to manage radvd ensures Router Advertisements are consistently configured and prefix information is accurately propagated to all IPv6 clients on your network.
