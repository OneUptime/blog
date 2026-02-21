# How to Use Ansible Automation Hub vs Galaxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Automation Hub, Red Hat, Enterprise

Description: A detailed comparison of Ansible Automation Hub and Galaxy covering features, content quality, access, pricing, and when to use each platform.

---

If you work with Ansible, you have probably encountered two places to get collections and roles: Ansible Galaxy and Ansible Automation Hub. They serve similar purposes but target different audiences and offer different guarantees. Understanding the differences helps you choose the right source for your automation content and configure your environment to use both effectively.

## What Is Ansible Galaxy?

Ansible Galaxy (https://galaxy.ansible.com) is the free, public, community-driven repository for Ansible content. Anyone with a GitHub account can publish roles and collections to Galaxy. It has been around since the early days of Ansible and hosts thousands of roles and collections.

Key characteristics:
- Free and open to everyone
- Community-maintained content with no formal review process
- Anyone can publish content
- No guaranteed support or maintenance
- Contains both high-quality and experimental content
- Hosted by Red Hat but community-governed

## What Is Ansible Automation Hub?

Ansible Automation Hub (https://cloud.redhat.com/ansible/automation-hub/) is Red Hat's curated, supported content repository. It is included with an Ansible Automation Platform subscription. Content on Automation Hub goes through Red Hat's certification and testing process.

Key characteristics:
- Requires an Ansible Automation Platform subscription
- Content is certified and tested by Red Hat
- Partners like AWS, Azure, Cisco, and VMware publish certified collections
- Includes long-term support commitments
- Private Automation Hub can be deployed on-premises
- Content is security-scanned and reviewed

## Feature Comparison

Here is a side-by-side comparison of the two platforms:

| Feature | Galaxy | Automation Hub |
|---------|--------|---------------|
| Cost | Free | Subscription required |
| Content review | None (community trust) | Certified by Red Hat |
| Support | Community only | Red Hat support included |
| Content types | Roles and collections | Collections (certified) |
| Access control | Public | Token-based, RBAC |
| On-premises option | Galaxy NG (open source) | Private Automation Hub |
| Signing | Optional | Collections are signed |
| SLA | None | Per subscription terms |
| Content volume | Thousands of roles/collections | Hundreds of certified collections |
| Update frequency | Continuous | Scheduled releases |

## When to Use Galaxy

Galaxy is the right choice when:

- You are experimenting, learning, or prototyping
- Budget constraints prevent purchasing an Automation Platform subscription
- You need community-maintained content for non-critical systems
- You want the widest selection of available content
- You are contributing content back to the community

## When to Use Automation Hub

Automation Hub is the right choice when:

- You run Ansible in production for business-critical infrastructure
- You need vendor-supported modules (AWS, Azure, VMware, Cisco, etc.)
- Compliance requires all software to come from verified, signed sources
- You need long-term support and lifecycle guarantees
- Your organization already has an Ansible Automation Platform subscription

## Configuring Both in ansible.cfg

Most organizations use both. Configure `ansible.cfg` to check Automation Hub first, then fall back to Galaxy:

```ini
# ansible.cfg - use both Automation Hub and Galaxy
[galaxy]
server_list = automation_hub, galaxy

[galaxy_server.automation_hub]
url = https://cloud.redhat.com/api/automation-hub/content/published/
auth_url = https://sso.redhat.com/auth/realms/redhat-external/protocol/openid-connect/token
token = your_automation_hub_token

[galaxy_server.galaxy]
url = https://galaxy.ansible.com/
```

With this configuration, `ansible-galaxy collection install` checks Automation Hub first. If the collection is not found there, it tries Galaxy.

## Getting Your Automation Hub Token

1. Log into https://cloud.redhat.com
2. Navigate to Ansible Automation Platform > Automation Hub
3. Go to "Connect to Hub" or "API Token"
4. Generate or copy your token

```bash
# Test the token works
curl -H "Authorization: Bearer your_token" \
    "https://cloud.redhat.com/api/automation-hub/v3/collections/"
```

## Private Automation Hub

Organizations that need on-premises content hosting can deploy Private Automation Hub. This gives you the same curated experience but within your own network.

Setting up Private Automation Hub:

```bash
# Private Automation Hub is typically deployed via the AAP installer
# Download from access.redhat.com

# After installation, configure your clients:
```

```ini
# ansible.cfg - use Private Automation Hub
[galaxy]
server_list = private_hub, automation_hub, galaxy

[galaxy_server.private_hub]
url = https://hub.internal.com/api/galaxy/content/published/
token = your_private_hub_token

[galaxy_server.automation_hub]
url = https://cloud.redhat.com/api/automation-hub/content/published/
auth_url = https://sso.redhat.com/auth/realms/redhat-external/protocol/openid-connect/token
token = your_cloud_token

[galaxy_server.galaxy]
url = https://galaxy.ansible.com/
```

## Syncing Content Between Hub and Galaxy

Private Automation Hub can sync certified content from the cloud-hosted Automation Hub and community content from Galaxy:

```bash
# Through the Private Automation Hub UI:
# 1. Go to "Repo Management" > "Remote"
# 2. Add Red Hat Certified remote (syncs from cloud Automation Hub)
# 3. Add Community remote (syncs from Galaxy)
# 4. Configure which collections to sync
# 5. Set sync schedule
```

You can also configure which specific collections to sync via a requirements file:

```yaml
# sync-requirements.yml - collections to sync from Galaxy to Private Hub
---
collections:
  - name: community.general
  - name: community.docker
  - name: community.postgresql
  - name: ansible.posix
```

## Content Quality Differences

Let me illustrate the quality difference with a concrete example. Consider the `amazon.aws` collection:

**On Automation Hub (certified):**
- Tested against specific AWS API versions
- Includes support from both Red Hat and AWS
- Follows Red Hat's release lifecycle (supported for years)
- Security vulnerabilities get prioritized patches
- Documentation meets Red Hat standards

**On Galaxy (community):**
- Same codebase, but might be a different version
- Community support only
- Updates ship faster (no certification delay)
- Might include experimental features not yet certified

## Requirements File with Multiple Servers

You can specify which server to use per collection in your requirements file:

```yaml
# requirements.yml - mixed sourcing
---
collections:
  # Get certified AWS collection from Automation Hub
  - name: amazon.aws
    version: "7.2.0"
    source: https://cloud.redhat.com/api/automation-hub/content/published/

  # Get community collection from Galaxy
  - name: community.docker
    version: "3.7.0"
    source: https://galaxy.ansible.com/

  # Internal collection from Private Hub
  - name: myorg.infrastructure
    version: "1.0.0"
    source: https://hub.internal.com/api/galaxy/content/published/
```

## Migration Path: Galaxy to Automation Hub

If you are currently using Galaxy and want to move to Automation Hub:

1. Audit your current requirements file for certified equivalents
2. Check which collections are available on Automation Hub
3. Update your `ansible.cfg` to add Automation Hub as the primary server
4. Test your playbooks with the certified versions
5. Update `requirements.yml` with `source` fields where needed

```bash
#!/bin/bash
# check-certified.sh - Check which Galaxy collections have certified versions
set -e

echo "Checking for certified versions on Automation Hub..."

# Read collections from requirements.yml
python3 -c "
import yaml
import requests

with open('requirements.yml') as f:
    data = yaml.safe_load(f)

for coll in data.get('collections', []):
    name = coll['name']
    namespace, collection = name.split('.')
    # Check if the collection exists on Automation Hub
    # This requires authentication
    print(f'  {name}: check https://cloud.redhat.com/ansible/automation-hub/ manually')
"
```

## Cost Considerations

Galaxy is free forever. Automation Hub requires an Ansible Automation Platform subscription, which is priced per managed node. For small teams or personal projects, Galaxy is the obvious choice. For enterprises managing hundreds or thousands of nodes, the Automation Platform subscription that includes Automation Hub also includes AWX/Tower (now Automation Controller), EDA (Event-Driven Ansible), and support.

Consider the total cost: if an uncertified collection breaks in production and costs 4 hours of engineering time to debug, the subscription might pay for itself quickly.

## Summary

Ansible Galaxy and Automation Hub serve different needs. Galaxy is the free, community-driven repository with the widest selection of content. Automation Hub is the enterprise-grade, certified, supported repository included with Ansible Automation Platform subscriptions. Most organizations benefit from using both: Automation Hub for production-critical, certified content and Galaxy for community modules and experimentation. Configure both servers in `ansible.cfg` with appropriate priority, and use Private Automation Hub for on-premises environments. The choice between them comes down to your support requirements, compliance needs, and budget.
