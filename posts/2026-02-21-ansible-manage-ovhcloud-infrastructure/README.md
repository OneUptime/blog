# How to Use Ansible to Manage OVHcloud Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, OVHcloud, Cloud, Infrastructure, Automation

Description: Manage OVHcloud servers, DNS, and cloud resources using Ansible modules and the OVH API for automated infrastructure provisioning.

---

OVHcloud is a European cloud provider that offers dedicated servers, public cloud instances, managed Kubernetes, and DNS services at competitive prices. While it does not get the same community attention as AWS or GCP in the Ansible world, there are solid ways to manage OVHcloud infrastructure with Ansible using their API and available modules.

This guide covers provisioning and managing OVHcloud resources with Ansible, including public cloud instances, dedicated servers, and DNS records.

## Setting Up OVHcloud API Access

Before using Ansible with OVHcloud, you need API credentials. Create them at the OVHcloud API console:

1. Go to https://api.ovh.com/createToken/
2. Set the rights you need (GET, POST, PUT, DELETE on the relevant paths)
3. Note your Application Key, Application Secret, and Consumer Key

Store these credentials securely:

```bash
# Create a credentials file for the OVH API
# Do NOT commit this file to version control
cat > ~/.ovh.conf << 'CONF'
[default]
endpoint=ovh-eu
application_key=your_app_key
application_secret=your_app_secret
consumer_key=your_consumer_key
CONF
chmod 600 ~/.ovh.conf
```

Install the Python OVH SDK that Ansible will use:

```bash
# Install the OVH Python library
pip install ovh
```

## Using the OVH API Module

The community provides an `ovh_api` module, but you can also use Ansible's `uri` module to call the OVH API directly. Here is a role that wraps common OVH operations:

```yaml
# roles/ovhcloud/tasks/main.yml - Core OVH API interaction tasks
---
- name: Install OVH Python SDK
  pip:
    name: ovh
    state: present

- name: List OVHcloud public cloud projects
  script: scripts/ovh_list_projects.py
  register: ovh_projects
  changed_when: false
```

The helper script for API calls:

```python
#!/usr/bin/env python3
# scripts/ovh_list_projects.py - List OVHcloud public cloud projects
import ovh
import json

client = ovh.Client()
projects = client.get('/cloud/project')
print(json.dumps(projects))
```

## Managing Public Cloud Instances

OVHcloud Public Cloud runs on OpenStack, which means you can use Ansible's OpenStack modules. This is the recommended approach for managing compute instances:

```bash
# Install the OpenStack collection
ansible-galaxy collection install openstack.cloud
pip install openstacksdk
```

Configure your OpenStack credentials for OVHcloud:

```yaml
# clouds.yml - OpenStack configuration for OVHcloud
clouds:
  ovhcloud:
    auth:
      auth_url: https://auth.cloud.ovh.net/v3
      username: your_openstack_user
      password: your_openstack_password
      project_name: your_project_id
      project_domain_name: Default
      user_domain_name: Default
    region_name: GRA11
    interface: public
    identity_api_version: 3
```

Now you can use standard OpenStack modules:

```yaml
# provision-ovh-instances.yml - Create OVHcloud public cloud instances
---
- name: Provision OVHcloud public cloud instances
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    cloud_name: ovhcloud
    instances:
      - name: web-01
        flavor: b2-7
        image: "Ubuntu 22.04"
        network: Ext-Net
      - name: web-02
        flavor: b2-7
        image: "Ubuntu 22.04"
        network: Ext-Net

  tasks:
    # Create a security group
    - name: Create security group
      openstack.cloud.security_group:
        cloud: "{{ cloud_name }}"
        name: web-servers
        description: Security group for web servers
        state: present

    # Add rules to the security group
    - name: Allow HTTP traffic
      openstack.cloud.security_group_rule:
        cloud: "{{ cloud_name }}"
        security_group: web-servers
        protocol: tcp
        port_range_min: 80
        port_range_max: 80
        remote_ip_prefix: 0.0.0.0/0
        state: present

    - name: Allow HTTPS traffic
      openstack.cloud.security_group_rule:
        cloud: "{{ cloud_name }}"
        security_group: web-servers
        protocol: tcp
        port_range_min: 443
        port_range_max: 443
        remote_ip_prefix: 0.0.0.0/0
        state: present

    - name: Allow SSH traffic
      openstack.cloud.security_group_rule:
        cloud: "{{ cloud_name }}"
        security_group: web-servers
        protocol: tcp
        port_range_min: 22
        port_range_max: 22
        remote_ip_prefix: "{{ admin_cidr }}"
        state: present

    # Create the instances
    - name: Create compute instances
      openstack.cloud.server:
        cloud: "{{ cloud_name }}"
        name: "{{ item.name }}"
        flavor: "{{ item.flavor }}"
        image: "{{ item.image }}"
        network: "{{ item.network }}"
        security_groups:
          - web-servers
        key_name: my-ssh-key
        wait: true
        timeout: 300
      loop: "{{ instances }}"
      register: ovh_servers

    # Add to in-memory inventory
    - name: Add instances to inventory
      add_host:
        name: "{{ item.server.public_v4 }}"
        groups: webservers
        ansible_user: ubuntu
      loop: "{{ ovh_servers.results }}"
      when: item.server is defined
```

## Managing OVHcloud Dedicated Servers

Dedicated servers on OVHcloud are managed through their proprietary API rather than OpenStack. Here is a playbook using a custom module approach:

```yaml
# manage-dedicated.yml - Manage OVHcloud dedicated servers
---
- name: Manage OVHcloud dedicated servers
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    # List all dedicated servers using the OVH API
    - name: Get list of dedicated servers
      uri:
        url: "https://eu.api.ovh.com/1.0/dedicated/server"
        method: GET
        headers:
          X-Ovh-Application: "{{ ovh_application_key }}"
          X-Ovh-Timestamp: "{{ lookup('pipe', 'date +%s') }}"
          X-Ovh-Consumer: "{{ ovh_consumer_key }}"
          X-Ovh-Signature: "{{ ovh_signature }}"
        return_content: true
      register: server_list

    # Get details for each server
    - name: Get server details
      uri:
        url: "https://eu.api.ovh.com/1.0/dedicated/server/{{ item }}"
        method: GET
        headers:
          X-Ovh-Application: "{{ ovh_application_key }}"
          X-Ovh-Timestamp: "{{ lookup('pipe', 'date +%s') }}"
          X-Ovh-Consumer: "{{ ovh_consumer_key }}"
          X-Ovh-Signature: "{{ ovh_signature }}"
        return_content: true
      loop: "{{ server_list.json }}"
      register: server_details
```

For a cleaner approach, use a custom Ansible module that wraps the OVH Python SDK:

```python
#!/usr/bin/env python3
# library/ovh_dedicated_server_info.py - Custom module for OVH dedicated server info
from ansible.module_utils.basic import AnsibleModule
import ovh

def main():
    module = AnsibleModule(
        argument_spec=dict(
            server_name=dict(type='str', required=False),
        ),
        supports_check_mode=True,
    )

    client = ovh.Client()

    try:
        if module.params['server_name']:
            result = client.get(f"/dedicated/server/{module.params['server_name']}")
            module.exit_json(changed=False, server=result)
        else:
            servers = client.get('/dedicated/server')
            module.exit_json(changed=False, servers=servers)
    except ovh.exceptions.APIError as e:
        module.fail_json(msg=str(e))

if __name__ == '__main__':
    main()
```

Use the custom module in your playbook:

```yaml
# Using the custom module
- name: Get dedicated server info
  ovh_dedicated_server_info:
    server_name: ns12345.ip-1-2-3.eu
  register: server_info

- name: Display server details
  debug:
    msg: "Server {{ server_info.server.name }} - OS: {{ server_info.server.os }}"
```

## Managing OVHcloud DNS

OVHcloud provides DNS hosting that you can manage through their API:

```yaml
# ovh-dns.yml - Manage OVHcloud DNS records
---
- name: Manage OVHcloud DNS
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    domain: example.com
    dns_records:
      - fieldType: A
        subDomain: www
        target: "1.2.3.4"
        ttl: 3600
      - fieldType: A
        subDomain: api
        target: "1.2.3.5"
        ttl: 3600
      - fieldType: CNAME
        subDomain: blog
        target: "www.example.com."
        ttl: 3600

  tasks:
    # Create DNS records using custom script
    - name: Create DNS records
      script: "scripts/ovh_dns_record.py create {{ domain }} {{ item.fieldType }} {{ item.subDomain }} {{ item.target }} {{ item.ttl }}"
      loop: "{{ dns_records }}"
      register: dns_result
      changed_when: "'created' in dns_result.stdout"
```

The DNS management script:

```python
#!/usr/bin/env python3
# scripts/ovh_dns_record.py - Manage OVH DNS records
import ovh
import sys
import json

action = sys.argv[1]
domain = sys.argv[2]
field_type = sys.argv[3]
subdomain = sys.argv[4]
target = sys.argv[5]
ttl = int(sys.argv[6])

client = ovh.Client()

if action == 'create':
    # Check if record already exists
    existing = client.get(f'/domain/zone/{domain}/record',
                          fieldType=field_type,
                          subDomain=subdomain)
    if existing:
        print(f"Record already exists: {existing}")
    else:
        result = client.post(f'/domain/zone/{domain}/record',
                             fieldType=field_type,
                             subDomain=subdomain,
                             target=target,
                             ttl=ttl)
        # Refresh the zone
        client.post(f'/domain/zone/{domain}/refresh')
        print(f"created: {json.dumps(result)}")
```

## Private Network Setup

Setting up private networks (vRack) on OVHcloud:

```yaml
# ovh-private-network.yml - Configure OVHcloud private networking
---
- name: Setup OVHcloud private network
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    # Create a private network in OpenStack
    - name: Create private network
      openstack.cloud.network:
        cloud: ovhcloud
        name: backend-network
        state: present
      register: private_net

    # Create a subnet
    - name: Create subnet
      openstack.cloud.subnet:
        cloud: ovhcloud
        network_name: backend-network
        name: backend-subnet
        cidr: 192.168.1.0/24
        dns_nameservers:
          - 213.186.33.99
        state: present
```

## Practical Tips for OVHcloud and Ansible

OVHcloud's OpenStack integration is the smoothest path for public cloud automation. Use the `openstack.cloud` collection whenever possible instead of raw API calls.

For dedicated servers, the OVH Python SDK combined with custom Ansible modules gives you the most control. The API has rate limits, so add appropriate `throttle` settings when managing many resources.

The OVHcloud API authentication uses a signature mechanism that includes timestamps, so be careful with caching API responses. Each request needs a fresh signature.

OVHcloud regions (GRA, SBG, BHS, WAW, etc.) matter for latency and data residency. Define the region in your group variables and keep it consistent across your playbooks.
