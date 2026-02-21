# How to Configure Ansible Galaxy Server URL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Collections, DevOps, Configuration

Description: Configure Ansible Galaxy to use custom server URLs, private registries, and Automation Hub for downloading collections and roles.

---

Ansible Galaxy is the default repository for sharing Ansible roles and collections. By default, the `ansible-galaxy` command connects to `https://galaxy.ansible.com` to download content. But many organizations need to point Galaxy at a different server: a private Automation Hub instance, an air-gapped mirror, or a custom registry. This guide covers how to configure the Galaxy server URL and manage multiple server sources.

## The Default Galaxy Server

Out of the box, Ansible Galaxy uses:

```
https://galaxy.ansible.com/api/
```

This is the public, community-maintained server. When you run `ansible-galaxy collection install community.general`, it downloads from this URL.

## Changing the Galaxy Server URL

### In ansible.cfg

The simplest way to change the Galaxy server URL:

```ini
# ansible.cfg
[galaxy]
server_list = my_galaxy

[galaxy_server.my_galaxy]
url = https://galaxy.example.com/api/
```

For the public Red Hat Automation Hub (which hosts certified, supported collections):

```ini
# ansible.cfg
[galaxy]
server_list = automation_hub

[galaxy_server.automation_hub]
url = https://console.redhat.com/api/automation-hub/
auth_url = https://sso.redhat.com/auth/realms/redhat-external/protocol/openid-connect/token
token = your-automation-hub-token
```

### Via Environment Variable

```bash
# Set the Galaxy server URL via environment variable
export ANSIBLE_GALAXY_SERVER_URL=https://galaxy.example.com/api/
ansible-galaxy collection install community.general
```

### Via Command Line

Override the server for a single command:

```bash
# Use a specific server for one installation
ansible-galaxy collection install community.general \
  --server https://galaxy.example.com/api/
```

## Configuring Multiple Galaxy Servers

You can configure multiple Galaxy servers and Ansible will search them in order. This is useful when you have both a private registry and want to fall back to the public Galaxy for community content.

```ini
# ansible.cfg
[galaxy]
# Search servers in this order
server_list = private_hub, automation_hub, public_galaxy

[galaxy_server.private_hub]
url = https://galaxy.internal.example.com/api/
token = my-private-hub-token

[galaxy_server.automation_hub]
url = https://console.redhat.com/api/automation-hub/
auth_url = https://sso.redhat.com/auth/realms/redhat-external/protocol/openid-connect/token
token = my-rh-token

[galaxy_server.public_galaxy]
url = https://galaxy.ansible.com/api/
```

When you install a collection, Ansible tries each server in order. If the collection is not found on the first server, it tries the next one.

## Authentication Methods

### Token Authentication

Most Galaxy-compatible servers use API tokens:

```ini
[galaxy_server.my_server]
url = https://galaxy.example.com/api/
token = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

To generate a token on the public Galaxy:

```bash
# Log in and get a token from galaxy.ansible.com
ansible-galaxy login
```

For Automation Hub, generate a token from the web UI at `https://console.redhat.com/ansible/automation-hub/token`.

### Username and Password

Some private Galaxy servers support basic auth:

```ini
[galaxy_server.my_server]
url = https://galaxy.example.com/api/
username = admin
password = secretpassword
```

### OAuth2 (Automation Hub)

Red Hat Automation Hub uses OAuth2 with a separate auth URL:

```ini
[galaxy_server.automation_hub]
url = https://console.redhat.com/api/automation-hub/
auth_url = https://sso.redhat.com/auth/realms/redhat-external/protocol/openid-connect/token
token = your-offline-token
```

## Using a requirements.yml with Custom Servers

You can specify the server source per collection in your requirements file:

```yaml
# collections/requirements.yml
---
collections:
  # This comes from the private hub
  - name: company.internal_tools
    version: ">=1.0.0"
    source: https://galaxy.internal.example.com/api/

  # This comes from Red Hat Automation Hub
  - name: redhat.rhel_system_roles
    version: ">=1.20.0"
    source: https://console.redhat.com/api/automation-hub/

  # This comes from the default configured server (public Galaxy)
  - name: community.general
    version: ">=8.0.0"

  - name: amazon.aws
    version: ">=7.0.0"
```

Install all collections:

```bash
# Install from the requirements file
ansible-galaxy collection install -r collections/requirements.yml
```

## Setting Up a Private Galaxy Server

If your organization needs a private Galaxy server, there are several options:

### Ansible Automation Hub (Private)

Red Hat provides a private Automation Hub that you can run on-premises. It is part of the Ansible Automation Platform subscription.

### Pulp Galaxy NG

Galaxy NG is the open-source upstream of Automation Hub, built on the Pulp content management framework:

```bash
# Deploy Galaxy NG using Docker Compose
git clone https://github.com/ansible/galaxy_ng.git
cd galaxy_ng
docker compose up -d
```

Once running, configure it in your ansible.cfg:

```ini
[galaxy_server.local_galaxy]
url = http://localhost:5001/api/
token = your-generated-token
```

### Artifactory or Nexus

JFrog Artifactory and Sonatype Nexus both support hosting Ansible collections. Configure them as Galaxy servers:

```ini
# Artifactory
[galaxy_server.artifactory]
url = https://artifactory.example.com/api/ansible/collections/
token = your-artifactory-token

# Nexus
[galaxy_server.nexus]
url = https://nexus.example.com/repository/ansible-proxy/
username = ansible
password = secretpassword
```

## Air-Gapped Environments

For environments without internet access, you need to download collections on a connected machine and transfer them manually.

### Download Collections on a Connected Machine

```bash
# Download collections to a local directory
ansible-galaxy collection download community.general -p ./collections-download/
ansible-galaxy collection download amazon.aws -p ./collections-download/

# Or download from a requirements file
ansible-galaxy collection download -r collections/requirements.yml -p ./collections-download/
```

### Transfer and Install on the Air-Gapped Machine

```bash
# Copy the downloaded tarballs to the air-gapped machine
scp collections-download/*.tar.gz air-gapped-host:~/collections/

# On the air-gapped machine, install from the local files
ansible-galaxy collection install ~/collections/community-general-8.3.0.tar.gz
ansible-galaxy collection install ~/collections/amazon-aws-7.2.0.tar.gz
```

Or serve them from a local web server:

```bash
# Set up a simple HTTP server
cd ~/collections
python3 -m http.server 8080
```

Configure the local server in ansible.cfg on other air-gapped machines:

```ini
[galaxy_server.local_mirror]
url = http://10.0.0.5:8080/
```

## Caching Galaxy Downloads

When working with CI/CD pipelines, you can cache Galaxy downloads to speed up repeated installations:

```bash
# Set a custom cache directory
export ANSIBLE_GALAXY_CACHE_DIR=/opt/cache/ansible-galaxy

# Install collections (subsequent runs use the cache)
ansible-galaxy collection install -r requirements.yml
```

In a CI/CD context:

```yaml
# GitHub Actions example
- name: Cache Ansible Galaxy collections
  uses: actions/cache@v4
  with:
    path: ~/.ansible/collections
    key: ansible-collections-${{ hashFiles('collections/requirements.yml') }}

- name: Install collections
  run: ansible-galaxy collection install -r collections/requirements.yml
```

## Troubleshooting Galaxy Server Issues

**"ERROR! Failed to resolve the requested dependencies"**

The collection might not exist on your configured server. Check the server list order and make sure the public Galaxy is included as a fallback:

```bash
# Try installing with verbose output
ansible-galaxy collection install community.general -vvv
```

**"ERROR! Unexpected token in response"**

The URL might be wrong. Make sure you include `/api/` at the end of the URL:

```ini
# Correct
url = https://galaxy.example.com/api/

# Wrong (missing /api/)
url = https://galaxy.example.com/
```

**"Authentication error"**

Verify your token is valid and has the right permissions:

```bash
# Test the connection with curl
curl -H "Authorization: Token your-token-here" https://galaxy.example.com/api/
```

## Summary

Configuring the Ansible Galaxy server URL is essential for organizations that use private registries, Automation Hub, or air-gapped environments. Set up multiple servers in your ansible.cfg and order them by priority so private collections are found first, with the public Galaxy as a fallback. For reproducible builds, pin collection versions in a requirements.yml file and cache downloads in your CI/CD pipelines. For air-gapped environments, pre-download collection tarballs and install from local files.
