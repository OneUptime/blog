# How to Set Up Docker on a Headless Linux Server via SSH

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Linux, SSH, Server, Installation, DevOps, Containers, Remote Administration, Headless

Description: A complete guide to installing and managing Docker on a remote headless Linux server over SSH, covering secure setup, remote management, and monitoring.

---

Most production Docker deployments run on headless servers, machines with no monitor, keyboard, or graphical interface. You manage everything through SSH. This guide covers the full workflow: connecting to a remote server, installing Docker, configuring it for production use, and managing containers remotely. The examples use Ubuntu, but the concepts apply to any Linux distribution.

## Prerequisites

- A remote Linux server (cloud VPS, bare metal, or on-premises)
- SSH access to the server with a user that has sudo privileges
- SSH key-based authentication configured (recommended over passwords)
- The server has an active internet connection

## Step 1: Connect to the Server

```bash
# Connect to your server via SSH
ssh user@your-server-ip

# Or with a specific SSH key
ssh -i ~/.ssh/my-key.pem user@your-server-ip
```

For long sessions, consider using `tmux` or `screen` to prevent disconnections from killing running processes.

```bash
# Start a tmux session
tmux new -s docker-setup
```

If your SSH connection drops, reconnect and reattach.

```bash
# Reattach to the tmux session after reconnection
ssh user@your-server-ip
tmux attach -t docker-setup
```

## Step 2: Update the System

```bash
# Update package lists and upgrade
sudo apt-get update && sudo apt-get upgrade -y
```

## Step 3: Install Docker

Use Docker's official convenience script for a quick installation.

```bash
# Download and run the official install script
curl -fsSL https://get.docker.com | sudo sh
```

For a more controlled installation, follow the manual repository setup.

```bash
# Install prerequisites
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker's GPG key
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## Step 4: Configure Docker for Production

On a headless server, several configuration choices matter more than on a development machine.

### Non-Root Access

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER

# Apply the group change
newgrp docker
```

### Daemon Configuration

Create a production-ready daemon configuration.

```bash
# Write a production daemon.json
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65536,
      "Soft": 32768
    }
  },
  "exec-opts": ["native.cgroupdriver=systemd"],
  "metrics-addr": "127.0.0.1:9323"
}
EOF
```

Key settings explained:
- `live-restore`: Keeps containers running during Docker daemon restarts
- `default-ulimits`: Raises file descriptor limits for high-traffic containers
- `metrics-addr`: Exposes Prometheus metrics on localhost only

Apply the configuration.

```bash
# Reload and restart Docker
sudo systemctl daemon-reload
sudo systemctl restart docker
```

### Enable Docker at Boot

```bash
# Ensure Docker starts automatically
sudo systemctl enable docker
sudo systemctl enable containerd
```

## Step 5: Verify the Installation

```bash
# Run the test container
docker run hello-world

# Check system information
docker info
```

## Remote Docker Management

### Using SSH to Run Docker Commands

You do not have to SSH into the server every time you want to run a Docker command. Use SSH as a Docker transport directly from your local machine.

```bash
# Run Docker commands on the remote server from your local machine
docker -H ssh://user@your-server-ip ps
docker -H ssh://user@your-server-ip images
```

### Setting Up a Docker Context

Docker contexts make remote management seamless.

```bash
# Create a context for your remote server (run on your local machine)
docker context create my-server --docker "host=ssh://user@your-server-ip"

# Switch to the remote context
docker context use my-server

# Now all Docker commands run on the remote server
docker ps
docker images
docker compose up -d

# Switch back to local Docker
docker context use default
```

This is the cleanest way to manage Docker on headless servers. No extra ports to open, no TLS certificates to manage. Authentication uses your existing SSH keys.

### Using Docker over TCP with TLS

If SSH-based Docker access is not suitable (perhaps you need programmatic access), you can expose Docker over TCP with TLS authentication.

Generate TLS certificates.

```bash
# Create a directory for TLS certificates
mkdir -p ~/.docker/tls && cd ~/.docker/tls

# Generate CA key and certificate
openssl genrsa -aes256 -out ca-key.pem 4096
openssl req -new -x509 -days 365 -key ca-key.pem -sha256 -out ca.pem -subj "/CN=Docker CA"

# Generate server key and certificate
openssl genrsa -out server-key.pem 4096
openssl req -new -key server-key.pem -out server.csr -subj "/CN=your-server-ip"

# Create a config for the server certificate
echo "subjectAltName = IP:your-server-ip,IP:127.0.0.1" > extfile.cnf
echo "extendedKeyUsage = serverAuth" >> extfile.cnf

# Sign the server certificate
openssl x509 -req -days 365 -sha256 -in server.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial -out server-cert.pem -extfile extfile.cnf

# Generate client key and certificate
openssl genrsa -out key.pem 4096
openssl req -new -key key.pem -out client.csr -subj "/CN=client"
echo "extendedKeyUsage = clientAuth" > client-extfile.cnf
openssl x509 -req -days 365 -sha256 -in client.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial -out cert.pem -extfile client-extfile.cnf

# Set permissions
chmod 0400 ca-key.pem key.pem server-key.pem
chmod 0444 ca.pem server-cert.pem cert.pem
```

Configure Docker to use TLS.

```bash
# Update daemon.json with TLS settings
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "tlsverify": true,
  "tlscacert": "/root/.docker/tls/ca.pem",
  "tlscert": "/root/.docker/tls/server-cert.pem",
  "tlskey": "/root/.docker/tls/server-key.pem",
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2376"]
}
EOF

sudo systemctl restart docker
```

Connect from your local machine.

```bash
# Connect with TLS from your local machine
docker --tlsverify --tlscacert=ca.pem --tlscert=cert.pem --tlskey=key.pem -H tcp://your-server-ip:2376 ps
```

Most users should prefer the SSH-based approach. It is simpler and does not require opening additional firewall ports.

## Firewall Configuration

Lock down the server to only allow necessary traffic.

```bash
# Configure UFW for a Docker server
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow 22/tcp

# Allow specific ports for your containerized services
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable the firewall
sudo ufw enable
```

Docker manipulates iptables directly and can bypass UFW. To prevent this, configure Docker's iptables behavior.

```bash
# Prevent Docker from modifying iptables (advanced - requires manual networking)
# Only do this if you understand iptables thoroughly
# Add "iptables": false to /etc/docker/daemon.json
```

## Monitoring Docker on a Headless Server

Without a GUI, you need command-line monitoring tools.

### Real-Time Container Stats

```bash
# Watch container resource usage in real time
docker stats
```

### System Health Check Script

Create a simple health check script.

```bash
# Create a Docker health check script
cat <<'SCRIPT' > ~/docker-health.sh
#!/bin/bash
echo "=== Docker Service Status ==="
systemctl is-active docker

echo ""
echo "=== Running Containers ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=== Disk Usage ==="
docker system df

echo ""
echo "=== Recent Docker Events ==="
docker events --since 1h --until "$(date +%Y-%m-%dT%H:%M:%S)" 2>/dev/null | tail -20
SCRIPT

chmod +x ~/docker-health.sh
```

Run it anytime.

```bash
# Check Docker health
~/docker-health.sh
```

### Log Monitoring

```bash
# View logs for a specific container
docker logs --tail 50 -f container-name

# View Docker daemon logs
sudo journalctl -u docker --no-pager -n 100
```

## Deploying Containers on the Headless Server

### Using Docker Compose

Transfer your Compose files to the server and start your stack.

```bash
# Copy files from your local machine to the server
scp -r ./my-project user@your-server-ip:~/my-project

# SSH in and start the stack
ssh user@your-server-ip
cd ~/my-project
docker compose up -d
```

Or use the Docker context approach to deploy without SSHing in.

```bash
# Deploy directly from your local machine using a Docker context
docker context use my-server
cd ./my-project
docker compose up -d
docker context use default
```

### Auto-Restart Containers

Always use restart policies for production containers.

```bash
# Run with automatic restart
docker run -d --restart unless-stopped --name my-app my-app:latest
```

## Automated Updates

Set up unattended security updates for the host OS.

```bash
# Install and configure unattended upgrades
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

For Docker image updates, use a tool like Watchtower.

```bash
# Run Watchtower to auto-update containers
docker run -d \
  --name watchtower \
  --restart unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --interval 86400 \
  --cleanup
```

This checks for image updates every 24 hours and restarts containers with newer images.

## Summary

Setting up Docker on a headless server is straightforward: install Docker, configure it for production (log rotation, live restore, resource limits), and set up remote access via SSH contexts. The SSH-based Docker context is the simplest and most secure way to manage containers remotely, requiring no additional ports or certificates. Combined with proper monitoring and auto-restart policies, your headless Docker server will run reliably with minimal hands-on maintenance.
