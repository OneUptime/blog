# How to Deploy Home Assistant via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Home Assistant, Smart Home, IoT, Docker, Self-Hosting, Automation

Description: Learn how to deploy Home Assistant via Portainer using host networking for full device discovery, with persistent configuration storage.

---

Home Assistant is the most popular open-source home automation platform, supporting thousands of integrations. Running it in Docker via Portainer gives you easy version management while keeping all your automations in persistent volumes.

## Prerequisites

- Portainer running on Linux (host network mode is Linux-only)
- At least 1GB RAM
- Devices on the same local network as the host

## Compose Stack

Home Assistant works best with `network_mode: host` so it can discover devices via mDNS, DHCP, and other broadcast protocols that do not cross Docker's bridge network:

```yaml
version: "3.8"

services:
  homeassistant:
    image: ghcr.io/home-assistant/home-assistant:stable
    restart: unless-stopped
    # Host networking required for device auto-discovery (mDNS, SSDP, etc.)
    network_mode: host
    privileged: true       # Needed for USB device access (Zigbee sticks, etc.)
    environment:
      TZ: America/New_York  # Set your timezone
    volumes:
      - ha_config:/config
      - /run/dbus:/run/dbus:ro  # D-Bus for Bluetooth integration

volumes:
  ha_config:
```

## Deploying

1. In Portainer go to **Stacks > Add Stack**.
2. Name it `homeassistant`.
3. Set `TZ` to your timezone.
4. Click **Deploy the stack**.

With host networking, Home Assistant is available at `http://<host-ip>:8123`.

## USB Device Passthrough

If you use a Zigbee or Z-Wave USB stick, pass the device through to the container. First find the device path:

```bash
# List USB serial devices on the host

ls /dev/ttyUSB* /dev/ttyACM*
```

Then add to the compose service:

```yaml
devices:
  - /dev/ttyUSB0:/dev/ttyUSB0   # Adjust path to your device
```

## Updating Home Assistant

In Portainer navigate to the `homeassistant` stack, click **Editor**, change `stable` to the desired version tag (e.g., `2024.3`), and redeploy. The `ha_config` volume retains all your automations and integrations.

## Monitoring

Add an HTTP monitor in OneUptime pointing to `http://<host>:8123/api/`. The `/api/` endpoint requires authentication, so create a Long-Lived Access Token under your Home Assistant user profile and send it as `Authorization: Bearer <token>` on the monitor request. With a valid token, Home Assistant returns `{"message": "API running."}` when healthy. Alert on any downtime to catch issues with your smart home hub before automations start failing.
