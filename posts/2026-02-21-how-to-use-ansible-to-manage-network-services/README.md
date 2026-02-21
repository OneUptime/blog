# How to Use Ansible to Manage Network Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Networking, Linux, Service Management, Infrastructure

Description: Learn how to manage network services like NetworkManager, systemd-networkd, firewalld, and NTP with Ansible for consistent network configuration.

---

Network services are the foundation of every server. If DNS fails, nothing works. If the firewall is misconfigured, you are either locked out or wide open. If NTP drifts, your logs become unreliable and your TLS certificates start failing validation. Managing these services correctly across a fleet of servers is one of the most important things you can do with Ansible.

In this guide, I will cover managing the core network services that every Linux server depends on: NetworkManager, systemd-networkd, firewalld/iptables, NTP, and SSH.

## Managing NetworkManager

NetworkManager is the default network management tool on most desktop and server distributions like RHEL, CentOS, and Fedora.

Install and configure NetworkManager:

```yaml
---
- name: Configure NetworkManager
  hosts: all
  become: yes
  tasks:
    - name: Install NetworkManager
      ansible.builtin.apt:
        name:
          - network-manager
          - network-manager-config-connectivity-ubuntu
        state: present

    - name: Ensure NetworkManager is running
      ansible.builtin.systemd:
        name: NetworkManager
        state: started
        enabled: yes

    - name: Deploy NetworkManager configuration
      ansible.builtin.template:
        src: NetworkManager.conf.j2
        dest: /etc/NetworkManager/NetworkManager.conf
        owner: root
        group: root
        mode: '0644'
      notify: Restart NetworkManager

  handlers:
    - name: Restart NetworkManager
      ansible.builtin.systemd:
        name: NetworkManager
        state: restarted
```

The NetworkManager configuration template:

```ini
# /etc/NetworkManager/NetworkManager.conf
[main]
plugins=ifupdown,keyfile
dns={{ nm_dns_plugin | default('default') }}

[ifupdown]
managed={{ nm_manage_ifupdown | default('true') }}

[connection]
# Disable WiFi power saving for servers
wifi.powersave={{ nm_wifi_powersave | default(2) }}

{% if nm_dns_plugin == 'none' %}
[global-dns-domain-*]
servers={{ nm_dns_servers | join(',') }}
{% endif %}
```

## Configuring Network Connections

Use the `community.general.nmcli` module to manage network connections.

Configure a static IP address:

```yaml
- name: Configure static IP on eth0
  community.general.nmcli:
    conn_name: eth0-static
    ifname: eth0
    type: ethernet
    ip4: "{{ server_ip }}/{{ subnet_mask }}"
    gw4: "{{ gateway }}"
    dns4:
      - "{{ dns_server_1 }}"
      - "{{ dns_server_2 }}"
    dns4_search:
      - internal.example.com
    method4: manual
    autoconnect: yes
    state: present
  notify: Restart NetworkManager

- name: Configure a bonded interface
  community.general.nmcli:
    conn_name: bond0
    type: bond
    mode: 802.3ad
    ip4: "{{ bond_ip }}/24"
    gw4: "{{ gateway }}"
    autoconnect: yes
    state: present

- name: Add slave interfaces to bond
  community.general.nmcli:
    conn_name: "bond0-slave-{{ item }}"
    ifname: "{{ item }}"
    type: bond-slave
    master: bond0
    autoconnect: yes
    state: present
  loop:
    - eth0
    - eth1
```

## Managing systemd-networkd

For servers, systemd-networkd is a lighter alternative to NetworkManager. It is commonly used on Ubuntu Server and container hosts.

Configure systemd-networkd:

```yaml
---
- name: Configure systemd-networkd
  hosts: servers
  become: yes
  tasks:
    - name: Disable NetworkManager if present
      ansible.builtin.systemd:
        name: NetworkManager
        state: stopped
        enabled: no
      ignore_errors: yes

    - name: Enable systemd-networkd
      ansible.builtin.systemd:
        name: systemd-networkd
        state: started
        enabled: yes

    - name: Deploy network configuration
      ansible.builtin.template:
        src: "{{ item.src }}"
        dest: "/etc/systemd/network/{{ item.dest }}"
        mode: '0644'
      loop:
        - src: 10-eth0.network.j2
          dest: 10-eth0.network
      notify: Restart networkd

  handlers:
    - name: Restart networkd
      ansible.builtin.systemd:
        name: systemd-networkd
        state: restarted
```

Network configuration template for a static IP:

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
Address={{ server_ip }}/{{ subnet_cidr }}
Gateway={{ gateway }}
DNS={{ dns_server_1 }}
DNS={{ dns_server_2 }}
Domains={{ search_domain }}

[Link]
MTU={{ mtu | default(1500) }}
```

For DHCP:

```ini
[Match]
Name=eth0

[Network]
DHCP=yes

[DHCPv4]
UseDNS=yes
UseNTP=yes
UseDomains=yes
```

## Managing Firewall Services

### firewalld

firewalld is the default firewall on RHEL/CentOS/Fedora.

Configure firewalld with Ansible:

```yaml
---
- name: Configure firewall
  hosts: all
  become: yes
  tasks:
    - name: Ensure firewalld is running
      ansible.builtin.systemd:
        name: firewalld
        state: started
        enabled: yes

    - name: Allow SSH
      ansible.posix.firewalld:
        service: ssh
        permanent: yes
        immediate: yes
        state: enabled

    - name: Allow HTTP and HTTPS
      ansible.posix.firewalld:
        service: "{{ item }}"
        permanent: yes
        immediate: yes
        state: enabled
      loop:
        - http
        - https

    - name: Allow custom application port
      ansible.posix.firewalld:
        port: "{{ item }}"
        permanent: yes
        immediate: yes
        state: enabled
      loop:
        - 8080/tcp
        - 9090/tcp

    - name: Set default zone to drop
      ansible.builtin.command: firewall-cmd --set-default-zone=drop
      changed_when: true

    - name: Allow traffic from internal network
      ansible.posix.firewalld:
        source: "10.0.0.0/8"
        zone: trusted
        permanent: yes
        immediate: yes
        state: enabled
```

### iptables

For systems using iptables directly:

```yaml
- name: Configure iptables rules
  ansible.builtin.iptables:
    chain: INPUT
    protocol: tcp
    destination_port: "{{ item.port }}"
    jump: ACCEPT
    comment: "{{ item.comment }}"
  loop:
    - { port: 22, comment: "Allow SSH" }
    - { port: 80, comment: "Allow HTTP" }
    - { port: 443, comment: "Allow HTTPS" }

- name: Drop all other incoming traffic
  ansible.builtin.iptables:
    chain: INPUT
    policy: DROP

- name: Save iptables rules
  ansible.builtin.command: iptables-save > /etc/iptables/rules.v4
  changed_when: true
```

## Managing NTP Services

Accurate time is critical for log correlation, TLS certificate validation, and distributed systems.

### chronyd (RHEL/CentOS)

```yaml
- name: Configure chronyd
  hosts: all
  become: yes
  tasks:
    - name: Install chrony
      ansible.builtin.apt:
        name: chrony
        state: present

    - name: Deploy chrony configuration
      ansible.builtin.template:
        src: chrony.conf.j2
        dest: /etc/chrony/chrony.conf
      notify: Restart chronyd

    - name: Ensure chronyd is running
      ansible.builtin.systemd:
        name: chronyd
        state: started
        enabled: yes

  handlers:
    - name: Restart chronyd
      ansible.builtin.systemd:
        name: chronyd
        state: restarted
```

Chrony configuration template:

```ini
# /etc/chrony/chrony.conf
{% for server in ntp_servers | default(['0.pool.ntp.org', '1.pool.ntp.org', '2.pool.ntp.org', '3.pool.ntp.org']) %}
server {{ server }} iburst
{% endfor %}

# Record the rate at which the system clock gains/losses time
driftfile /var/lib/chrony/drift

# Allow the system clock to be stepped in the first three updates
makestep 1.0 3

# Enable kernel synchronization of the real-time clock
rtcsync

# Specify directory for log files
logdir /var/log/chrony
```

### systemd-timesyncd

For simpler setups, systemd-timesyncd is a lightweight NTP client:

```yaml
- name: Configure timesyncd
  ansible.builtin.template:
    src: timesyncd.conf.j2
    dest: /etc/systemd/timesyncd.conf
  notify: Restart timesyncd

- name: Enable NTP synchronization
  ansible.builtin.command: timedatectl set-ntp true
  changed_when: false

- name: Ensure timesyncd is running
  ansible.builtin.systemd:
    name: systemd-timesyncd
    state: started
    enabled: yes

handlers:
  - name: Restart timesyncd
    ansible.builtin.systemd:
      name: systemd-timesyncd
      state: restarted
```

## Managing SSH

SSH is the most critical network service for remote management.

Harden SSH configuration:

```yaml
- name: Deploy hardened SSH configuration
  ansible.builtin.template:
    src: sshd_config.j2
    dest: /etc/ssh/sshd_config
    owner: root
    group: root
    mode: '0600'
    validate: "sshd -t -f %s"
  notify: Restart SSH

- name: Ensure SSH is running
  ansible.builtin.systemd:
    name: sshd
    state: started
    enabled: yes
```

Key SSH hardening settings:

```yaml
# group_vars/all.yml
ssh_port: 22
ssh_permit_root_login: "no"
ssh_password_authentication: "no"
ssh_pubkey_authentication: "yes"
ssh_max_auth_tries: 3
ssh_client_alive_interval: 300
ssh_client_alive_count_max: 2
ssh_allowed_users: "deploy ansible"
```

## Complete Network Services Playbook

A comprehensive playbook that configures all network services on a server.

Full network services configuration:

```yaml
---
- name: Configure all network services
  hosts: all
  become: yes

  vars:
    dns_servers:
      - 10.0.1.53
      - 10.0.2.53
    ntp_servers:
      - time.internal.example.com
      - 0.pool.ntp.org
    allowed_ports:
      - { port: 22, protocol: tcp }
      - { port: 80, protocol: tcp }
      - { port: 443, protocol: tcp }

  tasks:
    - name: Configure DNS resolution
      ansible.builtin.template:
        src: resolved.conf.j2
        dest: /etc/systemd/resolved.conf
      notify: Restart resolved

    - name: Configure NTP
      ansible.builtin.template:
        src: chrony.conf.j2
        dest: /etc/chrony/chrony.conf
      notify: Restart chronyd

    - name: Configure firewall rules
      ansible.builtin.iptables:
        chain: INPUT
        protocol: "{{ item.protocol }}"
        destination_port: "{{ item.port }}"
        jump: ACCEPT
      loop: "{{ allowed_ports }}"

    - name: Configure SSH
      ansible.builtin.template:
        src: sshd_config.j2
        dest: /etc/ssh/sshd_config
        validate: "sshd -t -f %s"
      notify: Restart SSH

    - name: Verify all network services are running
      ansible.builtin.systemd:
        name: "{{ item }}"
        state: started
        enabled: yes
      loop:
        - systemd-resolved
        - chronyd
        - sshd

  handlers:
    - name: Restart resolved
      ansible.builtin.systemd:
        name: systemd-resolved
        state: restarted

    - name: Restart chronyd
      ansible.builtin.systemd:
        name: chronyd
        state: restarted

    - name: Restart SSH
      ansible.builtin.systemd:
        name: sshd
        state: restarted
```

## Verifying Network Services

After configuration, run verification checks:

```yaml
- name: Verify DNS resolution
  ansible.builtin.command: "resolvectl query google.com"
  register: dns_check
  changed_when: false
  failed_when: dns_check.rc != 0

- name: Verify NTP synchronization
  ansible.builtin.command: timedatectl show --property=NTPSynchronized
  register: ntp_check
  changed_when: false

- name: Show NTP status
  ansible.builtin.debug:
    msg: "NTP synced: {{ ntp_check.stdout }}"

- name: Verify firewall rules
  ansible.builtin.command: iptables -L -n --line-numbers
  register: fw_rules
  changed_when: false

- name: Test SSH connectivity
  ansible.builtin.wait_for:
    port: 22
    host: "{{ ansible_default_ipv4.address }}"
    timeout: 5
```

## Summary

Network services form the base layer of your infrastructure. DNS, NTP, firewall, and SSH must all be configured correctly for everything above them to work. Ansible gives you a consistent way to deploy and verify these configurations across your entire fleet. The key points are: always validate configurations before applying them (especially SSH, since a bad config locks you out), use handlers to restart services only when needed, run verification tasks after changes, and use rolling updates for SSH changes to avoid locking yourself out of the entire fleet. Get the network layer right, and everything built on top of it becomes more reliable.
