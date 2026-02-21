# How to Use Ansible meta refresh_inventory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Meta, Dynamic Inventory, Infrastructure

Description: Learn how to use Ansible meta refresh_inventory to reload inventory data mid-playbook when hosts or groups change dynamically.

---

Dynamic inventories are powerful because they reflect the current state of your infrastructure. But what happens when your playbook itself changes that infrastructure? If you create new VMs, register hosts in a CMDB, or modify group membership during a play, the inventory data Ansible loaded at the start becomes stale. The `meta: refresh_inventory` directive tells Ansible to re-read the inventory sources and update its internal host and group data without restarting the playbook.

## When You Need refresh_inventory

The most common scenario is a two-phase playbook: the first phase creates infrastructure (VMs, containers, cloud instances), and the second phase configures that infrastructure. Without refreshing, Ansible does not know about the new hosts.

```yaml
# The problem: new hosts are not visible
---
- name: Phase 1 - Create infrastructure
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Create new VMs
      ansible.builtin.command:
        cmd: terraform apply -auto-approve
      args:
        chdir: /opt/terraform/web-cluster

    # At this point, the dynamic inventory plugin would return new hosts
    # but Ansible still has the old inventory in memory

- name: Phase 2 - Configure new hosts (PROBLEM: they are not in inventory yet)
  hosts: new_webservers
  become: true

  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present
    # This play might target zero hosts because the inventory was not refreshed
```

## Basic refresh_inventory Usage

Insert `meta: refresh_inventory` between the infrastructure creation and configuration phases.

```yaml
# Solution: refresh inventory between phases
---
- name: Phase 1 - Create infrastructure
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Create EC2 instances
      amazon.aws.ec2_instance:
        name: "web-{{ item }}"
        instance_type: t3.medium
        image_id: ami-0abcdef1234567890
        tags:
          Role: webserver
          Environment: production
      loop: "{{ range(1, 4) | list }}"
      register: ec2_result

    - name: Wait for instances to be reachable
      ansible.builtin.wait_for:
        host: "{{ item.instances[0].public_ip_address }}"
        port: 22
        delay: 10
        timeout: 300
      loop: "{{ ec2_result.results }}"

    - name: Refresh inventory to pick up new instances
      ansible.builtin.meta: refresh_inventory

- name: Phase 2 - Configure new instances
  hosts: tag_Role_webserver
  become: true
  gather_facts: true

  tasks:
    - name: Install web server packages
      ansible.builtin.apt:
        name:
          - nginx
          - certbot
        state: present
        update_cache: true

    - name: Deploy application
      ansible.builtin.copy:
        src: app/
        dest: /opt/app/
```

Now when Phase 2 starts, the `tag_Role_webserver` group includes the newly created instances because the dynamic inventory was re-queried.

## Use Case: Cloud Auto-Scaling

When your playbook triggers auto-scaling events, you need to refresh to see the new instances.

```yaml
# Auto-scaling with inventory refresh
---
- name: Scale and configure web tier
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Get current instance count
      amazon.aws.ec2_instance_info:
        filters:
          "tag:AutoScaleGroup": web-asg
          instance-state-name: running
      register: current_instances

    - name: Scale up if needed
      amazon.aws.autoscaling_group:
        name: web-asg
        desired_capacity: "{{ target_capacity }}"
      when: current_instances.instances | length < target_capacity | int

    - name: Wait for new instances to launch
      ansible.builtin.pause:
        seconds: 60
      when: current_instances.instances | length < target_capacity | int

    - name: Refresh inventory to see new instances
      ansible.builtin.meta: refresh_inventory

- name: Configure all web instances
  hosts: tag_AutoScaleGroup_web_asg
  become: true
  gather_facts: true

  tasks:
    - name: Ensure latest application version
      ansible.builtin.copy:
        src: "app-{{ app_version }}.jar"
        dest: /opt/app/app.jar
      notify: restart app

  handlers:
    - name: restart app
      ansible.builtin.systemd:
        name: app
        state: restarted
```

## Use Case: Container Orchestration

When creating Docker containers or Kubernetes pods that should be managed by Ansible.

```yaml
# Create containers and configure them
---
- name: Create application containers
  hosts: docker_hosts
  become: true

  tasks:
    - name: Start application containers
      community.docker.docker_container:
        name: "app-{{ item }}"
        image: "myapp:{{ app_version }}"
        state: started
        networks:
          - name: app-network
        labels:
          ansible_managed: "true"
      loop: "{{ range(1, app_replicas | int + 1) | list }}"

    - name: Refresh inventory to discover containers
      ansible.builtin.meta: refresh_inventory

- name: Configure application containers
  hosts: docker_containers
  connection: docker
  gather_facts: false

  tasks:
    - name: Copy configuration
      ansible.builtin.copy:
        src: app-config.yml
        dest: /etc/app/config.yml

    - name: Signal application to reload config
      ansible.builtin.command:
        cmd: kill -HUP 1
```

## Use Case: CMDB Registration

When you register hosts in a Configuration Management Database during the playbook, and a later play needs to query that CMDB-backed inventory.

```yaml
# Register hosts in CMDB and refresh
---
- name: Provision and register new servers
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Create virtual machines
      ansible.builtin.command:
        cmd: /opt/scripts/create-vm.sh --name {{ item }} --role webserver
      loop:
        - web-new-01
        - web-new-02
      register: vm_creation

    - name: Register VMs in CMDB
      ansible.builtin.uri:
        url: "https://cmdb.example.com/api/v1/hosts"
        method: POST
        body_format: json
        body:
          hostname: "{{ item.item }}"
          role: webserver
          environment: production
          status: active
        headers:
          Authorization: "Bearer {{ cmdb_token }}"
      loop: "{{ vm_creation.results }}"

    - name: Wait for CMDB to sync
      ansible.builtin.pause:
        seconds: 15

    - name: Refresh inventory (CMDB dynamic inventory plugin will pick up new hosts)
      ansible.builtin.meta: refresh_inventory

- name: Configure newly registered hosts
  hosts: cmdb_role_webserver
  become: true
  gather_facts: true

  tasks:
    - name: Apply base configuration
      ansible.builtin.include_role:
        name: base_config
```

## Use Case: Group Membership Changes

When you modify group membership through external tools during a playbook run.

```yaml
# Modify groups and refresh
---
- name: Promote staging to production
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Update host labels to production
      ansible.builtin.command:
        cmd: >
          /opt/infra/relabel-hosts.sh
          --from-group staging_web
          --to-group production_web
      register: relabel_result

    - name: Refresh inventory to see group changes
      ansible.builtin.meta: refresh_inventory

- name: Apply production configuration to promoted hosts
  hosts: production_web
  become: true
  gather_facts: true

  tasks:
    - name: Apply production SSL certificates
      ansible.builtin.include_role:
        name: ssl_production

    - name: Apply production firewall rules
      ansible.builtin.include_role:
        name: firewall_production

    - name: Enable production monitoring
      ansible.builtin.include_role:
        name: monitoring_production
```

## Combining with add_host

The `add_host` module adds hosts to the in-memory inventory without querying external sources. You can use both `add_host` for immediate additions and `refresh_inventory` for full re-reads.

```yaml
# add_host for immediate use vs refresh_inventory for full refresh
---
- name: Create and immediately configure a host
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Create a VM and get its IP
      ansible.builtin.command:
        cmd: /opt/scripts/create-vm.sh --name test-server
      register: vm_result

    - name: Add host immediately (no refresh needed)
      ansible.builtin.add_host:
        name: "{{ vm_result.stdout_lines[0] }}"
        groups:
          - new_servers
        ansible_host: "{{ vm_result.stdout_lines[1] }}"
        ansible_user: ubuntu

- name: Configure new host (added via add_host)
  hosts: new_servers
  become: true
  gather_facts: true

  tasks:
    - name: Install packages
      ansible.builtin.apt:
        name: nginx
        state: present
        update_cache: true

- name: Final phase - refresh to see everything
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Full inventory refresh
      ansible.builtin.meta: refresh_inventory

- name: Verify all hosts
  hosts: all
  gather_facts: false

  tasks:
    - name: Ping all known hosts
      ansible.builtin.ping:
```

## Performance Considerations

Refreshing inventory can be slow if your dynamic inventory sources are complex or query slow APIs. Keep these tips in mind:

1. Only refresh when you have actually changed the infrastructure
2. Place the refresh between plays, not in the middle of a task list
3. If using multiple inventory sources, all of them are re-read on refresh
4. Add a pause before refreshing to give external systems time to update

```yaml
# Conditional refresh to avoid unnecessary delays
- name: Refresh only if infrastructure changed
  ansible.builtin.meta: refresh_inventory
  when: infrastructure_changed | default(false) | bool
```

## Limitations

There are some limitations to be aware of:

- `refresh_inventory` re-reads ALL inventory sources, not just one
- It cannot be targeted at a specific inventory plugin
- Variables set with `set_fact` on hosts that are removed from inventory are lost
- The refresh happens for the entire playbook context, affecting all subsequent plays

The `meta: refresh_inventory` directive bridges the gap between static playbook execution and dynamic infrastructure. It lets you write playbooks that create infrastructure and then configure it in a single run, which is essential for bootstrapping new environments, auto-scaling, and any workflow where the inventory changes during execution.
