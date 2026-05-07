# How to Self-Host an Ad Blocker (DNS) with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Self-Hosted, Pi-hole, AdGuard Home, DNS, Ad Blocking, Networking

Description: Deploy Pi-hole or AdGuard Home as a network-wide DNS-based ad blocker using Portainer to block ads on all devices.

## Introduction

A DNS-based ad blocker filters advertisement and tracking domains at the network level, blocking ads on every device including smart TVs, phones, and IoT devices - without installing any browser extension. Pi-hole and AdGuard Home are the two most popular solutions. This guide covers deploying both using Portainer.

## Prerequisites

- Portainer installed and running
- A static IP for your Docker host
- Access to your router settings to change DNS

## How DNS-Based Ad Blocking Works

When a device requests `ads.doubleclick.net`, your DNS server (Pi-hole/AdGuard) recognizes it as an ad domain and returns `0.0.0.0` instead of the real IP, effectively blocking the request before it reaches your browser.

## Option 1: Deploy Pi-hole

```yaml
# docker-compose.yml - Pi-hole

networks:
  dns_network:
    driver: bridge
    ipam:
      config:
        # Fixed subnet for predictable IPs
        - subnet: 172.21.0.0/24

volumes:
  pihole_etc:
  pihole_dnsmasq:

services:
  pihole:
    image: pihole/pihole:latest
    container_name: pihole
    restart: unless-stopped
    # Use host networking for DNS (port 53)
    # Or use port mapping as shown below
    ports:
      - "53:53/tcp"   # DNS TCP
      - "53:53/udp"   # DNS UDP
      # - "67:67/udp" # DHCP; bridge mode also needs a DHCP relay
      - "8053:80/tcp" # Web admin UI
    environment:
      # Admin password for web UI
      - FTLCONF_webserver_api_password=your_secure_admin_password

      # Required when using bridge networking
      - FTLCONF_dns_listeningMode=all

      # Upstream DNS servers
      - FTLCONF_dns_upstreams=1.1.1.1;1.0.0.2;9.9.9.9

      # Your local domain (optional)
      - FTLCONF_dns_domain_name=home

      # Timezone
      - TZ=America/New_York

      # DNSSEC validation
      - FTLCONF_dns_dnssec=true

      # Enable FTLDNS privacy
      - FTLCONF_misc_privacylevel=0
    volumes:
      # Pi-hole configuration
      - pihole_etc:/etc/pihole
      # Optional custom dnsmasq files; Pi-hole v6 also needs FTLCONF_misc_etc_dnsmasq_d=true
      - pihole_dnsmasq:/etc/dnsmasq.d
    # Needed only if you enable Pi-hole's DHCP server
    cap_add:
      - NET_ADMIN
    networks:
      dns_network:
        ipv4_address: 172.21.0.100
```

## Option 2: Deploy AdGuard Home

AdGuard Home offers a more modern interface and built-in HTTPS/DoH support.

```yaml
# docker-compose.yml - AdGuard Home

networks:
  dns_network:
    driver: bridge

volumes:
  adguard_work:
  adguard_conf:

services:
  adguardhome:
    image: adguard/adguardhome:latest
    container_name: adguardhome
    restart: unless-stopped
    ports:
      - "53:53/tcp"    # DNS TCP
      - "53:53/udp"    # DNS UDP
      - "3000:3000"    # Initial setup UI
      - "8080:80"      # Web admin UI (after setup)
      - "443:443/tcp"  # HTTPS / DNS over HTTPS
      - "443:443/udp"  # HTTP/3 / DNS over HTTPS
      - "853:853/tcp"  # DNS over TLS
      - "853:853/udp"  # DNS over QUIC
    volumes:
      # Work directory (query logs, statistics)
      - adguard_work:/opt/adguardhome/work
      # Configuration directory
      - adguard_conf:/opt/adguardhome/conf
    networks:
      - dns_network
```

## Step 3: Configure Router DNS

Point all devices on your network to use Pi-hole/AdGuard as the DNS server.

### Option A: Router DHCP Settings
1. Log into your router admin panel
2. Find **DHCP Settings** or **LAN Settings**
3. Set **Primary DNS** to your Docker host IP (e.g., `192.168.1.100`)
4. Leave **Secondary DNS** blank if your router allows it, or point it to a second Pi-hole/AdGuard Home instance

### Option B: Individual Device Configuration
```bash
# Linux - temporary change until DHCP or NetworkManager rewrites it
echo "nameserver 192.168.1.100" | sudo tee /etc/resolv.conf

# Or via NetworkManager
nmcli con modify "your-connection" ipv4.method auto ipv4.ignore-auto-dns yes ipv4.dns "192.168.1.100"
nmcli con up "your-connection"
```

## Step 4: Add Custom Blocklists to Pi-hole

```bash
# Add blocklists in the Pi-hole web interface:
# https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts
# https://raw.githubusercontent.com/FadeMind/hosts.extras/master/add.Spam/hosts
# https://www.github.developerdan.com/hosts/lists/ads-and-tracking-extended.txt

# Or via command line
docker exec pihole pihole updateGravity
```

## Step 5: Configure Local DNS Records

Add your self-hosted services as local DNS records:

```bash
# In Pi-hole: Settings > Local DNS > DNS Records
# Or add to Pi-hole's custom DNS list

docker exec -i pihole tee -a /etc/pihole/custom.list > /dev/null << 'EOF'
192.168.1.100 portainer.home
192.168.1.100 nextcloud.home
192.168.1.100 jellyfin.home
192.168.1.100 grafana.home
EOF

# Restart Pi-hole to apply
docker restart pihole
```

## Step 6: Set Up Unbound as an Upstream Resolver

For additional DNS privacy, you can use Unbound as an upstream resolver. Note that `mvance/unbound:latest` forwards queries to Cloudflare over TLS by default; if you want full recursion, provide a custom `unbound.conf`.

```yaml
# Add to docker-compose.yml
  unbound:
    image: mvance/unbound:latest
    container_name: unbound
    restart: unless-stopped
    networks:
      dns_network:
        ipv4_address: 172.21.0.101
```

```yaml
# Update Pi-hole to use Unbound
environment:
  - FTLCONF_dns_upstreams=unbound#53
```

## Monitoring in Portainer

Use Portainer to monitor your DNS server:
- **Logs**: Check for query errors or blocklist update failures
- **Stats**: Monitor CPU and memory (Pi-hole is very lightweight)
- **Restart**: Quickly restart after configuration changes

```bash
# Check Pi-hole status
docker exec pihole pihole status

# Check query logs
docker exec pihole pihole tail

# Update blocklists
docker exec pihole pihole updateGravity
```

## Allowlisting Domains

```bash
# Allow a domain that's being incorrectly blocked
docker exec pihole pihole allow example.com

# Allow a regex pattern
docker exec pihole pihole --allow-regex '^ads\..*\.yoursite\.com$'
```

## Conclusion

You now have a network-wide ad blocker running in Docker managed through Portainer. Every device on your network - phones, smart TVs, gaming consoles, and laptops - benefits from ad and tracker blocking without any configuration on individual devices. Pi-hole can block a meaningful share of DNS queries in a household, significantly reducing tracking and improving page load times. Use Portainer to keep your ad blocker updated and monitor its resource usage.
