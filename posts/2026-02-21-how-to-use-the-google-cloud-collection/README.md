# How to Use the google.cloud Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Google Cloud, GCP, Cloud Automation, Infrastructure as Code

Description: Manage Google Cloud Platform resources with Ansible using the google.cloud collection for Compute Engine, GKE, Cloud Storage, and networking.

---

Google Cloud Platform has a solid Ansible integration through the `google.cloud` collection. Whether you are spinning up Compute Engine instances, managing GKE clusters, configuring Cloud Storage buckets, or setting up VPC networks, this collection lets you do it all from your playbooks. It is maintained by Google and covers a wide range of GCP services.

## Installing the Collection

The collection requires the `google-auth` Python library and optionally `requests`.

```bash
# Install the collection
ansible-galaxy collection install google.cloud

# Install Python dependencies
pip install google-auth requests
```

## Authentication

GCP authentication is handled through service account credentials. You have a few options.

```bash
# Option 1: Set the environment variable to your service account key file
export GCP_SERVICE_ACCOUNT_FILE="/path/to/service-account.json"
export GCP_PROJECT="my-gcp-project"

# Option 2: Use application default credentials
gcloud auth application-default login
```

You can also pass credentials directly in your playbook.

```yaml
# playbook-auth-example.yml - explicit credential configuration
- hosts: localhost
  vars:
    gcp_project: "my-gcp-project"
    gcp_cred_kind: "serviceaccount"
    gcp_cred_file: "{{ lookup('env', 'GCP_SERVICE_ACCOUNT_FILE') }}"
    gcp_region: "us-central1"
    gcp_zone: "us-central1-a"
  tasks:
    - name: List all instances
      google.cloud.gcp_compute_instance_info:
        zone: "{{ gcp_zone }}"
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_cred_kind }}"
        service_account_file: "{{ gcp_cred_file }}"
      register: instances
```

## Creating VPC Networks

Start with networking. GCP uses VPC networks and subnets.

```yaml
# playbook-vpc.yml - create VPC network with subnets
- hosts: localhost
  vars:
    gcp_project: "my-gcp-project"
    gcp_cred_kind: "serviceaccount"
    gcp_cred_file: "{{ lookup('env', 'GCP_SERVICE_ACCOUNT_FILE') }}"
  tasks:
    - name: Create a custom VPC network
      google.cloud.gcp_compute_network:
        name: "myapp-vpc"
        auto_create_subnetworks: false
        routing_config:
          routing_mode: "REGIONAL"
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_cred_kind }}"
        service_account_file: "{{ gcp_cred_file }}"
        state: present
      register: vpc_network

    - name: Create subnet for web tier
      google.cloud.gcp_compute_subnetwork:
        name: "myapp-web-subnet"
        ip_cidr_range: "10.0.1.0/24"
        region: "us-central1"
        network: "{{ vpc_network }}"
        private_ip_google_access: true
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_cred_kind }}"
        service_account_file: "{{ gcp_cred_file }}"
        state: present
      register: web_subnet

    - name: Create subnet for database tier
      google.cloud.gcp_compute_subnetwork:
        name: "myapp-db-subnet"
        ip_cidr_range: "10.0.2.0/24"
        region: "us-central1"
        network: "{{ vpc_network }}"
        private_ip_google_access: true
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_cred_kind }}"
        service_account_file: "{{ gcp_cred_file }}"
        state: present
```

## Configuring Firewall Rules

GCP firewall rules control traffic at the network level.

```yaml
# playbook-firewall.yml - create firewall rules
- hosts: localhost
  vars:
    gcp_project: "my-gcp-project"
    gcp_cred_kind: "serviceaccount"
    gcp_cred_file: "{{ lookup('env', 'GCP_SERVICE_ACCOUNT_FILE') }}"
  tasks:
    - name: Allow HTTP and HTTPS traffic to web servers
      google.cloud.gcp_compute_firewall:
        name: "allow-web-traffic"
        network:
          selfLink: "projects/{{ gcp_project }}/global/networks/myapp-vpc"
        allowed:
          - ip_protocol: tcp
            ports:
              - "80"
              - "443"
        source_ranges:
          - "0.0.0.0/0"
        target_tags:
          - "web-server"
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_cred_kind }}"
        service_account_file: "{{ gcp_cred_file }}"
        state: present

    - name: Allow SSH from internal network only
      google.cloud.gcp_compute_firewall:
        name: "allow-internal-ssh"
        network:
          selfLink: "projects/{{ gcp_project }}/global/networks/myapp-vpc"
        allowed:
          - ip_protocol: tcp
            ports:
              - "22"
        source_ranges:
          - "10.0.0.0/16"
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_cred_kind }}"
        service_account_file: "{{ gcp_cred_file }}"
        state: present
```

## Launching Compute Engine Instances

With networking ready, create instances.

```yaml
# playbook-instances.yml - launch Compute Engine instances
- hosts: localhost
  vars:
    gcp_project: "my-gcp-project"
    gcp_cred_kind: "serviceaccount"
    gcp_cred_file: "{{ lookup('env', 'GCP_SERVICE_ACCOUNT_FILE') }}"
    gcp_zone: "us-central1-a"
  tasks:
    - name: Create a boot disk
      google.cloud.gcp_compute_disk:
        name: "web-server-1-boot"
        size_gb: 50
        type: "pd-ssd"
        source_image: "projects/ubuntu-os-cloud/global/images/family/ubuntu-2204-lts"
        zone: "{{ gcp_zone }}"
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_cred_kind }}"
        service_account_file: "{{ gcp_cred_file }}"
        state: present
      register: boot_disk

    - name: Create a static external IP
      google.cloud.gcp_compute_address:
        name: "web-server-1-ip"
        region: "us-central1"
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_cred_kind }}"
        service_account_file: "{{ gcp_cred_file }}"
        state: present
      register: static_ip

    - name: Launch the web server instance
      google.cloud.gcp_compute_instance:
        name: "web-server-1"
        machine_type: "e2-standard-2"
        zone: "{{ gcp_zone }}"
        disks:
          - auto_delete: true
            boot: true
            source: "{{ boot_disk }}"
        network_interfaces:
          - network:
              selfLink: "projects/{{ gcp_project }}/global/networks/myapp-vpc"
            subnetwork:
              selfLink: "projects/{{ gcp_project }}/regions/us-central1/subnetworks/myapp-web-subnet"
            access_configs:
              - name: "External NAT"
                nat_ip: "{{ static_ip }}"
                type: "ONE_TO_ONE_NAT"
        tags:
          items:
            - web-server
        metadata:
          startup-script: |
            #!/bin/bash
            apt-get update
            apt-get install -y nginx
        labels:
          environment: production
          managed_by: ansible
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_cred_kind }}"
        service_account_file: "{{ gcp_cred_file }}"
        state: present
      register: instance
```

## Managing Cloud Storage Buckets

Cloud Storage buckets for object storage.

```yaml
# playbook-storage.yml - manage Cloud Storage buckets
- hosts: localhost
  vars:
    gcp_project: "my-gcp-project"
    gcp_cred_kind: "serviceaccount"
    gcp_cred_file: "{{ lookup('env', 'GCP_SERVICE_ACCOUNT_FILE') }}"
  tasks:
    - name: Create a storage bucket with lifecycle rules
      google.cloud.gcp_storage_bucket:
        name: "myapp-backups-{{ gcp_project }}"
        location: "US"
        storage_class: "STANDARD"
        versioning:
          enabled: true
        lifecycle:
          rule:
            - action:
                type: "Delete"
              condition:
                age: 90  # delete objects older than 90 days
            - action:
                type: "SetStorageClass"
                storage_class: "NEARLINE"
              condition:
                age: 30  # move to nearline after 30 days
        labels:
          project: myapp
          managed_by: ansible
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_cred_kind }}"
        service_account_file: "{{ gcp_cred_file }}"
        state: present
```

## Managing GKE Clusters

The collection can create and manage Google Kubernetes Engine clusters.

```yaml
# playbook-gke.yml - create a GKE cluster
- hosts: localhost
  vars:
    gcp_project: "my-gcp-project"
    gcp_cred_kind: "serviceaccount"
    gcp_cred_file: "{{ lookup('env', 'GCP_SERVICE_ACCOUNT_FILE') }}"
    gcp_zone: "us-central1-a"
  tasks:
    - name: Create a GKE cluster
      google.cloud.gcp_container_cluster:
        name: "myapp-cluster"
        initial_node_count: 3
        location: "us-central1"
        network: "myapp-vpc"
        subnetwork: "myapp-web-subnet"
        ip_allocation_policy:
          use_ip_aliases: true
        master_auth:
          client_certificate_config:
            issue_client_certificate: false
        node_config:
          machine_type: "e2-standard-4"
          disk_size_gb: 100
          disk_type: "pd-ssd"
          oauth_scopes:
            - "https://www.googleapis.com/auth/cloud-platform"
          labels:
            environment: production
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_cred_kind }}"
        service_account_file: "{{ gcp_cred_file }}"
        state: present
      register: cluster

    - name: Create a separate node pool for workers
      google.cloud.gcp_container_node_pool:
        name: "worker-pool"
        cluster: "{{ cluster }}"
        location: "us-central1"
        initial_node_count: 2
        autoscaling:
          enabled: true
          min_node_count: 2
          max_node_count: 10
        config:
          machine_type: "e2-standard-8"
          disk_size_gb: 200
          preemptible: false
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_cred_kind }}"
        service_account_file: "{{ gcp_cred_file }}"
        state: present
```

## Using the GCP Dynamic Inventory

The collection includes an inventory plugin for pulling Compute Engine instances dynamically.

```yaml
# inventory/gcp.yml - dynamic inventory from GCP
plugin: google.cloud.gcp_compute
projects:
  - my-gcp-project
zones:
  - us-central1-a
  - us-central1-b
  - us-central1-c
filters:
  - labels.managed_by = ansible
  - status = RUNNING
keyed_groups:
  - key: labels.environment
    prefix: env
  - key: labels.role
    prefix: role
  - key: zone
    prefix: zone
hostnames:
  - private_ip
compose:
  ansible_host: networkInterfaces[0].networkIP
auth_kind: serviceaccount
service_account_file: "{{ lookup('env', 'GCP_SERVICE_ACCOUNT_FILE') }}"
```

## Practical Tips

From running this collection in production GCP environments, here is what I have found:

1. **Use service accounts with minimal permissions.** Create a dedicated service account for Ansible and grant only the roles it needs. Do not use an owner or editor role.

2. **Labels are your friend.** Like AWS tags, GCP labels help you filter and organize resources. Always add a `managed_by: ansible` label so you can distinguish automated resources from manual ones.

3. **Prefer regional resources.** When possible, use regional instead of zonal resources for better availability. The collection supports both.

4. **Combine with `gcloud` for gaps.** Not every GCP service has a module yet. For unsupported services, use the `ansible.builtin.command` module with `gcloud` CLI commands as a fallback.

5. **State management is limited.** Unlike Terraform, Ansible does not track state. If you delete a resource manually, Ansible will not know about it. Use labels and the `_info` modules to check current state before making changes.

The `google.cloud` collection gives you a solid foundation for GCP automation within Ansible. It works particularly well when combined with configuration management tasks that Ansible already excels at.
