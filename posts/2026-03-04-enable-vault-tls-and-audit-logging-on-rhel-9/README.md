# How to Enable Vault TLS and Audit Logging on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, HashiCorp, Security, Linux

Description: Step-by-step guide on enable vault tls and audit logging using Red Hat Enterprise Linux 9.

---

TLS encryption protects Vault API traffic from eavesdropping, and audit logging creates a detailed record of Vault requests and responses. Both are essential for production Vault deployments.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- Vault installed and configured as a systemd service
- A TLS certificate and private key for the Vault server

## Step 2: Configure Vault TLS

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /etc/vault.d/vault.hcl
```

Adjust the listener settings according to your requirements. Key parameters to configure include the listening address, cluster address, TLS certificate file, TLS key file, and minimum TLS version.

```hcl
listener "tcp" {
  address         = "0.0.0.0:8200"
  cluster_address = "0.0.0.0:8201"
  tls_cert_file   = "/etc/vault.d/tls/vault.crt"
  tls_key_file    = "/etc/vault.d/tls/vault.key"
  tls_min_version = "tls12"
}
```

Make sure the Vault service user can read the certificate and key:

```bash
sudo chown -R vault:vault /etc/vault.d/tls
sudo chmod 0644 /etc/vault.d/tls/vault.crt
sudo chmod 0600 /etc/vault.d/tls/vault.key
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

Enable audit logging after Vault is initialized, unsealed, and you have authenticated with a token that can manage audit devices:

```bash
export VAULT_ADDR="https://127.0.0.1:8200"
# If you use a private CA, point the CLI at that CA bundle:
# export VAULT_CACERT="/etc/vault.d/tls/ca.crt"

sudo install -o vault -g vault -m 0750 -d /var/log/vault
vault audit enable file file_path=/var/log/vault/audit.log
```

## Step 4: Configure the Firewall

```bash
# Open the Vault API port
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

# Verify audit logging is enabled
vault audit list
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u vault -e --no-pager`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Ensure Vault is installed: `rpm -qa | grep vault`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
