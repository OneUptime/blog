# How to Integrate IPAM with Ansible for Automated IPv4 Provisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, IPAM, IPv4, Automation, NetBox, Provisioning

Description: Use Ansible modules for NetBox and phpIPAM to automatically allocate IPv4 addresses during infrastructure provisioning playbooks.

Integrating IPAM into Ansible playbooks ensures every provisioned resource automatically gets a tracked IPv4 address, eliminating the manual "what IP should I use?" step.

## Using the NetBox Ansible Collection

```bash
# Install the NetBox Ansible collection and its Python dependency on the control node

ansible-galaxy collection install netbox.netbox
python -m pip install pynetbox
```

## Allocating an IP from NetBox in a Playbook

```yaml
# provision_server.yml
---
- name: Provision Server with IP from NetBox
  hosts: localhost
  gather_facts: false

  vars:
    netbox_url: "http://netbox.example.com"
    netbox_token: "{{ lookup('env', 'NETBOX_TOKEN') }}"
    server_name: "web05"
    prefix_cidr: "10.100.1.0/24"

  tasks:
    - name: Get next available IP from prefix
      netbox.netbox.netbox_ip_address:
        netbox_url: "{{ netbox_url }}"
        netbox_token: "{{ netbox_token }}"
        data:
          prefix: "{{ prefix_cidr }}"
          status: active
          dns_name: "{{ server_name }}.corp.example.com"
          description: "Auto-provisioned by Ansible"
        state: new
      register: ip_result

    - name: Display allocated IP
      debug:
        msg: "Allocated IP: {{ ip_result.ip_address.address }}"

    - name: Use the IP to configure the host
      # ... subsequent tasks use ip_result.ip_address.address
      set_fact:
        server_ip: "{{ ip_result.ip_address.address | ansible.builtin.regex_replace('/.*$', '') }}"
```

## Creating a Full Device Record in NetBox

```yaml
# netbox_device_create.yml
---
- name: Create Device Record in NetBox
  hosts: localhost
  gather_facts: false

  vars:
    netbox_url: "http://netbox.example.com"
    netbox_token: "{{ lookup('env', 'NETBOX_TOKEN') }}"

  tasks:
    - name: Create device
      netbox.netbox.netbox_device:
        netbox_url: "{{ netbox_url }}"
        netbox_token: "{{ netbox_token }}"
        data:
          name: "web05"
          device_type: { slug: "generic-server" }
          site: { name: "New York" }
          device_role: { name: "Web Server" }
          status: active
        state: present
      register: device_result

    - name: Create interface on device
      netbox.netbox.netbox_device_interface:
        netbox_url: "{{ netbox_url }}"
        netbox_token: "{{ netbox_token }}"
        data:
          device: "web05"
          name: "eth0"
          type: "1000Base-t (1GE)"
        state: present
      register: interface_result

    - name: Assign IP to interface
      netbox.netbox.netbox_ip_address:
        netbox_url: "{{ netbox_url }}"
        netbox_token: "{{ netbox_token }}"
        data:
          address: "10.100.1.15/24"
          status: active
          dns_name: "web05.corp.example.com"
          interface:
            name: "eth0"
            device: "web05"
        state: present
```

## Using phpIPAM with Ansible

```yaml
# phpipam_allocate.yml
---
- name: Allocate IP from phpIPAM
  hosts: localhost
  gather_facts: false

  vars:
    phpipam_url: "http://phpipam.example.com"
    phpipam_app_id: "myapp"
    phpipam_username: "admin"
    phpipam_password: "{{ lookup('env', 'PHPIPAM_PASSWORD') }}"
    subnet_id: 42
    server_name: "web05"

  tasks:
    - name: Get authentication token
      uri:
        url: "{{ phpipam_url }}/api/{{ phpipam_app_id }}/user/"
        method: POST
        url_username: "{{ phpipam_username }}"
        url_password: "{{ phpipam_password }}"
        force_basic_auth: true
        status_code: 200
      register: auth_result

    - name: Get next free IP in subnet
      uri:
        url: "{{ phpipam_url }}/api/{{ phpipam_app_id }}/subnets/{{ subnet_id }}/first_free/"
        headers:
          phpipam-token: "{{ auth_result.json.data.token }}"
        method: GET
        status_code: 200
      register: free_ip_result

    - name: Reserve the IP address
      uri:
        url: "{{ phpipam_url }}/api/{{ phpipam_app_id }}/addresses/"
        headers:
          phpipam-token: "{{ auth_result.json.data.token }}"
        method: POST
        body_format: json
        body:
          subnetId: "{{ subnet_id }}"
          ip: "{{ free_ip_result.json.data }}"
          hostname: "{{ server_name }}.corp.example.com"
          description: "Allocated by Ansible"
        status_code: 201
      register: allocation_result

    - name: Store IP for use in subsequent tasks
      set_fact:
        allocated_ip: "{{ free_ip_result.json.data }}"
```

## Running the Playbook

```bash
export NETBOX_TOKEN="your-token-here"
ansible-playbook provision_server.yml -e "server_name=web05"

# The playbook output shows the allocated IP:
# TASK: Display allocated IP
# ok: [localhost] => msg: "Allocated IP: 10.100.1.16/24"
```

IPAM-integrated Ansible playbooks help reduce IP conflicts and keep documentation in sync for every provisioned resource.
