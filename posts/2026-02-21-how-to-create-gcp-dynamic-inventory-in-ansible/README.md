# How to Create GCP Dynamic Inventory in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, GCP, Dynamic Inventory, Google Cloud, DevOps

Description: Set up the Google Cloud Platform dynamic inventory plugin in Ansible to automatically discover and organize Compute Engine instances for your automation workflows.

---

Google Cloud Platform infrastructure can scale rapidly with managed instance groups, preemptible VMs, and automated provisioning pipelines. Keeping a static inventory file in sync with all of that is impractical. The GCP inventory plugin queries the Compute Engine API directly, giving you an always-current view of your GCP instances.

## Prerequisites

Install the Google Cloud Ansible collection and the Python client library:

```bash
# Install the GCP Ansible collection
ansible-galaxy collection install google.cloud

# Install the required Python libraries
pip install google-auth google-api-python-client
```

Set up GCP authentication. The plugin supports service accounts and application default credentials:

```bash
# Option 1: Service account JSON key file
export GCP_SERVICE_ACCOUNT_FILE="/path/to/service-account.json"

# Option 2: Application default credentials (when running on GCP)
gcloud auth application-default login

# Option 3: Set project explicitly
export GCP_PROJECT="my-project-id"
```

## Basic GCP Inventory Configuration

Create a file ending in `gcp.yml` or `gcp.yaml`. The suffix tells Ansible to use the GCP compute inventory plugin.

```yaml
# inventory/gcp.yml
# Basic GCP dynamic inventory
plugin: google.cloud.gcp_compute

# GCP project to discover instances from
projects:
  - my-project-id

# Authentication
auth_kind: serviceaccount
service_account_file: /path/to/service-account.json

# Discover instances in these zones (or use regions)
zones: []
# Leave empty to discover across all zones
```

Test the configuration:

```bash
# List all discovered GCP instances
ansible-inventory -i inventory/gcp.yml --list

# Show the group hierarchy
ansible-inventory -i inventory/gcp.yml --graph
```

## Filtering Instances

Limit discovery to specific zones, regions, or labels:

```yaml
# inventory/gcp.yml
# Filter GCP instances
plugin: google.cloud.gcp_compute
projects:
  - my-project-id
auth_kind: serviceaccount
service_account_file: /path/to/service-account.json

# Only discover instances in US regions
zones:
  - us-east1-b
  - us-east1-c
  - us-central1-a
  - us-central1-b

# Filter by instance labels
filters:
  - "labels.managed_by = ansible"
  - "status = RUNNING"
```

The `filters` option uses GCP's list filter syntax, which is different from Ansible's Jinja2 expressions.

## Grouping Instances

Use `keyed_groups` to create Ansible groups from instance metadata:

```yaml
# inventory/gcp.yml
# Group instances by labels, zone, and machine type
plugin: google.cloud.gcp_compute
projects:
  - my-project-id
auth_kind: serviceaccount
service_account_file: /path/to/service-account.json

filters:
  - "status = RUNNING"

keyed_groups:
  # Group by the "role" label: creates groups like gcp_role_web
  - key: labels.role
    prefix: gcp_role
    separator: "_"

  # Group by the "environment" label
  - key: labels.environment
    prefix: gcp_env
    separator: "_"

  # Group by zone: creates groups like gcp_zone_us_east1_b
  - key: zone
    prefix: gcp_zone
    separator: "_"

  # Group by machine type
  - key: machineType
    prefix: gcp_type
    separator: "_"

  # Group by network tags
  - key: tags.items
    prefix: gcp_tag
    separator: "_"
```

With consistent labeling, an instance in `us-east1-b` labeled `role=web` and `environment=production` appears in:
- `gcp_role_web`
- `gcp_env_production`
- `gcp_zone_us_east1_b`

## Setting Hostnames

By default, the plugin uses the instance name. You can customize this:

```yaml
# inventory/gcp.yml
# Configure hostname behavior
plugin: google.cloud.gcp_compute
projects:
  - my-project-id
auth_kind: serviceaccount
service_account_file: /path/to/service-account.json

# Use instance name as the hostname (default)
hostnames:
  - name
  # Or use the private IP
  # - private_ip
  # Or use a custom hostname from metadata
  # - "metadata.items['ansible_hostname']"
```

## Composing Variables

Map GCP instance attributes to Ansible variables:

```yaml
# inventory/gcp.yml
# Map GCP attributes to Ansible variables
plugin: google.cloud.gcp_compute
projects:
  - my-project-id
auth_kind: serviceaccount
service_account_file: /path/to/service-account.json

filters:
  - "status = RUNNING"
  - "labels.managed_by = ansible"

hostnames:
  - name

keyed_groups:
  - key: labels.role
    prefix: role
    separator: "_"
  - key: labels.environment
    prefix: env
    separator: "_"
  - key: zone
    prefix: zone
    separator: "_"

compose:
  # Use the internal IP for SSH connections
  ansible_host: networkInterfaces[0].networkIP

  # Set the SSH user
  ansible_user: "'ansible'"

  # Map GCP attributes to variables
  gcp_zone: zone
  gcp_machine_type: machineType
  gcp_project: project
  gcp_instance_id: id
  gcp_status: status
  gcp_private_ip: networkInterfaces[0].networkIP
  gcp_public_ip: networkInterfaces[0].accessConfigs[0].natIP if networkInterfaces[0].accessConfigs else ''
  gcp_labels: labels
  gcp_network_tags: tags.items | default([])
```

## Complete Production Configuration

Here is a comprehensive configuration for production use:

```yaml
# inventory/gcp.yml
# Production GCP dynamic inventory
plugin: google.cloud.gcp_compute

# Multiple projects
projects:
  - my-project-prod
  - my-project-shared-services

# Authentication
auth_kind: serviceaccount
service_account_file: /opt/ansible/gcp-sa-key.json

# All zones (leave empty for all)
zones: []

# Only running, Ansible-managed instances
filters:
  - "status = RUNNING"
  - "labels.managed_by = ansible"

# Performance: cache results
cache: true
cache_plugin: jsonfile
cache_timeout: 300
cache_connection: /tmp/ansible_gcp_cache

# Hostname preference
hostnames:
  - name

# Automatic grouping
keyed_groups:
  - key: labels.role
    prefix: role
    separator: "_"
    default_value: untagged
  - key: labels.environment
    prefix: env
    separator: "_"
    default_value: unknown
  - key: labels.team
    prefix: team
    separator: "_"
  - key: zone
    prefix: zone
    separator: "_"
  - key: machineType | regex_replace('.*/', '')
    prefix: machine
    separator: "_"

# Conditional groups
groups:
  # Preemptible instances
  preemptible: scheduling.preemptible | default(false)
  # Instances with public IPs
  public_facing: networkInterfaces[0].accessConfigs is defined
  # SSD instances
  has_ssd: "'SSD' in (disks | map(attribute='type') | list)"

# Variable composition
compose:
  ansible_host: networkInterfaces[0].networkIP
  ansible_user: "'ansible'"
  gcp_name: name
  gcp_zone: zone
  gcp_project: project
  gcp_machine_type: machineType | regex_replace('.*/', '')
  gcp_private_ip: networkInterfaces[0].networkIP
  gcp_public_ip: >-
    networkInterfaces[0].accessConfigs[0].natIP
    if networkInterfaces[0].accessConfigs
    else ''
  gcp_labels: labels
  gcp_network: networkInterfaces[0].network | regex_replace('.*/', '')
  gcp_subnet: networkInterfaces[0].subnetwork | regex_replace('.*/', '')
  gcp_preemptible: scheduling.preemptible | default(false)
```

## Using the Inventory in Playbooks

```yaml
# deploy.yml
# Deploy application to GCP web servers
- hosts: role_web
  become: true
  tasks:
    - name: Pull latest code
      git:
        repo: "https://source.developers.google.com/p/{{ gcp_project }}/r/webapp"
        dest: /opt/webapp
        version: main

    - name: Restart application
      systemd:
        name: webapp
        state: restarted

# Scale-specific operations
- hosts: preemptible
  become: true
  tasks:
    - name: Ensure checkpointing is enabled for preemptible VMs
      template:
        src: checkpoint-config.j2
        dest: /etc/app/checkpoint.conf
```

## Multi-Project Discovery

When your infrastructure spans multiple GCP projects:

```yaml
# inventory/gcp.yml
# Discover instances across multiple projects
plugin: google.cloud.gcp_compute
projects:
  - project-production
  - project-staging
  - project-shared-infra
auth_kind: serviceaccount
service_account_file: /path/to/sa-key.json

# Group by project to distinguish origins
keyed_groups:
  - key: project
    prefix: project
    separator: "_"
  - key: labels.role
    prefix: role
    separator: "_"
```

The service account needs the `compute.viewer` role on each project:

```bash
# Grant compute viewer role across projects
for project in project-production project-staging project-shared-infra; do
  gcloud projects add-iam-policy-binding "$project" \
    --member="serviceAccount:ansible@my-project.iam.gserviceaccount.com" \
    --role="roles/compute.viewer"
done
```

## Troubleshooting

```bash
# Debug verbose output
ansible-inventory -i inventory/gcp.yml --list -vvv

# Verify authentication
gcloud auth list
gcloud compute instances list --project my-project-id

# Clear cache
rm -rf /tmp/ansible_gcp_cache

# Test connectivity
ansible role_web -i inventory/gcp.yml -m ping
```

Common issues:
- **Authentication errors**: Check the service account file path and permissions
- **No instances found**: Verify the project ID, zone filters, and label filters
- **Wrong IPs**: Check the `compose` section and ensure `networkInterfaces[0].networkIP` resolves correctly

## Labeling Strategy for GCP

Consistent labels are critical for the inventory plugin to work well:

```bash
# Apply labels to instances
gcloud compute instances update web-prod-01 \
  --zone us-east1-b \
  --update-labels managed_by=ansible,role=web,environment=production,team=platform
```

Establish a labeling standard and enforce it through Terraform or Deployment Manager templates so every new instance gets the right labels from day one.

GCP dynamic inventory plugs directly into your cloud infrastructure and keeps your Ansible automation in sync with the real state of your Compute Engine instances. Combined with proper labeling and caching, it handles everything from small projects to multi-project, multi-region deployments.
