# How to Install and Initialize HashiCorp Vault on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, HashiCorp, Linux

Description: Step-by-step guide on install and initialize hashicorp vault using Red Hat Enterprise Linux 9.

---

HashiCorp Vault provides secrets management, encryption as a service, and identity-based access for modern infrastructure. Initializing it properly on RHEL sets the foundation for secure secret storage.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Install the repository management plugin
sudo dnf install -y dnf-plugins-core

# Add HashiCorp repository
sudo dnf config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo

# Install Vault
sudo dnf install -y vault
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /etc/vault.d/vault.hcl
```

Adjust the settings according to your requirements. Key parameters to configure include storage, listener addresses, TLS, and logging options. For a single-node test setup, the configuration can look like this:

```hcl
ui = true
disable_mlock = true

storage "file" {
  path = "/opt/vault/data"
}

listener "tcp" {
  address     = "127.0.0.1:8200"
  tls_disable = true
}
```

Create the data directory and set ownership for the Vault service user:

```bash
sudo mkdir -p /opt/vault/data
sudo chown -R vault:vault /opt/vault/data /etc/vault.d
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

Initialize Vault and save the unseal keys and initial root token in a secure location:

```bash
export VAULT_ADDR='http://127.0.0.1:8200'
vault operator init
vault operator unseal
vault login
```

Run `vault operator unseal` with enough unseal keys to meet the threshold shown by `vault operator init`.

## Step 4: Configure the Firewall

```bash
# Open the required port
sudo firewall-cmd --permanent --add-port=8200/tcp
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```

Only open the firewall if Vault is configured to listen on a routable network address instead of `127.0.0.1`.


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check Vault status
vault status

# Verify Vault is accessible
vault secrets list
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u vault -e --no-pager`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Ensure Vault is installed: `rpm -qa | grep vault`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
