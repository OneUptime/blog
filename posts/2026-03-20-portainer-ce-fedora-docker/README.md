# Installing Portainer CE on Fedora with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Fedora, Docker, Self-Hosted, Container Management

Description: A step-by-step guide to installing Portainer CE on Fedora Linux with Docker to manage containers through a web-based UI.

## Prerequisites

- Fedora 42, 43, or 44
- Root or sudo access
- Internet connectivity

## Step 1: Update the System

```bash
sudo dnf update -y
```

## Step 2: Install Docker

Fedora ships with Podman by default. To install Docker Engine from Docker's RPM repository:

```bash
sudo dnf config-manager addrepo --from-repofile https://download.docker.com/linux/fedora/docker-ce.repo
sudo dnf install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker

sudo usermod -aG docker $USER
newgrp docker
```

Verify:

```bash
docker --version
docker run hello-world
```

## Step 3: Create the Portainer Volume

```bash
docker volume create portainer_data
```

## Step 4: Deploy Portainer CE

```bash
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  --privileged \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Step 5: Open Firewall Ports

```bash
sudo firewall-cmd --permanent --add-port=9443/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload
```

## Step 6: Access Portainer

Navigate to `https://<server-ip>:9443` and set up your admin account.

## Troubleshooting

**SELinux on Fedora:**
```bash
docker stop portainer && docker rm portainer
# Re-run the deploy command with --privileged
```

**Docker socket permission:**
```bash
sudo usermod -aG docker $USER
newgrp docker
```

**Check logs:**
```bash
docker logs portainer
```

## Updating Portainer

```bash
docker stop portainer && docker rm portainer
docker pull portainer/portainer-ce:lts
# Re-run the deploy command

```

## Conclusion

Portainer CE on Fedora gives you a modern web UI for Docker container management. Note the SELinux consideration on Fedora - once Docker is properly configured and Portainer is deployed with `--privileged`, it runs reliably with the `--restart=always` policy.
