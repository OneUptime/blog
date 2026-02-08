# How to Run AdGuard Home in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, adguard, dns, ad-blocking, networking, self-hosted, privacy

Description: A complete guide to deploying AdGuard Home in Docker for network-wide ad blocking and DNS filtering on your home network.

---

AdGuard Home is a network-wide ad blocker and DNS server that filters out advertisements, trackers, and malicious domains before they reach any device on your network. Running it inside Docker makes deployment clean, portable, and easy to manage. This guide walks you through every step, from pulling the image to hardening your setup for daily use.

## Why AdGuard Home Over Pi-hole?

Both tools accomplish similar goals, but AdGuard Home ships with a polished web UI out of the box, supports DNS-over-HTTPS and DNS-over-TLS natively, and requires less manual configuration. It also handles DHCP if you want to replace your router's built-in DHCP server. For Docker users, AdGuard Home's single-container design keeps the stack simple compared to Pi-hole's multi-service approach.

## Prerequisites

Before you begin, make sure you have the following ready:

- A Linux host (Ubuntu 22.04 or later recommended) with Docker and Docker Compose installed
- At least 512 MB of free RAM and 1 GB of disk space
- Port 53 (DNS) available on the host - check that systemd-resolved is not occupying it
- A static IP address assigned to your Docker host

Many Linux distributions run systemd-resolved on port 53 by default. You need to free that port first.

This command disables the stub listener so port 53 becomes available:

```bash
# Stop systemd-resolved from binding to port 53
sudo sed -i 's/#DNSStubListener=yes/DNSStubListener=no/' /etc/systemd/resolved.conf
sudo systemctl restart systemd-resolved
```

Verify the port is free:

```bash
# Confirm nothing is listening on port 53
sudo ss -lnp | grep ':53 '
```

## Project Directory Setup

Create a dedicated directory to keep configuration and data organized:

```bash
# Create the project directory and necessary subdirectories
mkdir -p ~/adguard-home/{conf,work}
cd ~/adguard-home
```

## Docker Compose Configuration

Create a `docker-compose.yml` file that defines the AdGuard Home service with all the ports and volumes it needs:

```yaml
# docker-compose.yml - AdGuard Home deployment
version: "3.8"

services:
  adguard:
    image: adguard/adguardhome:latest
    container_name: adguard-home
    restart: unless-stopped
    # Use host network mode for DNS to work properly,
    # or map individual ports as shown below
    ports:
      # DNS ports - these handle all DNS queries
      - "53:53/tcp"
      - "53:53/udp"
      # Web UI and API
      - "3000:3000/tcp"
      # DNS-over-TLS
      - "853:853/tcp"
      # DNS-over-HTTPS
      - "443:443/tcp"
      # DHCP server (optional, only if replacing router DHCP)
      - "67:67/udp"
      - "68:68/udp"
    volumes:
      # Persist configuration across container restarts
      - ./conf:/opt/adguardhome/conf
      # Persist work data including query logs and filters
      - ./work:/opt/adguardhome/work
    # Cap add is needed if you want to use DHCP functionality
    cap_add:
      - NET_ADMIN
```

## Starting AdGuard Home

Launch the container with Docker Compose:

```bash
# Pull the latest image and start the container in detached mode
docker compose up -d
```

Check that the container is running and healthy:

```bash
# Verify the container status
docker compose ps
```

You should see the container listed with a status of "Up." The initial setup wizard runs on port 3000, so open your browser and navigate to `http://<your-server-ip>:3000`.

## Initial Setup Wizard

The web-based setup wizard walks you through five steps:

1. **Welcome screen** - Click "Get Started"
2. **Admin interface** - Choose the listen address and port for the web UI. The default (port 80) works fine, or change it to 8080 if port 80 is taken.
3. **DNS server** - Keep the default settings. AdGuard Home will listen on all interfaces for DNS queries.
4. **Authentication** - Set a strong username and password. This protects your DNS settings from unauthorized changes.
5. **Configure devices** - The wizard shows instructions for pointing your devices to the AdGuard Home DNS server.

After completing the wizard, the admin dashboard becomes available at the port you selected.

## Adding Blocklists

AdGuard Home ships with a default blocklist, but you can add more for broader coverage. Navigate to Filters > DNS Blocklists in the web UI and add these popular lists:

```
# Commonly used blocklists - add these via the web UI
https://adguardteam.github.io/HostlistsRegistry/assets/filter_1.txt
https://adguardteam.github.io/HostlistsRegistry/assets/filter_2.txt
https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts
https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/pro.txt
```

Each list targets different categories of ads, trackers, and malware domains. The Hagezi list is particularly thorough for blocking telemetry and tracking.

## Custom Filtering Rules

You can write custom rules directly in the UI under Filters > Custom filtering rules. The syntax follows AdBlock-style patterns:

```
# Block a specific domain entirely
||example-ads.com^

# Allow a domain that was blocked by a list (whitelist)
@@||allowed-service.com^

# Block all subdomains of a tracker
||*.tracker-network.net^

# Rewrite a domain to a specific IP (useful for local services)
|local-app.home^$dnsrewrite=192.168.1.50
```

## Configuring DNS Upstream Servers

By default, AdGuard Home forwards queries to public DNS resolvers. You can change these in Settings > DNS settings. Here are solid upstream choices:

```
# Privacy-focused upstream DNS servers
# Cloudflare DNS-over-HTTPS
https://dns.cloudflare.com/dns-query

# Quad9 DNS-over-TLS (blocks malware domains)
tls://dns.quad9.net

# Google DNS as a fallback
8.8.8.8
```

Setting multiple upstreams gives you redundancy. AdGuard Home queries the fastest available server by default.

## Pointing Your Network to AdGuard Home

The simplest approach is to change the DNS server setting on your router. Log into your router's admin panel and set the primary DNS to your Docker host's IP address. Every device on the network will then route DNS through AdGuard Home automatically.

For individual devices, change the DNS settings in the network configuration. On Linux:

```bash
# Set DNS on a Linux workstation (using resolvectl)
sudo resolvectl dns eth0 192.168.1.100
```

On macOS, go to System Settings > Network > your connection > DNS and add your server's IP.

## Monitoring and Logs

The AdGuard Home dashboard shows real-time statistics including total queries, blocked queries, and top queried domains. For deeper inspection, query logs are stored in the work directory.

View logs directly from Docker:

```bash
# Follow the AdGuard Home container logs in real time
docker compose logs -f adguard
```

## Updating AdGuard Home

Keeping the container up to date is straightforward:

```bash
# Pull the latest image and recreate the container
docker compose pull
docker compose up -d
```

Your configuration and data persist in the mounted volumes, so updates are non-destructive.

## Backup and Restore

Back up your configuration regularly. The important file is `AdGuardHome.yaml` inside the conf directory:

```bash
# Create a timestamped backup of the configuration
cp ~/adguard-home/conf/AdGuardHome.yaml \
   ~/adguard-home/conf/AdGuardHome.yaml.backup.$(date +%Y%m%d)
```

To restore, stop the container, replace the config file, and start it again.

## Performance Tuning

For networks with many devices, consider adjusting the DNS cache size. Edit `AdGuardHome.yaml` and look for the `dns` section:

```yaml
# Increase cache size for better performance on busy networks
dns:
  cache_size: 10000000
  cache_ttl_min: 600
  cache_ttl_max: 86400
```

This increases the cache to roughly 10 MB and sets minimum TTL to 10 minutes, reducing upstream queries significantly.

## Troubleshooting Common Issues

If DNS queries are not being blocked, verify that your devices are actually using the AdGuard Home server. Run a DNS lookup test:

```bash
# Check which DNS server is responding
nslookup example.com 192.168.1.100
```

If the container fails to start, the most common cause is port 53 still being occupied. Double-check that systemd-resolved is disabled as described in the prerequisites.

For containers that start but the web UI is unreachable, check your firewall rules:

```bash
# Allow DNS and web UI ports through the firewall
sudo ufw allow 53/tcp
sudo ufw allow 53/udp
sudo ufw allow 3000/tcp
```

## Integrating with OneUptime for Monitoring

You can monitor your AdGuard Home instance with OneUptime to get alerts if it goes down. Set up an HTTP monitor pointing to the admin interface URL and a TCP monitor on port 53 to verify DNS availability. This way, you will know immediately if your ad blocking stops working.

## Wrapping Up

Running AdGuard Home in Docker gives you a powerful, network-wide ad blocker that protects every device without installing software on each one. The Docker approach keeps the installation clean, makes updates painless, and lets you back up everything with a simple file copy. Once you see the dashboard showing thousands of blocked queries per day, you will wonder how you ever browsed without it.
