# How to Deploy Home Assistant via Portainer - Homeassistant

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Home Assistant, Home Automation, IoT, Self-Hosted

Description: Deploy Home Assistant via Portainer for a powerful, open-source home automation platform that integrates thousands of smart home devices and services.

## Introduction

Home Assistant is the leading open-source home automation platform, supporting 3000+ integrations with smart home devices and services. Deploying via Portainer with host network mode enables proper device discovery and local integration support.

## Deploy as a Stack

```yaml
services:
  homeassistant:
    image: ghcr.io/home-assistant/home-assistant:stable
    container_name: homeassistant
    # Host network is recommended for:
    # - mDNS/Zeroconf device discovery
    # - SSDP/UPnP discovery
    # - Other local network integrations
    network_mode: host
    environment:
      - TZ=America/New_York
    volumes:
      # Home Assistant configuration
      - homeassistant_config:/config
      # Keep the container's local time aligned with the host
      - /etc/localtime:/etc/localtime:ro
    # Uncomment if using USB devices (Zigbee/Z-Wave dongles)
    # devices:
    #   - /dev/ttyUSB0:/dev/ttyUSB0   # Zigbee/Z-Wave stick
    #   - /dev/ttyACM0:/dev/ttyACM0
    privileged: true   # Required for some USB device access
    restart: unless-stopped

volumes:
  homeassistant_config:
```

## Initial Setup

1. Access Home Assistant at `http://<host>:8123`
2. Complete the onboarding wizard:
   - Create your user account
   - Set your location (for sunrise/sunset automation)
   - Install recommended integrations

## Adding Integrations

1. Navigate to **Settings > Devices & Services**
2. Click **Add integration**
3. Search for your device type (Philips Hue, Nest, MQTT, etc.)
4. Follow the integration-specific setup

## Example Automation

In **Settings > Automations & Scenes > Create automation**:

```yaml
# automations.yaml - Turn on lights at sunset

alias: "Turn on lights at sunset"
description: ""
triggers:
  - trigger: sun
    event: sunset
    offset: "-00:30:00"
conditions:
  - condition: time
    weekday:
      - mon
      - tue
      - wed
      - thu
      - fri
actions:
  - action: light.turn_on
    target:
      area_id: living_room
    data:
      brightness_pct: 70
      color_temp_kelvin: 2500
mode: single
```

## Zigbee Integration via USB Dongle

If using a Zigbee coordinator (ConBee II, HUSBZB-1, etc.):

```yaml
services:
  homeassistant:
    devices:
      - /dev/ttyUSB0:/dev/ttyUSB0
    privileged: true

  # Alternative to ZHA: Zigbee2MQTT
  zigbee2mqtt:
    image: ghcr.io/koenkk/zigbee2mqtt:latest
    container_name: zigbee2mqtt
    volumes:
      - zigbee2mqtt_data:/app/data
      - /run/udev:/run/udev:ro
    devices:
      - /dev/ttyUSB0:/dev/ttyUSB0
    ports:
      - "8080:8080"
    environment:
      TZ: America/New_York
    restart: unless-stopped

volumes:
  zigbee2mqtt_data:
```

## MQTT Broker for Home Assistant

Many devices communicate via MQTT. Add Mosquitto to your stack, and make sure your `mosquitto.conf` defines a listener:

```conf
listener 1883
allow_anonymous true
persistence true
persistence_location /mosquitto/data/
log_dest file /mosquitto/log/mosquitto.log
```

```yaml
services:
  mosquitto:
    image: eclipse-mosquitto:2
    container_name: mosquitto
    ports:
      - "1883:1883"
    volumes:
      - /PATH_TO_YOUR_MOSQUITTO_CONFIG:/mosquitto/config
      - /PATH_TO_YOUR_MOSQUITTO_DATA:/mosquitto/data
      - /PATH_TO_YOUR_MOSQUITTO_LOG:/mosquitto/log
    restart: unless-stopped
```

## Backing Up Home Assistant

```bash
# After creating a manual backup in Settings > System > Backups,
# copy the local backup files from the container
docker cp homeassistant:/backup ./ha-backups
```

Or in the UI: **Settings > System > Backups > Backup now > Manual backup**

## Conclusion

Home Assistant deployed via Portainer creates a central hub for your smart home. The host network mode ensures device discovery works correctly for local protocols like mDNS, SSDP, and direct device communication. Portainer's stack management makes updating Home Assistant straightforward, and the persistent configuration volume preserves your automations and integrations across updates.
