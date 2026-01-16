# How to Install Home Assistant on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Home Assistant, Ubuntu, Smart Home, IoT, Docker, Home Automation, Zigbee, Z-Wave, Self-Hosted

Description: A comprehensive guide to installing, configuring, and optimizing Home Assistant on Ubuntu for complete smart home automation.

---

Home Assistant is an open-source home automation platform that puts local control and privacy first. Running it on Ubuntu gives you a stable, well-supported foundation for managing hundreds of smart devices, creating complex automations, and building dashboards that make your home truly intelligent. This guide covers everything from initial installation to advanced integrations.

## What is Home Assistant?

Home Assistant is a Python-based home automation platform that integrates with over 2,000 different services, devices, and platforms. Unlike cloud-dependent solutions, Home Assistant runs locally on your hardware, ensuring your smart home continues working even when the internet goes down.

### Key Use Cases

- **Unified Control**: Manage devices from different ecosystems (Google, Amazon, Apple, Zigbee, Z-Wave) in one interface
- **Privacy-First Automation**: Keep your data local instead of sending it to cloud servers
- **Energy Monitoring**: Track power consumption and optimize usage patterns
- **Security Integration**: Combine cameras, sensors, and locks into cohesive security workflows
- **Voice Assistant Integration**: Connect with Alexa, Google Assistant, or run fully local voice control
- **Presence Detection**: Automate based on who's home using phones, BLE beacons, or network presence

## Prerequisites

Before installing Home Assistant, ensure your Ubuntu system meets these requirements:

- Ubuntu 22.04 LTS or 24.04 LTS (recommended for long-term support)
- Minimum 2GB RAM (4GB+ recommended for complex setups)
- At least 32GB storage (SSD preferred for database performance)
- Python 3.11 or newer (for Core installation)
- Docker and Docker Compose (for Container installation)
- Network access for downloading integrations and updates
- Static IP address or DHCP reservation recommended

Update your system before proceeding with any installation method.

```bash
# Update package lists and upgrade existing packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git software-properties-common
```

## Installation Methods Overview

Home Assistant offers three main installation methods, each with different trade-offs:

| Method | Supervisor | Add-ons | Complexity | Flexibility |
|--------|------------|---------|------------|-------------|
| Container | No | No | Low | High |
| Supervised | Yes | Yes | Medium | Medium |
| Core | No | No | High | Highest |

### Method 1: Home Assistant Container (Docker)

The Container method runs Home Assistant Core in a Docker container. It's lightweight and integrates well with existing Docker infrastructure but lacks the Supervisor and add-on ecosystem.

Install Docker and Docker Compose if not already present.

```bash
# Install Docker using the official convenience script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to the docker group to run without sudo
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Log out and back in for group changes to take effect, or run:
newgrp docker

# Verify installation
docker --version
docker compose version
```

### Method 2: Home Assistant Supervised

Supervised installation provides the full Home Assistant experience including the Supervisor, Add-ons, backups, and updates. This is the recommended method for dedicated Home Assistant servers.

Install dependencies required for the Supervised installer.

```bash
# Install required packages for Supervised installation
sudo apt install -y \
    apparmor \
    cifs-utils \
    curl \
    dbus \
    jq \
    libglib2.0-bin \
    lsb-release \
    network-manager \
    nfs-common \
    systemd-journal-remote \
    systemd-resolved \
    udisks2 \
    wget

# Disable ModemManager as it can interfere with serial devices (Zigbee/Z-Wave dongles)
sudo systemctl disable ModemManager
sudo systemctl stop ModemManager
```

Install Docker for the Supervised setup.

```bash
# Install Docker (required for Supervised)
curl -fsSL https://get.docker.com | sudo sh

# Verify Docker is running
sudo systemctl status docker
```

Download and run the Home Assistant Supervised installer.

```bash
# Download the latest Home Assistant OS-Agent
wget https://github.com/home-assistant/os-agent/releases/latest/download/os-agent_1.6.0_linux_x86_64.deb

# Install OS-Agent
sudo dpkg -i os-agent_1.6.0_linux_x86_64.deb

# Verify OS-Agent installation
gdbus introspect --system --dest io.hass.os --object-path /io/hass/os

# Download the Home Assistant Supervised installer
wget -O homeassistant-supervised.deb https://github.com/home-assistant/supervised-installer/releases/latest/download/homeassistant-supervised.deb

# Install Home Assistant Supervised (select your machine type when prompted)
sudo dpkg -i homeassistant-supervised.deb
```

### Method 3: Home Assistant Core

Core installation runs Home Assistant directly in a Python virtual environment. This gives maximum control but requires manual management of dependencies and updates.

Install Python 3.11 and create a dedicated user for Home Assistant.

```bash
# Install Python 3.11 and development dependencies
sudo apt install -y python3.11 python3.11-venv python3.11-dev

# Create a dedicated system user for Home Assistant
sudo useradd -rm homeassistant -G dialout,gpio,i2c

# Create the configuration directory
sudo mkdir -p /srv/homeassistant
sudo chown homeassistant:homeassistant /srv/homeassistant
```

Create a virtual environment and install Home Assistant Core.

```bash
# Switch to the homeassistant user
sudo -u homeassistant -H -s

# Navigate to the Home Assistant directory
cd /srv/homeassistant

# Create a Python virtual environment
python3.11 -m venv .

# Activate the virtual environment
source bin/activate

# Upgrade pip to the latest version
pip install --upgrade pip wheel

# Install Home Assistant Core
pip install homeassistant

# Start Home Assistant for the first time (creates default config)
hass
```

Create a systemd service for automatic startup.

```bash
# Create the systemd service file
sudo tee /etc/systemd/system/home-assistant@homeassistant.service > /dev/null <<EOF
[Unit]
Description=Home Assistant
After=network-online.target

[Service]
Type=simple
User=homeassistant
WorkingDirectory=/srv/homeassistant
ExecStart=/srv/homeassistant/bin/hass -c "/home/homeassistant/.homeassistant"
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd, enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable home-assistant@homeassistant
sudo systemctl start home-assistant@homeassistant

# Check service status
sudo systemctl status home-assistant@homeassistant
```

## Docker Compose Deployment

For production deployments, Docker Compose provides reproducible, version-controlled configuration. This approach is recommended for users who want container isolation with easy updates.

Create a dedicated directory for your Home Assistant configuration.

```bash
# Create directory structure
mkdir -p ~/homeassistant/config
cd ~/homeassistant
```

Create a Docker Compose file with Home Assistant and common companion services.

```yaml
# docker-compose.yml
# Home Assistant with supporting services
version: '3.8'

services:
  homeassistant:
    container_name: homeassistant
    image: ghcr.io/home-assistant/home-assistant:stable
    volumes:
      # Mount configuration directory - persists all settings and data
      - ./config:/config
      # Mount local time for accurate timestamps
      - /etc/localtime:/etc/localtime:ro
      # Mount dbus for Bluetooth support (optional)
      - /run/dbus:/run/dbus:ro
    restart: unless-stopped
    privileged: true
    network_mode: host
    environment:
      - TZ=America/New_York
    # Required for Zigbee/Z-Wave USB dongles
    devices:
      - /dev/ttyUSB0:/dev/ttyUSB0
      - /dev/ttyACM0:/dev/ttyACM0

  # MQTT broker for IoT devices
  mosquitto:
    container_name: mosquitto
    image: eclipse-mosquitto:2
    volumes:
      - ./mosquitto/config:/mosquitto/config
      - ./mosquitto/data:/mosquitto/data
      - ./mosquitto/log:/mosquitto/log
    ports:
      - "1883:1883"
      - "9001:9001"
    restart: unless-stopped

  # InfluxDB for long-term metrics storage
  influxdb:
    container_name: influxdb
    image: influxdb:2
    volumes:
      - ./influxdb/data:/var/lib/influxdb2
      - ./influxdb/config:/etc/influxdb2
    ports:
      - "8086:8086"
    environment:
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=admin
      - DOCKER_INFLUXDB_INIT_PASSWORD=your-secure-password
      - DOCKER_INFLUXDB_INIT_ORG=homeassistant
      - DOCKER_INFLUXDB_INIT_BUCKET=homeassistant
    restart: unless-stopped

  # Grafana for dashboards and visualization
  grafana:
    container_name: grafana
    image: grafana/grafana:latest
    volumes:
      - ./grafana/data:/var/lib/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=your-secure-password
    depends_on:
      - influxdb
    restart: unless-stopped
```

Create the Mosquitto configuration file for MQTT.

```bash
# Create Mosquitto configuration directory and file
mkdir -p ~/homeassistant/mosquitto/config

# Create basic Mosquitto configuration
cat > ~/homeassistant/mosquitto/config/mosquitto.conf <<EOF
# Mosquitto MQTT Broker Configuration
listener 1883
listener 9001
protocol websockets

# Enable persistence for retained messages
persistence true
persistence_location /mosquitto/data/

# Log settings
log_dest file /mosquitto/log/mosquitto.log
log_type all

# Authentication (recommended for production)
allow_anonymous true
# For authenticated access, uncomment below and create password file:
# allow_anonymous false
# password_file /mosquitto/config/passwd
EOF
```

Start the Home Assistant stack.

```bash
# Navigate to the homeassistant directory
cd ~/homeassistant

# Start all services in detached mode
docker compose up -d

# View logs to monitor startup
docker compose logs -f homeassistant

# Check status of all containers
docker compose ps
```

## Initial Configuration

After installation, Home Assistant is accessible at `http://your-server-ip:8123`. The first-time setup wizard guides you through creating an account and basic configuration.

### Onboarding Steps

1. Create your administrator account with a strong password
2. Name your home and set the location (used for sun-based automations)
3. Select your timezone and unit system
4. Allow Home Assistant to discover devices on your network
5. Review automatically detected integrations

### Configuration File Structure

Home Assistant stores configuration in YAML files. Understanding the structure helps with advanced customization.

```yaml
# configuration.yaml - Main configuration file
# Located at /config/configuration.yaml (Docker) or ~/.homeassistant/configuration.yaml (Core)

homeassistant:
  # Name of the location where Home Assistant is running
  name: Home
  # Location required for elevation, time zone, and sun calculations
  latitude: 40.7128
  longitude: -74.0060
  # Elevation in meters - affects sunrise/sunset calculations
  elevation: 10
  # Unit system: metric or imperial
  unit_system: metric
  # Time zone from tz database
  time_zone: America/New_York
  # Currency for energy dashboard
  currency: USD

# Enable the default set of integrations
default_config:

# Text-to-speech configuration
tts:
  - platform: google_translate

# Split configuration into multiple files for organization
automation: !include automations.yaml
script: !include scripts.yaml
scene: !include scenes.yaml

# Custom sensor configurations
sensor: !include_dir_merge_list sensors/

# Logger configuration for debugging
logger:
  default: info
  logs:
    homeassistant.components.zwave_js: debug
    custom_components.hacs: debug
```

Validate your configuration before restarting.

```bash
# For Docker installations
docker exec homeassistant hass --script check_config -c /config

# For Core installations
sudo -u homeassistant /srv/homeassistant/bin/hass --script check_config
```

## Integrations Setup

Integrations connect Home Assistant to devices and services. Most can be added through the UI, but some require YAML configuration.

### Adding Integrations via UI

Navigate to Settings, then Devices & Services, then Add Integration. Search for your device or service and follow the setup wizard.

### MQTT Integration

MQTT is essential for many DIY devices and commercial IoT products. Configure it to use the Mosquitto broker from our Docker Compose setup.

```yaml
# Add to configuration.yaml for MQTT
mqtt:
  broker: localhost
  port: 1883
  # Uncomment for authenticated broker
  # username: homeassistant
  # password: your-mqtt-password
  discovery: true
  discovery_prefix: homeassistant
```

### Philips Hue Integration

Philips Hue is automatically discovered. Press the button on your Hue Bridge when prompted.

### Google Cast Integration

Chromecast devices are auto-discovered. Add the integration to control media playback and use speakers for TTS announcements.

### Weather Integration

Add weather data for automations based on conditions.

```yaml
# Add weather integration to configuration.yaml
weather:
  - platform: openweathermap
    api_key: your-openweathermap-api-key
```

## Automations and Scripts

Automations are the heart of a smart home. They respond to triggers, evaluate conditions, and execute actions.

### Creating Automations via UI

Navigate to Settings, then Automations & Scenes, then Create Automation. The visual editor makes building automations intuitive.

### YAML Automation Examples

Complex automations are often easier to write in YAML. Create an `automations.yaml` file for your custom automations.

```yaml
# automations.yaml
# Motion-activated lights with time and illuminance conditions
- id: 'motion_lights_living_room'
  alias: 'Living Room Motion Lights'
  description: 'Turn on lights when motion is detected and it is dark'
  trigger:
    # Trigger when motion sensor state changes to on
    - platform: state
      entity_id: binary_sensor.living_room_motion
      to: 'on'
  condition:
    # Only run when all conditions are met
    - condition: and
      conditions:
        # Check if it's dark based on sun position
        - condition: state
          entity_id: sun.sun
          state: 'below_horizon'
        # Verify lights are currently off (prevent re-triggering)
        - condition: state
          entity_id: light.living_room
          state: 'off'
        # Optional: check illuminance sensor
        - condition: numeric_state
          entity_id: sensor.living_room_illuminance
          below: 50
  action:
    # Turn on the lights with specific settings
    - service: light.turn_on
      target:
        entity_id: light.living_room
      data:
        brightness_pct: 80
        transition: 2
    # Set a timer to turn off lights after no motion
    - delay:
        minutes: 10
    # Check if motion still detected before turning off
    - condition: state
      entity_id: binary_sensor.living_room_motion
      state: 'off'
    - service: light.turn_off
      target:
        entity_id: light.living_room
      data:
        transition: 5
  mode: restart

# Presence-based thermostat control
- id: 'presence_thermostat'
  alias: 'Adjust Thermostat Based on Presence'
  description: 'Set eco mode when nobody is home'
  trigger:
    # Trigger when the home zone occupancy changes
    - platform: state
      entity_id: zone.home
  action:
    - choose:
        # If someone is home
        - conditions:
            - condition: numeric_state
              entity_id: zone.home
              above: 0
          sequence:
            - service: climate.set_preset_mode
              target:
                entity_id: climate.thermostat
              data:
                preset_mode: home
        # If nobody is home
        - conditions:
            - condition: numeric_state
              entity_id: zone.home
              below: 1
          sequence:
            - service: climate.set_preset_mode
              target:
                entity_id: climate.thermostat
              data:
                preset_mode: eco

# Morning routine automation
- id: 'morning_routine'
  alias: 'Morning Routine'
  description: 'Gradually wake up with lights and coffee'
  trigger:
    - platform: time
      at: '06:30:00'
  condition:
    # Only on weekdays
    - condition: time
      weekday:
        - mon
        - tue
        - wed
        - thu
        - fri
  action:
    # Gradually brighten bedroom lights over 15 minutes
    - service: light.turn_on
      target:
        entity_id: light.bedroom
      data:
        brightness_pct: 10
        color_temp: 500
    - delay:
        minutes: 5
    - service: light.turn_on
      target:
        entity_id: light.bedroom
      data:
        brightness_pct: 50
        color_temp: 370
        transition: 300
    # Start the coffee maker
    - service: switch.turn_on
      target:
        entity_id: switch.coffee_maker
    # Announce weather forecast
    - delay:
        minutes: 10
    - service: tts.speak
      target:
        entity_id: tts.google_en
      data:
        message: "Good morning! Today's forecast is {{ states('weather.home') }} with a high of {{ state_attr('weather.home', 'temperature') }} degrees."
        media_player_entity_id: media_player.bedroom_speaker
```

### Scripts

Scripts are reusable sequences of actions that can be called from automations or manually.

```yaml
# scripts.yaml
# Script to set the home to movie mode
movie_mode:
  alias: 'Movie Mode'
  description: 'Dim lights, close blinds, and set TV input'
  sequence:
    # Dim living room lights to 20%
    - service: light.turn_on
      target:
        entity_id: light.living_room
      data:
        brightness_pct: 20
        transition: 3
    # Close the blinds
    - service: cover.close_cover
      target:
        entity_id: cover.living_room_blinds
    # Set TV to correct input
    - service: media_player.select_source
      target:
        entity_id: media_player.living_room_tv
      data:
        source: 'HDMI 1'
  mode: single
  icon: mdi:movie

# Script to announce a message throughout the house
announce_message:
  alias: 'Announce Message'
  description: 'Play TTS message on all speakers'
  fields:
    message:
      description: 'The message to announce'
      example: 'Dinner is ready!'
  sequence:
    - service: tts.speak
      target:
        entity_id: tts.google_en
      data:
        message: "{{ message }}"
        media_player_entity_id:
          - media_player.living_room_speaker
          - media_player.kitchen_speaker
          - media_player.bedroom_speaker
  mode: queued
  max: 5
```

## Dashboard Customization

Home Assistant's Lovelace dashboard system provides flexible UI customization.

### Creating Custom Dashboards

Navigate to Overview, then click the three dots menu and select Edit Dashboard. Switch to YAML mode for advanced customization.

```yaml
# Dashboard configuration in YAML mode
# Access via Overview -> Edit Dashboard -> Raw Configuration Editor

title: Smart Home
views:
  # Main overview tab
  - title: Home
    path: home
    icon: mdi:home
    badges:
      # Show quick status badges at the top
      - entity: person.john
      - entity: person.jane
      - entity: alarm_control_panel.home_alarm
    cards:
      # Weather card
      - type: weather-forecast
        entity: weather.home
        show_forecast: true

      # Horizontal stack for quick controls
      - type: horizontal-stack
        cards:
          - type: button
            name: All Lights Off
            icon: mdi:lightbulb-off
            tap_action:
              action: call-service
              service: light.turn_off
              target:
                entity_id: all
          - type: button
            name: Movie Mode
            icon: mdi:movie
            tap_action:
              action: call-service
              service: script.movie_mode

      # Entity card for common controls
      - type: entities
        title: Living Room
        entities:
          - entity: light.living_room
            name: Main Lights
          - entity: light.living_room_lamp
            name: Floor Lamp
          - entity: climate.living_room
            name: Thermostat
          - entity: media_player.living_room_tv
            name: TV

      # Glance card for sensors
      - type: glance
        title: Sensors
        entities:
          - entity: sensor.living_room_temperature
            name: Temperature
          - entity: sensor.living_room_humidity
            name: Humidity
          - entity: sensor.electricity_usage
            name: Power

  # Security tab
  - title: Security
    path: security
    icon: mdi:shield-home
    cards:
      - type: alarm-panel
        entity: alarm_control_panel.home_alarm
        states:
          - arm_home
          - arm_away
          - arm_night

      # Camera feed grid
      - type: grid
        columns: 2
        cards:
          - type: picture-entity
            entity: camera.front_door
            camera_view: live
          - type: picture-entity
            entity: camera.backyard
            camera_view: live
          - type: picture-entity
            entity: camera.garage
            camera_view: live
          - type: picture-entity
            entity: camera.driveway
            camera_view: live

      # Door and window sensors
      - type: entities
        title: Entry Points
        entities:
          - entity: binary_sensor.front_door
            name: Front Door
            icon: mdi:door
          - entity: binary_sensor.back_door
            name: Back Door
            icon: mdi:door
          - entity: binary_sensor.garage_door
            name: Garage Door
            icon: mdi:garage

  # Energy tab
  - title: Energy
    path: energy
    icon: mdi:flash
    cards:
      - type: energy-distribution
        link_dashboard: true

      - type: gauge
        entity: sensor.electricity_usage
        name: Current Usage
        min: 0
        max: 5000
        severity:
          green: 0
          yellow: 2000
          red: 4000

      - type: history-graph
        title: Power Usage (24h)
        hours_to_show: 24
        entities:
          - entity: sensor.electricity_usage
```

### Installing HACS for Custom Components

HACS (Home Assistant Community Store) provides access to thousands of custom integrations, themes, and frontend components.

```bash
# Download and run the HACS installation script
# For Docker/Supervised installations:
docker exec -it homeassistant bash -c "wget -O - https://get.hacs.xyz | bash -"

# For Core installations:
wget -O - https://get.hacs.xyz | bash -

# Restart Home Assistant after installation
docker restart homeassistant
```

After restart, add HACS through Settings, then Devices & Services. You'll need a GitHub account for authentication.

## HTTPS and Remote Access

Securing your Home Assistant installation is critical before exposing it to the internet.

### Option 1: Cloudflare Tunnel (Recommended)

Cloudflare Tunnel provides secure remote access without opening ports on your firewall.

```yaml
# Add Cloudflare integration to configuration.yaml
http:
  use_x_forwarded_for: true
  trusted_proxies:
    - 172.30.33.0/24
```

Install and configure cloudflared.

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Authenticate with Cloudflare
cloudflared tunnel login

# Create a tunnel
cloudflared tunnel create homeassistant

# Configure the tunnel
mkdir -p ~/.cloudflared

cat > ~/.cloudflared/config.yml <<EOF
tunnel: YOUR_TUNNEL_ID
credentials-file: /home/$USER/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: homeassistant.yourdomain.com
    service: http://localhost:8123
  - service: http_status:404
EOF

# Run the tunnel
cloudflared tunnel run homeassistant

# Install as a service for automatic startup
sudo cloudflared service install
```

### Option 2: Let's Encrypt with NGINX

For users who prefer traditional SSL termination, use NGINX as a reverse proxy with Let's Encrypt certificates.

```bash
# Install NGINX and Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Create NGINX configuration for Home Assistant
sudo tee /etc/nginx/sites-available/homeassistant <<EOF
server {
    listen 80;
    server_name homeassistant.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8123;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # WebSocket support for real-time updates
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/homeassistant /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Obtain SSL certificate
sudo certbot --nginx -d homeassistant.yourdomain.com
```

Update Home Assistant configuration for the reverse proxy.

```yaml
# Add to configuration.yaml
http:
  use_x_forwarded_for: true
  trusted_proxies:
    - 127.0.0.1
    - ::1
```

### Option 3: Nabu Casa (Easiest)

Nabu Casa is Home Assistant's official cloud service. For $6.50/month, you get:
- Secure remote access without configuration
- Alexa and Google Assistant integration
- Support for Home Assistant development

Enable it through Settings, then Home Assistant Cloud.

## Add-ons Installation

Add-ons are available in Supervised and Home Assistant OS installations. They provide containerized services managed through the Supervisor.

### Installing Add-ons

Navigate to Settings, then Add-ons, then Add-on Store. Popular add-ons include:

**Essential Add-ons:**
- **File Editor**: Edit configuration files directly in the browser
- **Terminal & SSH**: Command-line access to your installation
- **Samba Share**: Access config files from Windows/macOS
- **Let's Encrypt**: Automated SSL certificate management

**Integration Add-ons:**
- **Mosquitto Broker**: MQTT broker for IoT devices
- **Z-Wave JS**: Z-Wave device management
- **Zigbee2MQTT**: Zigbee device management alternative to ZHA
- **Node-RED**: Visual flow-based automation

**Monitoring Add-ons:**
- **InfluxDB**: Time-series database for history
- **Grafana**: Advanced dashboards and visualization
- **Glances**: System monitoring

### Configuring File Editor Add-on

After installing the File Editor add-on, access it from the sidebar to edit configuration files directly.

```yaml
# Example: Adding File Editor to sidebar
# No configuration needed - appears automatically after installation
```

### Setting Up Node-RED

Node-RED provides visual flow-based programming for complex automations.

Install the Node-RED add-on from the Add-on Store. Configure credential secret in the add-on options.

```yaml
# Node-RED add-on configuration
credential_secret: your-secure-secret
http_node:
  username: admin
  password: your-password
```

After starting Node-RED, install the Home Assistant nodes palette: `node-red-contrib-home-assistant-websocket`.

## Backup Strategies

Regular backups protect your configuration, automations, and device history from data loss.

### Automatic Backups (Supervised/OS)

Enable automatic backups through Settings, then System, then Backups.

```yaml
# Example backup automation (for any installation type)
# Add to automations.yaml
- id: 'weekly_backup'
  alias: 'Weekly Backup Reminder'
  trigger:
    - platform: time
      at: '03:00:00'
  condition:
    - condition: time
      weekday:
        - sun
  action:
    - service: backup.create
      data:
        name: "weekly_backup_{{ now().strftime('%Y%m%d') }}"
```

### Manual Backup Script (Docker)

For Docker installations, create a backup script that preserves the entire config directory.

```bash
#!/bin/bash
# backup-homeassistant.sh
# Run with: ./backup-homeassistant.sh

# Configuration
BACKUP_DIR="/backup/homeassistant"
HA_CONFIG="/home/$USER/homeassistant/config"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Stop Home Assistant for consistent backup (optional but recommended)
echo "Stopping Home Assistant..."
docker stop homeassistant

# Create compressed backup
echo "Creating backup..."
tar -czf "$BACKUP_DIR/homeassistant_backup_$DATE.tar.gz" -C "$(dirname $HA_CONFIG)" "$(basename $HA_CONFIG)"

# Start Home Assistant
echo "Starting Home Assistant..."
docker start homeassistant

# Remove old backups
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "homeassistant_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Verify backup
BACKUP_SIZE=$(du -h "$BACKUP_DIR/homeassistant_backup_$DATE.tar.gz" | cut -f1)
echo "Backup complete: homeassistant_backup_$DATE.tar.gz ($BACKUP_SIZE)"
```

Schedule the backup script with cron.

```bash
# Add to crontab with: crontab -e
# Run backup every day at 3 AM
0 3 * * * /home/user/backup-homeassistant.sh >> /var/log/homeassistant-backup.log 2>&1
```

### Off-site Backup with rclone

Send backups to cloud storage for disaster recovery.

```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure a remote (interactive setup)
rclone config

# Sync backups to cloud storage
rclone sync /backup/homeassistant remote:homeassistant-backups --progress

# Add to the backup script or schedule separately
```

## Z-Wave and Zigbee Integration

Z-Wave and Zigbee are popular wireless protocols for smart home devices.

### Z-Wave JS Setup

Z-Wave JS is the modern, recommended method for Z-Wave integration.

Connect your Z-Wave USB stick and identify the device path.

```bash
# List USB devices to find your Z-Wave stick
ls -la /dev/serial/by-id/

# Common paths:
# /dev/ttyUSB0 - Generic USB serial
# /dev/ttyACM0 - USB ACM device
# /dev/serial/by-id/usb-Silicon_Labs_... - Specific device path (preferred)
```

For Docker installations, add the device to your compose file (already included in the example above). Then add the Z-Wave JS integration through Settings, then Devices & Services.

For Supervised installations, install the Z-Wave JS add-on from the Add-on Store and configure the device path.

```yaml
# Z-Wave JS add-on configuration
device: /dev/serial/by-id/usb-Silicon_Labs_CP2102_USB_to_UART-if00-port0
network_key: "YOUR_NETWORK_KEY_HERE"
```

### Zigbee Setup with ZHA

ZHA (Zigbee Home Automation) is the native Zigbee integration.

Connect your Zigbee coordinator and add the ZHA integration through the UI.

Supported coordinators include:
- ConBee II / ConBee III
- Sonoff Zigbee 3.0 USB Dongle Plus
- HUSBZB-1 (combined Z-Wave/Zigbee)
- TubeZB coordinators

```yaml
# No YAML configuration needed for ZHA
# Add through Settings -> Devices & Services -> Add Integration -> ZHA
```

### Alternative: Zigbee2MQTT

Zigbee2MQTT provides more flexibility and device support than ZHA.

For Docker installations, add Zigbee2MQTT to your compose file.

```yaml
# Add to docker-compose.yml
  zigbee2mqtt:
    container_name: zigbee2mqtt
    image: koenkk/zigbee2mqtt
    volumes:
      - ./zigbee2mqtt/data:/app/data
      - /run/udev:/run/udev:ro
    ports:
      - "8080:8080"
    environment:
      - TZ=America/New_York
    devices:
      # Use your specific device path
      - /dev/serial/by-id/usb-Silicon_Labs_Sonoff_Zigbee-if00-port0:/dev/ttyACM0
    restart: unless-stopped
    depends_on:
      - mosquitto
```

Create the Zigbee2MQTT configuration.

```yaml
# zigbee2mqtt/data/configuration.yaml
homeassistant: true
permit_join: false
mqtt:
  base_topic: zigbee2mqtt
  server: mqtt://mosquitto:1883
serial:
  port: /dev/ttyACM0
frontend:
  port: 8080
advanced:
  network_key: GENERATE
  log_level: info
  log_output:
    - console
  homeassistant_legacy_entity_attributes: false
  legacy_api: false
  legacy_availability_payload: false
device_options:
  legacy: false
```

## Troubleshooting

Common issues and their solutions.

### Home Assistant Won't Start

Check the logs for error messages.

```bash
# Docker logs
docker logs homeassistant --tail 100

# Core installation logs
sudo journalctl -u home-assistant@homeassistant -n 100

# Check configuration syntax
docker exec homeassistant hass --script check_config -c /config
```

### Integration Not Loading

Enable debug logging for the specific integration.

```yaml
# Add to configuration.yaml
logger:
  default: warning
  logs:
    homeassistant.components.YOUR_INTEGRATION: debug
```

### Database Issues

Home Assistant uses SQLite by default. Large databases can cause slowdowns.

```bash
# Check database size
ls -lh /config/home-assistant_v2.db

# Purge old history (run in Developer Tools -> Services)
# Service: recorder.purge
# Data: {"keep_days": 7, "repack": true}
```

Consider switching to MariaDB or PostgreSQL for better performance.

```yaml
# MariaDB recorder configuration
recorder:
  db_url: mysql://homeassistant:password@localhost/homeassistant?charset=utf8mb4
  purge_keep_days: 14
  commit_interval: 1
```

### USB Device Not Detected

Ensure proper permissions and device mapping.

```bash
# Check if device exists
ls -la /dev/ttyUSB* /dev/ttyACM*

# Check device permissions
stat /dev/ttyUSB0

# Add user to dialout group (logout/login required)
sudo usermod -aG dialout $USER

# For Docker, ensure privileged mode or specific device mapping
```

### Memory Issues

Monitor memory usage and optimize configuration.

```bash
# Check memory usage
docker stats homeassistant

# Reduce history retention
# Add to configuration.yaml
recorder:
  purge_keep_days: 7
  exclude:
    entity_globs:
      - sensor.weather_*_hourly
    domains:
      - automation
      - script
```

### Network Discovery Not Working

Ensure Home Assistant has proper network access.

```bash
# For Docker, use host network mode (already in our compose file)
network_mode: host

# Verify multicast/broadcast is working
docker exec homeassistant ping -c 3 224.0.0.1
```

### Automation Not Triggering

Debug automations using trace functionality in the UI or add debug actions.

```yaml
# Add logging action to debug automation flow
- service: system_log.write
  data:
    message: "Automation triggered: {{ trigger.entity_id }} changed to {{ trigger.to_state.state }}"
    level: warning
```

---

Home Assistant transforms a collection of smart devices into a cohesive, automated home. Whether you choose Docker for flexibility or Supervised for the full add-on experience, Ubuntu provides a rock-solid foundation. Start with the basics, add integrations as needed, and gradually build automations that make your home truly smart.

For monitoring the health of your Home Assistant server and the services it depends on, consider using **OneUptime**. OneUptime provides comprehensive uptime monitoring, alerting, and incident management that ensures you're immediately notified if your smart home infrastructure experiences issues. With features like synthetic monitoring, status pages, and on-call scheduling, OneUptime helps you maintain the reliability your connected home deserves. Learn more at [oneuptime.com](https://oneuptime.com).
