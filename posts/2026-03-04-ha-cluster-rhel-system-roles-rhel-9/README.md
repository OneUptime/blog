# How to Configure a High Availability Cluster Using RHEL System Roles on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, System Roles, Ansible, High Availability, Pacemaker, Cluster, Linux

Description: Learn how to use RHEL System Roles to automate the configuration of a Pacemaker high availability cluster on RHEL.

---

RHEL System Roles provide Ansible roles for automating system configuration, including high availability clusters. The `ha_cluster` system role automates Pacemaker cluster setup, resource creation, and constraint configuration on RHEL.

## Prerequisites

- A control node with Ansible installed
- Two or more RHEL target nodes
- RHEL System Roles installed on the control node
- SSH access from the control node to target nodes

## Installing RHEL System Roles

On the Ansible control node:

```bash
sudo dnf install rhel-system-roles -y
```

The HA cluster role is installed at `/usr/share/ansible/roles/rhel-system-roles.ha_cluster/`.

## Creating the Inventory

```ini
# inventory/hosts
[ha_cluster]
node1 ansible_host=192.168.1.11
node2 ansible_host=192.168.1.12

[ha_cluster:vars]
ansible_user=admin
ansible_become=true
```

## Writing the Playbook

Create a playbook for a basic two-node cluster:

```yaml
---
# ha-cluster.yml
- name: Configure HA Cluster
  hosts: ha_cluster
  vars:
    ha_cluster_cluster_name: my-cluster
    ha_cluster_hacluster_password: "SecurePassword123"
    ha_cluster_enable_repos: true

    ha_cluster_resource_primitives:
      - id: ClusterVIP
        agent: "ocf:heartbeat:IPaddr2"
        instance_attrs:
          - attrs:
              - name: ip
                value: "192.168.1.100"
              - name: cidr_netmask
                value: "24"
        operations:
          - action: monitor
            attrs:
              - name: interval
                value: "30s"

      - id: WebServer
        agent: "ocf:heartbeat:apache"
        instance_attrs:
          - attrs:
              - name: configfile
                value: "/etc/httpd/conf/httpd.conf"
              - name: statusurl
                value: "http://127.0.0.1/server-status"
        operations:
          - action: monitor
            attrs:
              - name: interval
                value: "30s"

    ha_cluster_resource_groups:
      - id: WebGroup
        resource_ids:
          - ClusterVIP
          - WebServer

  roles:
    - rhel-system-roles.ha_cluster
```

## Adding STONITH Configuration

Include fencing in the playbook:

```yaml
    ha_cluster_cluster_properties:
      - attrs:
          - name: stonith-enabled
            value: "true"

    ha_cluster_fence_agents:
      - id: fence-node1
        agent: "fence_ipmilan"
        instance_attrs:
          - attrs:
              - name: ipaddr
                value: "10.0.0.101"
              - name: login
                value: "admin"
              - name: passwd
                value: "password"
              - name: lanplus
                value: "1"
              - name: pcmk_host_list
                value: "node1"

      - id: fence-node2
        agent: "fence_ipmilan"
        instance_attrs:
          - attrs:
              - name: ipaddr
                value: "10.0.0.102"
              - name: login
                value: "admin"
              - name: passwd
                value: "password"
              - name: lanplus
                value: "1"
              - name: pcmk_host_list
                value: "node2"
```

## Adding Constraints

Add constraints to the playbook:

```yaml
    ha_cluster_constraints_location:
      - resource:
          id: fence-node1
        node: node1
        score: "-INFINITY"
      - resource:
          id: fence-node2
        node: node2
        score: "-INFINITY"
```

## Running the Playbook

```bash
ansible-playbook -i inventory/hosts ha-cluster.yml
```

## Verifying the Result

SSH to a cluster node and check status:

```bash
sudo pcs status
```

## Idempotent Configuration

The ha_cluster role is idempotent. Running it again will not disrupt an already configured cluster. This makes it safe to run as part of regular configuration management.

## Using Vault for Passwords

Store the hacluster password securely:

```bash
ansible-vault create group_vars/ha_cluster/vault.yml
```

Add:

```yaml
ha_cluster_hacluster_password: "SecurePassword123"
```

Reference in the playbook and run with:

```bash
ansible-playbook -i inventory/hosts ha-cluster.yml --ask-vault-pass
```

## Conclusion

RHEL System Roles automate HA cluster configuration on RHEL with Ansible. Define your cluster resources, constraints, and fencing in a playbook and apply it consistently across your infrastructure. This eliminates manual configuration errors and provides repeatable deployments.
