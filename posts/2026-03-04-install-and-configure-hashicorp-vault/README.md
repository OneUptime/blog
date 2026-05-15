# How to Install and Configure HashiCorp Vault on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, HashiCorp Vault, Secret Management, Linux

Description: Learn how to install and Configure HashiCorp Vault on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Install and Configure HashiCorp Vault on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Install and Configure HashiCorp Vault requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y yum-utils
```

## Step 2: Install Required Packages

```bash
sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo
sudo dnf install -y vault
```

Verify the installation:

```bash
vault version
rpm -qi vault
```

## Step 3: Configure the Service

Create or edit the main configuration file:

```bash
sudo vi /etc/vault.d/vault.hcl
```

Apply the recommended settings for your environment. Start with a valid Vault server configuration and adjust the addresses, TLS certificate paths, and node ID for your host:

```hcl
ui            = true
api_addr      = "https://127.0.0.1:8200"
cluster_addr  = "https://127.0.0.1:8201"

storage "raft" {
  path    = "/opt/vault/data"
  node_id = "vault-1"
}

listener "tcp" {
  address       = "127.0.0.1:8200"
  tls_cert_file = "/opt/vault/tls/vault.crt"
  tls_key_file  = "/opt/vault/tls/vault.key"
}
```

## Step 4: Start and Enable the Service

```bash
sudo systemctl enable --now vault
sudo systemctl status vault
```

## Step 5: Verify the Configuration

Set the Vault API address:

```bash
export VAULT_ADDR=https://127.0.0.1:8200
vault status
```

Initialize Vault once, then securely store the unseal keys and initial root token from the output:

```bash
vault operator init
```

Unseal Vault with the required number of unseal keys:

```bash
vault operator unseal
```

Check the logs for any errors:

```bash
journalctl -u vault -f
```

## Step 6: Configure Firewall Rules

If the service needs network access:

```bash
sudo firewall-cmd --permanent --add-port=8200/tcp
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show vault --property=MemoryCurrent
top -p $(pidof vault)
```

## Security Considerations

- Run the service with a dedicated non-root user when possible
- Enable TLS/SSL for network communication
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u vault -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp | grep 8200` to identify processes using the port

## Conclusion

You have successfully installed and configured HashiCorp Vault on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
