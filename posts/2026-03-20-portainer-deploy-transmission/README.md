# How to Deploy Transmission via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Transmission, BitTorrent, Downloading, Self-Hosted

Description: Deploy Transmission via Portainer as a lightweight BitTorrent client with a clean web interface and RSS-based auto-downloading capabilities.

## Introduction

Transmission is a lightweight, easy-to-use BitTorrent client known for its minimal resource usage. It's ideal for lower-power devices like NAS boxes and Raspberry Pis where a lighter client is preferable. Deploying via Portainer gives you remote management through its simple web UI.

## Deploy as a Stack

```yaml
services:
  transmission:
    image: lscr.io/linuxserver/transmission:latest
    container_name: transmission
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
      - USER=admin
      - PASS=change_this_password
    volumes:
      - transmission_config:/config
      # Download directories
      - /mnt/media/downloads:/downloads
      - /mnt/media/downloads/incomplete:/incomplete
    ports:
      - "9091:9091"    # Web UI
      - "51413:51413"  # Peer port
      - "51413:51413/udp"
    restart: unless-stopped

volumes:
  transmission_config:
```

## Access and Configuration

Navigate to `http://<host>:9091` with the credentials you set in `USER`/`PASS`, for example `admin` / `change_this_password`.

## Custom Settings

The main settings file is `settings.json` in the config volume. Stop the container before editing it, and keep web UI credentials in the `USER`/`PASS` environment variables for the LinuxServer image. Key settings:

```json
{
    "download_dir": "/downloads",
    "incomplete_dir": "/incomplete",
    "incomplete_dir_enabled": true,
    "peer_port": 51413,
    "rpc_whitelist": "127.0.0.1,192.168.*.*",
    "rpc_whitelist_enabled": true,
    "speed_limit_down_enabled": false,
    "speed_limit_up": 100,
    "speed_limit_up_enabled": true,
    "ratio_limit": 1.0,
    "ratio_limit_enabled": true
}
```

## Transmission with OpenVPN

```yaml
services:
  transmission-openvpn:
    image: haugene/transmission-openvpn:latest
    container_name: transmission-openvpn
    cap_add:
      - NET_ADMIN
    environment:
      - OPENVPN_PROVIDER=PIA
      - OPENVPN_CONFIG=france
      - OPENVPN_USERNAME=your_vpn_username
      - OPENVPN_PASSWORD=your_vpn_password
      - LOCAL_NETWORK=192.168.1.0/24
      - TRANSMISSION_WEB_UI=combustion   # Or flood-for-transmission
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    volumes:
      - transmission_config:/config
      - /mnt/media/downloads:/data
    ports:
      - "9091:9091"
    restart: unless-stopped

volumes:
  transmission_config:
```

## Adding Transmission to *arr Stack

Configure in Sonarr/Radarr:

1. **Settings > Download Clients > Add**
2. Select **Transmission**
3. Host: `transmission` if the apps share a Docker network, otherwise use the Docker host/IP; Port: `9091`
4. Username/password from your config
5. Optional category: `sonarr` or `radarr`

Resource Usage Comparison

| Feature | Transmission | qBittorrent |
|---------|-------------|-------------|
| Resource footprint | Lightweight | More feature-rich, typically heavier |
| UI Complexity | Simple | Feature-rich |
| Web UI | Built-in | Built-in |
| RSS support | Via external tools/plugins | Built-in |
| Search extensions | No built-in plugin system | Built-in search engine plugins |

## Conclusion

Transmission deployed via Portainer is ideal for resource-constrained environments like NAS devices and ARM boards where every megabyte of RAM matters. Its simplicity and low resource usage make it reliable as a background download client in automated media pipelines. The VPN-integrated images provide a straightforward path to privacy-protected downloading.
