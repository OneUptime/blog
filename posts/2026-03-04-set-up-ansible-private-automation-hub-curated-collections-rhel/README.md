# How to Set Up Ansible Private Automation Hub for Curated Collections on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ansible, Private Automation Hub, Collections, Automation

Description: Set up an Ansible Private Automation Hub on RHEL to host curated, approved Ansible collections for your organization.

---

Private Automation Hub (PAH) allows you to host and curate Ansible collections internally. This gives your organization control over which collections and versions are available to automation teams, ensuring consistency and compliance.

## Installing Private Automation Hub

PAH is distributed as part of the Ansible Automation Platform subscription.

```bash
# Register the system and attach the AAP subscription
sudo subscription-manager register
sudo subscription-manager attach --pool=<your-pool-id>

# Enable the required repositories
sudo subscription-manager repos \
  --enable=ansible-automation-platform-2.4-for-rhel-9-x86_64-rpms

# Install the automation hub package
sudo dnf install automation-hub -y
```

## Running the Installer

```bash
# Edit the installer inventory file
sudo vi /opt/ansible-automation-platform/installer/inventory
```

Key configuration parameters:

```ini
[automationhub]
hub.example.com

[all:vars]
automationhub_admin_password='SecurePassword123'
automationhub_pg_host='localhost'
automationhub_pg_database='automationhub'
automationhub_pg_username='automationhub'
automationhub_pg_password='DBPassword123'
```

```bash
# Run the installer
cd /opt/ansible-automation-platform/installer
sudo ./setup.sh
```

## Syncing Collections from Automation Hub

Configure PAH to sync certified collections from the Red Hat Automation Hub.

```bash
# Log in to the PAH web interface at https://hub.example.com
# Navigate to Collections > Repository Management > Remote

# Add the certified remote:
# URL: https://console.redhat.com/api/automation-hub/content/published/
# Token: <your-offline-token-from-console.redhat.com>
```

## Configuring Clients to Use PAH

On your control nodes and execution environments, configure ansible-galaxy to use PAH.

```bash
# Edit or create the ansible.cfg
cat >> /etc/ansible/ansible.cfg << 'CONFIG'
[galaxy]
server_list = private_hub

[galaxy_server.private_hub]
url=https://hub.example.com/api/galaxy/content/published/
token=<your-pah-token>
CONFIG
```

## Uploading Custom Collections

```bash
# Build your custom collection
cd my-collection/
ansible-galaxy collection build

# Upload to PAH using the API
ansible-galaxy collection publish \
  myorg-mycollection-1.0.0.tar.gz \
  --server https://hub.example.com/api/galaxy/content/inbound-custom/ \
  --token <your-pah-token>
```

## Approving Collections

Collections uploaded to PAH land in a staging area and must be approved before they are available.

```bash
# Use the web UI: Collections > Approval
# Or use the API:
curl -X POST \
  https://hub.example.com/api/galaxy/v3/collections/myorg/mycollection/versions/1.0.0/move/staging/published/ \
  -H "Authorization: Token <your-pah-token>"
```

PAH gives your organization a single source of truth for Ansible collections, with approval workflows and version control.
