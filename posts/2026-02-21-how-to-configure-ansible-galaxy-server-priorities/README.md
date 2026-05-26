# How to Configure Ansible Galaxy Server Priorities

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Configuration, Multi-Server

Description: How to configure server priorities in Ansible Galaxy to control the order in which content is resolved across multiple Galaxy-compatible servers.

---

When you have multiple Galaxy-compatible servers (public Galaxy, Automation Hub, a private Galaxy instance), you need to control which server gets checked first. Server priority determines the resolution order and is used to choose between matching collection candidates, especially when the same version is available on more than one server. Getting this right is important for security, performance, and ensuring you get the right version of every collection.

## How Server Priority Works

Ansible Galaxy resolves content by checking servers in the order they appear in the `server_list` configuration. The first server in the list has the highest priority. When you run `ansible-galaxy collection install community.general`, Ansible uses that prioritized list while finding candidate versions for the collection.

This is not a substitute for version pinning. Ansible prefers the newest compatible collection version, and server priority is used when otherwise equivalent candidates, such as the same version, are available from multiple configured servers.

## Basic Priority Configuration

Configure server priority in `ansible.cfg`:

```ini
# ansible.cfg - server list defines priority (first = highest)

[galaxy]
server_list = private_hub, automation_hub, galaxy

[galaxy_server.private_hub]
url = https://hub.internal.com/api/galaxy/content/published/
token = your_private_hub_token

[galaxy_server.automation_hub]
url = https://console.redhat.com/api/automation-hub/content/published/
auth_url = https://sso.redhat.com/auth/realms/redhat-external/protocol/openid-connect/token
token = your_automation_hub_token

[galaxy_server.galaxy]
url = https://galaxy.ansible.com/
```

In this configuration:

1. **private_hub** is checked first (internal content takes priority)
2. **automation_hub** is checked second (certified content)
3. **galaxy** is checked last (community content as fallback)

## Why Priority Order Matters

Consider what happens with the wrong priority order. If Galaxy is listed first and you have an internal collection named `myorg.utils` version 1.0.0, but someone coincidentally publishes `myorg.utils` version 1.0.0 to public Galaxy, you could pull untrusted external content instead of your internal collection.

By putting your private server first, internal content takes precedence when the same compatible version is available from multiple servers. Pin versions or use a `source` entry in `requirements.yml` when a collection must come from a specific server.

The recommended priority order for most organizations:

```text
1. Private Automation Hub (internal content)
2. Red Hat Automation Hub (certified content)
3. Public Galaxy (community content)
```

## Environment-Specific Priorities

You might want different priorities in different environments. Development teams might prefer Galaxy for faster access to the latest community content, while production deployments should use certified content.

Create environment-specific config files:

```ini
# ansible-dev.cfg - development environment (Galaxy first for latest)
[galaxy]
server_list = galaxy, private_hub

[galaxy_server.galaxy]
url = https://galaxy.ansible.com/

[galaxy_server.private_hub]
url = https://hub.internal.com/api/galaxy/content/published/
token = dev_token
```

```ini
# ansible-prod.cfg - production environment (certified first)
[galaxy]
server_list = private_hub, automation_hub

[galaxy_server.private_hub]
url = https://hub.internal.com/api/galaxy/content/published/
token = prod_token

[galaxy_server.automation_hub]
url = https://console.redhat.com/api/automation-hub/content/published/
auth_url = https://sso.redhat.com/auth/realms/redhat-external/protocol/openid-connect/token
token = prod_hub_token
```

Switch between them with the `ANSIBLE_CONFIG` environment variable:

```bash
# Use development config
export ANSIBLE_CONFIG=./ansible-dev.cfg
ansible-galaxy collection install community.general

# Use production config
export ANSIBLE_CONFIG=./ansible-prod.cfg
ansible-galaxy collection install community.general
```

## Per-Collection Server Override

You can override the server for specific collections in your `requirements.yml`:

```yaml
# requirements.yml - per-collection server specification
---
collections:
  # Always get this from the private hub, regardless of server_list order
  - name: myorg.infrastructure
    version: "1.0.0"
    source: https://hub.internal.com/api/galaxy/content/published/

  # Always get certified AWS from Automation Hub
  - name: amazon.aws
    version: "7.2.0"
    source: https://console.redhat.com/api/automation-hub/content/published/

  # Get community content from Galaxy
  - name: community.docker
    version: "3.7.0"
    source: https://galaxy.ansible.com/
```

The `source` field overrides the server_list priority for that specific collection.

## Verifying Server Resolution

To see which server a collection is being resolved from, use verbose output:

```bash
# Verbose output shows which server was used
ansible-galaxy collection install community.general -vvv
```

The output can include the configured servers involved in resolution:

```text
...
Searching for 'community.general' in configured galaxy servers
Checking private_hub (https://hub.internal.com/...)
  - collection not found
Checking automation_hub (https://console.redhat.com/...)
  - found version 8.1.0
Installing 'community.general:8.1.0' from automation_hub
```

## Testing Server Connectivity

Before relying on a server priority setup, verify that all servers are reachable:

```bash
#!/bin/bash
# test-galaxy-servers.sh - Verify all configured Galaxy servers
set -e

echo "Testing Galaxy server connectivity..."

# Parse ansible.cfg for server list
SERVERS=$(python3 -c "
import configparser
config = configparser.ConfigParser()
config.read('ansible.cfg')

server_list = config.get('galaxy', 'server_list', fallback='').split(',')
for server in server_list:
    server = server.strip()
    if server:
        url = config.get(f'galaxy_server.{server}', 'url', fallback='')
        print(f'{server}|{url}')
")

echo "$SERVERS" | while IFS='|' read -r name url; do
    echo -n "  ${name} (${url}): "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        "${url}" 2>/dev/null || echo "000")

    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        echo "OK (HTTP ${HTTP_CODE})"
    else
        echo "FAILED (HTTP ${HTTP_CODE})"
    fi
done
```

## Handling Server Failures

If a higher-priority server is down, Ansible may skip that server while searching for available versions and continue with other configured servers, or fail if it cannot retrieve the required metadata. This can cause unexpected behavior if the lower-priority server has a different compatible version of the collection.

Add monitoring for your Galaxy servers:

```yaml
# playbook-monitor-galaxy.yml - Monitor Galaxy server availability
---
- hosts: monitoring_server
  tasks:
    - name: Check private Galaxy server
      ansible.builtin.uri:
        url: "https://hub.internal.com/api/galaxy/"
        method: GET
        timeout: 10
        status_code: 200
      register: private_hub_check
      ignore_errors: true

    - name: Alert if private Galaxy is down
      ansible.builtin.debug:
        msg: "WARNING: Private Galaxy server is unreachable!"
      when: private_hub_check is failed
```

## Server Priority with Collection Dependencies

When a collection has dependencies, all dependencies are resolved using the same server priority. If you install `amazon.aws` from Automation Hub and it depends on `ansible.utils`, the dependency is also resolved starting from the highest-priority server.

This can cause issues if a dependency exists on your private hub at a different version than what the collection requires. Be aware of this when curating your private hub content.

## Configuration Precedence

Galaxy server configuration follows Ansible's standard precedence rules:

1. Environment variables (highest)
2. `ansible.cfg` in the current directory
3. `~/.ansible.cfg` (user-level)
4. `/etc/ansible/ansible.cfg` (system-level, lowest)

You can override the server list with an environment variable:

```bash
# Override the server list via environment variable
export ANSIBLE_GALAXY_SERVER_LIST="galaxy"
ansible-galaxy collection install community.general
```

## Summary

Server priority in Ansible Galaxy is controlled by the `server_list` order in `ansible.cfg`, where the first entry has the highest priority. For most organizations, the recommended order is private hub first, Automation Hub second, and public Galaxy last. This makes internal content the preferred source when matching versions exist on multiple servers, certified content is preferred over community content in the same situation, and community content serves as a fallback. Use per-collection `source` overrides in `requirements.yml` for fine-grained control, and test server connectivity before deploying to catch configuration issues early.
