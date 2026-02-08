# How to Set Up Docker on an Oracle Cloud Free Tier Instance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Oracle Cloud, Free Tier, Cloud Computing, DevOps, Container Setup

Description: A step-by-step guide to installing and configuring Docker on Oracle Cloud's always-free ARM and AMD instances.

---

Oracle Cloud Infrastructure (OCI) offers one of the most generous free tiers in cloud computing. You get up to four ARM-based Ampere A1 cores with 24 GB of RAM, or two AMD-based micro instances, all at zero cost. Combining that with Docker gives you a powerful playground for hosting containers, running side projects, or learning container orchestration without spending a dime.

This guide walks you through every step, from provisioning your instance to running your first container.

## Prerequisites

Before you begin, make sure you have:

- An Oracle Cloud account (sign up at cloud.oracle.com)
- An SSH key pair generated on your local machine
- Basic familiarity with Linux command-line tools

## Step 1: Create a Compute Instance

Log into the OCI Console and navigate to Compute > Instances > Create Instance. For the free tier, you have two choices:

**ARM (Ampere A1):** Up to 4 OCPUs and 24 GB RAM. Choose the "VM.Standard.A1.Flex" shape with Oracle Linux 8 or Ubuntu 22.04 as the image.

**AMD Micro:** Always free "VM.Standard.E2.1.Micro" shape with 1 OCPU and 1 GB RAM.

The ARM instance is the better pick for Docker workloads because of the extra memory. Select your VCN, assign a public IP, paste your SSH public key, and launch the instance.

## Step 2: Connect and Update the System

Once the instance is running, grab its public IP from the console and SSH in.

This command connects to the instance using your private key:

```bash
# Replace with your key path and instance IP
ssh -i ~/.ssh/oracle_key opc@<PUBLIC_IP>
```

On Oracle Linux, the default user is `opc`. On Ubuntu, it is `ubuntu`.

Update all system packages before installing anything new:

```bash
# Update package lists and upgrade installed packages
sudo dnf update -y        # Oracle Linux
# or
sudo apt update && sudo apt upgrade -y   # Ubuntu
```

## Step 3: Install Docker

The installation steps differ slightly depending on your OS choice.

### Oracle Linux 8/9

Oracle Linux ships with a `podman-docker` package that can conflict. Remove it first, then install Docker CE from the official repository.

```bash
# Remove conflicting podman-docker package if present
sudo dnf remove -y podman-docker

# Install required utilities
sudo dnf install -y dnf-utils

# Add the official Docker CE repository
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Install Docker Engine, CLI, and containerd
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

### Ubuntu 22.04

```bash
# Install prerequisite packages
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

## Step 4: Start Docker and Enable It on Boot

After installation, start the Docker daemon and configure it to launch automatically when the instance boots.

```bash
# Start Docker right now
sudo systemctl start docker

# Enable Docker to start on every boot
sudo systemctl enable docker

# Verify Docker is running
sudo systemctl status docker
```

## Step 5: Run Docker Without Sudo

By default, Docker commands require root privileges. Adding your user to the `docker` group eliminates the need for `sudo` on every command.

```bash
# Add the current user to the docker group
sudo usermod -aG docker $USER

# Apply the new group membership without logging out
newgrp docker

# Test that it works
docker run hello-world
```

You should see the "Hello from Docker!" message confirming everything is set up correctly.

## Step 6: Open Firewall Ports

Oracle Linux uses `firewalld`, and OCI has its own security lists. You need to open ports in both places if you want to expose container services to the internet.

Open ports in the OS firewall:

```bash
# Open port 80 for HTTP traffic
sudo firewall-cmd --permanent --add-port=80/tcp

# Open port 443 for HTTPS traffic
sudo firewall-cmd --permanent --add-port=443/tcp

# Reload firewall rules to apply changes
sudo firewall-cmd --reload
```

Then go to the OCI Console: Networking > Virtual Cloud Networks > your VCN > Security Lists > Default Security List. Add ingress rules for TCP ports 80 and 443 from source 0.0.0.0/0.

On Ubuntu, replace `firewall-cmd` with `iptables`. OCI Ubuntu images come with restrictive iptables rules by default:

```bash
# List current iptables rules to see existing restrictions
sudo iptables -L -n --line-numbers

# Allow incoming HTTP traffic
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT

# Allow incoming HTTPS traffic
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT

# Save iptables rules so they persist across reboots
sudo netfilter-persistent save
```

## Step 7: Configure Docker Daemon Options

For a cloud instance, a few daemon tweaks improve log management and storage efficiency.

Create or edit the Docker daemon configuration file:

```json
// /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true
}
```

```bash
# Write the config file
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true
}
EOF

# Restart Docker to apply the configuration
sudo systemctl restart docker
```

The `live-restore` option keeps containers running during Docker daemon restarts, which is valuable on a production-like server.

## Step 8: Deploy a Sample Application

Let us run a simple Nginx container to verify everything works end to end.

```bash
# Run Nginx on port 80, mapping host port 80 to container port 80
docker run -d --name web --restart unless-stopped -p 80:80 nginx:alpine
```

Open your browser and navigate to `http://<PUBLIC_IP>`. You should see the default Nginx welcome page.

## Step 9: Set Up Docker Compose

Docker Compose lets you define multi-container applications in a single YAML file. The Compose plugin was already installed in Step 3.

Verify it works:

```bash
# Check Docker Compose version
docker compose version
```

Create a sample compose file for a WordPress stack:

```yaml
# docker-compose.yml - WordPress with MySQL backend
version: "3.8"
services:
  db:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: changeme
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wpuser
      MYSQL_PASSWORD: wppass
    volumes:
      - db_data:/var/lib/mysql

  wordpress:
    image: wordpress:latest
    restart: unless-stopped
    depends_on:
      - db
    ports:
      - "8080:80"
    environment:
      WORDPRESS_DB_HOST: db:3306
      WORDPRESS_DB_USER: wpuser
      WORDPRESS_DB_PASSWORD: wppass
      WORDPRESS_DB_NAME: wordpress
    volumes:
      - wp_data:/var/www/html

volumes:
  db_data:
  wp_data:
```

```bash
# Launch the WordPress stack in detached mode
docker compose up -d

# Check that both containers are running
docker compose ps
```

## Tips for the Free Tier

**Watch your boot volume.** Free tier instances come with a 47 GB boot volume. Docker images can fill that up fast. Regularly prune unused images:

```bash
# Remove all unused images, networks, and stopped containers
docker system prune -af
```

**Use ARM images when possible.** On Ampere A1 instances, pull images built for `linux/arm64`. Most popular images on Docker Hub already support ARM. If you encounter an image that does not, you can build it yourself using a multi-platform Dockerfile.

**Set up swap space.** The 1 GB AMD micro instance benefits from swap:

```bash
# Create a 2 GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make swap permanent across reboots
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**Enable automatic security updates.** Keep your instance patched:

```bash
# Oracle Linux - enable automatic updates
sudo dnf install -y dnf-automatic
sudo systemctl enable --now dnf-automatic-install.timer
```

## Monitoring Your Instance

OCI provides built-in monitoring, but you can also run a lightweight monitoring stack with Docker:

```bash
# Run cAdvisor to monitor container resource usage
docker run -d \
  --name cadvisor \
  --restart unless-stopped \
  -p 9090:8080 \
  --volume /:/rootfs:ro \
  --volume /var/run:/var/run:ro \
  --volume /sys:/sys:ro \
  --volume /var/lib/docker/:/var/lib/docker:ro \
  gcr.io/cadvisor/cadvisor:latest
```

## Conclusion

You now have a fully functional Docker environment running on Oracle Cloud's free tier. The ARM instances with 24 GB of RAM are surprisingly capable, handling everything from personal web apps to small production workloads. Between the generous compute allocation and Docker's efficiency, you can run multiple containerized services without worrying about costs. Start experimenting, deploy your projects, and take advantage of one of the best free cloud offerings available today.
