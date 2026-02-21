# How to Use Ansible to Configure Static IP Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Networking, Static IP, Linux

Description: Learn how to configure static IP addresses on Linux servers using Ansible with Netplan, NetworkManager, and ifupdown.

---

DHCP is fine for workstations, but servers need predictable IP addresses. If your web server gets a new IP after a reboot, your DNS records, firewall rules, and monitoring will all break. Configuring static IPs manually is slow and inconsistent. Ansible lets you define your network configuration as code and apply it reliably across your entire fleet.

The challenge is that Linux has several different networking subsystems: Netplan (Ubuntu 18.04+), NetworkManager (RHEL/CentOS/Fedora), and the older ifupdown (Debian). This post covers all three approaches.

## Netplan Configuration (Ubuntu)

Modern Ubuntu uses Netplan as a frontend for systemd-networkd or NetworkManager. Configuration lives in YAML files under `/etc/netplan/`:

```yaml
# configure static IP with Netplan on Ubuntu
---
- name: Configure static IP (Netplan)
  hosts: ubuntu_servers
  become: true
  vars:
    interface: eth0
    ip_address: 10.0.1.10
    prefix: 24
    gateway: 10.0.1.1
    dns_servers:
      - 8.8.8.8
      - 8.8.4.4
    dns_search:
      - example.com
  tasks:
    - name: Configure Netplan static IP
      ansible.builtin.copy:
        content: |
          network:
            version: 2
            ethernets:
              {{ interface }}:
                dhcp4: false
                addresses:
                  - {{ ip_address }}/{{ prefix }}
                routes:
                  - to: default
                    via: {{ gateway }}
                nameservers:
                  addresses: {{ dns_servers | to_json }}
                  search: {{ dns_search | to_json }}
        dest: /etc/netplan/01-static-config.yaml
        owner: root
        group: root
        mode: '0600'
      register: netplan_config

    - name: Apply Netplan configuration
      ansible.builtin.command:
        cmd: netplan apply
      when: netplan_config.changed
```

Using `mode: '0600'` is important because Netplan files can contain sensitive data like WiFi passwords, and Netplan warns if files are world-readable.

## Template-Based Netplan Configuration

For more flexibility, use a Jinja2 template:

```yaml
# use a template for complex Netplan configurations
---
- name: Configure network with Netplan template
  hosts: ubuntu_servers
  become: true
  vars:
    network_interfaces:
      - name: eth0
        addresses:
          - "10.0.1.10/24"
        gateway: "10.0.1.1"
        dns:
          - "8.8.8.8"
          - "8.8.4.4"
      - name: eth1
        addresses:
          - "192.168.1.10/24"
        dns: []
  tasks:
    - name: Deploy Netplan configuration
      ansible.builtin.template:
        src: templates/netplan.yaml.j2
        dest: /etc/netplan/01-ansible-config.yaml
        owner: root
        group: root
        mode: '0600'
      notify: Apply netplan

  handlers:
    - name: Apply netplan
      ansible.builtin.command:
        cmd: netplan apply
```

The template file:

```jinja2
# templates/netplan.yaml.j2 - managed by Ansible
network:
  version: 2
  ethernets:
{% for iface in network_interfaces %}
    {{ iface.name }}:
      dhcp4: false
      addresses:
{% for addr in iface.addresses %}
        - {{ addr }}
{% endfor %}
{% if iface.gateway is defined %}
      routes:
        - to: default
          via: {{ iface.gateway }}
{% endif %}
{% if iface.dns | length > 0 %}
      nameservers:
        addresses:
{% for dns in iface.dns %}
          - {{ dns }}
{% endfor %}
{% endif %}
{% endfor %}
```

## NetworkManager Configuration (RHEL/CentOS/Fedora)

On RHEL-based systems, use the `nmcli` module or configure connection files directly:

```yaml
# configure static IP with NetworkManager using nmcli
---
- name: Configure static IP (NetworkManager)
  hosts: rhel_servers
  become: true
  vars:
    connection_name: "static-eth0"
    interface: eth0
    ip_address: 10.0.1.10
    prefix: 24
    gateway: 10.0.1.1
    dns_servers:
      - 8.8.8.8
      - 8.8.4.4
  tasks:
    - name: Configure static IP with nmcli
      community.general.nmcli:
        conn_name: "{{ connection_name }}"
        ifname: "{{ interface }}"
        type: ethernet
        ip4: "{{ ip_address }}/{{ prefix }}"
        gw4: "{{ gateway }}"
        dns4: "{{ dns_servers }}"
        state: present
        autoconnect: true
        method4: manual
      notify: Restart NetworkManager connection

  handlers:
    - name: Restart NetworkManager connection
      ansible.builtin.command:
        cmd: "nmcli connection up {{ connection_name }}"
```

If you prefer to manage the connection file directly:

```yaml
# configure static IP via NetworkManager connection file
---
- name: Configure static IP via connection file
  hosts: rhel_servers
  become: true
  vars:
    interface: eth0
    ip_address: 10.0.1.10
    prefix: 24
    gateway: 10.0.1.1
  tasks:
    - name: Deploy NetworkManager connection file
      ansible.builtin.copy:
        content: |
          [connection]
          id=static-{{ interface }}
          type=ethernet
          interface-name={{ interface }}
          autoconnect=yes

          [ipv4]
          method=manual
          addresses={{ ip_address }}/{{ prefix }}
          gateway={{ gateway }}
          dns=8.8.8.8;8.8.4.4;

          [ipv6]
          method=ignore
        dest: "/etc/NetworkManager/system-connections/static-{{ interface }}.nmconnection"
        owner: root
        group: root
        mode: '0600'
      notify: Reload NetworkManager

  handlers:
    - name: Reload NetworkManager
      ansible.builtin.command:
        cmd: nmcli connection reload
```

## ifupdown Configuration (Debian)

Older Debian systems use `/etc/network/interfaces`:

```yaml
# configure static IP with ifupdown on Debian
---
- name: Configure static IP (ifupdown)
  hosts: debian_servers
  become: true
  vars:
    interface: eth0
    ip_address: 10.0.1.10
    netmask: 255.255.255.0
    gateway: 10.0.1.1
    dns_servers: "8.8.8.8 8.8.4.4"
  tasks:
    - name: Configure static IP in interfaces file
      ansible.builtin.blockinfile:
        path: /etc/network/interfaces
        block: |
          auto {{ interface }}
          iface {{ interface }} inet static
              address {{ ip_address }}
              netmask {{ netmask }}
              gateway {{ gateway }}
              dns-nameservers {{ dns_servers }}
        marker: "# {mark} ANSIBLE MANAGED {{ interface }}"
      notify: Restart networking

  handlers:
    - name: Restart networking
      ansible.builtin.systemd:
        name: networking
        state: restarted
```

## Cross-Distribution Playbook

Handle different distributions in a single playbook:

```yaml
# cross-distribution static IP configuration
---
- name: Configure static IP (any distro)
  hosts: all
  become: true
  vars:
    static_ip: "{{ hostvars[inventory_hostname].ip_address }}"
    prefix: 24
    gateway: "{{ hostvars[inventory_hostname].gateway }}"
    dns_servers:
      - 8.8.8.8
      - 8.8.4.4
  tasks:
    - name: Configure Netplan (Ubuntu 18.04+)
      ansible.builtin.copy:
        content: |
          network:
            version: 2
            ethernets:
              {{ ansible_default_ipv4.interface }}:
                dhcp4: false
                addresses:
                  - {{ static_ip }}/{{ prefix }}
                routes:
                  - to: default
                    via: {{ gateway }}
                nameservers:
                  addresses: {{ dns_servers | to_json }}
        dest: /etc/netplan/01-static.yaml
        mode: '0600'
      when: ansible_distribution == "Ubuntu" and ansible_distribution_major_version | int >= 18
      notify: Apply netplan

    - name: Configure NetworkManager (RHEL)
      community.general.nmcli:
        conn_name: "static-{{ ansible_default_ipv4.interface }}"
        ifname: "{{ ansible_default_ipv4.interface }}"
        type: ethernet
        ip4: "{{ static_ip }}/{{ prefix }}"
        gw4: "{{ gateway }}"
        dns4: "{{ dns_servers }}"
        state: present
        autoconnect: true
        method4: manual
      when: ansible_os_family == "RedHat"
      notify: Restart nmcli connection

  handlers:
    - name: Apply netplan
      ansible.builtin.command:
        cmd: netplan apply

    - name: Restart nmcli connection
      ansible.builtin.command:
        cmd: "nmcli connection up static-{{ ansible_default_ipv4.interface }}"
```

## Configuring Multiple Interfaces

Servers often have multiple network interfaces:

```yaml
# configure multiple network interfaces
---
- name: Multi-interface configuration
  hosts: all
  become: true
  vars:
    interfaces:
      - name: eth0
        ip: 10.0.1.10
        prefix: 24
        gateway: 10.0.1.1
        description: "Public network"
      - name: eth1
        ip: 192.168.1.10
        prefix: 24
        description: "Storage network"
      - name: eth2
        ip: 172.16.0.10
        prefix: 24
        description: "Management network"
  tasks:
    - name: Configure each interface
      ansible.builtin.copy:
        content: |
          network:
            version: 2
            ethernets:
          {% for iface in interfaces %}
              {{ iface.name }}:
                dhcp4: false
                addresses:
                  - {{ iface.ip }}/{{ iface.prefix }}
          {% if iface.gateway is defined %}
                routes:
                  - to: default
                    via: {{ iface.gateway }}
          {% endif %}
          {% endfor %}
                nameservers:
                  addresses:
                    - 8.8.8.8
                    - 8.8.4.4
        dest: /etc/netplan/01-static.yaml
        mode: '0600'
      notify: Apply netplan

  handlers:
    - name: Apply netplan
      ansible.builtin.command:
        cmd: netplan apply
```

## VLAN Configuration

Configure VLAN interfaces with static IPs:

```yaml
# configure VLAN interfaces with static IPs
---
- name: VLAN configuration
  hosts: all
  become: true
  tasks:
    - name: Configure VLANs with Netplan
      ansible.builtin.copy:
        content: |
          network:
            version: 2
            ethernets:
              eth0:
                dhcp4: false
            vlans:
              vlan100:
                id: 100
                link: eth0
                addresses:
                  - 10.100.0.10/24
                routes:
                  - to: 10.100.0.0/24
                    via: 10.100.0.1
              vlan200:
                id: 200
                link: eth0
                addresses:
                  - 10.200.0.10/24
        dest: /etc/netplan/02-vlans.yaml
        mode: '0600'
      notify: Apply netplan

  handlers:
    - name: Apply netplan
      ansible.builtin.command:
        cmd: netplan apply
```

## Safe Network Reconfiguration

Changing network settings remotely is risky. If something goes wrong, you lose connectivity. Here is a safer approach:

```yaml
# safely change network configuration with automatic rollback
---
- name: Safe network reconfiguration
  hosts: all
  become: true
  vars:
    new_ip: 10.0.1.20
    old_ip: "{{ ansible_default_ipv4.address }}"
  tasks:
    - name: Deploy new configuration
      ansible.builtin.copy:
        content: |
          network:
            version: 2
            ethernets:
              {{ ansible_default_ipv4.interface }}:
                dhcp4: false
                addresses:
                  - {{ new_ip }}/24
                routes:
                  - to: default
                    via: 10.0.1.1
                nameservers:
                  addresses: [8.8.8.8, 8.8.4.4]
        dest: /etc/netplan/01-static.yaml
        mode: '0600'

    # Use netplan try which auto-reverts after 120 seconds if not confirmed
    - name: Apply with automatic rollback
      ansible.builtin.command:
        cmd: "netplan try --timeout 120"
      async: 130
      poll: 0
      register: netplan_try

    - name: Wait for new IP to become reachable
      ansible.builtin.wait_for:
        host: "{{ new_ip }}"
        port: 22
        timeout: 60
      delegate_to: localhost

    - name: Confirm new configuration
      ansible.builtin.command:
        cmd: netplan apply
      vars:
        ansible_host: "{{ new_ip }}"
```

The `netplan try` command applies the configuration but automatically reverts it after the timeout if you do not confirm. This prevents permanent lockouts.

## Summary

Configuring static IP addresses with Ansible requires knowing which networking subsystem your target systems use. Netplan handles modern Ubuntu systems with YAML configuration files. NetworkManager covers RHEL-based distributions using `nmcli` or connection files. Older Debian systems use `/etc/network/interfaces`. Always back up existing configurations before making changes, and use safe reconfiguration patterns like `netplan try` when changing IPs remotely. For multi-distribution environments, use `ansible_os_family` and `ansible_distribution` facts to select the right configuration method automatically.
