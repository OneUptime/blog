# How to Set a Custom Admin Password on First Launch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Password, Security, Setup, Automation

Description: A guide to setting a custom admin password for Portainer on first launch using multiple methods including the UI, CLI flags, and environment variables.

## Overview

When Portainer is first installed, you have a brief window to set the admin password before the initialization timeout expires (5 minutes by default). This guide covers multiple methods to set the admin password: through the web UI during first launch, via the `--admin-password` CLI flag, using `--admin-password-file`, and through the Portainer API for automated first-run initialization.

## Method 1: Via the Web UI (Standard Method)

After deploying Portainer, navigate to `https://your-server:9443` within 5 minutes:

1. Enter your desired admin username (default: "admin")
2. Enter a strong password (minimum 12 characters)
3. Click "Create user"
4. Click "Get Started"

**Password Requirements:**
- Minimum 12 characters
- Administrators can increase the minimum password length later in authentication settings

## Method 2: Pre-configure Password via CLI Flag

Set the password directly in the docker run command (useful for automated deployments):

```bash
# Step 1: Generate a bcrypt hash of your password

# Method A: Using htpasswd
docker run --rm httpd:2.4-alpine \
  htpasswd -nbB admin 'YourStrongPassword123!' \
  | cut -d: -f2

# Method B: Using Python
python3 -c "import bcrypt; print(bcrypt.hashpw(b'YourStrongPassword123!', bcrypt.gensalt(rounds=10)).decode())"

# Method C: Using Node.js
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YourStrongPassword123!', 10, (e,h) => console.log(h))"
```

```bash
# Step 2: Use the hash in the docker run command
BCRYPT_HASH='$2y$10$abc123...'  # Your generated hash

docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --admin-password="${BCRYPT_HASH}"
```

**Important:** The bcrypt hash contains `$` signs. Use single quotes or escape them properly in your shell.

## Method 3: Using admin-password-file

For security, avoid passing passwords as command-line arguments. Use a file instead:

```bash
# Step 1: Create password file with the plaintext password
echo -n 'YourStrongPassword123!' > /tmp/portainer_admin_password
chmod 600 /tmp/portainer_admin_password

# Step 2: Mount the file and reference it
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /tmp/portainer_admin_password:/tmp/admin_pass:ro \
  portainer/portainer-ce:latest \
  --admin-password-file=/tmp/admin_pass
```

## Method 4: Via Portainer API (First Launch Automation)

If you're automating a brand-new Portainer deployment, initialize the admin account via API:

```bash
# Initialize the admin account
curl -s -k \
  -X POST https://portainer.example.com:9443/api/users/admin/init \
  -H "Content-Type: application/json" \
  -d '{
    "Username": "admin",
    "Password": "newStrongPassword123!"
  }'
```

This endpoint only works before any administrator account exists. After initialization, change the password through the UI or the user update API endpoints.

## Method 5: Reset Password if Forgotten

If you've lost access to Portainer:

```bash
# Stop Portainer
docker stop portainer

# Use Portainer's reset helper to set a new password
docker pull portainer/helper-reset-password
docker run --rm \
  -v portainer_data:/data \
  portainer/helper-reset-password \
  --password 'YourNewStrongPassword123!'

# Restart Portainer
docker start portainer
# Log in with the new password
```

## Automated Deployment with Pre-configured Password

For CI/CD or automated infrastructure:

```bash
#!/bin/bash
# deploy-portainer.sh

# Load password from secrets manager or environment
ADMIN_PASSWORD="${PORTAINER_ADMIN_PASSWORD}"

# Generate bcrypt hash
BCRYPT_HASH=$(docker run --rm httpd:2.4-alpine \
  htpasswd -nbB admin "${ADMIN_PASSWORD}" | cut -d: -f2)

# Deploy Portainer with pre-configured admin
docker volume create portainer_data
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --admin-password="${BCRYPT_HASH}"

echo "Portainer deployed with pre-configured admin password"
```

## Security Best Practices

1. **Use a strong, unique password** - avoid password reuse across services
2. **Use a password manager** - store Portainer admin credentials securely
3. **Use a password file or Docker secrets for automation** - avoid passing passwords as command-line arguments
4. **Rotate passwords regularly** - change admin passwords quarterly
5. **Use LDAP/AD or OAuth** - for team environments, prefer external authentication over local accounts

## Conclusion

Setting a strong admin password on first launch is a critical security step for Portainer deployments. For automated deployments, use the `--admin-password` flag with a bcrypt hash, `--admin-password-file` with a secret file, or the first-run API endpoint to ensure consistent, secure configuration without manual intervention. For production environments, consider using Portainer Business Edition with LDAP/AD or OAuth integration to reduce reliance on local password management.
