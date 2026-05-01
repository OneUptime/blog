# How to Deploy Pi-hole via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Pi-hole, DNS, Ad Blocking, Docker, Networking, Self-Hosting

Description: Learn how to deploy Pi-hole, the network-wide ad blocker, via Portainer with proper DNS port configuration and a persistent data volume.

---

Pi-hole acts as a DNS sinkhole for your entire network, blocking ads and trackers before they reach any device. Running it in Docker via Portainer makes it easy to update, back up, and restart.

## Prerequisites

- Portainer running on a Linux host
- Port `53` (DNS) available (stop `systemd-resolved` if it occupies port 53)
- A static IP or DHCP reservation for the Pi-hole host

## Freeing Port 53 on Ubuntu/Debian

Ubuntu and Debian can use `systemd-resolved` which binds to port 53. Disable the stub listener first:

```bash
# Disable the stub DNS listener and point resolv.conf at systemd-resolved's upstream view
sudo sh -c 'mkdir -p /etc/systemd/resolved.conf.d && printf "[Resolve]\nDNSStubListener=no\n" | tee /etc/systemd/resolved.conf.d/no-stub.conf'
sudo sh -c 'rm -f /etc/resolv.conf && ln -s /run/systemd/resolve/resolv.conf /etc/resolv.conf'
sudo systemctl restart systemd-resolved
```

## Compose Stack

```yaml
services:
  pihole:
    image: pihole/pihole:latest
    restart: unless-stopped
    ports:
      - "53:53/tcp"      # DNS over TCP
      - "53:53/udp"      # DNS over UDP
      - "8053:80/tcp"    # Pi-hole admin UI
    environment:
      TZ: America/New_York
      FTLCONF_webserver_api_password: "yourpassword"  # Change this - admin UI password
      FTLCONF_dns_upstreams: "1.1.1.1;8.8.8.8"        # Upstream DNS servers
      FTLCONF_dns_listeningMode: "ALL"
    volumes:
      - pihole_data:/etc/pihole

volumes:
  pihole_data:
```

## Deploying

1. In Portainer go to **Stacks > Add Stack**.
2. Name it `pihole`.
3. Set `FTLCONF_webserver_api_password` and your `TZ`.
4. Click **Deploy the stack**.

Access the admin interface at `http://<host>:8053/admin`.

## Pointing Devices to Pi-hole

On your router, set the primary DNS server to the Pi-hole host IP. All devices on your network will automatically use Pi-hole for DNS resolution. You can also configure individual devices manually.

## Adding Block Lists

In the Pi-hole admin UI go to **Group Management > Adlists** and add community block lists:

```text
https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts
https://adaway.org/hosts.txt
```

Run **Tools > Update Gravity** after adding lists.

## Monitoring

Use OneUptime to monitor `http://<host>:8053/admin/` for the web interface. Pi-hole v6 also exposes a REST API at `http://<host>:8053/api/`; for example, `GET /api/stats/summary` returns overview metrics, though password-protected instances may require authentication. Also set a DNS monitor to verify that Pi-hole is resolving queries correctly.
