# How to Use Local DNS with Portainer (Pi-hole/AdGuard)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Pi-hole, AdGuard Home, DNS, Self-Hosted, Docker, Networking

Description: Learn how to set up local DNS resolution for Portainer and its managed services using Pi-hole or AdGuard Home for clean internal hostnames.

---

Instead of accessing your Portainer services via IP addresses, you can give them proper domain names like `portainer.home.lab` using a local DNS server. If you are not using a reverse proxy yet, local DNS still gives you stable hostnames, but you will keep the original service ports (for example, `https://portainer.home.lab:9443`). Pi-hole and AdGuard Home are the most popular choices for self-hosted environments. This guide shows how to deploy them via Portainer and configure DNS rewrites for all your services.

---

## Why Use Local DNS?

Without local DNS:
- `https://192.168.1.100:9443` - hard to remember, changes if IP changes
- Multiple services on different ports - confusing

With local DNS:
- `https://portainer.home.lab:9443` - clean, memorable hostname
- `http://grafana.home.lab:3000`
- `http://app1.home.lab:8080`

Add a reverse proxy later if you also want to remove the port numbers entirely.

---

## Option A: Deploy Pi-hole via Portainer

Deploy Pi-hole as a Portainer stack on your network.

```yaml
# pi-hole-stack.yml - deploy Pi-hole as a Portainer stack

version: "3.8"

services:
  pihole:
    image: pihole/pihole:latest
    container_name: pihole
    restart: unless-stopped
    ports:
      - "53:53/tcp"        # DNS TCP
      - "53:53/udp"        # DNS UDP
      - "8080:80/tcp"      # Pi-hole web UI (use port 8080 to avoid conflicts)
    environment:
      TZ: "America/New_York"
      FTLCONF_webserver_api_password: "your-secure-password"
      FTLCONF_dns_upstreams: "1.1.1.1;8.8.8.8"   # upstream DNS servers
      FTLCONF_dns_listeningMode: "ALL"           # recommended for Docker bridge networking
      FTLCONF_misc_etc_dnsmasq_d: "true"         # allow custom files in /etc/dnsmasq.d
    volumes:
      - pihole_etc:/etc/pihole
      - pihole_dnsmasq:/etc/dnsmasq.d
    cap_add:
      - NET_ADMIN   # required only if you enable Pi-hole DHCP

volumes:
  pihole_etc:
  pihole_dnsmasq:
```

In Portainer: **Stacks > Add Stack > Paste YAML > Deploy the stack**

---

## Option B: Deploy AdGuard Home via Portainer

AdGuard Home has a more modern UI and built-in DNS rewrite support.

```yaml
# adguard-stack.yml - deploy AdGuard Home as a Portainer stack
version: "3.8"

services:
  adguardhome:
    image: adguard/adguardhome:latest
    container_name: adguardhome
    restart: unless-stopped
    ports:
      - "53:53/tcp"
      - "53:53/udp"
      - "3000:3000/tcp"    # Initial setup wizard
      - "8888:80/tcp"      # Web UI after setup
    volumes:
      - adguard_work:/opt/adguardhome/work
      - adguard_conf:/opt/adguardhome/conf

volumes:
  adguard_work:
  adguard_conf:
```

---

## Configuring DNS Rewrites in Pi-hole

After Pi-hole is running, add local DNS entries via the admin UI or by editing dnsmasq config directly.

**Via Pi-hole UI:**
1. Open `http://<server-ip>:8080/admin`
2. Go to **Local DNS > DNS Records**
3. Add entries:

| Domain | IP |
|---|---|
| portainer.home.lab | 192.168.1.100 |
| grafana.home.lab | 192.168.1.100 |
| app1.home.lab | 192.168.1.100 |

**Via config file (inside the Pi-hole container):**

```bash
# Exec into the Pi-hole container to add a custom dnsmasq conf
docker exec -it pihole sh

# Create a custom DNS entries file
cat > /etc/dnsmasq.d/02-local-hosts.conf << 'EOF'
address=/portainer.home.lab/192.168.1.100
address=/grafana.home.lab/192.168.1.100
address=/app1.home.lab/192.168.1.100
EOF

exit

# Restart the container so Pi-hole re-reads dnsmasq config files
docker restart pihole
```

---

## Configuring DNS Rewrites in AdGuard Home

1. Open AdGuard Home UI at `http://<server-ip>:8888`
2. Go to **Filters > DNS Rewrites**
3. Click **Add DNS Rewrite**
4. Add domain `portainer.home.lab` → `192.168.1.100`
5. Repeat for each service

---

## Point Your Network to the Local DNS Server

In your router's DHCP settings, set the primary DNS server to your Pi-hole/AdGuard IP.

```bash
# Test DNS resolution from any client on your network
nslookup portainer.home.lab 192.168.1.10
# Expected: Address: 192.168.1.100

# Test from the command line
curl -k https://portainer.home.lab:9443
```

---

## Add a Wildcard Entry (Optional)

For a cleaner setup, use a wildcard DNS entry to route all `.home.lab` subdomains to your server.

```bash
# Exec into the Pi-hole container
docker exec -it pihole sh

# In Pi-hole custom dnsmasq config
echo "address=/.home.lab/192.168.1.100" > /etc/dnsmasq.d/03-wildcard.conf
exit

# Restart the container so Pi-hole re-reads dnsmasq config files
docker restart pihole
```

Then configure your reverse proxy (Nginx, Traefik) to handle subdomain routing to the correct containers.

---

## Summary

Deploying Pi-hole or AdGuard Home via Portainer and adding DNS rewrites gives all your Portainer-managed services clean, memorable hostnames. Set your router DHCP to point to the DNS container IP, and every device on your network will resolve `portainer.home.lab` and similar names automatically. If you also want to remove per-service port numbers, put a reverse proxy in front of those services.
