# How to Store and Retrieve Secrets with Vault on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, HashiCorp, Linux

Description: Step-by-step guide on store and retrieve secrets with vault using Red Hat Enterprise Linux 9.

---

Storing and retrieving secrets is Vault's core functionality. The KV (Key-Value) secrets engine provides a straightforward way to manage sensitive data like passwords, API keys, and certificates.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- A secure location to store the Vault unseal keys and initial root token

## Step 1: Install Vault

Install Vault from HashiCorp's RHEL package repository:

```bash
# Install repository tools
sudo dnf install -y dnf-plugins-core

# Add the HashiCorp repository for RHEL
sudo dnf config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo

# Install Vault
sudo dnf install -y vault
```

## Step 2: Configure Vault

Edit the configuration file to match your environment:

```bash
# Open the configuration file

sudo vi /etc/vault.d/vault.hcl
```

Adjust the settings according to your requirements. Key parameters to configure include the storage backend, listening address, API address, and logging options.

```hcl
ui = true
api_addr = "http://127.0.0.1:8200"

storage "raft" {
  path    = "/opt/vault/data"
  node_id = "rhel-vault-1"
}

listener "tcp" {
  address     = "127.0.0.1:8200"
  tls_disable = true
}
```

```bash
# Restart the service to apply changes
sudo systemctl restart vault
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable vault

# Start the service
sudo systemctl start vault

# Check the status
sudo systemctl status vault
```

Initialize Vault, unseal it, and log in before storing secrets:

```bash
# Point the CLI at the local Vault listener
export VAULT_ADDR="http://127.0.0.1:8200"

# Initialize Vault and save the unseal keys and initial root token securely
vault operator init

# Run this command three times with three different unseal keys from the init output
vault operator unseal

# Log in with the initial root token, or another token with the required policy
vault login
```

## Step 4: Configure the Firewall

```bash
# Open the Vault API port if you change the listener to a reachable network address
sudo firewall-cmd --permanent --add-port=8200/tcp
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check Vault status
vault status

# Verify Vault is accessible
vault secrets list

# Enable the KV v2 secrets engine
vault secrets enable -path=secret -version=2 kv

# Store a secret
vault kv put secret/myapp username="appuser" password="change-me"

# Retrieve the secret
vault kv get secret/myapp
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u vault -e --no-pager`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Ensure Vault is installed: `rpm -q vault`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
