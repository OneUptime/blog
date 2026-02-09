# How to Install Docker on Kali Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Kali Linux, Security, Linux, Installation, DevOps, Containers, Penetration Testing

Description: How to install Docker on Kali Linux for running security tools, isolated lab environments, and containerized penetration testing workflows.

---

Kali Linux is the go-to distribution for penetration testers and security researchers. Running Docker on Kali opens up powerful possibilities: isolated testing environments, quick deployment of vulnerable applications for practice, and access to containerized security tools without cluttering your base system. Since Kali is based on Debian Testing (not Debian Stable), the installation process has a few quirks worth knowing about.

## Prerequisites

- A Kali Linux installation (bare metal, VM, or WSL)
- Root access or a user with sudo privileges
- An active internet connection
- At least 20 GB of free disk space

## Step 1: Update Kali

Kali follows a rolling release model. Update your system before installing Docker.

```bash
# Full system update
sudo apt-get update && sudo apt-get full-upgrade -y
```

## Step 2: Remove Conflicting Packages

Remove any old or conflicting Docker-related packages.

```bash
# Remove legacy packages
sudo apt-get remove -y docker docker-engine docker.io containerd runc
```

## Step 3: Install Dependencies

```bash
# Install required packages for HTTPS repository access
sudo apt-get install -y ca-certificates curl gnupg lsb-release
```

## Step 4: Add Docker's GPG Key and Repository

Kali is based on Debian, so we use Docker's Debian repository. However, since Kali uses its own codename (`kali-rolling`), we need to explicitly specify a Debian codename.

```bash
# Create the keyring directory
sudo install -m 0755 -d /etc/apt/keyrings

# Download Docker's GPG key
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

Now add the repository with the Debian Bookworm codename (since Kali rolling tracks Debian Testing, Bookworm packages are compatible).

```bash
# Add Docker repository with explicit Debian bookworm codename
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian bookworm stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

Update the package index.

```bash
# Refresh package lists
sudo apt-get update
```

## Step 5: Install Docker Engine

```bash
# Install Docker Engine and plugins
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

If you encounter dependency issues (Kali's rolling nature can cause version conflicts), try installing with `--fix-broken`.

```bash
# Fix broken dependencies if the initial install fails
sudo apt-get install -y -f
```

## Step 6: Start and Enable Docker

```bash
# Start Docker
sudo systemctl start docker

# Enable Docker at boot
sudo systemctl enable docker
```

## Step 7: Verify the Installation

```bash
# Run the hello-world test
sudo docker run hello-world
```

## Step 8: Non-Root Docker Access

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER

# Apply immediately
newgrp docker

# Verify
docker ps
```

## Running Security Tools in Docker

One of the primary reasons to run Docker on Kali is to containerize security tools. This keeps your base system clean and lets you run multiple tool versions simultaneously.

### Running Metasploit in Docker

```bash
# Pull the official Metasploit image
docker pull metasploitframework/metasploit-framework

# Run Metasploit with host networking for scanning
docker run --rm -it \
  --network host \
  metasploitframework/metasploit-framework \
  msfconsole
```

### Running Nmap in Docker

```bash
# Run Nmap scan from a container
docker run --rm --network host instrumentisto/nmap -sV -sC target.example.com
```

### Running OWASP ZAP

```bash
# Run ZAP in daemon mode for API scanning
docker run -d --name zap \
  -p 8080:8080 \
  ghcr.io/zaproxy/zaproxy:stable zap.sh \
  -daemon -host 0.0.0.0 -port 8080
```

## Setting Up Vulnerable Lab Environments

Docker makes it easy to spin up deliberately vulnerable applications for practice.

### DVWA (Damn Vulnerable Web Application)

```bash
# Run DVWA
docker run -d --name dvwa \
  -p 80:80 \
  vulnerables/web-dvwa

# Access at http://localhost
# Default credentials: admin / password
```

### Juice Shop (OWASP)

```bash
# Run OWASP Juice Shop
docker run -d --name juice-shop \
  -p 3000:3000 \
  bkimminich/juice-shop

# Access at http://localhost:3000
```

### A Full Lab with Docker Compose

Create a multi-target lab environment.

```yaml
# lab-compose.yml - vulnerable application lab
services:
  dvwa:
    image: vulnerables/web-dvwa
    ports:
      - "8081:80"
    restart: unless-stopped

  juice-shop:
    image: bkimminich/juice-shop
    ports:
      - "3000:3000"
    restart: unless-stopped

  webgoat:
    image: webgoat/webgoat
    ports:
      - "8082:8080"
    restart: unless-stopped

  hackazon:
    image: ianwijaya/hackazon
    ports:
      - "8083:80"
    restart: unless-stopped
```

```bash
# Start the entire lab
docker compose -f lab-compose.yml up -d

# Stop the lab when done
docker compose -f lab-compose.yml down
```

## Network Isolation for Testing

When testing exploits, you want network isolation to prevent accidental damage.

```bash
# Create an isolated Docker network (no internet access)
docker network create --internal pentest-lab

# Run vulnerable targets on the isolated network
docker run -d --name target --network pentest-lab vulnerables/web-dvwa

# Run your attack container on the same network
docker run -it --rm --network pentest-lab kalilinux/kali-rolling /bin/bash
```

The `--internal` flag prevents containers from reaching the internet, creating a safe sandbox.

## Building Custom Security Tool Images

Create a custom Docker image with your preferred toolkit.

```dockerfile
# Dockerfile for a custom security toolkit
FROM kalilinux/kali-rolling

# Install commonly used tools
RUN apt-get update && apt-get install -y \
    nmap \
    nikto \
    sqlmap \
    dirb \
    gobuster \
    hydra \
    john \
    hashcat \
    wfuzz \
    whatweb \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /root

# Default command
CMD ["/bin/bash"]
```

Build and run it.

```bash
# Build the custom toolkit image
docker build -t my-security-toolkit .

# Run it with host networking for scanning
docker run -it --rm --network host my-security-toolkit
```

## Docker on Kali in WSL

If you run Kali through WSL (Windows Subsystem for Linux), Docker has some additional considerations.

```bash
# Check if systemd is enabled in WSL
cat /etc/wsl.conf
```

If systemd is not enabled, add it.

```bash
# Enable systemd in WSL
sudo tee /etc/wsl.conf <<'EOF'
[boot]
systemd=true
EOF
```

Restart WSL from PowerShell: `wsl --shutdown`, then reopen Kali.

Alternatively, use Docker Desktop for Windows and enable WSL integration with your Kali distribution.

## Troubleshooting

### Package version conflicts

Kali's rolling release can cause dependency conflicts with Docker packages built for stable Debian.

```bash
# If docker-ce conflicts with existing packages, try pinning
sudo apt-get install -y docker-ce=5:27.* docker-ce-cli=5:27.* containerd.io
```

### iptables issues

Kali sometimes has `iptables` configured in nftables mode. Docker works better with legacy iptables.

```bash
# Switch to legacy iptables
sudo update-alternatives --set iptables /usr/sbin/iptables-legacy
sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy

# Restart Docker
sudo systemctl restart docker
```

### Docker daemon crashes on startup

Check the journal for specific errors.

```bash
# View Docker daemon logs
sudo journalctl -u docker --no-pager -n 50
```

Common fix: ensure the overlay kernel module is loaded.

```bash
# Load the overlay module
sudo modprobe overlay
```

## Summary

Docker on Kali Linux transforms your security testing workflow. You can spin up vulnerable targets in seconds, run security tools in isolated environments, and create reproducible lab setups with Docker Compose. The key installation detail is using the Debian Bookworm codename when adding Docker's repository, since Kali's own codename is not recognized by Docker. With Docker running, the combination of Kali's security tooling and Docker's containerization gives you a flexible, powerful testing platform.
