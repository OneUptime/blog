# How to Fix Docker Containers Not Resolving External DNS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, dns, networking, troubleshooting, containers, docker-compose, resolve

Description: Fix Docker containers that cannot resolve external DNS names by configuring custom DNS servers, daemon settings, and network options.

---

Your Docker container builds fine. It starts without errors. But the moment it tries to reach an external service by hostname, it fails. `curl: (6) Could not resolve host: api.example.com`. The container has network access, it can ping IP addresses directly, but DNS resolution is broken. This is one of the most common networking headaches in Docker.

Let's dig into why this happens and how to fix it across different environments.

## How Docker DNS Resolution Works

Docker containers use an embedded DNS server at 127.0.0.11 for service discovery within user-defined networks. For external DNS resolution, Docker falls back to the DNS servers configured on the host machine. It reads from `/etc/resolv.conf` on the host and copies those settings into each container.

The problem starts when the host's `/etc/resolv.conf` contains a DNS entry that does not work from inside the container's network namespace.

Check what DNS your container is currently using:

```bash
# Inspect the DNS configuration inside a running container
docker exec my-container cat /etc/resolv.conf
```

Compare that with the host:

```bash
# Check the host's DNS configuration
cat /etc/resolv.conf
```

## Cause 1: Host Uses systemd-resolved (127.0.0.53)

On Ubuntu 18.04 and later, the host's `/etc/resolv.conf` points to `127.0.0.53`, which is the systemd-resolved stub listener. This address is only reachable from the host, not from inside Docker containers.

Verify if this is your issue:

```bash
# If you see 127.0.0.53, that's the problem
docker run --rm alpine cat /etc/resolv.conf
```

Fix this by telling Docker to use a public DNS server directly. Edit the Docker daemon configuration:

```bash
# Create or edit the Docker daemon configuration file
sudo nano /etc/docker/daemon.json
```

Add the following DNS configuration:

```json
{
    "dns": ["8.8.8.8", "8.8.4.4"]
}
```

Then restart the Docker daemon:

```bash
# Restart Docker to apply the new DNS configuration
sudo systemctl restart docker
```

Alternatively, you can point Docker to the real upstream DNS instead of the stub resolver:

```bash
# Find the actual upstream DNS servers that systemd-resolved uses
resolvectl status | grep "DNS Servers"

# Or check the resolved configuration directly
cat /run/systemd/resolve/resolv.conf
```

You can then configure Docker to use the actual DNS file:

```json
{
    "dns": ["192.168.1.1"]
}
```

## Cause 2: Corporate DNS or VPN Interference

When connected to a corporate VPN, the DNS servers often change to internal company DNS servers. These servers may not be reachable from Docker's default bridge network.

Test DNS resolution manually:

```bash
# Test if the container can reach the DNS server on port 53
docker run --rm alpine nslookup google.com

# Test with a specific DNS server
docker run --rm alpine nslookup google.com 8.8.8.8
```

If the second command works but the first does not, Docker is using the wrong DNS server. You have a few options.

Set DNS per container at runtime:

```bash
# Specify DNS servers when running a container
docker run --dns 8.8.8.8 --dns 8.8.4.4 myimage
```

Set DNS in Docker Compose:

```yaml
# docker-compose.yml with explicit DNS servers
version: "3.8"
services:
  webapp:
    image: myapp:latest
    dns:
      - 8.8.8.8
      - 8.8.4.4
      - 192.168.1.1  # Add your corporate DNS too if needed
```

## Cause 3: iptables or Firewall Blocking DNS

Docker relies on iptables rules to route traffic from containers. If your firewall rules block outgoing UDP traffic on port 53, DNS will fail.

Check if DNS traffic is being blocked:

```bash
# Test if UDP port 53 is reachable from a container
docker run --rm alpine sh -c "nc -zu 8.8.8.8 53 && echo 'DNS port reachable' || echo 'DNS port blocked'"
```

Verify Docker's iptables rules exist:

```bash
# List the Docker-related iptables rules
sudo iptables -L -n | grep -A 5 DOCKER
```

If you recently modified iptables rules, Docker's rules may have been flushed. Restart Docker to recreate them:

```bash
# Restart Docker to restore its iptables rules
sudo systemctl restart docker
```

If you use ufw (Uncomplicated Firewall) on Ubuntu, it can conflict with Docker's iptables rules:

```bash
# Allow DNS traffic through ufw
sudo ufw allow out 53/udp
sudo ufw allow out 53/tcp
```

## Cause 4: Custom Bridge Network Missing DNS Configuration

Containers on Docker's default bridge network do not get the built-in DNS server. They rely entirely on the host's DNS configuration. Containers on user-defined bridge networks get Docker's internal DNS server at 127.0.0.11.

```bash
# Create a user-defined bridge network
docker network create my-network

# Run the container on the custom network
docker run --network my-network --rm alpine nslookup google.com
```

In Docker Compose, services automatically join a user-defined network, so this is typically only a problem with standalone `docker run` commands.

## Cause 5: /etc/resolv.conf Has Too Many Nameservers

Linux only uses the first three nameserver entries in `/etc/resolv.conf`. If the working DNS server is listed fourth or later, it gets ignored.

Check how many nameservers are configured:

```bash
# Count nameserver entries in the container
docker run --rm alpine grep nameserver /etc/resolv.conf
```

If there are more than three, explicitly set the ones you need:

```bash
# Override with only the DNS servers that work
docker run --dns 8.8.8.8 --dns 192.168.1.1 myimage
```

## Cause 6: DNS Search Domain Issues

Sometimes DNS resolution fails because of a misconfigured search domain. The container tries to resolve `api.example.com.corp.internal` instead of `api.example.com`.

Check the search domains:

```bash
# View search domain configuration in the container
docker exec my-container cat /etc/resolv.conf | grep search
```

Override the search domain:

```bash
# Run a container with a specific DNS search domain
docker run --dns-search example.com myimage

# Or disable search domains entirely
docker run --dns-search . myimage
```

In Docker Compose:

```yaml
# docker-compose.yml with explicit DNS search domains
services:
  app:
    image: myapp:latest
    dns_search:
      - example.com
```

## Debugging DNS Issues Step by Step

When you are not sure which cause applies, run through this diagnostic sequence:

```bash
# Step 1: Check if the container has any network access
docker run --rm alpine ping -c 2 8.8.8.8

# Step 2: Check if DNS resolution works with a specific server
docker run --rm alpine nslookup google.com 8.8.8.8

# Step 3: Check what DNS the container is configured to use
docker run --rm alpine cat /etc/resolv.conf

# Step 4: Test DNS on the host itself
nslookup google.com

# Step 5: Check Docker daemon DNS configuration
docker info | grep -i dns
```

If step 1 fails, the problem is general networking, not DNS. If step 2 works but step 3 shows a broken DNS server, you need to reconfigure Docker's DNS. If step 4 fails, the problem is on the host, not in Docker.

## A Permanent Solution

For production environments, set DNS at the daemon level so every container picks it up automatically:

```json
{
    "dns": ["8.8.8.8", "8.8.4.4"],
    "dns-search": ["example.com"],
    "dns-opts": ["timeout:2", "attempts:3"]
}
```

Save this to `/etc/docker/daemon.json` and restart Docker. The `timeout` and `attempts` options make DNS resolution fail faster instead of hanging for long periods.

## Summary

DNS resolution failures in Docker containers almost always boil down to one of two things: the container inherited a DNS server address from the host that does not work inside the container's network namespace, or a firewall is blocking DNS traffic. Start your debugging with `nslookup` and `cat /etc/resolv.conf` inside the container. Once you identify the broken DNS server, override it at the daemon level in `/etc/docker/daemon.json` so you never have to think about it again.
