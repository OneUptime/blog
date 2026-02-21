# How to Use Ansible Galaxy Token Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Authentication, Security, API Tokens

Description: Complete guide to Ansible Galaxy token authentication including token generation, configuration, storage, rotation, and multi-server token management.

---

Token authentication is how you prove your identity to Galaxy servers. Whether you are publishing a collection, downloading from Automation Hub, or accessing a private Galaxy NG instance, tokens are the credentials that grant access. This post covers how to generate, configure, store, and manage Galaxy tokens across different servers and environments.

## Types of Galaxy Tokens

There are several types of tokens depending on the server you are connecting to:

- **Galaxy API Token**: Used for the public Galaxy server to publish content
- **Automation Hub Offline Token**: A long-lived token that gets exchanged for short-lived access tokens via Red Hat SSO
- **Private Galaxy NG Token**: Generated through the Galaxy NG admin interface
- **Personal Access Tokens**: Used when Galaxy is backed by GitHub authentication

## Getting Your Public Galaxy Token

To interact with the public Galaxy server (publishing roles or collections):

1. Go to https://galaxy.ansible.com
2. Sign in with your GitHub account
3. Navigate to your profile settings or "API Token" page
4. Click "Load Token" or "Generate Token"
5. Copy the token

```bash
# Test the token
curl -H "Authorization: Token your_galaxy_token" \
    https://galaxy.ansible.com/api/v3/namespaces/ | python3 -m json.tool | head -20
```

## Getting Your Automation Hub Token

For Red Hat's Automation Hub:

1. Log into https://cloud.redhat.com
2. Go to Ansible Automation Platform > Automation Hub
3. Navigate to "Connect to Hub"
4. Copy the "Offline Token"

This offline token is exchanged for access tokens via OAuth2:

```bash
# Exchange the offline token for an access token (manual test)
curl -X POST https://sso.redhat.com/auth/realms/redhat-external/protocol/openid-connect/token \
    -d grant_type=refresh_token \
    -d client_id=cloud-services \
    -d refresh_token=your_offline_token
```

Ansible handles this exchange automatically when you configure `auth_url` in `ansible.cfg`.

## Configuring Tokens in ansible.cfg

The primary way to configure tokens:

```ini
# ansible.cfg - token configuration for multiple servers
[galaxy]
server_list = private_hub, automation_hub, galaxy

[galaxy_server.private_hub]
url = https://galaxy.internal.com/api/galaxy/content/published/
token = your_private_hub_token

[galaxy_server.automation_hub]
url = https://cloud.redhat.com/api/automation-hub/content/published/
auth_url = https://sso.redhat.com/auth/realms/redhat-external/protocol/openid-connect/token
token = your_offline_token

[galaxy_server.galaxy]
url = https://galaxy.ansible.com/
token = your_galaxy_token
```

Notice that `automation_hub` has an `auth_url` field. This tells Ansible to use the OAuth2 token exchange flow. The `token` field contains the offline/refresh token, not a direct access token.

## Storing Tokens with Environment Variables

Putting tokens directly in `ansible.cfg` is convenient but insecure if the file is committed to Git. Use environment variables instead:

```bash
# Set tokens as environment variables
export ANSIBLE_GALAXY_SERVER_PRIVATE_HUB_TOKEN="your_private_hub_token"
export ANSIBLE_GALAXY_SERVER_AUTOMATION_HUB_TOKEN="your_offline_token"
export ANSIBLE_GALAXY_SERVER_GALAXY_TOKEN="your_galaxy_token"
```

The naming convention is:

```
ANSIBLE_GALAXY_SERVER_<SERVER_NAME_UPPERCASE>_<OPTION_UPPERCASE>
```

So for a server named `my_server` with option `token`, the variable is `ANSIBLE_GALAXY_SERVER_MY_SERVER_TOKEN`.

Your `ansible.cfg` can then omit the tokens:

```ini
# ansible.cfg - tokens come from environment variables
[galaxy]
server_list = private_hub, automation_hub, galaxy

[galaxy_server.private_hub]
url = https://galaxy.internal.com/api/galaxy/content/published/
# Token: ANSIBLE_GALAXY_SERVER_PRIVATE_HUB_TOKEN

[galaxy_server.automation_hub]
url = https://cloud.redhat.com/api/automation-hub/content/published/
auth_url = https://sso.redhat.com/auth/realms/redhat-external/protocol/openid-connect/token
# Token: ANSIBLE_GALAXY_SERVER_AUTOMATION_HUB_TOKEN

[galaxy_server.galaxy]
url = https://galaxy.ansible.com/
# Token: ANSIBLE_GALAXY_SERVER_GALAXY_TOKEN
```

## Using the --token CLI Flag

For one-off commands, pass the token directly:

```bash
# Publish with an explicit token
ansible-galaxy collection publish my_namespace-my_collection-1.0.0.tar.gz \
    --token your_galaxy_token

# Install from a server that requires authentication
ansible-galaxy collection install myorg.internal_tools \
    --server https://galaxy.internal.com/api/galaxy/content/published/ \
    --token your_private_token
```

## Token Storage with ansible-galaxy login

The `ansible-galaxy login` command authenticates via GitHub and stores the token:

```bash
# Authenticate with Galaxy via GitHub
ansible-galaxy login --github-token your_github_personal_access_token
```

This stores the token in `~/.ansible/galaxy_token`. The file is plain text:

```
token: your_galaxy_token
```

Make sure this file has restrictive permissions:

```bash
# Secure the token file
chmod 600 ~/.ansible/galaxy_token
```

## Secure Token Storage Options

### Option 1: System Keyring

Use the system keyring to store tokens:

```python
#!/usr/bin/env python3
# galaxy-token.py - Manage Galaxy tokens in the system keyring
import keyring
import sys

def store_token(server_name, token):
    keyring.set_password("ansible-galaxy", server_name, token)
    print(f"Token stored for {server_name}")

def get_token(server_name):
    token = keyring.get_password("ansible-galaxy", server_name)
    if token:
        print(token)
    else:
        print(f"No token found for {server_name}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    action = sys.argv[1]
    server = sys.argv[2]

    if action == "store":
        token = sys.argv[3]
        store_token(server, token)
    elif action == "get":
        get_token(server)
```

Use it in your shell:

```bash
# Store a token
python3 galaxy-token.py store private_hub "your_token"

# Export it as an environment variable
export ANSIBLE_GALAXY_SERVER_PRIVATE_HUB_TOKEN=$(python3 galaxy-token.py get private_hub)
```

### Option 2: HashiCorp Vault

For enterprise environments:

```bash
# Store the token in Vault
vault kv put secret/ansible/galaxy private_hub_token="your_token" galaxy_token="your_galaxy_token"

# Retrieve and export
export ANSIBLE_GALAXY_SERVER_PRIVATE_HUB_TOKEN=$(vault kv get -field=private_hub_token secret/ansible/galaxy)
export ANSIBLE_GALAXY_SERVER_GALAXY_TOKEN=$(vault kv get -field=galaxy_token secret/ansible/galaxy)
```

### Option 3: Ansible Vault

Store tokens in an encrypted file:

```bash
# Create an encrypted vars file
ansible-vault create galaxy-tokens.yml
```

Content:

```yaml
# galaxy-tokens.yml (encrypted with Ansible Vault)
---
galaxy_private_hub_token: "your_private_token"
galaxy_automation_hub_token: "your_rh_token"
galaxy_public_token: "your_galaxy_token"
```

Extract tokens before running Galaxy commands:

```bash
#!/bin/bash
# setup-galaxy-tokens.sh - Load tokens from Ansible Vault
eval $(ansible-vault view galaxy-tokens.yml | python3 -c "
import yaml, sys
data = yaml.safe_load(sys.stdin)
mapping = {
    'galaxy_private_hub_token': 'ANSIBLE_GALAXY_SERVER_PRIVATE_HUB_TOKEN',
    'galaxy_automation_hub_token': 'ANSIBLE_GALAXY_SERVER_AUTOMATION_HUB_TOKEN',
    'galaxy_public_token': 'ANSIBLE_GALAXY_SERVER_GALAXY_TOKEN',
}
for key, env_var in mapping.items():
    if key in data:
        print(f'export {env_var}=\"{data[key]}\"')
")
```

## Token Rotation

Tokens should be rotated periodically. Set up a rotation schedule:

```bash
#!/bin/bash
# rotate-galaxy-token.sh - Rotate Galaxy NG token
set -e

GALAXY_URL="https://galaxy.internal.com"
OLD_TOKEN="${ANSIBLE_GALAXY_SERVER_PRIVATE_HUB_TOKEN}"

# Create a new token (Galaxy NG API)
NEW_TOKEN=$(curl -s -X POST "${GALAXY_URL}/api/galaxy/v3/auth/token/" \
    -H "Authorization: Token ${OLD_TOKEN}" \
    -H "Content-Type: application/json" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data['token'])
")

echo "New token generated"

# Update in your secret store
# vault kv put secret/ansible/galaxy private_hub_token="$NEW_TOKEN"

# Or update the local file
# echo "export ANSIBLE_GALAXY_SERVER_PRIVATE_HUB_TOKEN=\"$NEW_TOKEN\"" > ~/.galaxy-tokens

echo "Token rotated successfully"
```

## CI/CD Token Configuration

In GitHub Actions:

```yaml
# .github/workflows/deploy.yml
---
name: Deploy

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Ansible
        run: pip install ansible-core

      - name: Configure Galaxy authentication
        env:
          ANSIBLE_GALAXY_SERVER_PRIVATE_HUB_TOKEN: ${{ secrets.PRIVATE_HUB_TOKEN }}
          ANSIBLE_GALAXY_SERVER_AUTOMATION_HUB_TOKEN: ${{ secrets.AUTOMATION_HUB_TOKEN }}
        run: |
          ansible-galaxy collection install -r requirements.yml -p ./collections/
```

In GitLab CI:

```yaml
# .gitlab-ci.yml
---
deploy:
  variables:
    ANSIBLE_GALAXY_SERVER_PRIVATE_HUB_TOKEN: $PRIVATE_HUB_TOKEN
    ANSIBLE_GALAXY_SERVER_AUTOMATION_HUB_TOKEN: $AUTOMATION_HUB_TOKEN
  script:
    - ansible-galaxy collection install -r requirements.yml -p ./collections/
    - ansible-playbook -i inventory playbook.yml
```

## Debugging Authentication Issues

When token authentication fails:

```bash
# Use verbose output to see authentication details
ansible-galaxy collection install community.general -vvvv

# Test the token directly with curl
curl -v -H "Authorization: Token your_token" \
    https://galaxy.internal.com/api/galaxy/v3/collections/

# Check if the token has expired
curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Token your_token" \
    https://galaxy.internal.com/api/galaxy/v3/collections/
# 200 = token works, 401 = token expired/invalid, 403 = insufficient permissions
```

Common issues:

- **401 Unauthorized**: Token is invalid or expired. Regenerate it.
- **403 Forbidden**: Token is valid but does not have the required permissions.
- **Connection refused**: The URL is wrong or the server is down.
- **SSL errors**: Certificate issues. Check your CA trust store.

## Summary

Token authentication for Ansible Galaxy involves generating tokens from each server's interface and configuring them in `ansible.cfg`, environment variables, or through the `--token` CLI flag. For security, never commit tokens to Git. Use environment variables for local development, secret management tools (HashiCorp Vault, system keyring) for persistent storage, and CI/CD secrets for pipeline configuration. Rotate tokens periodically and use the OAuth2 flow (with `auth_url`) for Automation Hub. When debugging authentication issues, verbose output and direct curl requests help isolate whether the problem is with the token, the URL, or network connectivity.
