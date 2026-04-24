# How to Set Up Portainer with a Custom Admin Password on First Launch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Security, Automation, DevOps

Description: Learn how to pre-configure a Portainer admin password at launch time using the --admin-password flag for automated deployments.

---

By default, Portainer presents a web-based setup wizard on first launch where you create the admin account. For automated or scripted deployments, you can pre-set the admin password using a startup flag, bypassing the initial admin password screen.

## Option 1: Pass a Hashed Password at Runtime

Portainer accepts a bcrypt-hashed password via the `--admin-password` flag. First, generate the hash:

```bash
# Install htpasswd to generate a bcrypt hash

# On Ubuntu/Debian:
sudo apt-get install apache2-utils

# Generate a bcrypt hash
# Replace 'yourpassword' with your actual password
htpasswd -nbB admin "yourpassword" | cut -d: -f2
# Output example: $2y$05$abc123...
```

## Option 2: Use the admin-password-file Flag

For automation that avoids passing the password on the Portainer command line, store the plain text password in a file:

```bash
# Store the password in a file
echo -n "yourpassword" > /tmp/portainer_password.txt

# Mount the file into the container and reference it
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /tmp/portainer_password.txt:/tmp/portainer_password:ro \
  portainer/portainer-ce:latest \
  --admin-password-file /tmp/portainer_password
```

## Option 3: Inline Hash in docker run

Pass the hash directly on the command line (less secure, appears in shell history):

```bash
# Generate hash inline and pass to Portainer
HASH=$(htpasswd -nbB admin "yourpassword" | cut -d: -f2)

docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --admin-password "$HASH"
```

## Docker Compose Example

For infrastructure-as-code deployments, use Docker Compose with a mounted password file:

```yaml
# docker-compose.yml
version: "3.8"

services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    ports:
      - "8000:8000"
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
      # Mount the password file
      - ./portainer_password.txt:/tmp/portainer_password:ro
    command: --admin-password-file /tmp/portainer_password

volumes:
  portainer_data:
```

## Verify the Setup

After starting with a pre-configured password, the initial admin setup screen is skipped. Log in at `https://localhost:9443` using `admin` and the password you configured.

## Security Best Practices

- Prefer `--admin-password-file` or Docker secrets over passing plain text passwords directly to Portainer on the command line
- Use Docker secrets for production deployments on Swarm
- Rotate the admin password after initial setup via **My account**
- Portainer's default minimum password length is 12 characters

---

*Automate your infrastructure monitoring with [OneUptime](https://oneuptime.com) alongside your Portainer deployments.*
