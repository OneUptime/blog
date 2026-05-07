# How to Run Pi-hole in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pi-hole, DNS, Ad Blocking, Network Security

Description: Learn how to run Pi-hole in a Podman container for network-wide DNS-based ad blocking with a web dashboard and custom blocklists.

---

> Pi-hole in Podman provides network-wide ad blocking through DNS filtering in a rootless container with a powerful web dashboard.

Pi-hole is a network-level ad blocker that acts as a DNS sinkhole, filtering out advertisement and tracking domains for all devices on your network. Running it in a Podman container gives you DNS-based ad blocking without dedicated hardware, with easy configuration through a web interface. This guide covers setup, custom DNS configuration, blocklist management, and the web dashboard.

---

## Pulling the Pi-hole Image

Download the official Pi-hole image.

```bash
# Pull the latest Pi-hole image

podman pull docker.io/pihole/pihole:latest

# Verify the image
podman images | grep pihole
```

## Running a Basic Pi-hole Container

Start Pi-hole with DNS and the web interface.

```bash
# Create volumes for Pi-hole configuration and DNS records
podman volume create pihole-config
podman volume create pihole-dnsmasq

# Run Pi-hole with required settings
podman run -d \
  --name my-pihole \
  -p 53:53/tcp \
  -p 53:53/udp \
  -p 8080:80 \
  -e TZ=America/New_York \
  -e FTLCONF_webserver_api_password=my-pihole-password \
  -e FTLCONF_dns_listeningMode=ALL \
  -v pihole-config:/etc/pihole:z \
  -v pihole-dnsmasq:/etc/dnsmasq.d:z \
  docker.io/pihole/pihole:latest

# Wait for Pi-hole to initialize
sleep 15

# Check the container is running
podman ps

# Verify DNS is working
dig @localhost example.com +short

# Access the web dashboard
echo "Open http://localhost:8080/admin in your browser"
echo "Password: my-pihole-password"
```

## Configuring Upstream DNS Servers

Set custom upstream DNS servers for Pi-hole to forward queries to.

```bash
# Run Pi-hole with custom upstream DNS servers
podman volume create pihole-custom-config
podman volume create pihole-custom-dnsmasq

podman run -d \
  --name pihole-custom-dns \
  -p 5353:53/tcp \
  -p 5353:53/udp \
  -p 8081:80 \
  -e TZ=America/New_York \
  -e FTLCONF_webserver_api_password=my-pihole-password \
  -e FTLCONF_dns_listeningMode=ALL \
  -e FTLCONF_dns_upstreams="1.1.1.1;1.0.0.1" \
  -e FTLCONF_dns_dnssec=true \
  -e FTLCONF_dns_revServers="true,192.168.1.0/24,192.168.1.1,lan" \
  -v pihole-custom-config:/etc/pihole:z \
  -v pihole-custom-dnsmasq:/etc/dnsmasq.d:z \
  docker.io/pihole/pihole:latest
```

## Adding Custom DNS Records

Define local DNS entries for your network.

```bash
# Add custom DNS records via the configuration file
podman exec my-pihole bash -c 'cat >> /etc/pihole/custom.list <<EOF
192.168.1.10 server.local
192.168.1.20 nas.local
192.168.1.30 printer.local
192.168.1.100 homelab.local
EOF'

# Restart the container so FTL re-reads local DNS records
podman restart my-pihole

# Test the custom DNS record
dig @localhost server.local +short
```

## Managing Blocklists

Add and manage ad-blocking lists.

```bash
# View current blocklist statistics
podman exec my-pihole pihole api stats/summary

# Update the gravity database (blocklists)
podman exec my-pihole pihole -g

# Add a custom blocklist via the command line
podman exec my-pihole bash -c 'sqlite3 /etc/pihole/gravity.db \
  "INSERT INTO adlist (address, enabled) VALUES (\"https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts\", 1);"'

# Update gravity after adding new lists
podman exec my-pihole pihole -g

# Check how many domains are blocked
podman exec my-pihole pihole api stats/summary
```

## Whitelisting and Blacklisting Domains

Control which domains are allowed or blocked.

```bash
# Whitelist a domain
podman exec my-pihole pihole allow example.com

# Whitelist with a comment
podman exec my-pihole pihole allow safe-site.com --comment "Needed for work"

# Blacklist a specific domain
podman exec my-pihole pihole deny tracking.example.com

# Blacklist with a wildcard
podman exec my-pihole pihole --wild ads.example.com

# Show the current whitelist
podman exec my-pihole pihole allow -l

# Show the current blacklist
podman exec my-pihole pihole deny -l

# Remove a domain from the whitelist
podman exec my-pihole pihole allow -d example.com
```

## Custom dnsmasq Configuration

Add custom dnsmasq settings for advanced DNS control.

```bash
# Create a custom dnsmasq configuration
podman exec my-pihole pihole-FTL --config misc.etc_dnsmasq_d true

podman exec my-pihole bash -c 'cat > /etc/dnsmasq.d/99-custom.conf <<EOF
# Set a custom domain for local network
local=/home.lab/
domain=home.lab

# DHCP range (if Pi-hole should act as DHCP)
# dhcp-range=192.168.1.100,192.168.1.200,24h

# Conditional forwarding for a specific domain
server=/corp.example.com/10.0.0.1

# Cache settings
cache-size=10000
EOF'

# Restart the container so FTL re-reads dnsmasq configuration files
podman restart my-pihole
```

## Monitoring Pi-hole

Check Pi-hole statistics and query logs.

```bash
# View Pi-hole summary statistics
podman exec my-pihole pihole api stats/summary

# View the query log (last 20 entries)
podman exec my-pihole pihole api 'queries?length=20'

# Check Pi-hole status
podman exec my-pihole pihole status

# Use the Pi-hole API for stats
podman exec my-pihole pihole api stats/summary

# Get top blocked domains
podman exec my-pihole pihole api 'stats/top_domains?blocked=true&count=10'

# Temporarily disable Pi-hole blocking (for 5 minutes)
podman exec my-pihole pihole disable 300

# Re-enable Pi-hole blocking
podman exec my-pihole pihole enable
```

## Managing the Container

Common management operations.

```bash
# View Pi-hole logs
podman logs my-pihole

# View DNS query logs
podman exec my-pihole tail -f /var/log/pihole/pihole.log

# Restart the Pi-hole DNS service
podman exec my-pihole pihole reloaddns

# Stop and start
podman stop my-pihole
podman start my-pihole

# Remove containers and volumes
podman rm -f my-pihole pihole-custom-dns
podman volume rm pihole-config pihole-dnsmasq pihole-custom-config pihole-custom-dnsmasq
```

## Summary

Running Pi-hole in a Podman container gives you network-wide ad blocking through DNS filtering without dedicated hardware. The web dashboard provides real-time statistics on blocked queries, top domains, and client activity. Custom DNS records let you set up local name resolution, while blocklist management and whitelisting give you granular control over what is filtered. Named volumes persist your configuration and blocklists across restarts. Podman's rootless mode provides security isolation for your DNS infrastructure, though you may need to configure port forwarding for port 53 depending on your system setup.
