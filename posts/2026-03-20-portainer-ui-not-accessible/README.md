# How to Fix 'Portainer UI Not Accessible After Installation'

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Troubleshooting, Self-Hosted

Description: Diagnose and fix the most common reasons why the Portainer web UI is not accessible immediately after installation.

## Introduction

You've installed Portainer, but navigating to port 9443, or to port 9000 if you exposed legacy HTTP, gives you a connection timeout or refused error. This is one of the most common issues new users face. This guide covers every likely cause and its fix.

## Common Causes

1. Container not running
2. Wrong port binding
3. Firewall blocking the port
4. Initial setup window expired (5-minute admin setup window)
5. HTTP disabled, so port 9000 will not respond
6. Port published only on localhost or the wrong interface

## Step 1: Verify the Container Is Running

```bash
# Check Portainer container status

docker ps | grep portainer

# If not listed, check all containers including stopped ones
docker ps -a | grep portainer

# If stopped, check the exit code
docker inspect --format '{{.State.ExitCode}}' portainer

# Then check the logs
docker logs portainer
```

If the container exited immediately, the logs will show the error. Other failures, such as host port conflicts, are reported directly by `docker run`. Common errors include:

```text
# Permission denied on data volume
Error: open /data/portainer.db: permission denied

# Host port already in use
docker: Error response from daemon: driver failed programming external connectivity on endpoint ...: Bind for 0.0.0.0:9443 failed: port is already allocated
```

## Step 2: Confirm Port Binding

```bash
# Check what ports Portainer is actually bound to
docker port portainer

# Or use docker ps output
docker ps --format "table {{.Names}}\t{{.Ports}}"

# Check if the relevant port is listening on the host
ss -tlnp | grep -E '9443|9000'
# or
netstat -tlnp | grep -E '9443|9000'
```

If nothing is listening on port 9443, the container may have crashed or the port binding was not specified correctly. Port 9000 is only expected if you explicitly exposed legacy HTTP.

## Step 3: Check Firewall Rules

```bash
# Ubuntu/Debian (ufw)
sudo ufw status
# If active, allow port 9443
sudo ufw allow 9443/tcp
# Allow port 9000 only if you explicitly exposed legacy HTTP
sudo ufw allow 9000/tcp

# CentOS/RHEL (firewalld)
sudo firewall-cmd --list-ports
sudo firewall-cmd --permanent --add-port=9443/tcp
# Allow port 9000 only if you explicitly exposed legacy HTTP
sudo firewall-cmd --permanent --add-port=9000/tcp
sudo firewall-cmd --reload

# Check iptables directly
sudo iptables -L INPUT -n | grep -E '9443|9000'
```

## Step 4: Verify the Portainer Run Command

The most common installation mistake is missing the UI port mapping:

```bash
# WRONG - no UI port mapping
docker run -d -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data portainer/portainer-ce:sts

# CORRECT - HTTPS UI on 9443
docker run -d -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts

# Optional legacy HTTP on 9000
# Add: -p 9000:9000
```

## Step 5: Re-create the Container with Correct Ports

```bash
# Stop and remove the incorrectly configured container
docker stop portainer
docker rm portainer

# Re-create with correct settings
# Add -p 9000:9000 as well if you need legacy HTTP access
docker run -d \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts
```

## Step 6: Check for the 5-Minute Initialization Timeout

Portainer waits 5 minutes for you to create the first admin account. If you do not complete the initial setup in that window, the Portainer Server stops listening for requests until the container is restarted.

```bash
# Check logs for the timeout message
docker logs portainer 2>&1 | grep -Ei "timed out|security purposes|admin"
```

If you see a timeout message, restart Portainer:

```bash
# Stop and restart the container to get another 5 minutes
docker stop portainer
docker start portainer
```

If this happens on a previously working installation, verify that the `portainer_data` volume is mounted correctly. If that volume is missing, Portainer behaves like a fresh install.

## Step 7: Check If HTTPS-Only Mode Is Active

If Portainer was started with `--http-disabled`, port 9000 will not respond:

```bash
# Check startup flags
docker inspect --format '{{json .Config.Cmd}}' portainer
```

If `--http-disabled` is present, use `https://your-host:9443` instead. Portainer serves the UI on HTTPS port 9443 by default and generates a self-signed certificate if you do not provide your own.

## Step 8: Test Connectivity

```bash
# Test from the same host
curl -k -v https://localhost:9443

# Test from another machine
curl -k -v https://your-server-ip:9443

# If you explicitly exposed legacy HTTP on 9000
curl -v http://your-server-ip:9000
```

## Step 9: Check Whether Portainer Is Bound Only to Localhost

Docker publishes ports to all interfaces by default, but if Portainer was started with a host IP such as `127.0.0.1:9443:9443`, or Docker is configured to bind published ports to localhost by default, remote machines will not be able to connect.

```bash
# See the published host address for Portainer's ports
docker port portainer

# Check Docker daemon configuration for a default localhost bind
cat /etc/docker/daemon.json
```

## Conclusion

The most common causes of Portainer being inaccessible are: missing the `9443` port mapping in the run command, a firewall blocking `9443`, or the 5-minute initial setup window having expired and Portainer stopping its listener until restart. Port `9000` is only relevant if you deliberately exposed legacy HTTP. Systematically checking each of these using the commands above will identify and resolve the issue quickly.
