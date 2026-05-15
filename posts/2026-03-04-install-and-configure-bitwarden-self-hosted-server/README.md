# How to Install and Configure Bitwarden Self-Hosted Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Bitwarden, Secret Management, Linux

Description: Learn how to install and Configure Bitwarden Self-Hosted Server on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Install and Configure Bitwarden Self-Hosted Server on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL 8, 9, or 10 with a minimal or standard installation
- Root or sudo access
- A stable network connection
- A domain name pointing to the server
- Ports 80 and 443 open for HTTP and HTTPS
- A Bitwarden installation ID and key from https://bitwarden.com/host

## Overview

Install and Configure Bitwarden Self-Hosted Server requires careful planning and execution. Bitwarden's standard Linux deployment runs in Docker containers and is managed with the Bitwarden installation script. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
```

## Step 2: Install Required Packages

```bash
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
```

Verify the installation:

```bash
docker --version
docker compose version
sudo docker run hello-world
```

## Step 3: Configure the Service

Create a dedicated Bitwarden user and installation directory:

```bash
sudo adduser bitwarden
sudo passwd bitwarden
sudo usermod -aG docker bitwarden
sudo mkdir /opt/bitwarden
sudo chmod -R 700 /opt/bitwarden
sudo chown -R bitwarden:bitwarden /opt/bitwarden
```

Switch to the Bitwarden user, download the installer, and run it from `/opt/bitwarden`:

```bash
su - bitwarden
cd /opt/bitwarden
curl -Lso bitwarden.sh "https://func.bitwarden.com/api/dl/?app=self-host&platform=linux" && chmod 700 bitwarden.sh
./bitwarden.sh install
```

Create or edit the main environment file:

```bash
vi ./bwdata/env/global.override.env
```

Apply the recommended settings for your environment. At a minimum, configure the `globalSettings__mail__smtp__*` values so Bitwarden can send account verification and organization invitation emails.

## Step 4: Start and Enable the Service

```bash
./bitwarden.sh start
```

## Step 5: Verify the Configuration

Test the setup:

```bash
docker ps
```

Check the logs for any errors:

```bash
./bitwarden.sh compresslogs
```

## Step 6: Configure Firewall Rules

Bitwarden is served through HTTP and HTTPS by default. Open both services in firewalld:

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
docker stats
docker ps
```

## Security Considerations

- Run Bitwarden from the dedicated `bitwarden` user, not as root
- Enable TLS/SSL for network communication
- Restrict access with firewall rules
- Keep packages updated with `dnf update`
- Back up the `bwdata` directory regularly

## Troubleshooting

Common issues and solutions:

1. **Containers fail to start**: Check `docker ps` and run `./bitwarden.sh compresslogs` to collect server logs
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using the port

## Conclusion

You have successfully configured Bitwarden Self-Hosted Server on RHEL. Monitor the service regularly, back up the `bwdata` directory, and keep it updated to maintain security and performance.
