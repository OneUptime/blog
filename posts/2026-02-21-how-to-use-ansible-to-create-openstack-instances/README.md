# How to Use Ansible to Create OpenStack Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, OpenStack, Compute, Cloud Provisioning, Automation

Description: Step-by-step guide to creating and managing OpenStack compute instances with Ansible including networking, volumes, and cloud-init.

---

Creating OpenStack instances through Horizon is fine for one-off testing, but when you need to provision application environments with multiple servers, proper networking, and attached storage, Ansible is the way to go. You define your desired state in YAML, run the playbook, and get consistent, repeatable infrastructure every time.

This guide walks through creating OpenStack instances with Ansible, from basic single-VM creation to multi-tier application deployments with custom networking and block storage.

## Prerequisites

Make sure you have:

- Ansible 2.12+ with the `openstack.cloud` collection
- Python `openstacksdk` library installed
- A valid `clouds.yaml` configuration
- An OpenStack project with sufficient quota

```bash
# Install required packages
ansible-galaxy collection install openstack.cloud
pip install openstacksdk
```

## Creating a Basic Instance

The `openstack.cloud.server` module handles instance creation. Here is the simplest possible example.

```yaml
# playbooks/create-basic-instance.yml
---
- name: Create a basic OpenStack instance
  hosts: localhost
  gather_facts: false

  vars:
    cloud_name: production

  tasks:
    # Launch a single instance with minimal configuration
    - name: Create test instance
      openstack.cloud.server:
        cloud: "{{ cloud_name }}"
        name: test-vm-01
        image: ubuntu-22.04
        flavor: m1.medium
        key_name: my-ssh-key
        network: private-net
        security_groups:
          - default
          - sg-ssh
        state: present
        wait: true
        timeout: 300
      register: instance

    - name: Show instance details
      ansible.builtin.debug:
        msg: "Instance {{ instance.server.name }} created with IP {{ instance.server.addresses }}"
```

## Creating Multiple Instances

For multi-instance deployments, define your servers in a variable and loop over them.

```yaml
# playbooks/create-instances.yml
---
- name: Create multiple OpenStack instances
  hosts: localhost
  gather_facts: false

  vars:
    cloud_name: production
    servers:
      - name: web-01
        image: ubuntu-22.04
        flavor: m1.medium
        network: web-net
        security_groups: [default, sg-web, sg-ssh]
      - name: web-02
        image: ubuntu-22.04
        flavor: m1.medium
        network: web-net
        security_groups: [default, sg-web, sg-ssh]
      - name: app-01
        image: ubuntu-22.04
        flavor: m1.large
        network: app-net
        security_groups: [default, sg-app, sg-ssh]
      - name: db-01
        image: ubuntu-22.04
        flavor: m1.xlarge
        network: db-net
        security_groups: [default, sg-database, sg-ssh]

  tasks:
    # Create all servers from the list
    - name: Create instances
      openstack.cloud.server:
        cloud: "{{ cloud_name }}"
        name: "{{ item.name }}"
        image: "{{ item.image }}"
        flavor: "{{ item.flavor }}"
        key_name: deploy-key
        network: "{{ item.network }}"
        security_groups: "{{ item.security_groups }}"
        state: present
        wait: true
        timeout: 300
      loop: "{{ servers }}"
      loop_control:
        label: "{{ item.name }}"
      register: created_instances

    # Display all created instances
    - name: Show created instances
      ansible.builtin.debug:
        msg: "{{ item.server.name }}: {{ item.server.addresses | dict2items | map(attribute='value') | flatten | map(attribute='addr') | list }}"
      loop: "{{ created_instances.results }}"
      loop_control:
        label: "{{ item.server.name }}"
```

## Using Cloud-Init for Initial Configuration

Cloud-init lets you run scripts and configure the instance during its first boot. Pass userdata through Ansible.

```yaml
# playbooks/create-with-cloudinit.yml
---
- name: Create instances with cloud-init
  hosts: localhost
  gather_facts: false

  vars:
    cloud_name: production

  tasks:
    # Create instance with inline cloud-init configuration
    - name: Create web server with cloud-init
      openstack.cloud.server:
        cloud: "{{ cloud_name }}"
        name: web-auto-01
        image: ubuntu-22.04
        flavor: m1.medium
        key_name: deploy-key
        network: web-net
        security_groups: [default, sg-web]
        userdata: |
          #cloud-config
          package_update: true
          package_upgrade: true
          packages:
            - nginx
            - certbot
            - python3-certbot-nginx
            - htop
            - curl
          runcmd:
            - systemctl enable nginx
            - systemctl start nginx
            - mkdir -p /var/www/html
            - echo "Server $(hostname) is ready" > /var/www/html/index.html
          write_files:
            - path: /etc/nginx/conf.d/health.conf
              content: |
                server {
                    listen 8080;
                    location /health {
                        return 200 'OK';
                        add_header Content-Type text/plain;
                    }
                }
        state: present
        wait: true
      register: web_server
```

For more complex cloud-init configurations, use a template file.

```yaml
# playbooks/create-with-cloudinit-template.yml
---
- name: Create instances with templated cloud-init
  hosts: localhost
  gather_facts: false

  vars:
    cloud_name: production
    app_version: "2.5.1"
    db_host: "192.168.30.10"
    redis_host: "192.168.40.10"

  tasks:
    # Generate cloud-init config from template
    - name: Create app server with templated userdata
      openstack.cloud.server:
        cloud: "{{ cloud_name }}"
        name: app-01
        image: ubuntu-22.04
        flavor: m1.large
        key_name: deploy-key
        network: app-net
        security_groups: [default, sg-app]
        userdata: "{{ lookup('template', '../templates/app-cloudinit.yml.j2') }}"
        state: present
        wait: true
```

The cloud-init template.

```yaml
# templates/app-cloudinit.yml.j2
#cloud-config
package_update: true
packages:
  - openjdk-17-jre
  - curl
  - jq

write_files:
  - path: /etc/myapp/config.yml
    content: |
      server:
        port: 8080
      database:
        host: {{ db_host }}
        port: 5432
        name: myapp
      cache:
        host: {{ redis_host }}
        port: 6379

runcmd:
  - curl -L https://releases.myapp.com/v{{ app_version }}/myapp.jar -o /opt/myapp/myapp.jar
  - systemctl enable myapp
  - systemctl start myapp
```

## Attaching Floating IPs

Floating IPs give your instances public accessibility. Assign them after creation.

```yaml
# playbooks/assign-floating-ips.yml
---
- name: Assign floating IPs to instances
  hosts: localhost
  gather_facts: false

  vars:
    cloud_name: production
    public_servers:
      - name: web-01
        floating_ip_pool: external
      - name: web-02
        floating_ip_pool: external

  tasks:
    # Allocate and assign floating IPs to web servers
    - name: Assign floating IP
      openstack.cloud.floating_ip:
        cloud: "{{ cloud_name }}"
        server: "{{ item.name }}"
        network: "{{ item.floating_ip_pool }}"
        state: present
        wait: true
      loop: "{{ public_servers }}"
      loop_control:
        label: "{{ item.name }}"
      register: floating_ips

    - name: Display floating IP assignments
      ansible.builtin.debug:
        msg: "{{ item.item.name }}: {{ item.floating_ip.floating_ip_address }}"
      loop: "{{ floating_ips.results }}"
      loop_control:
        label: "{{ item.item.name }}"
```

## Creating Instances with Block Storage

For instances that need persistent storage beyond the root disk, create and attach Cinder volumes.

```yaml
# playbooks/create-with-volumes.yml
---
- name: Create instances with attached volumes
  hosts: localhost
  gather_facts: false

  vars:
    cloud_name: production

  tasks:
    # Create a data volume first
    - name: Create data volume for database
      openstack.cloud.volume:
        cloud: "{{ cloud_name }}"
        name: db-01-data
        size: 500
        volume_type: ssd
        state: present
      register: data_volume

    # Create a log volume
    - name: Create log volume for database
      openstack.cloud.volume:
        cloud: "{{ cloud_name }}"
        name: db-01-logs
        size: 100
        volume_type: ssd
        state: present
      register: log_volume

    # Create the database instance
    - name: Create database instance
      openstack.cloud.server:
        cloud: "{{ cloud_name }}"
        name: db-01
        image: ubuntu-22.04
        flavor: m1.xlarge
        key_name: deploy-key
        network: db-net
        security_groups: [default, sg-database]
        volumes:
          - "{{ data_volume.volume.id }}"
          - "{{ log_volume.volume.id }}"
        state: present
        wait: true
      register: db_instance

    - name: Show database instance details
      ansible.builtin.debug:
        msg: "DB instance created: {{ db_instance.server.name }}, Volumes: {{ data_volume.volume.id }}, {{ log_volume.volume.id }}"
```

## Boot from Volume

For instances where the root disk should persist beyond the VM lifecycle, boot from a Cinder volume.

```yaml
# playbooks/boot-from-volume.yml
---
- name: Create instance that boots from volume
  hosts: localhost
  gather_facts: false

  vars:
    cloud_name: production

  tasks:
    # Create an instance with a boot volume instead of ephemeral disk
    - name: Create boot-from-volume instance
      openstack.cloud.server:
        cloud: "{{ cloud_name }}"
        name: persistent-vm-01
        image: ubuntu-22.04
        flavor: m1.large
        key_name: deploy-key
        network: app-net
        security_groups: [default, sg-app]
        boot_from_volume: true
        volume_size: 100
        terminate_volume: false
        state: present
        wait: true
```

Setting `terminate_volume: false` means the boot volume survives even if you delete the instance. This is useful for VMs where you want to preserve the root disk for forensics or rebuilding.

## Building a Dynamic Inventory After Provisioning

After creating instances, build a dynamic inventory so Ansible can configure them.

```yaml
# playbooks/provision-and-configure.yml
---
- name: Provision instances
  hosts: localhost
  gather_facts: false
  vars:
    cloud_name: production
  tasks:
    - name: Create web instances
      openstack.cloud.server:
        cloud: "{{ cloud_name }}"
        name: "web-{{ item }}"
        image: ubuntu-22.04
        flavor: m1.medium
        key_name: deploy-key
        network: web-net
        security_groups: [default, sg-web]
        state: present
        wait: true
      loop: ["01", "02", "03"]
      register: web_instances

    # Build an in-memory inventory from created instances
    - name: Add instances to inventory
      ansible.builtin.add_host:
        name: "{{ item.server.name }}"
        ansible_host: "{{ item.server.addresses['web-net'][0].addr }}"
        ansible_user: ubuntu
        ansible_ssh_private_key_file: ~/.ssh/deploy-key.pem
        groups: webservers
      loop: "{{ web_instances.results }}"
      loop_control:
        label: "{{ item.server.name }}"

- name: Configure web servers
  hosts: webservers
  become: true
  gather_facts: true
  tasks:
    - name: Wait for connection
      ansible.builtin.wait_for_connection:
        delay: 15
        timeout: 300

    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present
        update_cache: true

    - name: Start nginx
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true
```

## Cleanup and Teardown

Tearing down instances is just as important as creating them. Here is a playbook for clean removal.

```yaml
# playbooks/teardown-instances.yml
---
- name: Teardown OpenStack instances
  hosts: localhost
  gather_facts: false

  vars:
    cloud_name: production
    instances_to_remove:
      - web-01
      - web-02
      - app-01
      - db-01

  tasks:
    # Remove instances and their floating IPs
    - name: Delete instances
      openstack.cloud.server:
        cloud: "{{ cloud_name }}"
        name: "{{ item }}"
        state: absent
        wait: true
      loop: "{{ instances_to_remove }}"
      loop_control:
        label: "{{ item }}"

    # Clean up orphaned volumes
    - name: Delete associated volumes
      openstack.cloud.volume:
        cloud: "{{ cloud_name }}"
        name: "{{ item }}"
        state: absent
      loop:
        - db-01-data
        - db-01-logs
```

## Tips from Production

1. **Always set `wait: true` and a reasonable `timeout`.** Without waiting, subsequent tasks that depend on the instance being ready will fail.
2. **Use boot-from-volume for anything important.** Ephemeral disks vanish when the instance is deleted or the compute host fails.
3. **Tag your instances.** OpenStack metadata and server tags help with organization, billing, and dynamic inventory grouping.
4. **Pre-create your networks and security groups.** Instance creation playbooks are cleaner when they reference existing resources rather than creating everything inline.
5. **Cloud-init is your friend for bootstrap, but not for ongoing management.** Use it for the initial setup, then switch to Ansible for day-to-day configuration.

With these patterns, you can go from zero to a fully provisioned multi-tier application environment in OpenStack with a single `ansible-playbook` command.
