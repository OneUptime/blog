# How to Deploy Transmission via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Transmission, Docker, Self-Hosting, Download Client, BitTorrent

Description: Learn how to deploy Transmission BitTorrent client via Portainer with the web UI, configurable credentials, and proper download directory mapping.

---

Transmission is a lightweight, fast BitTorrent client with low resource usage, making it ideal for always-on server deployments. Its clean web UI and RPC API integrate well with Sonarr, Radarr, and automation scripts.

## Prerequisites

- Portainer running
- A download directory on the host

## Compose Stack

```yaml
services:
  transmission:
    image: lscr.io/linuxserver/transmission:latest
    restart: unless-stopped
    ports:
      - "9091:9091"       # Web UI and RPC API
      - "51413:51413"     # Peer port (TCP)
      - "51413:51413/udp" # Peer port (UDP)
    environment:
      PUID: 1000
      PGID: 1000
      TZ: America/New_York
      USER: admin          # Web UI username
      PASS: changeme       # Web UI password - change this
    volumes:
      - transmission_config:/config
      - /mnt/data/downloads:/downloads
      - /mnt/data/downloads/watch:/watch  # Drop .torrent files here to auto-add

volumes:
  transmission_config:
```

## Deploying

1. In Portainer go to **Stacks > Add Stack**.
2. Name it `transmission`.
3. Set `USER`, `PASS`, and update volume paths.
4. Click **Deploy the stack**.

Open `http://<host>:9091/transmission/web/` and log in with the credentials you set.

## Configuring Speed Limits

Transmission supports scheduled speed limits (e.g., full speed at night). In the web UI open **Edit preferences** and use the **Speed** section:

- Enable **Alternative Speed Limits** for throttled daytime speeds
- Set **Scheduled times** to automatically switch between normal and alternative limits

## RPC API Usage

Automation scripts can control Transmission via its JSON-RPC API:

```bash
# Get the session header, then add a torrent by URL using curl

SESSION_ID=$(
  curl -s -D - -o /dev/null \
    -u admin:changeme \
    http://localhost:9091/transmission/rpc \
  | awk -F': ' '/^X-Transmission-Session-Id:/ {print $2}' \
  | tr -d '\r'
)

curl -s \
  -u admin:changeme \
  -H "Content-Type: application/json" \
  -H "X-Transmission-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","method":"torrent_add","params":{"filename":"https://example.com/file.torrent"},"id":1}' \
  http://localhost:9091/transmission/rpc
```

## Monitoring

Use OneUptime to monitor `http://<host>:9091/transmission/web/` for HTTP 200. If you enabled `USER` and `PASS`, configure HTTP Basic authentication in the monitor so the check can authenticate successfully. Transmission downtime halts automated downloads, so configure an alert with a short check interval.
