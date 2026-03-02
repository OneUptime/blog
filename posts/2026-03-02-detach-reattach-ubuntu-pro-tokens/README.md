# How to Detach and Reattach Ubuntu Pro Tokens

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Ubuntu Pro, Token Management, Administration

Description: How to detach Ubuntu Pro tokens from machines and reattach them, covering token management for organizations managing fleets of Ubuntu servers.

---

Ubuntu Pro tokens bind a machine to a subscription. Organizations with limited seat counts need to manage these tokens - detaching them from decommissioned machines and reattaching to new ones. This post covers the mechanics of that process.

## How Pro Token Attachment Works

When you run `sudo pro attach TOKEN`, the system:
1. Validates the token against Canonical's contract server
2. Registers the machine under the associated account
3. Stores the token and contract data locally in `/var/lib/ubuntu-advantage/`
4. Enables default services for the subscription type

The token itself is a machine identifier, not a per-seat credential. One token can be used to attach multiple machines up to the seat limit of your subscription. For free personal subscriptions, the limit is 5 machines.

## Checking What Is Currently Attached

Before detaching, verify what you have attached:

```bash
# Check attachment status
pro status

# See account and subscription information
pro accounts

# Check which machines are consuming your subscription (web portal)
# Visit ubuntu.com/pro/dashboard
```

## Detaching Ubuntu Pro

Detaching removes the Pro subscription from a machine:

```bash
# Detach Pro (runs as root)
sudo pro detach
```

The detach process:
1. Disables all enabled Pro services (ESM, Livepatch, etc.)
2. Removes ESM apt repositories
3. Removes stored token and contract data
4. Deregisters the machine from the account

Detaching does NOT:
- Remove packages that were installed via ESM repositories
- Uninstall Livepatch (just stops the service)
- Remove any configuration changes made by Pro services

### Non-Interactive Detach (for Scripting)

```bash
# Detach without confirmation prompt
sudo pro detach --assume-yes
```

### What Happens to ESM Packages

After detaching, packages installed from ESM repositories remain installed. However, they will no longer receive updates because the ESM repositories are removed. If you later `apt upgrade`, apt cannot update these packages from any available source.

```bash
# After detaching, check if any packages are from ESM (now unavailable)
apt list --installed 2>/dev/null | grep -i esm

# Packages still installed but from removed repos show up as:
# package/now version architecture [installed,local]
```

## Reattaching to the Same Account

On a freshly set up machine or after detaching:

```bash
# Reattach with the same token
sudo pro attach YOUR_TOKEN

# Verify the attachment
pro status
```

## Reattaching to a Different Account

To move a machine from one Canonical account to another (e.g., during an organization restructure):

```bash
# Detach from the current account
sudo pro detach --assume-yes

# Attach with the new account's token
sudo pro attach NEW_TOKEN

# Verify
pro status
```

## Rotating Tokens

If a token needs to be rotated (security rotation, expired token, etc.):

```bash
# Get the new token from ubuntu.com/pro
# Detach and reattach

sudo pro detach --assume-yes
sudo pro attach NEW_TOKEN
```

For organizations, tokens can be refreshed without detaching if they are still valid:

```bash
# Refresh the contract data from Canonical's servers
sudo pro refresh

# If the token was updated on the Canonical side, this picks up the changes
```

## Managing Tokens in a Fleet

For organizations with many servers, manual token management does not scale. Several approaches work better:

### Cloud-Init Attachment

For new machine provisioning, include Pro attachment in cloud-init:

```yaml
#cloud-config
ubuntu_advantage:
  token: YOUR_TOKEN
  enable:
    - esm-infra
    - esm-apps
    - livepatch
```

This attaches Pro automatically on first boot. No manual intervention is needed per machine.

### Ansible Playbook

For attaching existing machines:

```yaml
---
- name: Attach Ubuntu Pro
  hosts: ubuntu_servers
  become: true
  vars:
    ubuntu_pro_token: "{{ vault_ubuntu_pro_token }}"  # From Ansible Vault

  tasks:
    - name: Install ubuntu-advantage-tools
      apt:
        name: ubuntu-advantage-tools
        state: present
        update_cache: true

    - name: Check if already attached
      command: pro status --format json
      register: pro_status_output
      changed_when: false
      failed_when: false

    - name: Parse Pro status
      set_fact:
        pro_attached: "{{ (pro_status_output.stdout | from_json).attached }}"
      when: pro_status_output.rc == 0

    - name: Attach Ubuntu Pro if not attached
      command: "pro attach {{ ubuntu_pro_token }}"
      when: not (pro_attached | default(false))

    - name: Enable ESM services
      command: "pro enable {{ item }}"
      loop:
        - esm-infra
        - esm-apps
      ignore_errors: true  # May already be enabled
```

Store the token in Ansible Vault:

```bash
ansible-vault encrypt_string 'YOUR_TOKEN' --name 'vault_ubuntu_pro_token'
```

### Terraform / Packer

For immutable infrastructure that bakes in Pro:

```hcl
# Packer provisioner
provisioner "shell" {
  environment_vars = [
    "UBUNTU_PRO_TOKEN=${var.ubuntu_pro_token}"
  ]
  inline = [
    "sudo pro attach ${UBUNTU_PRO_TOKEN}",
    "sudo pro enable esm-infra esm-apps livepatch"
  ]
}
```

## Handling Attachment Failures

### Network Connectivity Issues

```bash
# Check if the machine can reach Canonical's contract server
curl -v https://contracts.canonical.com

# If behind a proxy, configure the proxy for Pro
sudo nano /etc/ubuntu-advantage/uaclient.conf
```

Add proxy configuration:

```json
{
  "contract_url": "https://contracts.canonical.com",
  "http_proxy": "http://proxy.example.com:8080",
  "https_proxy": "http://proxy.example.com:8080"
}
```

Or set environment variables:

```bash
sudo HTTP_PROXY=http://proxy.example.com:8080 \
     HTTPS_PROXY=http://proxy.example.com:8080 \
     pro attach YOUR_TOKEN
```

### Token Limit Reached

If you see "maximum number of machines" errors:

```bash
# The web dashboard shows which machines are attached
# Visit ubuntu.com/pro/dashboard

# Detach decommissioned machines first (if they are still running)
# Or use the web portal to remove machines that no longer exist
```

On the web portal, you can remove machines that are no longer reachable (e.g., deleted cloud instances that were not properly detached before deletion).

### Expired or Invalid Token

```bash
# Verify the token is valid by checking the pro portal
# Try refreshing
sudo pro refresh

# If that fails, get a new token from ubuntu.com/pro and reattach
sudo pro detach --assume-yes
sudo pro attach NEW_TOKEN
```

## Token Management Best Practices

**1. Store tokens in a secrets manager**

Tokens are sensitive - they allow attaching machines to your organization's account. Use HashiCorp Vault, AWS Secrets Manager, or similar:

```bash
# Example: Retrieve token from AWS Secrets Manager
TOKEN=$(aws secretsmanager get-secret-value --secret-id ubuntu-pro-token --query SecretString --output text)
sudo pro attach "$TOKEN"
```

**2. Detach before decommissioning**

Always detach before destroying a machine:

```bash
# In your decommission script or Terraform destroy provisioner
sudo pro detach --assume-yes
```

**3. Track which machines are attached**

Use the Canonical web portal or query machines via a configuration management tool:

```bash
# Script to inventory Pro status across your fleet
for host in $(cat servers.txt); do
    echo -n "$host: "
    ssh "$host" "pro status --format json 2>/dev/null | python3 -c \"import json,sys; d=json.load(sys.stdin); print('ATTACHED' if d.get('attached') else 'NOT_ATTACHED')\"" 2>/dev/null || echo "UNREACHABLE"
done
```

**4. Use organization tokens, not personal tokens**

Personal tokens have a 5-machine limit. Organizational subscriptions have their own tokens with the appropriate seat count. Keep personal and organizational tokens separate.

## Verifying a Successful Reattach

```bash
# Full status check
pro status

# Verify ESM repos are accessible
sudo apt update 2>&1 | grep -E "esm|error"

# Verify Livepatch is running
sudo canonical-livepatch status

# Check that package security status looks correct
pro security-status | head -20
```

The combination of `pro detach` and `pro attach` is the correct way to move a token between machines or refresh a broken attachment. The process is clean and reversible, and the machine retains its installed packages even after detaching.
