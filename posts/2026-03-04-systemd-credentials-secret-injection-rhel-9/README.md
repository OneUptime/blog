# How to Use systemd Credentials for Secure Secret Injection on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Systemd, Credential, Secret, Security, Linux

Description: Learn how to use the systemd credentials framework on RHEL to securely inject secrets into services without exposing them in unit files or environment variables.

---

systemd credentials provide a secure way to pass secrets (API keys, passwords, certificates) to services. Encrypted credentials are encrypted at rest, exposed to the service through a read-only credentials directory, and automatically cleaned up when the service stops. This is far more secure than storing secrets in unit files or environment variables.

## How Credentials Work

```mermaid
graph LR
    A[Encrypted Credential<br>/etc/credstore.encrypted/] --> B[systemd]
    B -->|Decrypted at runtime| C[Service Process]
    C -->|Reads from| D[$CREDENTIALS_DIRECTORY/secret]
    E[TPM2 or Host Key] --> B
```

## Step 1: Create Encrypted Credentials

```bash
# Create a credential encrypted with the host key

sudo mkdir -p /etc/credstore.encrypted
echo "my-secret-api-key-12345" | sudo systemd-creds encrypt --with-key=host --name=api-key - /etc/credstore.encrypted/api-key

# Create a credential from a file
sudo systemd-creds encrypt --with-key=host --name=db-password /path/to/db-password.txt /etc/credstore.encrypted/db-password

# List stored credentials
ls /etc/credstore.encrypted/

# Verify a credential can be decrypted
sudo systemd-creds decrypt --name=api-key /etc/credstore.encrypted/api-key -
```

## Step 2: Configure a Service to Use Credentials

```bash
# Create a service that receives credentials
sudo tee /etc/systemd/system/myapp.service << 'UNITEOF'
[Unit]
Description=My Application with Credentials

[Service]
ExecStart=/usr/local/bin/myapp
# Load credentials from the credential store
LoadCredentialEncrypted=api-key:/etc/credstore.encrypted/api-key
LoadCredentialEncrypted=db-password:/etc/credstore.encrypted/db-password
# The CREDENTIALS_DIRECTORY environment variable points to the secrets

[Install]
WantedBy=multi-user.target
UNITEOF

sudo systemctl daemon-reload
```

## Step 3: Read Credentials in Your Application

```python
#!/usr/bin/env python3
"""myapp.py - Application that reads systemd credentials"""
import os
import sys

def read_credential(name):
    """Read a credential from the systemd credentials directory."""
    cred_dir = os.environ.get('CREDENTIALS_DIRECTORY')
    if not cred_dir:
        print("No credentials directory available", file=sys.stderr)
        return None

    cred_path = os.path.join(cred_dir, name)
    try:
        with open(cred_path, 'r') as f:
            return f.read().strip()
    except FileNotFoundError:
        print(f"Credential '{name}' not found", file=sys.stderr)
        return None

def main():
    api_key = read_credential('api-key')
    db_password = read_credential('db-password')

    if api_key:
        print(f"API key loaded (length: {len(api_key)})")
    if db_password:
        print(f"DB password loaded (length: {len(db_password)})")

    # Use the secrets in your application logic
    # ...

if __name__ == '__main__':
    main()
```

```bash
# In a shell script, read credentials like this:
#!/bin/bash
API_KEY=$(cat "$CREDENTIALS_DIRECTORY/api-key")
DB_PASS=$(cat "$CREDENTIALS_DIRECTORY/db-password")
```

## Step 4: Use Plain-Text Credentials (Development)

```bash
# For development, you can use unencrypted credentials
sudo mkdir -p /etc/credstore
echo "dev-api-key" | sudo tee /etc/credstore/api-key

# Reference with LoadCredential (not LoadCredentialEncrypted)
# The service will look in /etc/credstore/ automatically
```

## Step 5: TPM2-Bound Credentials

```bash
# Encrypt credentials bound to the TPM2 chip
# These can only be decrypted on this specific machine
echo "tpm-bound-secret" | sudo systemd-creds encrypt --with-key=tpm2 --name=tpm-secret - /etc/credstore.encrypted/tpm-secret

# Use in a service
# LoadCredentialEncrypted=tpm-secret:/etc/credstore.encrypted/tpm-secret
```

## Summary

You have configured systemd credentials on RHEL for secure secret injection. Encrypted credentials are encrypted at rest, decrypted only at service runtime, and automatically cleaned up when the service stops. This approach eliminates the need for secrets in environment variables, configuration files, or unit files.
