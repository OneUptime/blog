# How to Use Ansible to Set Up a VPN Server (WireGuard)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, WireGuard, VPN, Networking, Security

Description: Automate the deployment of a WireGuard VPN server with peer management, firewall rules, and DNS configuration using Ansible playbooks.

---

WireGuard has become the go-to VPN solution for good reasons. It is faster than OpenVPN, simpler to configure than IPsec, and the codebase is small enough that security audits are actually feasible. But even with WireGuard's simplicity, managing keys, peer configurations, firewall rules, and DNS settings across multiple servers and clients gets tedious quickly. Ansible is the perfect fit for automating WireGuard deployments.

This guide covers setting up a WireGuard VPN server with Ansible, including key generation, peer management, firewall configuration, and client config distribution.

## Prerequisites

You need Ansible 2.12+ on your control machine and a target server with a public IP address running Ubuntu 22.04. The server needs to be accessible on the WireGuard port (default 51820/UDP) through any cloud provider firewalls.

## Project Structure

```
wireguard-vpn/
  inventory/
    hosts.ini
  roles/
    wireguard/
      tasks/
        main.yml
        peers.yml
      templates/
        wg0.conf.j2
        client.conf.j2
      defaults/
        main.yml
      handlers/
        main.yml
  playbook.yml
```

## Default Variables

```yaml
# roles/wireguard/defaults/main.yml - WireGuard configuration defaults
wireguard_port: 51820
wireguard_interface: wg0
wireguard_address: 10.100.0.1/24
wireguard_network: 10.100.0.0/24
wireguard_dns: 1.1.1.1, 1.0.0.1
wireguard_config_dir: /etc/wireguard
wireguard_client_config_dir: /opt/wireguard-clients

# Define VPN peers/clients
wireguard_peers:
  - name: laptop
    address: 10.100.0.2/32
    allowed_ips: 0.0.0.0/0
  - name: phone
    address: 10.100.0.3/32
    allowed_ips: 0.0.0.0/0
  - name: office-server
    address: 10.100.0.4/32
    allowed_ips: 10.100.0.0/24
```

## Main Tasks

```yaml
# roles/wireguard/tasks/main.yml - Install and configure WireGuard
---
- name: Install WireGuard packages
  apt:
    name:
      - wireguard
      - wireguard-tools
      - qrencode
    state: present
    update_cache: yes

- name: Enable IP forwarding for IPv4
  sysctl:
    name: net.ipv4.ip_forward
    value: '1'
    sysctl_set: yes
    state: present
    reload: yes

- name: Enable IP forwarding for IPv6
  sysctl:
    name: net.ipv6.conf.all.forwarding
    value: '1'
    sysctl_set: yes
    state: present
    reload: yes

- name: Generate server private key
  command: wg genkey
  register: wg_server_privkey
  args:
    creates: "{{ wireguard_config_dir }}/server_private.key"
  no_log: true

- name: Save server private key to file
  copy:
    content: "{{ wg_server_privkey.stdout }}"
    dest: "{{ wireguard_config_dir }}/server_private.key"
    owner: root
    group: root
    mode: '0600'
  when: wg_server_privkey.changed
  no_log: true

- name: Read server private key
  slurp:
    src: "{{ wireguard_config_dir }}/server_private.key"
  register: wg_server_privkey_content
  no_log: true

- name: Generate server public key from private key
  shell: "cat {{ wireguard_config_dir }}/server_private.key | wg pubkey"
  register: wg_server_pubkey
  changed_when: false

- name: Save server public key
  copy:
    content: "{{ wg_server_pubkey.stdout }}"
    dest: "{{ wireguard_config_dir }}/server_public.key"
    owner: root
    group: root
    mode: '0644'

- name: Create client config directory
  file:
    path: "{{ wireguard_client_config_dir }}"
    state: directory
    owner: root
    group: root
    mode: '0700'

- name: Include peer management tasks
  include_tasks: peers.yml

- name: Deploy WireGuard server configuration
  template:
    src: wg0.conf.j2
    dest: "{{ wireguard_config_dir }}/{{ wireguard_interface }}.conf"
    owner: root
    group: root
    mode: '0600'
  notify: restart wireguard

- name: Enable and start WireGuard
  systemd:
    name: "wg-quick@{{ wireguard_interface }}"
    state: started
    enabled: yes

- name: Configure UFW to allow WireGuard port
  ufw:
    rule: allow
    port: "{{ wireguard_port }}"
    proto: udp

- name: Configure UFW to allow forwarding
  ufw:
    direction: routed
    default: allow
    route: yes
  ignore_errors: yes
```

## Peer Management Tasks

```yaml
# roles/wireguard/tasks/peers.yml - Generate keys and configs for each peer
---
- name: Generate peer private keys
  command: wg genkey
  register: "peer_privkeys"
  loop: "{{ wireguard_peers }}"
  loop_control:
    label: "{{ item.name }}"
  args:
    creates: "{{ wireguard_config_dir }}/peer_{{ item.name }}_private.key"
  no_log: true

- name: Save peer private keys
  copy:
    content: "{{ item.stdout }}"
    dest: "{{ wireguard_config_dir }}/peer_{{ item.item.name }}_private.key"
    owner: root
    group: root
    mode: '0600'
  loop: "{{ peer_privkeys.results }}"
  loop_control:
    label: "{{ item.item.name }}"
  when: item.changed
  no_log: true

- name: Read all peer private keys
  slurp:
    src: "{{ wireguard_config_dir }}/peer_{{ item.name }}_private.key"
  register: peer_privkey_contents
  loop: "{{ wireguard_peers }}"
  loop_control:
    label: "{{ item.name }}"
  no_log: true

- name: Generate peer public keys
  shell: "cat {{ wireguard_config_dir }}/peer_{{ item.name }}_private.key | wg pubkey"
  register: peer_pubkeys
  loop: "{{ wireguard_peers }}"
  loop_control:
    label: "{{ item.name }}"
  changed_when: false

- name: Save peer public keys
  copy:
    content: "{{ item.stdout }}"
    dest: "{{ wireguard_config_dir }}/peer_{{ item.item.name }}_public.key"
    mode: '0644'
  loop: "{{ peer_pubkeys.results }}"
  loop_control:
    label: "{{ item.item.name }}"

- name: Generate client configuration files
  template:
    src: client.conf.j2
    dest: "{{ wireguard_client_config_dir }}/{{ item.0.name }}.conf"
    owner: root
    group: root
    mode: '0600'
  loop: "{{ wireguard_peers | zip(peer_privkey_contents.results, peer_pubkeys.results) | list }}"
  loop_control:
    label: "{{ item.0.name }}"

- name: Generate QR codes for mobile clients
  shell: "qrencode -t ansiutf8 < {{ wireguard_client_config_dir }}/{{ item.name }}.conf > {{ wireguard_client_config_dir }}/{{ item.name }}_qr.txt"
  loop: "{{ wireguard_peers }}"
  loop_control:
    label: "{{ item.name }}"
  changed_when: false
```

## Server Configuration Template

```ini
# roles/wireguard/templates/wg0.conf.j2 - WireGuard server config
[Interface]
Address = {{ wireguard_address }}
ListenPort = {{ wireguard_port }}
PrivateKey = {{ wg_server_privkey_content.content | b64decode | trim }}

# NAT rules for routing client traffic through the server
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -t nat -A POSTROUTING -o {{ ansible_default_ipv4.interface }} -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -t nat -D POSTROUTING -o {{ ansible_default_ipv4.interface }} -j MASQUERADE

{% for peer in wireguard_peers %}
{% set peer_pubkey = peer_pubkeys.results[loop.index0].stdout %}
# Peer: {{ peer.name }}
[Peer]
PublicKey = {{ peer_pubkey }}
AllowedIPs = {{ peer.address }}
{% endfor %}
```

## Client Configuration Template

```ini
# roles/wireguard/templates/client.conf.j2 - Per-peer client config
[Interface]
PrivateKey = {{ item.1.content | b64decode | trim }}
Address = {{ item.0.address }}
DNS = {{ wireguard_dns }}

[Peer]
PublicKey = {{ wg_server_pubkey.stdout }}
Endpoint = {{ ansible_host }}:{{ wireguard_port }}
AllowedIPs = {{ item.0.allowed_ips }}
PersistentKeepalive = 25
```

## Handlers

```yaml
# roles/wireguard/handlers/main.yml - Restart WireGuard on config changes
---
- name: restart wireguard
  systemd:
    name: "wg-quick@{{ wireguard_interface }}"
    state: restarted
```

## Running the Playbook

```bash
# Deploy the WireGuard VPN server
ansible-playbook -i inventory/hosts.ini playbook.yml

# Fetch client configs to your local machine
ansible -i inventory/hosts.ini registry -m fetch \
  -a "src=/opt/wireguard-clients/laptop.conf dest=./clients/ flat=yes"
```

## Verifying the VPN

After deployment, check the WireGuard status on the server:

```bash
# Show WireGuard interface status and connected peers
sudo wg show

# Expected output shows the interface, listening port, and peer info
# interface: wg0
#   public key: <server_public_key>
#   private key: (hidden)
#   listening port: 51820
```

## Summary

This Ansible playbook automates the entire WireGuard VPN lifecycle. It handles key generation, server configuration, peer management, firewall rules, and even generates QR codes for mobile clients. Adding a new peer is as simple as adding an entry to the `wireguard_peers` list and rerunning the playbook. The idempotent nature of Ansible means existing keys and configurations are preserved on subsequent runs, so you will not accidentally break connections for existing peers.
