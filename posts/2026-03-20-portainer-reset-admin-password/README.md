# How to Reset the Portainer Admin Password

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Administration, Password, Recovery

Description: Recover access to a locked Portainer instance by resetting the admin password using the helper container or CLI flags.

## Introduction

Locked out of Portainer because you forgot the admin password? Portainer provides an official method to reset the admin password using a helper container that operates directly on the Portainer data volume. This guide covers the password reset process for both Docker standalone and Kubernetes deployments.

## Prerequisites

- Access to the Docker host running Portainer
- Knowledge of the Portainer data volume name or path
- Docker installed (for the helper container method)

## Method 1: Using the Helper Container (Docker)

This is the official and recommended method. The `portainer/helper-reset-password` image directly modifies the Portainer database.

### Step 1: Stop Portainer

```bash
# Stop the Portainer container (do NOT remove it)

docker stop portainer

# Verify it's stopped
docker ps | grep portainer  # Should show nothing
docker ps -a | grep portainer  # Should show "Exited"
```

### Step 2: Find the Data Volume Name

```bash
# If using a named volume
docker volume ls | grep portainer
# Example output: local   portainer_data

# If using a bind mount, inspect the mounts and look for the line ending in -> /data
docker inspect --format '{{range .Mounts}}{{println .Source "->" .Destination}}{{end}}' portainer
```

### Step 3: Run the Password Reset Helper

```bash
# Run the helper against the same data volume
docker run --rm \
  -v portainer_data:/data \
  portainer/helper-reset-password

# Example output:
# 2020/06/04 00:13:58 Password successfully updated for user: admin
# 2020/06/04 00:13:58 Use the following password to login: &_4#\3^5V8vLTd)E"NWiJBs26G*9HPl1
```

Note the generated password - it's displayed only once.

### Step 4: Start Portainer and Log In

```bash
# Restart Portainer
docker start portainer

# Access the web UI and log in with:
# Username: admin
# Password: (the password shown by the helper)
```

### Step 5: Change to a New Password

After logging in, immediately change the password:

1. Click your username in the top-right corner
2. Select **My account**
3. Enter the generated password in "Current password"
4. Set a new strong password
5. Click **Update password**

## Method 2: Using Docker Compose

```bash
# Stop the portainer service
docker compose stop portainer

# Run the helper against whatever the stopped service mounts at /data
docker run --rm \
  -v "$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Source}}{{end}}{{end}}' "$(docker compose ps --all -q portainer)")":/data \
  portainer/helper-reset-password

# Restart portainer
docker compose start portainer
```

Or specify the volume explicitly:

```bash
# The volume name is typically: <project-name>_portainer_data
docker run --rm \
  -v myproject_portainer_data:/data \
  portainer/helper-reset-password
```

## Method 3: For Portainer in Kubernetes

```bash
# Scale down the Portainer deployment
kubectl scale deployment portainer -n portainer --replicas=0

# If your PVC has a different name, change claimName below.
# Run the helper as a temporary pod with the same PVC
kubectl run password-reset \
  --image=portainer/helper-reset-password \
  --restart=Never \
  --overrides='{"spec":{"volumes":[{"name":"data","persistentVolumeClaim":{"claimName":"portainer"}}],"containers":[{"name":"password-reset","image":"portainer/helper-reset-password","volumeMounts":[{"name":"data","mountPath":"/data"}]}]}}' \
  -n portainer

# Get the new password from logs
kubectl logs password-reset -n portainer

# Clean up and scale back up
kubectl delete pod password-reset -n portainer
kubectl scale deployment portainer -n portainer --replicas=1
```

## Method 4: Setting Initial Password via Flag

If Portainer has never been initialized (first run), use the `--admin-password` flag:

```bash
# Generate a bcrypt hash first
docker run --rm httpd:2.4-alpine htpasswd -nbB admin 'yourNewPassword' | cut -d ":" -f 2

# Start Portainer with the pre-set password
docker run -d -p 9443:9443 -p 8000:8000 \
  --name portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts \
  --admin-password='$2y$05$hash...'
```

## Conclusion

Portainer's helper container provides a safe, supported way to recover admin access without manual database manipulation. The process takes less than two minutes: stop Portainer, run the helper against the data volume, restart Portainer, and log in with the generated credentials. Always change the generated password immediately after recovery.
