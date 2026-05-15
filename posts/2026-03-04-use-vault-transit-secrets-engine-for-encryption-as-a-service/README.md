# How to Use Vault Transit Secrets Engine for Encryption as a Service on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, HashiCorp Vault, Secret Management, Linux

Description: Learn how to use Vault Transit Secrets Engine for Encryption as a Service on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Use Vault Transit Secrets Engine for Encryption as a Service on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection
- TLS certificate and key files for the Vault listener

## Overview

Use Vault Transit Secrets Engine for Encryption as a Service requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y yum-utils jq firewalld
```

## Step 2: Install Required Packages

```bash
sudo dnf config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo
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

Apply the recommended settings for your environment. For a single-node test server using integrated storage, start with a configuration like this and replace the certificate paths with certificates issued for your Vault address:

```hcl
ui = true
disable_mlock = true
api_addr = "https://127.0.0.1:8200"
cluster_addr = "https://127.0.0.1:8201"

storage "raft" {
  path = "/opt/vault/data"
  node_id = "vault-1"
}

listener "tcp" {
  address = "127.0.0.1:8200"
  cluster_address = "127.0.0.1:8201"
  tls_cert_file = "/etc/vault.d/tls/vault.crt"
  tls_key_file = "/etc/vault.d/tls/vault.key"
}
```

Then make sure the Vault service can read the configuration and storage directory:

```bash
sudo install -o vault -g vault -m 0750 -d /opt/vault/data
sudo chown -R vault:vault /etc/vault.d
```

## Step 4: Start and Enable the Service

```bash
sudo systemctl enable --now vault
sudo systemctl status vault
```

## Step 5: Verify the Configuration

Set the Vault address, check the server status, and initialize and unseal Vault if this is a new server. Run `vault operator unseal` once for each required unseal key share:

```bash
export VAULT_ADDR=https://127.0.0.1:8200
vault status
vault operator init
vault operator unseal <unseal-key-share>
```

After Vault is initialized and unsealed, authenticate with a token that can manage secrets engines, enable Transit, and create a key:

```bash
export VAULT_TOKEN=<initial-root-token-or-admin-token>
vault secrets enable transit
vault write -f transit/keys/orders
```

Test encryption and decryption. Vault Transit requires plaintext to be base64-encoded before encryption, and decrypted plaintext is returned as base64:

```bash
PLAINTEXT=$(printf "4111 1111 1111 1111" | base64 -w0)
CIPHERTEXT=$(vault write -field=ciphertext transit/encrypt/orders plaintext="$PLAINTEXT")
vault write -field=plaintext transit/decrypt/orders ciphertext="$CIPHERTEXT" | base64 -d
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
- Protect unseal keys and root tokens; use root tokens only for initial setup or emergencies
- Grant applications only the Transit paths they need, such as `transit/encrypt/orders` and `transit/decrypt/orders`
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u vault -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using port `8200`
4. **Transit encryption fails**: Verify that Vault is unsealed, the `transit/` secrets engine is enabled, and the plaintext value is base64-encoded

## Conclusion

You have successfully configured use vault transit secrets engine for encryption as a service on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
