# How to Use an Admin Password File for Portainer Setup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Security, Secrets Management, Administration

Description: Use the --admin-password-file flag to securely provide the initial admin password to Portainer without exposing it in command arguments or environment variables.

## Introduction

The `--admin-password-file` flag is a secure way to configure Portainer's initial admin password in automated deployments. Unlike passing a bcrypt hash directly with `--admin-password` (which exposes the hash in process listings and Docker inspect output), the file-based approach keeps the plaintext password out of command arguments and supports Docker Secrets and Kubernetes Secret volumes.

## Why Use a Password File?

When you run:
```bash
docker run --name portainer portainer/portainer-ce:sts \
  --admin-password='$2y$05$8oz75U8m5tI/xT4P0NbSHeE7WyRzOWKRBprfGotwDkhBOGP/u802u'
```

The bcrypt hash is visible to anyone who can run `docker inspect portainer` or inspect host processes with `ps aux`. A password file eliminates this exposure and lets you keep the plaintext password in a mounted secret.

## Step 1: Create the Password File

```bash
# Create a directory for Portainer secrets

sudo mkdir -p /etc/portainer/secrets
sudo chmod 700 /etc/portainer/secrets

# Write the password to the file (no trailing newline)
printf 'MyStr0ngP@ssword2024!' | sudo tee /etc/portainer/secrets/admin_password > /dev/null

# Restrict permissions - only root can read it
sudo chmod 600 /etc/portainer/secrets/admin_password
sudo ls -la /etc/portainer/secrets/admin_password
```

## Step 2: Mount and Reference the File

```bash
docker run -d \
  --name portainer \
  --restart always \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /etc/portainer/secrets/admin_password:/run/portainer/admin_password:ro \
  portainer/portainer-ce:sts \
  --admin-password-file=/run/portainer/admin_password
```

The `:ro` flag mounts the file read-only, preventing the container from modifying it.

## Docker Compose Setup

```yaml
services:
  portainer:
    image: portainer/portainer-ce:sts
    container_name: portainer
    restart: always
    ports:
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
      # Mount the password file read-only
      - /etc/portainer/secrets/admin_password:/run/secrets/portainer_admin:ro
    command:
      - "--admin-password-file=/run/secrets/portainer_admin"
      - "--trusted-origins=portainer.example.com"

volumes:
  portainer_data:
```

## Docker Swarm with Native Secrets

Docker Swarm's secret management is the most secure option - secrets are encrypted at rest and in transit:

```bash
# Create the secret from a file
docker secret create portainer_admin_password /etc/portainer/secrets/admin_password

# Or from stdin (avoids writing to disk)
printf 'MyStr0ngP@ssword2024!' | docker secret create portainer_admin_password -

# Verify the secret was created (contents are never shown)
docker secret ls
```

```yaml
# portainer-stack.yml
version: "3.8"

services:
  portainer:
    image: portainer/portainer-ce:sts
    command:
      # Docker Swarm mounts secrets at /run/secrets/<name>
      - "--admin-password-file=/run/secrets/portainer_admin_password"
    secrets:
      - portainer_admin_password
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    ports:
      - "9443:9443"
    deploy:
      placement:
        constraints:
          - node.role == manager
      replicas: 1

secrets:
  portainer_admin_password:
    external: true  # References the secret created above

volumes:
  portainer_data:
```

```bash
docker stack deploy -c portainer-stack.yml portainer
```

## Kubernetes with Secret Volume

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: portainer-admin-password
  namespace: portainer
type: Opaque
stringData:
  admin-password: "MyStr0ngP@ssword2024!"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: portainer
  namespace: portainer
spec:
  selector:
    matchLabels:
      app: portainer
  template:
    metadata:
      labels:
        app: portainer
    spec:
      containers:
        - name: portainer
          image: portainer/portainer-ce:sts
          args:
            - "--admin-password-file=/run/secrets/portainer/admin-password"
          volumeMounts:
            - name: portainer-secrets
              mountPath: /run/secrets/portainer
              readOnly: true
      volumes:
        - name: portainer-secrets
          secret:
            secretName: portainer-admin-password
```

## Verifying the Configuration

```bash
# Confirm Portainer started without errors
docker logs portainer 2>&1 | head -20

# Test login with the configured password
curl -sk -X POST https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"MyStr0ngP@ssword2024!"}' \
  | python3 -m json.tool
```

## Conclusion

The password file approach is the secure standard for automated Portainer deployments. It integrates cleanly with Docker Secrets, Kubernetes Secrets, and other secret management systems. By keeping the credential out of command arguments and environment variables, you reduce the attack surface and make secrets auditable and rotatable without changing your Docker/Compose files.
