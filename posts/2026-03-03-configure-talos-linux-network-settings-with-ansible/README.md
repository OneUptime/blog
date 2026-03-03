# How to Configure Talos Linux Network Settings with Ansible

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Ansible, Networking, Kubernetes, Configuration Management

Description: A practical guide to managing Talos Linux network configurations using Ansible playbooks for consistent networking across cluster nodes.

---

Network configuration is one of the most critical aspects of running a Talos Linux cluster. Every node needs proper IP addressing, DNS settings, routes, and sometimes VLANs or bonded interfaces. Getting these wrong can leave nodes unreachable or cause cluster instability. Using Ansible to manage Talos network settings gives you a centralized, version-controlled approach that reduces errors and makes it easy to apply consistent networking across all your nodes.

## How Talos Handles Networking

Talos Linux configures networking through its machine configuration file. Unlike traditional Linux where you might edit `/etc/network/interfaces` or use NetworkManager, Talos reads network settings from the machine config and applies them declaratively. This means you define the desired state, and Talos makes it happen.

The network configuration lives under the `machine.network` section of the Talos machine config. You can define interfaces, addresses, routes, DNS settings, hostnames, and more. Changes to network configuration can be applied to running nodes using `talosctl apply-config`, though some changes may require a reboot.

## Defining Network Variables in Ansible

Start by defining network-related variables in your Ansible inventory. Use host-specific variables for IP addresses and group variables for shared settings:

```yaml
# inventory/group_vars/all.yml
cluster_name: "production"
talosconfig_path: "./talosconfig"

# Shared DNS settings
dns_servers:
  - "10.0.0.2"
  - "8.8.8.8"

# Shared NTP settings
ntp_servers:
  - "time.google.com"
  - "time.cloudflare.com"

# Default network settings
default_gateway: "10.0.1.1"
subnet_mask: 24
network_cidr: "10.0.1.0/24"

# Domain search settings
dns_search_domains:
  - "cluster.local"
  - "production.example.com"
```

```yaml
# inventory/host_vars/cp-0.yml
node_ip: "10.0.1.10"
hostname: "cp-0"
network_interfaces:
  - name: eth0
    dhcp: false
    addresses:
      - "10.0.1.10/24"
    routes:
      - network: "0.0.0.0/0"
        gateway: "10.0.1.1"
    mtu: 9000
```

```yaml
# inventory/host_vars/worker-0.yml
node_ip: "10.0.1.20"
hostname: "worker-0"
network_interfaces:
  - name: eth0
    dhcp: false
    addresses:
      - "10.0.1.20/24"
    routes:
      - network: "0.0.0.0/0"
        gateway: "10.0.1.1"
    mtu: 9000
  - name: eth1
    dhcp: false
    addresses:
      - "192.168.1.20/24"
    # Secondary interface for storage network
```

## Network Configuration Template

Create a Jinja2 template that generates the network portion of the Talos machine config:

```yaml
# templates/network-patch.yaml.j2
machine:
  network:
    hostname: {{ hostname }}
    nameservers:
{% for server in dns_servers %}
      - {{ server }}
{% endfor %}
{% if dns_search_domains is defined %}
    searchDomains:
{% for domain in dns_search_domains %}
      - {{ domain }}
{% endfor %}
{% endif %}
    interfaces:
{% for iface in network_interfaces %}
      - interface: {{ iface.name }}
        dhcp: {{ iface.dhcp | default(false) | lower }}
{% if iface.addresses is defined %}
        addresses:
{% for addr in iface.addresses %}
          - {{ addr }}
{% endfor %}
{% endif %}
{% if iface.routes is defined %}
        routes:
{% for route in iface.routes %}
          - network: {{ route.network }}
            gateway: {{ route.gateway }}
{% if route.metric is defined %}
            metric: {{ route.metric }}
{% endif %}
{% endfor %}
{% endif %}
{% if iface.mtu is defined %}
        mtu: {{ iface.mtu }}
{% endif %}
{% if iface.vlans is defined %}
        vlans:
{% for vlan in iface.vlans %}
          - vlanId: {{ vlan.id }}
            addresses:
{% for addr in vlan.addresses %}
              - {{ addr }}
{% endfor %}
{% if vlan.routes is defined %}
            routes:
{% for route in vlan.routes %}
              - network: {{ route.network }}
                gateway: {{ route.gateway }}
{% endfor %}
{% endif %}
{% endfor %}
{% endif %}
{% endfor %}
```

## Handling VLAN Configurations

For environments that use VLANs, extend the host variables:

```yaml
# inventory/host_vars/worker-1.yml
node_ip: "10.0.1.21"
hostname: "worker-1"
network_interfaces:
  - name: eth0
    dhcp: false
    addresses:
      - "10.0.1.21/24"
    routes:
      - network: "0.0.0.0/0"
        gateway: "10.0.1.1"
    vlans:
      - id: 100
        addresses:
          - "10.100.0.21/24"
        routes:
          - network: "10.100.0.0/24"
            gateway: "10.100.0.1"
      - id: 200
        addresses:
          - "10.200.0.21/24"
```

## Network Bond Configuration

For high-availability networking, configure bonded interfaces:

```yaml
# inventory/host_vars/worker-2.yml
node_ip: "10.0.1.22"
hostname: "worker-2"
network_interfaces:
  - name: bond0
    dhcp: false
    addresses:
      - "10.0.1.22/24"
    routes:
      - network: "0.0.0.0/0"
        gateway: "10.0.1.1"
    bond:
      mode: "802.3ad"
      lacpRate: "fast"
      hashPolicy: "layer3+4"
      interfaces:
        - eth0
        - eth1
```

Update the template to handle bonds:

```yaml
# Add to templates/network-patch.yaml.j2 inside the interface loop
{% if iface.bond is defined %}
        bond:
          mode: {{ iface.bond.mode }}
          lacpRate: {{ iface.bond.lacpRate | default('slow') }}
          hashPolicy: {{ iface.bond.hashPolicy | default('layer2') }}
          interfaces:
{% for member in iface.bond.interfaces %}
            - {{ member }}
{% endfor %}
{% endif %}
```

## The Network Configuration Playbook

Build a playbook that generates and applies network configurations:

```yaml
# playbooks/configure-network.yml
---
- name: Generate network configuration patches
  hosts: all
  gather_facts: false
  connection: local

  tasks:
    - name: Create output directory
      ansible.builtin.file:
        path: "{{ playbook_dir }}/../generated/network"
        state: directory
        mode: '0700'
      run_once: true

    - name: Generate network patch for each node
      ansible.builtin.template:
        src: network-patch.yaml.j2
        dest: "{{ playbook_dir }}/../generated/network/{{ inventory_hostname }}-network.yaml"
        mode: '0600'

    - name: Validate the generated patch
      ansible.builtin.command:
        cmd: >
          python3 -c "import yaml; yaml.safe_load(open('{{ playbook_dir }}/../generated/network/{{ inventory_hostname }}-network.yaml'))"
      register: yaml_check
      failed_when: yaml_check.rc != 0

- name: Apply network configuration to control plane
  hosts: controlplane
  gather_facts: false
  connection: local
  serial: 1

  tasks:
    - name: Apply network patch to control plane node
      ansible.builtin.command:
        cmd: >
          talosctl patch machineconfig
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --patch @{{ playbook_dir }}/../generated/network/{{ inventory_hostname }}-network.yaml
      register: apply_result

    - name: Wait for node to stabilize after network change
      ansible.builtin.command:
        cmd: >
          talosctl health
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --wait-timeout 5m
      retries: 3
      delay: 20
      register: health
      until: health.rc == 0

- name: Apply network configuration to workers
  hosts: workers
  gather_facts: false
  connection: local
  serial: 2

  tasks:
    - name: Apply network patch to worker node
      ansible.builtin.command:
        cmd: >
          talosctl patch machineconfig
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --patch @{{ playbook_dir }}/../generated/network/{{ inventory_hostname }}-network.yaml
      register: apply_result

    - name: Wait for worker to stabilize
      ansible.builtin.command:
        cmd: >
          talosctl health
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --wait-timeout 5m
      retries: 3
      delay: 20
      register: health
      until: health.rc == 0
```

## Verifying Network Configuration

After applying changes, verify that networking is correct:

```yaml
# playbooks/verify-network.yml
---
- name: Verify network configuration on all nodes
  hosts: all
  gather_facts: false
  connection: local

  tasks:
    - name: Get network interfaces from node
      ansible.builtin.command:
        cmd: >
          talosctl get addresses
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
      register: addresses

    - name: Display node addresses
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }}: {{ addresses.stdout }}"

    - name: Get routes from node
      ansible.builtin.command:
        cmd: >
          talosctl get routes
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
      register: routes

    - name: Check DNS resolution
      ansible.builtin.command:
        cmd: >
          talosctl get resolvers
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
      register: resolvers

    - name: Display DNS resolvers
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} resolvers: {{ resolvers.stdout }}"
```

## Running the Network Configuration

```bash
# Apply network changes
ansible-playbook -i inventory/production playbooks/configure-network.yml

# Verify after applying
ansible-playbook -i inventory/production playbooks/verify-network.yml

# Target a specific node
ansible-playbook -i inventory/production playbooks/configure-network.yml --limit worker-0
```

Managing Talos network settings through Ansible gives you a single source of truth for your entire cluster's network topology. The combination of per-node variables, Jinja2 templates, and serial application ensures that changes are applied safely and consistently across all nodes.
