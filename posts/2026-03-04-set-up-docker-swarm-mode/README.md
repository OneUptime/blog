# How to Set Up Docker Swarm Mode on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Docker, Container, Docker Swarm, Linux

Description: Learn how to set Up Docker Swarm Mode on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Set Up Docker Swarm Mode on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL 8, 9, or 10 with a minimal or standard installation
- Root or sudo access
- A stable network connection
- A fixed IP address for the manager node

## Overview

Set Up Docker Swarm Mode requires careful planning and execution. This guide walks through the complete process from installation to verification.

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
```

Verify the installation:

```bash
docker --version
rpm -qi docker-ce
```

## Step 3: Start and Enable the Service

```bash
sudo systemctl enable --now docker
sudo systemctl status docker
```

## Step 4: Configure Docker Swarm

Initialize Docker Swarm mode on the manager node:

```bash
sudo docker swarm init --advertise-addr <manager-ip-address>
```

Save the worker join command printed by `docker swarm init`. To display it again later, run:

```bash
sudo docker swarm join-token worker
```

## Step 5: Verify the Configuration

Test the setup:

```bash
sudo docker info
sudo docker node ls
```

Check the logs for any errors:

```bash
journalctl -u docker -f
```

## Step 6: Configure Firewall Rules

Open the Swarm control, discovery, and overlay network ports between trusted swarm nodes:

```bash
sudo firewall-cmd --permanent --add-port=2377/tcp
sudo firewall-cmd --permanent --add-port=7946/tcp
sudo firewall-cmd --permanent --add-port=7946/udp
sudo firewall-cmd --permanent --add-port=4789/udp
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show docker --property=MemoryCurrent
top -p $(pidof dockerd)
```

## Security Considerations

- Protect manager nodes and swarm join tokens
- Use Swarm's built-in mutual TLS for node communication
- Restrict Swarm ports to trusted nodes with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u docker -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using the port

## Conclusion

You have successfully configured set up docker swarm mode on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
