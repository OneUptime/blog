# How to Use Multiple Galaxy Servers in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Multi-Server, Configuration Management

Description: Configure Ansible to use multiple Galaxy servers simultaneously for sourcing content from public, private, and certified repositories.

---

Real-world Ansible deployments rarely source all their content from a single server. You might pull certified collections from Red Hat's Automation Hub, community content from public Galaxy, and internal collections from a private Galaxy NG instance. Ansible supports this multi-server setup natively through the `ansible.cfg` configuration, and getting it right means your team can access all the content they need through a single `ansible-galaxy` command.

## The Multi-Server Architecture

A typical enterprise setup involves three types of servers:

```
Developer Workstation
    |
    +---> Private Galaxy NG (internal collections, curated community content)
    |         |
    |         +---> Synced from public Galaxy (approved community collections)
    |         +---> Internal teams publish here
    |
    +---> Automation Hub (Red Hat certified collections)
    |
    +---> Public Galaxy (fallback for community content)
```

## Configuring Multiple Servers

The configuration lives in `ansible.cfg`:

```ini
# ansible.cfg - three Galaxy servers configured
[galaxy]
server_list = private_hub, certified_hub, community_galaxy

[galaxy_server.private_hub]
url = https://galaxy.internal.com/api/galaxy/content/published/
token = your_private_token

[galaxy_server.certified_hub]
url = https://cloud.redhat.com/api/automation-hub/content/published/
auth_url = https://sso.redhat.com/auth/realms/redhat-external/protocol/openid-connect/token
token = your_rh_offline_token

[galaxy_server.community_galaxy]
url = https://galaxy.ansible.com/
```

The `server_list` key is a comma-separated list of server names. Each server has its own `[galaxy_server.NAME]` section with connection details.

## Authentication Methods

Different servers use different authentication mechanisms:

### Token Authentication (Galaxy and Private Galaxy NG)

```ini
# Simple token authentication
[galaxy_server.my_server]
url = https://galaxy.internal.com/api/galaxy/content/published/
token = your_api_token
```

### SSO/OAuth Authentication (Automation Hub)

```ini
# Red Hat SSO authentication
[galaxy_server.automation_hub]
url = https://cloud.redhat.com/api/automation-hub/content/published/
auth_url = https://sso.redhat.com/auth/realms/redhat-external/protocol/openid-connect/token
token = your_offline_token
```

The `auth_url` field triggers the OAuth token exchange flow. The `token` here is a long-lived offline token that gets exchanged for a short-lived access token.

### No Authentication (Public Galaxy)

```ini
# Public Galaxy needs no authentication
[galaxy_server.galaxy]
url = https://galaxy.ansible.com/
```

## Storing Tokens Securely

Putting tokens directly in `ansible.cfg` is convenient but not great for security, especially if the file is committed to Git.

### Option 1: Environment Variables

```bash
# Set tokens as environment variables
export ANSIBLE_GALAXY_SERVER_PRIVATE_HUB_TOKEN="your_private_token"
export ANSIBLE_GALAXY_SERVER_CERTIFIED_HUB_TOKEN="your_rh_token"
```

The environment variable name follows the pattern: `ANSIBLE_GALAXY_SERVER_<SERVER_NAME>_<OPTION>`, with the server name uppercased.

```ini
# ansible.cfg - tokens come from environment variables
[galaxy]
server_list = private_hub, certified_hub, community_galaxy

[galaxy_server.private_hub]
url = https://galaxy.internal.com/api/galaxy/content/published/
# Token set via ANSIBLE_GALAXY_SERVER_PRIVATE_HUB_TOKEN

[galaxy_server.certified_hub]
url = https://cloud.redhat.com/api/automation-hub/content/published/
auth_url = https://sso.redhat.com/auth/realms/redhat-external/protocol/openid-connect/token
# Token set via ANSIBLE_GALAXY_SERVER_CERTIFIED_HUB_TOKEN

[galaxy_server.community_galaxy]
url = https://galaxy.ansible.com/
```

### Option 2: Ansible Vault

Store tokens in an encrypted vault file:

```yaml
# group_vars/all/vault.yml (encrypted)
---
galaxy_private_hub_token: "your_private_token"
galaxy_certified_hub_token: "your_rh_token"
```

Then export them before running Galaxy commands:

```bash
# Extract and export tokens from vault
eval $(ansible-vault view group_vars/all/vault.yml | python3 -c "
import yaml, sys
data = yaml.safe_load(sys.stdin)
for key, value in data.items():
    env_key = key.upper()
    print(f'export {env_key}=\"{value}\"')
")

# Now run Galaxy commands
ansible-galaxy collection install -r requirements.yml
```

## Installing from Specific Servers

By default, Galaxy checks servers in order and uses the first match. To install from a specific server:

```yaml
# requirements.yml - specify source per collection
---
collections:
  # From the private hub
  - name: myorg.infrastructure
    version: "1.0.0"
    source: https://galaxy.internal.com/api/galaxy/content/published/

  # From Automation Hub (certified)
  - name: amazon.aws
    version: "7.2.0"
    source: https://cloud.redhat.com/api/automation-hub/content/published/

  # From public Galaxy
  - name: community.docker
    version: "3.7.0"
    source: https://galaxy.ansible.com/
```

## Publishing to a Specific Server

When publishing your collections, specify the target server:

```bash
# Publish to your private hub
ansible-galaxy collection publish myorg-infrastructure-1.0.0.tar.gz \
    --server private_hub

# Publish to public Galaxy
ansible-galaxy collection publish myorg-infrastructure-1.0.0.tar.gz \
    --server community_galaxy
```

The `--server` flag uses the server name from your `ansible.cfg` server_list.

## Server Health Monitoring

With multiple servers, monitoring becomes important. If one goes down, you want to know:

```bash
#!/bin/bash
# check-servers.sh - Health check all configured Galaxy servers
set -e

SERVERS=(
    "private_hub|https://galaxy.internal.com/api/galaxy/"
    "certified_hub|https://cloud.redhat.com/api/automation-hub/"
    "community_galaxy|https://galaxy.ansible.com/api/"
)

echo "Galaxy Server Health Check"
echo "========================="

for entry in "${SERVERS[@]}"; do
    IFS='|' read -r name url <<< "$entry"
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$url" 2>/dev/null || echo "000")
    LATENCY=$(curl -s -o /dev/null -w "%{time_total}" --connect-timeout 5 "$url" 2>/dev/null || echo "timeout")

    if [ "$STATUS" = "200" ] || [ "$STATUS" = "302" ] || [ "$STATUS" = "301" ]; then
        echo "  [OK]   ${name}: HTTP ${STATUS} (${LATENCY}s)"
    else
        echo "  [FAIL] ${name}: HTTP ${STATUS}"
    fi
done
```

## Handling Server Failover

Galaxy servers are checked in order. If the first server is unreachable, Ansible moves to the next. But there is no built-in caching or smart failover. If your private hub is slow or flaky, it will slow down every Galaxy command.

To handle this, add timeouts:

```ini
# ansible.cfg - add timeout for Galaxy operations
[galaxy]
server_list = private_hub, certified_hub, community_galaxy
timeout = 30
```

For unreliable servers, consider using a reverse proxy with health checks in front of your private hub:

```nginx
# nginx.conf - health-checked reverse proxy for Galaxy
upstream galaxy_backend {
    server galaxy-api-1.internal.com:8080;
    server galaxy-api-2.internal.com:8080 backup;
}

server {
    listen 443 ssl;
    server_name galaxy.internal.com;

    location / {
        proxy_pass http://galaxy_backend;
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
    }
}
```

## Multi-Server in CI/CD

Configure your CI pipeline with multiple servers:

```yaml
# .github/workflows/deploy.yml
---
name: Deploy

jobs:
  deploy:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4

      - name: Configure Galaxy servers
        run: |
          cat > ansible.cfg << 'CFG'
          [galaxy]
          server_list = private_hub, community_galaxy

          [galaxy_server.private_hub]
          url = https://galaxy.internal.com/api/galaxy/content/published/

          [galaxy_server.community_galaxy]
          url = https://galaxy.ansible.com/
          CFG

      - name: Set Galaxy tokens
        run: |
          export ANSIBLE_GALAXY_SERVER_PRIVATE_HUB_TOKEN="${{ secrets.GALAXY_PRIVATE_TOKEN }}"

      - name: Install dependencies
        run: ansible-galaxy collection install -r requirements.yml -p ./collections/
```

## Debugging Multi-Server Issues

When things go wrong, verbose output helps:

```bash
# Maximum verbosity for debugging server issues
ansible-galaxy collection install community.general -vvvv
```

Common issues:

- **Token expired**: Regenerate the token for the failing server
- **Wrong URL path**: Automation Hub requires `/content/published/` in the path
- **Server name mismatch**: The name in `server_list` must match the `[galaxy_server.NAME]` section exactly
- **SSL errors**: Check certificate trust for private servers

## Summary

Using multiple Galaxy servers in Ansible lets you source content from the right place for each use case: internal collections from a private hub, certified content from Automation Hub, and community content from public Galaxy. Configure all servers in `ansible.cfg` with the `server_list` determining priority order, store tokens securely via environment variables or vault, and use per-collection `source` fields in `requirements.yml` for explicit control. Monitor server health and set appropriate timeouts to handle outages gracefully. This multi-server setup gives you the flexibility to use the best content from every available source.
