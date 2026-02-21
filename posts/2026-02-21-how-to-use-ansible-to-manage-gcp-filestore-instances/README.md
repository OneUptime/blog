# How to Use Ansible to Manage GCP Filestore Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, GCP, Filestore, NFS, Shared Storage

Description: Practical guide to provisioning and managing GCP Filestore NFS instances with Ansible for shared file storage across VMs and GKE clusters.

---

Filestore is Google Cloud's managed NFS file server. It provides a network-attached storage solution that multiple VMs or containers can mount simultaneously. If you have ever set up an NFS server manually, you know it involves a fair amount of configuration and ongoing maintenance. Filestore eliminates all of that. In this post, we will automate Filestore provisioning and management with Ansible.

## When to Use Filestore

Filestore is the right choice when you need:

- Shared file storage that multiple VMs can read and write to simultaneously
- A persistent file system for GKE pods that need `ReadWriteMany` access
- Media processing pipelines where multiple workers need access to the same files
- Legacy applications that expect a POSIX file system
- Content management systems that store uploads on a shared file system

## Filestore Tiers

Filestore offers several tiers with different performance characteristics:

- **BASIC_HDD**: Standard capacity, HDD-backed. Good for general file sharing.
- **BASIC_SSD**: Standard capacity, SSD-backed. Better performance for latency-sensitive workloads.
- **HIGH_SCALE_SSD**: High performance, up to 100TB. For demanding workloads.
- **ENTERPRISE**: Multi-zone availability with snapshots. For production critical data.

## Prerequisites

- Ansible 2.10+ with the `google.cloud` collection
- A GCP service account with Filestore Editor permissions
- The Filestore API enabled

```bash
# Install the GCP collection
ansible-galaxy collection install google.cloud

# Enable the Filestore API
gcloud services enable file.googleapis.com --project=my-project-id
```

## Creating a Basic Filestore Instance

Let us start with a basic HDD-backed Filestore instance.

```yaml
# create-filestore.yml - Provision a basic Filestore NFS instance
---
- name: Create GCP Filestore Instance
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    gcp_project: "my-project-id"
    gcp_auth_kind: "serviceaccount"
    gcp_service_account_file: "/path/to/service-account-key.json"
    zone: "us-central1-a"

  tasks:
    - name: Create a Filestore instance
      google.cloud.gcp_filestore_instance:
        name: "shared-storage"
        zone: "{{ zone }}"
        tier: "BASIC_HDD"
        file_shares:
          - name: "data"
            capacity_gb: 1024
        networks:
          - network: "default"
            modes:
              - "MODE_IPV4"
        labels:
          environment: "production"
          purpose: "shared-storage"
          managed_by: "ansible"
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_auth_kind }}"
        service_account_file: "{{ gcp_service_account_file }}"
        state: present
      register: filestore

    - name: Show Filestore details
      ansible.builtin.debug:
        msg: |
          Filestore created: {{ filestore.name }}
          Tier: BASIC_HDD
          Share name: data
          Capacity: 1024 GB
          IP Address: {{ filestore.networks[0].ipAddresses[0] }}
          Mount command: mount {{ filestore.networks[0].ipAddresses[0] }}:/data /mnt/shared
```

## Creating an SSD-Backed Instance

For workloads that need better performance, use the BASIC_SSD tier.

```yaml
# create-filestore-ssd.yml - Create an SSD-backed Filestore instance
---
- name: Create SSD Filestore Instance
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    gcp_project: "my-project-id"
    gcp_auth_kind: "serviceaccount"
    gcp_service_account_file: "/path/to/service-account-key.json"
    zone: "us-central1-a"

  tasks:
    - name: Create SSD Filestore instance
      google.cloud.gcp_filestore_instance:
        name: "fast-storage"
        zone: "{{ zone }}"
        tier: "BASIC_SSD"
        file_shares:
          - name: "appdata"
            capacity_gb: 2560
        networks:
          - network: "default"
            modes:
              - "MODE_IPV4"
            # Reserve a specific IP range for the Filestore
            reserved_ip_range: "10.0.100.0/29"
        labels:
          environment: "production"
          tier: "ssd"
          managed_by: "ansible"
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_auth_kind }}"
        service_account_file: "{{ gcp_service_account_file }}"
        state: present
      register: filestore

    - name: Show mount information
      ansible.builtin.debug:
        msg: |
          SSD Filestore: {{ filestore.name }}
          IP: {{ filestore.networks[0].ipAddresses[0] }}
          Mount: {{ filestore.networks[0].ipAddresses[0] }}:/appdata
```

## Filestore Architecture

```mermaid
graph TD
    A[Filestore Instance] -->|NFS Export| B[/data share]
    C[VM Instance 1] -->|mount| B
    D[VM Instance 2] -->|mount| B
    E[VM Instance 3] -->|mount| B
    F[GKE Pod 1] -->|PV/PVC| B
    G[GKE Pod 2] -->|PV/PVC| B
    H[Ansible] -->|Filestore API| A
    I[VPC Network] --- A
    I --- C
    I --- D
    I --- E
```

## Mounting Filestore on VMs

After creating the Filestore instance, you need to mount it on your VMs. Here is a playbook that handles both the NFS client installation and the mount.

```yaml
# mount-filestore.yml - Mount Filestore on application VMs
---
- name: Mount Filestore on VMs
  hosts: app_servers
  become: true
  gather_facts: true

  vars:
    filestore_ip: "10.0.100.2"
    share_name: "appdata"
    mount_point: "/mnt/shared"

  tasks:
    - name: Install NFS client packages (Ubuntu/Debian)
      ansible.builtin.apt:
        name: nfs-common
        state: present
        update_cache: true
      when: ansible_os_family == "Debian"

    - name: Install NFS client packages (CentOS/RHEL)
      ansible.builtin.yum:
        name: nfs-utils
        state: present
      when: ansible_os_family == "RedHat"

    - name: Create the mount point directory
      ansible.builtin.file:
        path: "{{ mount_point }}"
        state: directory
        mode: "0755"

    - name: Mount the Filestore share
      ansible.posix.mount:
        path: "{{ mount_point }}"
        src: "{{ filestore_ip }}:/{{ share_name }}"
        fstype: nfs
        opts: "defaults,_netdev,nofail"
        state: mounted

    - name: Verify the mount
      ansible.builtin.command: df -h {{ mount_point }}
      register: mount_check
      changed_when: false

    - name: Show mount status
      ansible.builtin.debug:
        msg: "{{ mount_check.stdout }}"
```

## Creating Filestore for a Custom VPC

In production, you usually have a custom VPC with specific subnets. Here is how to attach Filestore to a non-default network.

```yaml
# filestore-custom-vpc.yml - Filestore on a custom VPC network
---
- name: Create Filestore on Custom VPC
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    gcp_project: "my-project-id"
    gcp_auth_kind: "serviceaccount"
    gcp_service_account_file: "/path/to/service-account-key.json"
    zone: "us-central1-a"

  tasks:
    - name: Create Filestore on custom network
      google.cloud.gcp_filestore_instance:
        name: "app-shared-files"
        zone: "{{ zone }}"
        tier: "BASIC_SSD"
        file_shares:
          - name: "uploads"
            capacity_gb: 2560
        networks:
          - network: "production-vpc"
            modes:
              - "MODE_IPV4"
            reserved_ip_range: "10.10.50.0/29"
        labels:
          environment: "production"
          application: "cms"
          managed_by: "ansible"
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_auth_kind }}"
        service_account_file: "{{ gcp_service_account_file }}"
        state: present
      register: filestore

    - name: Show connection details
      ansible.builtin.debug:
        msg: |
          Filestore instance: {{ filestore.name }}
          Network: production-vpc
          IP: {{ filestore.networks[0].ipAddresses[0] }}
          Share: uploads
          Capacity: 2560 GB
```

## Complete Workflow: Filestore + VMs

Here is a complete playbook that creates a Filestore instance and then mounts it on a group of VMs.

```yaml
# complete-filestore-setup.yml - End-to-end Filestore setup
---
- name: Create Filestore Instance
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    gcp_project: "my-project-id"
    gcp_auth_kind: "serviceaccount"
    gcp_service_account_file: "/path/to/service-account-key.json"
    zone: "us-central1-a"

  tasks:
    - name: Provision the Filestore instance
      google.cloud.gcp_filestore_instance:
        name: "media-storage"
        zone: "{{ zone }}"
        tier: "BASIC_SSD"
        file_shares:
          - name: "media"
            capacity_gb: 2560
        networks:
          - network: "default"
            modes:
              - "MODE_IPV4"
        labels:
          environment: "production"
          managed_by: "ansible"
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_auth_kind }}"
        service_account_file: "{{ gcp_service_account_file }}"
        state: present
      register: filestore

    - name: Save Filestore IP for later plays
      ansible.builtin.set_fact:
        filestore_ip: "{{ filestore.networks[0].ipAddresses[0] }}"

    - name: Add Filestore IP to group vars
      ansible.builtin.add_host:
        name: "filestore_config"
        groups: filestore_vars
        filestore_ip: "{{ filestore_ip }}"
        share_name: "media"

- name: Configure VMs to Use Filestore
  hosts: media_workers
  become: true

  vars:
    filestore_ip: "{{ hostvars['filestore_config']['filestore_ip'] }}"
    share_name: "{{ hostvars['filestore_config']['share_name'] }}"
    mount_point: "/mnt/media"

  tasks:
    - name: Install NFS client
      ansible.builtin.apt:
        name: nfs-common
        state: present
        update_cache: true

    - name: Create mount directory
      ansible.builtin.file:
        path: "{{ mount_point }}"
        state: directory
        mode: "0755"

    - name: Mount the NFS share
      ansible.posix.mount:
        path: "{{ mount_point }}"
        src: "{{ filestore_ip }}:/{{ share_name }}"
        fstype: nfs
        opts: "defaults,_netdev,nofail,rw"
        state: mounted

    - name: Create application subdirectories
      ansible.builtin.file:
        path: "{{ mount_point }}/{{ item }}"
        state: directory
        mode: "0755"
      loop:
        - "uploads"
        - "processed"
        - "thumbnails"
        - "temp"
```

## Scaling Filestore

You can increase the capacity of a Filestore instance without downtime.

```yaml
# scale-filestore.yml - Increase Filestore capacity
---
- name: Scale Filestore Instance
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    gcp_project: "my-project-id"
    gcp_auth_kind: "serviceaccount"
    gcp_service_account_file: "/path/to/service-account-key.json"
    zone: "us-central1-a"

  tasks:
    - name: Increase Filestore capacity from 1TB to 2TB
      google.cloud.gcp_filestore_instance:
        name: "shared-storage"
        zone: "{{ zone }}"
        tier: "BASIC_HDD"
        file_shares:
          - name: "data"
            # Increased from 1024 to 2048
            capacity_gb: 2048
        networks:
          - network: "default"
            modes:
              - "MODE_IPV4"
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_auth_kind }}"
        service_account_file: "{{ gcp_service_account_file }}"
        state: present

    - name: Scaling complete
      ansible.builtin.debug:
        msg: |
          Filestore capacity increased to 2048 GB.
          No remount required on clients.
```

## Cleanup

```yaml
# cleanup-filestore.yml - Remove Filestore instances
---
- name: Cleanup Filestore
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    gcp_project: "my-project-id"
    gcp_auth_kind: "serviceaccount"
    gcp_service_account_file: "/path/to/service-account-key.json"
    zone: "us-central1-a"

  tasks:
    - name: Delete the Filestore instance
      google.cloud.gcp_filestore_instance:
        name: "shared-storage"
        zone: "{{ zone }}"
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_auth_kind }}"
        service_account_file: "{{ gcp_service_account_file }}"
        state: absent
```

## Best Practices

1. **Choose the right tier.** BASIC_HDD is fine for archival and infrequent access. BASIC_SSD for active workloads. ENTERPRISE for production data that needs multi-zone availability.

2. **Use reserved IP ranges.** Specifying a reserved IP range prevents conflicts with other services on your network and makes firewall rules more predictable.

3. **Plan your capacity.** BASIC_HDD minimum is 1TB, BASIC_SSD minimum is 2.5TB. You cannot go below these minimums.

4. **Set up NFS mount options properly.** Always use `_netdev` and `nofail` in your mount options. `_netdev` tells the system to wait for the network before mounting. `nofail` prevents boot failures if the NFS server is temporarily unreachable.

5. **Use Filestore with GKE.** Filestore integrates well with GKE through the Filestore CSI driver, providing `ReadWriteMany` persistent volumes.

6. **Monitor usage.** Set up alerts in Cloud Monitoring for capacity utilization. Running out of space on a shared file system affects all clients at once.

## Conclusion

Filestore provides a simple, managed NFS solution that works well for shared storage scenarios on GCP. Ansible makes it easy to provision Filestore instances, mount them on VMs, and manage the entire lifecycle. By defining your Filestore configuration in playbooks, you ensure consistent deployments across environments and have a clear record of your storage infrastructure.
