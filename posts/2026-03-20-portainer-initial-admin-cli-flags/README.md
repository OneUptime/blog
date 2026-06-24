# How to Set Up the Initial Admin Account via CLI Flags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Administration, Automation, CLI, Initial Setup

Description: Automate Portainer's initial admin account setup using CLI flags to bypass the interactive setup wizard and enable unattended deployments.

## Introduction

By default, Portainer requires you to create the admin account on first boot. This is problematic for automated deployments, infrastructure-as-code, or CI/CD pipelines. Portainer provides CLI flags to pre-configure the admin account, avoiding manual password entry during the initial setup flow.

## Prerequisites

- Docker installed
- Portainer data volume not yet initialized (these flags only work when first creating the admin user)

## Method 1: Plain Text Passwords Are Not Supported by `--admin-password`

Portainer's `--admin-password` flag expects a bcrypt hash, not a plain text password. If you want to avoid storing the hash inline, use Method 3 with `--admin-password-file` instead.

## Method 2: Hashed Password Flag (Recommended)

Pre-hash the password with bcrypt before passing it to Portainer:

```bash
# Step 1: Generate a bcrypt hash of your desired password

# Using htpasswd from Apache utils
sudo apt-get install -y apache2-utils
htpasswd -nbB admin 'MyStr0ngP@ssword!' | cut -d":" -f2

# Or using Python (requires the bcrypt package)
python3 -m pip install bcrypt
python3 -c "import bcrypt; print(bcrypt.hashpw(b'MyStr0ngP@ssword!', bcrypt.gensalt(rounds=10)).decode())"

# Or using Docker (no local dependencies)
docker run --rm httpd:2.4-alpine htpasswd -nbB admin 'MyStr0ngP@ssword!' | cut -d":" -f2
```

Example output (your hash will differ):
```bash
$2y$05$8oz75U8m5tI/xT4P0NbSHeE7WyRzOWKRBprfGotwDkhBOGP/u802u
```

```bash
# Step 2: Use the hash in Portainer startup
docker run -d \
  --name portainer \
  --restart always \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --admin-password='$2y$05$8oz75U8m5tI/xT4P0NbSHeE7WyRzOWKRBprfGotwDkhBOGP/u802u'
```

**Note**: The `$` characters in the hash need to be escaped or wrapped in single quotes.

## Method 3: Password File Flag (Most Secure)

Store the password in a file and reference it:

```bash
# Create a secure password file
sudo install -d -m 700 /etc/portainer
sudo sh -c "printf '%s' 'MyStr0ngP@ssword!' > /etc/portainer/admin_password.txt"
sudo chmod 600 /etc/portainer/admin_password.txt

# Reference the file at startup
docker run -d \
  --name portainer \
  --restart always \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /etc/portainer/admin_password.txt:/tmp/portainer_password:ro \
  portainer/portainer-ce:latest \
  --admin-password-file=/tmp/portainer_password
```

## Docker Compose Example

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    ports:
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
      # Mount password file (most secure approach)
      - ./secrets/portainer_password.txt:/tmp/portainer_password:ro
    command:
      - "--admin-password-file=/tmp/portainer_password"
      - "--trusted-origins=https://portainer.example.com"

volumes:
  portainer_data:
```

## Using Docker Secrets (Swarm)

```yaml
version: "3.8"

services:
  portainer:
    image: portainer/portainer-ce:latest
    ports:
      - "9443:9443"
      - "8000:8000"
    command:
      - "--admin-password-file=/run/secrets/portainer_admin"
    secrets:
      - portainer_admin
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    deploy:
      placement:
        constraints:
          - node.role == manager

secrets:
  portainer_admin:
    external: true  # Create with: echo -n 'password' | docker secret create portainer_admin -

volumes:
  portainer_data:
```

```bash
# Create the secret
echo -n 'MyStr0ngP@ssword!' | docker secret create portainer_admin -

# Deploy the stack
docker stack deploy -c portainer-stack.yml portainer
```

## Verifying the Setup

```bash
# Test login immediately after startup
curl -X POST https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"MyStr0ngP@ssword!"}' \
  -k  # Allow self-signed cert

# Expected: {"jwt":"eyJ..."}
```

## Conclusion

Pre-configuring the admin account via CLI flags enables automated Portainer deployments without manually creating the initial admin password. The password file approach is most secure as it keeps credentials out of process lists and Docker inspect output. For Docker Swarm, use Docker Secrets for the most secure secret management. Always change the admin password to something unique per environment immediately after deployment.
