# How to Run Pi-hole in Docker for Network-Wide Ad Blocking

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Pi-hole, DNS, Ad Blocking, Network, Docker Compose, Self-Hosted

Description: Deploy Pi-hole in Docker for network-wide ad blocking and DNS management with complete setup instructions

---

Pi-hole is a network-level ad blocker that acts as a DNS sinkhole. Instead of blocking ads in individual browsers, Pi-hole blocks them at the DNS level for every device on your network. Phones, tablets, smart TVs, and IoT devices all benefit without installing anything on them. When a device requests a domain known to serve ads or trackers, Pi-hole returns a null response, preventing the content from loading. Running Pi-hole in Docker makes setup clean, keeps it isolated from the host system, and simplifies updates.

This guide covers deploying Pi-hole in Docker, configuring your network to use it, managing blocklists, and monitoring DNS traffic.

## Prerequisites

Before deploying Pi-hole, check that port 53 is available on your host. On many Linux distributions, systemd-resolved occupies port 53:

```bash
# Check if port 53 is in use
sudo lsof -i :53

# If systemd-resolved is using it, disable it
sudo systemctl stop systemd-resolved
sudo systemctl disable systemd-resolved

# Update resolv.conf to use an external DNS temporarily
sudo rm /etc/resolv.conf
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
```

On macOS with Docker Desktop, this is not an issue since Docker uses its own network namespace.

## Quick Start

Run Pi-hole with minimal configuration:

```bash
# Start Pi-hole with a web admin password
docker run -d \
  --name pihole \
  -p 53:53/tcp \
  -p 53:53/udp \
  -p 80:80 \
  -e TZ=America/New_York \
  -e WEBPASSWORD=your_admin_password \
  -v pihole-etc:/etc/pihole \
  -v pihole-dnsmasq:/etc/dnsmasq.d \
  --dns 127.0.0.1 \
  --dns 8.8.8.8 \
  --restart unless-stopped \
  pihole/pihole:latest
```

After about 30 seconds, the admin interface is available at http://localhost/admin.

## Docker Compose Setup

For a more maintainable deployment:

```yaml
# docker-compose.yml - Pi-hole with persistent configuration
version: "3.8"

services:
  pihole:
    image: pihole/pihole:latest
    container_name: pihole
    ports:
      # DNS ports
      - "53:53/tcp"
      - "53:53/udp"
      # Web admin interface
      - "80:80"
    environment:
      # Set your timezone
      TZ: America/New_York
      # Admin interface password
      WEBPASSWORD: your_secure_password
      # Upstream DNS servers (Cloudflare and Google)
      PIHOLE_DNS_: "1.1.1.1;8.8.8.8"
      # Interface to listen on (all interfaces)
      DNSMASQ_LISTENING: all
      # Enable query logging
      QUERY_LOGGING: "true"
    volumes:
      # Persist Pi-hole configuration and blocklists
      - pihole-etc:/etc/pihole
      # Persist dnsmasq configuration
      - pihole-dnsmasq:/etc/dnsmasq.d
    dns:
      - 127.0.0.1
      - 8.8.8.8
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "dig", "+short", "+norecurse", "+retry=0", "@127.0.0.1", "pi.hole"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  pihole-etc:
  pihole-dnsmasq:
```

Start it:

```bash
# Launch Pi-hole
docker compose up -d

# Verify DNS is working
dig @localhost google.com
```

## Configuring Your Network

For Pi-hole to block ads for all devices, you need to configure your network to use it as the DNS server.

### Option 1: Configure Your Router

The best approach is to set Pi-hole as the DNS server in your router's DHCP settings. This way, every device that connects to your network automatically uses Pi-hole:

1. Log into your router's admin page
2. Find the DHCP settings
3. Set the primary DNS to your Pi-hole host's IP address
4. Set the secondary DNS to a fallback (8.8.8.8) in case Pi-hole is unreachable
5. Save and restart

### Option 2: Configure Individual Devices

If you cannot modify router settings, configure DNS on each device:

```bash
# Linux - update systemd-resolved (if re-enabled) or /etc/resolv.conf
echo "nameserver 192.168.1.100" | sudo tee /etc/resolv.conf
```

For macOS, go to System Settings > Network > your connection > DNS, and add your Pi-hole IP address.

### Option 3: Pi-hole as DHCP Server

Pi-hole can replace your router's DHCP server, giving it complete control over DNS assignments:

```yaml
# Add to your docker-compose.yml environment
environment:
  # Enable DHCP server
  DHCP_ACTIVE: "true"
  DHCP_START: "192.168.1.100"
  DHCP_END: "192.168.1.250"
  DHCP_ROUTER: "192.168.1.1"
  PIHOLE_DOMAIN: "lan"
```

If you enable DHCP, you must use host networking:

```yaml
# Use host network mode for DHCP
network_mode: host
```

## Verifying Ad Blocking

Test that Pi-hole is blocking ads:

```bash
# This domain should be blocked (returns 0.0.0.0 or NXDOMAIN)
dig @localhost ads.google.com

# This domain should resolve normally
dig @localhost google.com

# Check the Pi-hole query log
docker exec pihole pihole -t
```

## Managing Blocklists

Pi-hole comes with a default blocklist. Add more through the web interface or the command line:

```bash
# Add a popular blocklist
docker exec pihole pihole -a adlist add https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts

# Add a malware blocklist
docker exec pihole pihole -a adlist add https://urlhaus.abuse.ch/downloads/hostfile/

# Update the blocklists (gravity)
docker exec pihole pihole -g
```

Popular blocklist sources:

| List | Focus | URL |
|------|-------|-----|
| StevenBlack | Unified hosts | github.com/StevenBlack/hosts |
| Firebog Ticked | Curated safe list | firebog.net |
| OISD | Balanced blocking | oisd.nl |

## Whitelisting Domains

Sometimes Pi-hole blocks a domain you need. Whitelist it:

```bash
# Whitelist a specific domain
docker exec pihole pihole -w example.com

# Whitelist with regex (useful for CDN domains)
docker exec pihole pihole --white-regex '(.*)\.example\.com$'

# View the current whitelist
docker exec pihole pihole -w -l
```

## Custom DNS Records

Pi-hole can serve as a local DNS for your home lab:

```bash
# Add a custom DNS entry
docker exec pihole pihole -a addcustomdns 192.168.1.50 nas.local
docker exec pihole pihole -a addcustomdns 192.168.1.51 plex.local
docker exec pihole pihole -a addcustomdns 192.168.1.52 homeassistant.local
```

Or add them to a dnsmasq configuration file:

```
# custom-dns.conf - mount this in /etc/dnsmasq.d/
address=/nas.local/192.168.1.50
address=/plex.local/192.168.1.51
address=/homeassistant.local/192.168.1.52
```

## DNS over HTTPS (DoH)

For privacy, configure Pi-hole to use DNS over HTTPS for upstream queries using cloudflared:

```yaml
# Add cloudflared to docker-compose.yml
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared
    command: proxy-dns --port 5053 --upstream https://1.1.1.1/dns-query --upstream https://1.0.0.1/dns-query
    restart: unless-stopped
```

Update Pi-hole to use cloudflared as its upstream:

```yaml
# In the pihole service environment
environment:
  PIHOLE_DNS_: "cloudflared#5053"
```

## Monitoring and Statistics

The Pi-hole dashboard shows real-time and historical DNS statistics. You can also query them from the API:

```bash
# Get summary statistics
curl http://localhost/admin/api.php?summary

# Get top blocked domains
curl http://localhost/admin/api.php?topItems=10

# Get recent queries
curl "http://localhost/admin/api.php?getAllQueries&auth=your_api_token"
```

## Updating Pi-hole

Update the Pi-hole Docker image:

```bash
# Pull the latest image
docker compose pull

# Recreate the container with the new image
docker compose up -d

# Verify the new version
docker exec pihole pihole -v
```

Your configuration, blocklists, and query history persist across updates because they are stored in Docker volumes.

## Backup and Restore

Pi-hole includes a built-in backup tool called Teleporter:

```bash
# Create a backup through the CLI
docker exec pihole pihole -a teleporter

# The backup file is created in /etc/pihole/
docker cp pihole:/etc/pihole/pi-hole-teleporter_*.tar.gz ./backups/
```

You can also create backups through the web interface at Settings > Teleporter.

Restore from backup:

```bash
# Copy the backup into the container
docker cp ./backups/pi-hole-teleporter_backup.tar.gz pihole:/tmp/

# Restore through the web interface or CLI
docker exec pihole pihole -a teleporter /tmp/pi-hole-teleporter_backup.tar.gz
```

## Conclusion

Pi-hole in Docker provides network-wide ad blocking that protects every device without installing software on any of them. The DNS-level approach blocks ads in apps, browsers, and smart devices alike. Start with the Docker Compose deployment, configure your router to use Pi-hole as the DNS server, and add additional blocklists based on your needs. The web dashboard gives you visibility into every DNS query on your network, which is useful for both ad blocking and understanding what your devices are doing. Regular gravity updates keep the blocklists current, and the Teleporter backup ensures you can recover your configuration quickly.
