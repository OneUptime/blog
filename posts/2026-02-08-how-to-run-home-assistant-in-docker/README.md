# How to Run Home Assistant in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, home-assistant, smart-home, iot, automation, self-hosted

Description: Complete guide to running Home Assistant in Docker for smart home automation with device integrations and custom dashboards.

---

Home Assistant is the leading open-source platform for smart home automation. It connects to over 2,000 different devices and services, from Philips Hue lights to Zigbee sensors to weather APIs. Running Home Assistant in Docker keeps your installation contained and easy to manage, while still giving you access to the full range of integrations and automations.

## Home Assistant Container vs. Home Assistant OS

Home Assistant comes in several installation flavors. Home Assistant OS runs as a full operating system with its own supervisor and add-on ecosystem. The Docker container version (called Home Assistant Container) gives you the core platform without the supervisor. You lose the built-in add-on store, but you gain the flexibility to manage everything yourself with Docker Compose. For users already running Docker on a server, the container approach fits naturally into an existing stack.

## Prerequisites

You will need:

- A Linux server with Docker and Docker Compose installed
- A dedicated machine or VM (Raspberry Pi 4, Intel NUC, or any x86 server works well)
- At least 2 GB of RAM
- Optional: a Zigbee or Z-Wave USB stick for local device communication
- Network access to your smart home devices

## Project Setup

Create a directory for Home Assistant:

```bash
# Create the Home Assistant project directory
mkdir -p ~/home-assistant/config
cd ~/home-assistant
```

## Docker Compose Configuration

Home Assistant needs host network mode to discover devices on your local network. Without it, mDNS discovery and many integrations will not work properly.

```yaml
# docker-compose.yml - Home Assistant Container
version: "3.8"

services:
  homeassistant:
    image: ghcr.io/home-assistant/home-assistant:stable
    container_name: homeassistant
    restart: unless-stopped
    # Host network mode is required for device discovery
    network_mode: host
    environment:
      # Set your timezone for automations to work correctly
      - TZ=America/New_York
    volumes:
      # Persist all configuration, automations, and history
      - ./config:/config
      # Give access to the host's D-Bus for Bluetooth support
      - /run/dbus:/run/dbus:ro
    # Privileged mode enables USB device access and Bluetooth
    privileged: true
```

If you have a Zigbee or Z-Wave USB stick, add the device mapping:

```yaml
# Add this under the homeassistant service for USB device passthrough
    devices:
      # Map the Zigbee/Z-Wave USB stick into the container
      # Check the actual device path with 'ls /dev/serial/by-id/'
      - /dev/serial/by-id/usb-Silicon_Labs_Zigbee_USB-if00-port0:/dev/ttyUSB0
```

## Finding Your USB Device Path

If you are using a Zigbee coordinator like the Sonoff Zigbee dongle, find its path:

```bash
# List USB serial devices by their persistent identifier
ls -la /dev/serial/by-id/
```

Always use the `/dev/serial/by-id/` path rather than `/dev/ttyUSB0` because the numbered path can change if you plug in additional USB devices.

## Starting Home Assistant

```bash
# Start Home Assistant in detached mode
docker compose up -d
```

The first startup takes a few minutes as Home Assistant creates its database and default configuration. Check progress with:

```bash
# Follow the Home Assistant startup logs
docker compose logs -f homeassistant
```

Once you see "Home Assistant initialized" in the logs, open `http://<your-server-ip>:8123` in your browser.

## Initial Configuration

The onboarding wizard asks you to:

1. Create an admin account with a name, username, and password
2. Name your home and set your location (used for sunrise/sunset automations and weather)
3. Choose which discovered integrations to set up
4. Review privacy settings for analytics

Home Assistant automatically discovers many devices on your network during onboarding. You will likely see smart speakers, Chromecast devices, routers, and other network-connected hardware.

## Adding Integrations

Integrations connect Home Assistant to your devices and services. Add them through Settings > Devices & Services > Add Integration. Some popular ones:

- **Philips Hue** - Discovers your bridge automatically
- **Google Cast** - Controls Chromecast and Google Home devices
- **MQTT** - Connects to an MQTT broker for IoT devices
- **Zigbee Home Automation (ZHA)** - Manages Zigbee devices through your USB stick
- **Weather** - Pulls forecast data from OpenWeatherMap or Met.no

## Creating Automations

Automations are the heart of Home Assistant. Here is an example YAML automation that turns on lights at sunset:

```yaml
# Add this to config/automations.yaml
# Turn on living room lights 30 minutes before sunset
- id: sunset_lights
  alias: "Turn on lights at sunset"
  trigger:
    - platform: sun
      event: sunset
      offset: "-00:30:00"
  condition:
    - condition: state
      entity_id: binary_sensor.someone_home
      state: "on"
  action:
    - service: light.turn_on
      target:
        entity_id: light.living_room
      data:
        brightness_pct: 70
        color_temp: 370
```

Here is another automation that sends a notification when a door is left open:

```yaml
# Alert if the front door stays open for more than 5 minutes
- id: door_open_alert
  alias: "Front door open alert"
  trigger:
    - platform: state
      entity_id: binary_sensor.front_door
      to: "on"
      for:
        minutes: 5
  action:
    - service: notify.mobile_app
      data:
        title: "Door Alert"
        message: "The front door has been open for 5 minutes."
```

## Custom Dashboards

Home Assistant's Lovelace dashboard system lets you build custom interfaces. Edit dashboards through the UI or define them in YAML. Here is a simple dashboard card configuration:

```yaml
# Example Lovelace card configuration for a room overview
type: vertical-stack
cards:
  - type: entities
    title: Living Room
    entities:
      - entity: light.living_room
      - entity: climate.living_room_thermostat
      - entity: sensor.living_room_temperature
      - entity: sensor.living_room_humidity
  - type: history-graph
    title: Temperature History
    entities:
      - entity: sensor.living_room_temperature
    hours_to_show: 24
```

## Running Add-on Equivalents as Docker Containers

Since the container installation does not include the add-on store, you run additional services as separate Docker containers. Common ones include:

```yaml
# Additional services to complement Home Assistant
services:
  mosquitto:
    image: eclipse-mosquitto:2
    container_name: mosquitto
    restart: unless-stopped
    ports:
      - "1883:1883"
    volumes:
      - ./mosquitto/config:/mosquitto/config
      - ./mosquitto/data:/mosquitto/data

  zigbee2mqtt:
    image: koenkk/zigbee2mqtt:latest
    container_name: zigbee2mqtt
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - ./zigbee2mqtt:/app/data
    devices:
      - /dev/serial/by-id/your-zigbee-stick:/dev/ttyUSB0
    environment:
      - TZ=America/New_York
```

## Backup and Restore

Back up your Home Assistant configuration regularly:

```bash
# Create a compressed backup of the entire config directory
tar czf ~/ha-backup-$(date +%Y%m%d).tar.gz ~/home-assistant/config/
```

The most critical files are `configuration.yaml`, `automations.yaml`, `scripts.yaml`, `scenes.yaml`, and the `.storage` directory which contains integration configurations and entity settings.

## Updating Home Assistant

Updates are released monthly. Check the release notes before updating since breaking changes do happen:

```bash
# Pull the latest stable image and restart
docker compose pull
docker compose up -d
```

After the update, check the logs for any migration messages and visit the web UI to confirm everything works.

## Security Considerations

If you expose Home Assistant to the internet, take these precautions:

- Always use HTTPS through a reverse proxy
- Enable multi-factor authentication in your user profile
- Use a strong, unique password
- Consider using a VPN instead of direct exposure
- Keep the instance updated

## Monitoring with OneUptime

Monitor your Home Assistant instance with OneUptime by setting up an HTTP health check against port 8123. You can also create custom monitors using the Home Assistant REST API to verify that specific automations and integrations are functioning. If your smart home controller goes down at 2 AM, you want to know about it.

## Wrapping Up

Running Home Assistant in Docker gives you a powerful smart home platform with clean separation from your host system. While you trade the built-in add-on store for manual Docker management, the flexibility is worth it if you already run other containers. Your automations, dashboards, and device integrations all persist in the config directory, making backups and migrations straightforward.
