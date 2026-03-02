# How to Set Up LoRaWAN Gateway on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LoRaWAN, IoT, Networking, ChirpStack

Description: A complete guide to setting up a LoRaWAN gateway on Ubuntu using ChirpStack, configuring the packet forwarder, and managing end devices on your private LoRaWAN network.

---

LoRaWAN (Long Range Wide Area Network) is a low-power wide-area networking protocol designed for IoT devices that need to send small amounts of data over long distances - kilometers in open areas, hundreds of meters in urban environments. It's used for smart meters, environmental sensors, asset tracking, and agricultural monitoring.

Setting up your own LoRaWAN network involves two main components:
- **Gateway**: receives radio transmissions from LoRaWAN end devices and forwards them to the network server
- **Network Server**: handles device authentication, deduplication, and routes data to your application

This guide covers running ChirpStack (an open-source LoRaWAN network server) on Ubuntu, with a software-defined radio approach for the gateway or a physical LoRaWAN gateway.

## Architecture Overview

```
[LoRa End Devices] --> [LoRaWAN Gateway] --> [ChirpStack Network Server (Ubuntu)]
                                                         |
                                                   [Your Application]
                                                    via MQTT / REST
```

The gateway runs a packet forwarder that communicates with ChirpStack via UDP (port 1700) or the Basics Station protocol.

## Prerequisites

- Ubuntu 20.04 or 22.04 server
- A LoRaWAN gateway (hardware) OR a software-defined radio setup
- sudo privileges

## Installing ChirpStack

ChirpStack provides an APT repository:

```bash
# Add ChirpStack repository
sudo apt-get install -y apt-transport-https dirmngr
sudo gpg --dearmor -o /usr/share/keyrings/chirpstack-archive-keyring.gpg < \
  <(wget -qO - https://artifacts.chirpstack.io/downloads/chirpstack/chirpstack.gpg)

echo "deb [signed-by=/usr/share/keyrings/chirpstack-archive-keyring.gpg] \
  https://artifacts.chirpstack.io/downloads/chirpstack/apt stable main" | \
  sudo tee /etc/apt/sources.list.d/chirpstack.list

sudo apt-get update
```

### Install Dependencies

ChirpStack requires PostgreSQL, Redis, and Mosquitto (MQTT broker):

```bash
# Install PostgreSQL
sudo apt-get install -y postgresql

# Install Redis
sudo apt-get install -y redis-server

# Install Mosquitto MQTT broker
sudo apt-get install -y mosquitto

# Enable services
sudo systemctl enable --now postgresql redis-server mosquitto
```

### Configure PostgreSQL

```bash
# Create ChirpStack database and user
sudo -u postgres psql << 'SQL'
CREATE ROLE chirpstack WITH LOGIN PASSWORD 'your-strong-password';
CREATE DATABASE chirpstack WITH OWNER chirpstack;
\c chirpstack
CREATE EXTENSION IF NOT EXISTS hstore;
\q
SQL
```

### Install ChirpStack

```bash
sudo apt-get install -y chirpstack
```

### Configure ChirpStack

```toml
# /etc/chirpstack/chirpstack.toml

[logging]
  level = "info"

[postgresql]
  dsn = "postgresql://chirpstack:your-strong-password@localhost/chirpstack?sslmode=disable"

[redis]
  servers = ["redis://localhost:6379"]

[network]
  # Must match your LoRaWAN region
  # Options: us915_0, eu868, au915_0, as923, as923_2, as923_3, as923_4, cn779, cn470, in865, kr920, ru864
  net_id = "000000"
  enabled_regions = [
    "eu868",
  ]

[api]
  # ChirpStack gRPC API (used by the UI and CLI)
  bind = "0.0.0.0:8080"
  secret = "your-secret-for-jwt-tokens"

[integration]
  # Publish device data to MQTT
  enabled = ["mqtt"]

  [integration.mqtt]
    server = "tcp://localhost:1883"
    json = true  # Publish as JSON (easier to consume)
```

```bash
sudo systemctl enable --now chirpstack
sudo journalctl -u chirpstack -f
```

The ChirpStack web UI is available at `http://your-server:8080`.

Default credentials: `admin` / `admin` (change immediately).

## Installing ChirpStack Gateway Bridge

The Gateway Bridge translates between the gateway's packet forwarder protocol (UDP) and MQTT for ChirpStack:

```bash
sudo apt-get install -y chirpstack-gateway-bridge
```

Configure it:

```toml
# /etc/chirpstack-gateway-bridge/chirpstack-gateway-bridge.toml

[integration.mqtt]
  # Connect to local Mosquitto
  server = "tcp://localhost:1883"

  # Topic prefix - must match ChirpStack's gateway configuration
  topic_prefix = "eu868/gateway"

[backend.semtech_udp]
  # Listen for connections from the packet forwarder
  # Gateways will forward packets to this IP:port
  udp_bind = "0.0.0.0:1700"
```

```bash
sudo systemctl enable --now chirpstack-gateway-bridge
```

## Configuring the Physical Gateway

If you have a physical LoRaWAN gateway (such as RAK7258, Dragino LPS8, or Multitech Conduit), configure it to point its packet forwarder at your Ubuntu server:

1. Log into the gateway's web interface
2. Navigate to Packet Forwarder settings
3. Set the **Server Address** to your Ubuntu server's IP address
4. Set **Port Up** and **Port Down** to `1700`
5. Set the **Gateway EUI** (usually the hardware MAC-based EUI64)
6. Save and restart the packet forwarder

## Software-Defined Radio Gateway (RTL-SDR)

For testing without a physical LoRaWAN gateway, you can use an RTL-SDR dongle and software demodulation:

```bash
# Install RTL-SDR tools
sudo apt-get install -y rtl-sdr

# Check if the RTL-SDR is detected
rtl_test

# Install ttn-lw-cli for The Things Network integration (alternative)
# For a software gateway, use lorasim or similar tools

# Install chirpstack-concentratord for supported SDR hardware
# This is more practical with SX1301-based hardware like the RAK2245 HAT
```

For the RAK2245 Pi HAT (SX1302 chipset) connected to a Raspberry Pi running Ubuntu:

```bash
# Install chirpstack-concentratord
sudo apt-get install -y chirpstack-concentratord

# Configure for your region and hardware
# Config file: /etc/chirpstack-concentratord/chirpstack-concentratord.toml
```

## Registering the Gateway in ChirpStack

1. Open the ChirpStack web UI at `http://your-server:8080`
2. Go to **Gateways** > **Add gateway**
3. Enter the **Gateway EUI** (from your physical gateway or software configuration)
4. Set the name and description
5. Select the **Region** (must match your hardware and local regulations - EU868, US915, etc.)
6. Click **Submit**

## Setting Up a Region Profile

In ChirpStack, configure a network region:

1. Go to **Network > Regions**
2. The regions you enabled in `chirpstack.toml` appear here
3. Click on the region to configure channels if your area uses non-standard channel plans

## Creating a Device Profile

Device profiles define the LoRaWAN parameters for a class of devices:

1. **Device Profiles** > **Add device profile**
2. Configure:
   - **Name**: "Temp Sensor v1.0"
   - **MAC version**: LoRaWAN 1.0.3 (check your device spec sheet)
   - **Regional parameters revision**: RP002-1.0.3
   - **ADR algorithm**: Default (recommended for most use cases)
   - **Join type**: OTAA (recommended) or ABP

## Registering End Devices

1. **Applications** > **Add application** > Create "Environment Monitoring"
2. Inside the application, **Add device**
3. Enter:
   - **Device name**: "sensor-001"
   - **Device EUI**: (from device label or manufacturer documentation)
   - **Device profile**: Select the profile you created
4. After creating the device, go to **OTAA keys** and enter the **Application Key** (also from device documentation or generated)

## Receiving Device Data

Once devices join the network and transmit data, it appears in ChirpStack and also on MQTT:

```bash
# Subscribe to all device uplink data
mosquitto_sub -h localhost -t "eu868/gateway/+/event/up" -v

# Subscribe to decoded device data
mosquitto_sub -h localhost -t "application/+/device/+/event/up" -v

# The payload is base64-encoded LoRaWAN payload
# You need a codec to decode it (configurable per device profile)
```

## Adding a Payload Codec

In the device profile, add a JavaScript codec to decode the raw bytes:

```javascript
// Example codec for a temperature/humidity sensor
// that sends 2 bytes for temperature (value * 10) and 2 bytes for humidity

function decodeUplink(input) {
    var bytes = input.bytes;

    // Parse temperature (first 2 bytes, big-endian, divide by 10)
    var temp = ((bytes[0] << 8) | bytes[1]) / 10.0;

    // Parse humidity (next 2 bytes)
    var hum = ((bytes[2] << 8) | bytes[3]) / 10.0;

    return {
        data: {
            temperature: temp,
            humidity: hum
        },
        warnings: [],
        errors: []
    };
}
```

## Integrating with Your Application

ChirpStack publishes decoded device data to MQTT. Subscribe to it from your application:

```python
#!/usr/bin/env python3
# Subscribe to ChirpStack MQTT and process sensor data
import paho.mqtt.client as mqtt
import json
import base64

def on_connect(client, userdata, flags, rc):
    print("Connected to MQTT broker")
    # Subscribe to all application device uplinks
    client.subscribe("application/+/device/+/event/up")

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode('utf-8'))

        # Device information
        dev_eui = payload.get('deviceInfo', {}).get('devEui', 'unknown')

        # Decoded object (if codec is configured)
        obj = payload.get('object', {})

        if obj:
            print(f"Device {dev_eui}:")
            print(f"  Temperature: {obj.get('temperature', 'N/A')}°C")
            print(f"  Humidity: {obj.get('humidity', 'N/A')}%")

        # Raw payload if no codec
        data_b64 = payload.get('data', '')
        if data_b64:
            raw = base64.b64decode(data_b64)
            print(f"  Raw bytes: {raw.hex()}")

    except Exception as e:
        print(f"Error processing message: {e}")

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

client.connect("localhost", 1883, 60)
client.loop_forever()
```

## Troubleshooting

**Gateway shows as "Never seen" in ChirpStack:**
```bash
# Check Gateway Bridge is receiving UDP packets
sudo tcpdump -i any -n udp port 1700

# Check Gateway Bridge logs
sudo journalctl -u chirpstack-gateway-bridge -f

# Verify the gateway EUI matches what's registered
```

**Devices are not joining (OTAA fails):**
- Verify the Application Key matches exactly (check for whitespace)
- Ensure the gateway covers the join channel frequencies
- Check device and server are using the same LoRaWAN spec version

**MQTT data not appearing:**
```bash
# Test Mosquitto is working
mosquitto_pub -h localhost -t "test" -m "hello"
mosquitto_sub -h localhost -t "test" -v

# Check ChirpStack MQTT integration is enabled
sudo journalctl -u chirpstack | grep -i mqtt
```

LoRaWAN is an excellent choice for sensor deployments where battery life and range matter more than throughput. A single gateway with a good antenna can cover an entire building or a few kilometers of outdoor range, and end devices can run for years on small batteries while reporting every few minutes.
