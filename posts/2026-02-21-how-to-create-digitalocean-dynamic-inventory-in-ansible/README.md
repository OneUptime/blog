# How to Create DigitalOcean Dynamic Inventory in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, DigitalOcean, Dynamic Inventory, Cloud, DevOps

Description: Configure the DigitalOcean dynamic inventory plugin in Ansible to automatically discover droplets and organize them into groups based on tags, regions, and sizes.

---

DigitalOcean makes it easy to spin up droplets, but keeping track of them in a static Ansible inventory is a chore. Every time you create, destroy, or resize a droplet, the inventory needs updating. The DigitalOcean inventory plugin solves this by querying the DO API directly, discovering all your droplets and organizing them into groups automatically.

## Prerequisites

Install the DigitalOcean Ansible collection:

```bash
# Install the community DigitalOcean collection
ansible-galaxy collection install community.digitalocean

# Install the required Python library
pip install pydo
```

You need a DigitalOcean API token. Generate one from the DigitalOcean control panel under API > Tokens.

```bash
# Set the API token as an environment variable
export DO_API_TOKEN="your-digitalocean-api-token"
```

## Basic Configuration

Create a file ending in `digitalocean.yml` or `digital_ocean.yml`:

```yaml
# inventory/digitalocean.yml
# Basic DigitalOcean dynamic inventory
plugin: community.digitalocean.digitalocean

# API token (can also use DO_API_TOKEN environment variable)
# api_token: "your-token-here"

# Attribute to use as the inventory hostname
attributes:
  - id
  - name
  - networks

# Use private IP for connections
var_prefix: do_
```

Test it:

```bash
# List all discovered droplets
ansible-inventory -i inventory/digitalocean.yml --list

# Show the group hierarchy
ansible-inventory -i inventory/digitalocean.yml --graph
```

## Grouping Droplets

The plugin automatically creates groups based on droplet properties:

```yaml
# inventory/digitalocean.yml
# Group droplets by various properties
plugin: community.digitalocean.digitalocean

keyed_groups:
  # Group by droplet tag: creates groups like tag_web, tag_database
  - key: do_tags | default([])
    prefix: tag
    separator: "_"

  # Group by region: creates groups like region_nyc1, region_sfo3
  - key: do_region.slug
    prefix: region
    separator: "_"

  # Group by size: creates groups like size_s_2vcpu_4gb
  - key: do_size_slug
    prefix: size
    separator: "_"

  # Group by image: creates groups like image_ubuntu_22_04
  - key: do_image.slug | default(do_image.id | string)
    prefix: image
    separator: "_"

  # Group by status
  - key: do_status
    prefix: status
    separator: "_"
```

## Setting Connection Variables

Configure how Ansible connects to discovered droplets:

```yaml
# inventory/digitalocean.yml
# Configure connection settings
plugin: community.digitalocean.digitalocean

keyed_groups:
  - key: do_tags | default([])
    prefix: tag
    separator: "_"
  - key: do_region.slug
    prefix: region
    separator: "_"

compose:
  # Use the private IP if available, fall back to public IP
  ansible_host: >-
    do_networks.v4 | selectattr('type', 'eq', 'private') | map(attribute='ip_address') | first
    if (do_networks.v4 | selectattr('type', 'eq', 'private') | list | length > 0)
    else do_networks.v4 | selectattr('type', 'eq', 'public') | map(attribute='ip_address') | first

  # Set SSH user (root is default for DO droplets)
  ansible_user: "'root'"

  # Map useful properties to variables
  do_droplet_name: do_name
  do_droplet_id: do_id
  do_droplet_region: do_region.slug
  do_droplet_size: do_size_slug
  do_droplet_image: do_image.slug | default('custom')
  do_public_ip: >-
    do_networks.v4 | selectattr('type', 'eq', 'public') | map(attribute='ip_address') | first
  do_private_ip: >-
    do_networks.v4 | selectattr('type', 'eq', 'private') | map(attribute='ip_address') | first
    if (do_networks.v4 | selectattr('type', 'eq', 'private') | list | length > 0)
    else ''
```

## Filtering Droplets

Only include specific droplets in your inventory:

```yaml
# inventory/digitalocean.yml
# Filter to only include certain droplets
plugin: community.digitalocean.digitalocean

# Only include active droplets
filters:
  - do_status == 'active'

# Or filter by tag
# filters:
#   - "'ansible-managed' in do_tags"

keyed_groups:
  - key: do_tags | default([])
    prefix: tag
    separator: "_"
  - key: do_region.slug
    prefix: region
    separator: "_"
```

## Complete Production Configuration

Here is a full production-ready DigitalOcean inventory:

```yaml
# inventory/digitalocean.yml
# Production DigitalOcean dynamic inventory
plugin: community.digitalocean.digitalocean

# API token from environment variable DO_API_TOKEN

# Cache results for 5 minutes
cache: true
cache_plugin: jsonfile
cache_timeout: 300
cache_connection: /tmp/ansible_do_cache

# Only active droplets with the ansible-managed tag
filters:
  - do_status == 'active'

# Group by multiple dimensions
keyed_groups:
  - key: do_tags | default([])
    prefix: tag
    separator: "_"
    default_value: untagged
  - key: do_region.slug
    prefix: region
    separator: "_"
  - key: do_size_slug
    prefix: size
    separator: "_"
  - key: do_image.slug | default('custom')
    prefix: image
    separator: "_"

# Create conditional groups
groups:
  # All droplets with private networking
  private_network: >-
    (do_networks.v4 | selectattr('type', 'eq', 'private') | list | length) > 0
  # High-memory droplets
  high_memory: >-
    do_memory >= 8192

# Variable mapping
compose:
  ansible_host: >-
    do_networks.v4 | selectattr('type', 'eq', 'private') | map(attribute='ip_address') | first
    if (do_networks.v4 | selectattr('type', 'eq', 'private') | list | length > 0)
    else do_networks.v4 | selectattr('type', 'eq', 'public') | map(attribute='ip_address') | first
  ansible_user: "'root'"
  ansible_port: 22
  droplet_name: do_name
  droplet_id: do_id
  droplet_region: do_region.slug
  droplet_size: do_size_slug
  droplet_vcpus: do_vcpus
  droplet_memory_mb: do_memory
  droplet_disk_gb: do_disk
  droplet_tags: do_tags | default([])
```

## Using the Inventory in Playbooks

Target droplets using the dynamically-created groups:

```yaml
# deploy.yml
# Deploy to DigitalOcean web droplets
- hosts: tag_web
  become: true
  tasks:
    - name: Update system packages
      apt:
        update_cache: true
        upgrade: safe

    - name: Install application dependencies
      apt:
        name:
          - nginx
          - python3-pip
          - git
        state: present

    - name: Deploy application
      git:
        repo: "https://github.com/company/webapp.git"
        dest: /opt/webapp
        version: "{{ app_version | default('main') }}"
      notify: restart app

  handlers:
    - name: restart app
      systemd:
        name: webapp
        state: restarted
```

Target by region:

```yaml
# maintenance.yml
# Regional maintenance window
- hosts: region_nyc1
  serial: 1
  become: true
  tasks:
    - name: Apply security patches
      apt:
        update_cache: true
        upgrade: safe

    - name: Reboot if required
      reboot:
        msg: "Rebooting for kernel update"
      when: reboot_required_file.stat.exists
```

## Tagging Strategy for DigitalOcean

Tags in DigitalOcean are simple strings (no key-value pairs like AWS). Establish a naming convention:

```bash
# Create droplets with meaningful tags using doctl
doctl compute droplet create web-prod-01 \
  --region nyc1 \
  --size s-2vcpu-4gb \
  --image ubuntu-22-04-x64 \
  --tag-name web \
  --tag-name production \
  --tag-name ansible-managed \
  --ssh-keys your-ssh-key-fingerprint \
  --enable-private-networking
```

With tags like `web`, `production`, and `ansible-managed`, the inventory plugin creates groups:
- `tag_web`
- `tag_production`
- `tag_ansible_managed`

You can then use intersections in playbooks:

```yaml
# Only production web servers
- hosts: tag_web:&tag_production
  tasks:
    - name: Deploy to production web servers
      include_role:
        name: webapp
```

## Using with Terraform-Managed Droplets

If you provision droplets with Terraform, make sure Terraform applies the right tags:

```hcl
# terraform/droplet.tf
resource "digitalocean_droplet" "web" {
  count    = 3
  name     = "web-prod-${count.index + 1}"
  region   = "nyc1"
  size     = "s-2vcpu-4gb"
  image    = "ubuntu-22-04-x64"
  tags     = ["web", "production", "ansible-managed"]
  vpc_uuid = digitalocean_vpc.main.id

  ssh_keys = [digitalocean_ssh_key.ansible.fingerprint]
}
```

After `terraform apply`, the Ansible inventory plugin immediately discovers the new droplets.

## Troubleshooting

```bash
# Debug with verbose output
ansible-inventory -i inventory/digitalocean.yml --list -vvv

# Verify API token works
curl -s -X GET "https://api.digitalocean.com/v2/droplets" \
  -H "Authorization: Bearer $DO_API_TOKEN" | python3 -m json.tool

# Clear cache
rm -rf /tmp/ansible_do_cache

# Test connectivity to discovered hosts
ansible tag_web -i inventory/digitalocean.yml -m ping
```

Common issues:
- **Empty inventory**: Check that `DO_API_TOKEN` is set and valid
- **Wrong IPs**: Ensure private networking is enabled on droplets if using private IPs
- **Timeouts**: DigitalOcean API can be slow with many droplets; enable caching

## Wrapping Up

The DigitalOcean inventory plugin keeps your Ansible automation in sync with your actual infrastructure. Tag your droplets consistently, enable caching for performance, and use the `compose` option to set the right connection parameters. Combined with Terraform for provisioning, you get a fully automated pipeline from droplet creation to configuration management.
