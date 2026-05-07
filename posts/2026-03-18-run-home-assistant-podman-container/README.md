# How to Run Home Assistant in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Home Assistant, Podman, Container, Smart Home, IoT, Linux, Automation

Description: Deploy Home Assistant Core inside a Podman container to manage your smart home devices, with persistent configuration, host network access, and automatic restarts.

---

> Home Assistant turns a simple Linux server into a powerful smart home hub. Running it in a Podman container keeps your host system clean while giving you full control over upgrades and configuration.

Home Assistant is the leading open-source platform for home automation. It supports thousands of devices and integrations, from Zigbee sensors to cloud-connected thermostats. Running Home Assistant Core inside a Podman container is a lightweight alternative to a full Home Assistant OS installation. You get the same automation engine and web interface without dedicating an entire machine to it. This guide covers installation, configuration, device access, and long-term maintenance.

---

## Prerequisites

- A Linux host with Podman installed (with cgroup v2 if you plan to use the Quadlet systemd service).
- At least 2 GB of free RAM and 1 GB of disk space.
- Network access to your smart home devices (same subnet recommended).
- Optional: USB devices such as Zigbee/Z-Wave dongles if you use those protocols.

---

## Step 1: Create a Configuration Directory

Home Assistant stores all its configuration, automations, and database files in a single directory. Create this on the host so your data persists across container restarts:

```bash
# Create a directory for Home Assistant configuration

mkdir -p ~/homeassistant/config

# Set appropriate ownership (use your UID and GID)
# Home Assistant runs as root inside the container by default
chown -R $USER:$USER ~/homeassistant/config
```

---

## Step 2: Run the Home Assistant Container

The official Home Assistant container image is available on GitHub Container Registry. For device discovery and local network integrations to work correctly, use host networking:

```bash
# Run Home Assistant with host networking for full device discovery
podman run -d \
  --name homeassistant \
  --network host \
  --privileged \
  -v ~/homeassistant/config:/config:Z \
  -v /run/dbus:/run/dbus:ro \
  -e TZ=America/New_York \
  --restart unless-stopped \
  ghcr.io/home-assistant/home-assistant:stable
```

Key flags explained:

| Flag | Purpose |
|------|---------|
| `--network host` | Uses the host network stack directly, required for mDNS/SSDP device discovery |
| `--privileged` | Grants full device access (needed for USB dongles and Bluetooth) |
| `-v ~/homeassistant/config:/config:Z` | Persists all configuration and database files |
| `-v /run/dbus:/run/dbus:ro` | Provides D-Bus access for Bluetooth integrations |
| `-e TZ=America/New_York` | Sets the timezone for automations and logs |

---

## Step 3: Access the Web Interface

After the container starts, Home Assistant needs a minute or two to initialize. Then open your browser and navigate to the setup wizard:

```text
http://<your-host-ip>:8123
```

On first launch you will:

1. Create an owner account (username and password).
2. Set your home location (used for sunrise/sunset automations).
3. Choose which discovered integrations to configure.

---

## Step 4: Access USB Devices (Zigbee/Z-Wave)

If you use a USB coordinator for Zigbee or Z-Wave, pass the device through to the container. First, identify the device path:

```bash
# List USB devices to find your dongle
ls -la /dev/ttyUSB*
ls -la /dev/ttyACM*

# Example output:
# crw-rw---- 1 root dialout 188, 0 Mar 18 10:00 /dev/ttyUSB0
```

Then run the container with the device mapped:

```bash
# Run with a specific USB device passed through
podman run -d \
  --name homeassistant \
  --network host \
  --privileged \
  -v ~/homeassistant/config:/config:Z \
  -v /run/dbus:/run/dbus:ro \
  --device /dev/ttyUSB0:/dev/ttyUSB0 \
  -e TZ=America/New_York \
  --restart unless-stopped \
  ghcr.io/home-assistant/home-assistant:stable
```

The `--device` flag maps the host USB device into the container at the same path. If you have multiple USB devices, add multiple `--device` flags.

---

## Step 5: Configure Automations

Home Assistant configuration lives in YAML files inside the config directory. Here is an example automation that turns on a light at sunset:

```yaml
# ~/homeassistant/config/automations.yaml
# This automation triggers at sunset and turns on the porch light

- id: "sunset_porch_light"
  alias: "Turn on porch light at sunset"
  description: "Automatically turns on the porch light when the sun sets"
  triggers:
    - trigger: sun
      event: sunset
      offset: "-00:15:00"  # 15 minutes before sunset
  conditions:
    - condition: state
      entity_id: binary_sensor.porch_motion
      state: "off"  # Only if no motion detected (light might already be on)
  actions:
    - action: light.turn_on
      target:
        entity_id: light.porch
      data:
        brightness_pct: 80
        color_temp_kelvin: 2700  # Warm white
```

After editing YAML files, reload the configuration from the web UI or restart the container:

```bash
# Restart Home Assistant to apply configuration changes
podman restart homeassistant
```

---

## Step 6: Check Logs and Troubleshoot

When things do not work as expected, the logs are your first stop:

```bash
# View the most recent container logs
podman logs --tail 100 homeassistant

# Follow logs in real time (press Ctrl+C to stop)
podman logs -f homeassistant

# Check Home Assistant core logs specifically
cat ~/homeassistant/config/home-assistant.log | tail -50
```

Common issues and solutions:

| Problem | Solution |
|---------|----------|
| Devices not discovered | Ensure `--network host` is set |
| USB dongle not found | Check `--device` mapping and permissions |
| Integrations failing | Check `home-assistant.log` for error details |
| Slow startup | First boot takes longer; subsequent starts are faster |

---

## Updating Home Assistant

When a new version is released, updating is straightforward:

```bash
# Pull the latest stable image
podman pull ghcr.io/home-assistant/home-assistant:stable

# Stop and remove the current container
podman stop homeassistant
podman rm homeassistant

# Start a new container with the same configuration
podman run -d \
  --name homeassistant \
  --network host \
  --privileged \
  -v ~/homeassistant/config:/config:Z \
  -v /run/dbus:/run/dbus:ro \
  -e TZ=America/New_York \
  --restart unless-stopped \
  ghcr.io/home-assistant/home-assistant:stable
```

Always back up your config directory before updating:

```bash
# Create a timestamped backup before upgrading
tar czf ~/homeassistant-backup-$(date +%Y%m%d).tar.gz ~/homeassistant/config/
```

---

## Running as a Systemd Service

For automatic startup on boot:

```bash
# Create a Quadlet unit file
sudo mkdir -p /etc/containers/systemd
sudo tee /etc/containers/systemd/homeassistant.container >/dev/null <<'EOF'
[Unit]
Description=Home Assistant container

[Container]
ContainerName=homeassistant
Image=ghcr.io/home-assistant/home-assistant:stable
Network=host
PodmanArgs=--privileged
Volume=/home/your-user/homeassistant/config:/config:Z
Volume=/run/dbus:/run/dbus:ro
Environment=TZ=America/New_York

[Service]
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Replace /home/your-user with your actual home directory, then enable the service
sudo systemctl daemon-reload
sudo systemctl enable --now homeassistant.service
```

---

## Conclusion

Running Home Assistant Core in a Podman container provides a clean, maintainable smart home platform. Your configuration files live on the host filesystem where they can be version-controlled and backed up. Host networking ensures device discovery works seamlessly, and systemd integration guarantees your smart home hub starts automatically after a reboot. When a new version comes out, updating is as simple as pulling a new image and recreating the container.
