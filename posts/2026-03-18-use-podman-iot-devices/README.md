# How to Use Podman on IoT Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, IoT, Container, Linux, Embedded, Sensor, MQTT, Raspberry Pi, DevOps

Description: Learn to deploy Podman containers on IoT devices for sensor data, MQTT messaging, and local processing, with lightweight images, OTA updates, and security.

---

> IoT devices collect and process data at the physical edge of your network. Podman brings container isolation to these devices without the overhead of a daemon process, making it possible to run multiple microservices on hardware with as little as 1GB of RAM. Containerized IoT applications are easier to update, test, and secure than applications installed directly on the host.

The Internet of Things encompasses everything from temperature sensors in warehouses to smart cameras in retail stores. These devices run Linux and need a way to deploy, update, and manage application software reliably. Podman's rootless, daemonless design is particularly valuable for IoT because it minimizes the attack surface on devices that are often deployed in physically accessible locations.

---

## IoT Device Requirements

Minimum hardware for running Podman:

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| CPU | ARMv7+ or x86_64 | ARM Cortex-A53+ |
| RAM | 512MB | 2GB+ |
| Storage | 4GB | 16GB+ |
| OS | Linux 4.18+ kernel | Fedora IoT, Ubuntu Core, Debian |

---

## Installing Podman on IoT Platforms

### Raspberry Pi (Raspberry Pi OS 64-bit)

```bash
sudo apt update
sudo apt install -y podman slirp4netns fuse-overlayfs uidmap
```

### Fedora IoT

Fedora IoT is an immutable operating system designed for IoT deployments. Podman is included by default:

```bash
# Podman is pre-installed

podman --version

# If additional tools are needed
sudo rpm-ostree install podman-compose
sudo systemctl reboot
```

### Debian on IoT Hardware

```bash
sudo apt update
sudo apt install -y podman fuse-overlayfs slirp4netns uidmap
```

### Verify Installation

```bash
podman info --format '{{.Host.Arch}} | Kernel: {{.Host.Kernel}} | OS: {{.Host.Distribution.Distribution}}'
```

---

## Building Lightweight IoT Container Images

IoT devices have limited storage and bandwidth. Build the smallest possible images.

### Minimal Sensor Reader Image

```dockerfile
# Dockerfile.sensor
FROM docker.io/library/python:3.12-alpine AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM docker.io/library/python:3.12-alpine
COPY --from=builder /install /usr/local
WORKDIR /app
COPY sensor_reader.py .
CMD ["python", "sensor_reader.py"]
```

Example `sensor_reader.py`:

```python
#!/usr/bin/env python3
import time
import json
import os

SENSOR_PATH = os.getenv("SENSOR_PATH", "/sys/bus/iio/devices/iio:device0")
INTERVAL = int(os.getenv("READ_INTERVAL", "5"))
OUTPUT_FILE = os.getenv("OUTPUT_FILE", "/data/readings.jsonl")

def read_sensor():
    try:
        with open(f"{SENSOR_PATH}/in_temp_raw", "r") as f:
            raw = int(f.read().strip())
        return {"timestamp": time.time(), "temperature_raw": raw}
    except FileNotFoundError:
        return {"timestamp": time.time(), "error": "sensor not found"}

if __name__ == "__main__":
    print(f"Sensor reader started, interval={INTERVAL}s")
    while True:
        reading = read_sensor()
        with open(OUTPUT_FILE, "a") as f:
            f.write(json.dumps(reading) + "\n")
        print(json.dumps(reading))
        time.sleep(INTERVAL)
```

Build and run:

```bash
podman build -f Dockerfile.sensor -t iot/sensor-reader:latest .

podman run -d --name sensor \
  --device /dev/i2c-1:/dev/i2c-1 \
  -v sensor-data:/data:Z \
  -e READ_INTERVAL=10 \
  iot/sensor-reader:latest
```

---

## MQTT Integration

MQTT is the standard messaging protocol for IoT. Run a local MQTT broker and connect sensor containers.

### Running Mosquitto MQTT Broker

```bash
# Create configuration
mkdir -p ~/mqtt/config
cat > ~/mqtt/config/mosquitto.conf <<EOF
listener 1883
allow_anonymous true
persistence true
persistence_location /mosquitto/data/
log_dest stdout
EOF

podman run -d --name mqtt-broker \
  -p 1883:1883 \
  -v ~/mqtt/config/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro,Z \
  -v mqtt-data:/mosquitto/data:Z \
  --memory 128m \
  docker.io/library/eclipse-mosquitto:2
```

### MQTT Publisher Container

```dockerfile
# Dockerfile.mqtt-publisher
FROM docker.io/library/python:3.12-alpine
RUN pip install --no-cache-dir paho-mqtt
WORKDIR /app
COPY publisher.py .
CMD ["python", "publisher.py"]
```

Example `publisher.py`:

```python
#!/usr/bin/env python3
import paho.mqtt.client as mqtt
import json
import time
import os

BROKER = os.getenv("MQTT_BROKER", "localhost")
TOPIC = os.getenv("MQTT_TOPIC", "sensors/temperature")
DEVICE_ID = os.getenv("DEVICE_ID", "iot-001")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=DEVICE_ID)
client.connect(BROKER, 1883, 60)
client.loop_start()

while True:
    payload = {
        "device": DEVICE_ID,
        "timestamp": time.time(),
        "temperature": 22.5,  # Replace with actual sensor reading
        "humidity": 45.0
    }
    client.publish(TOPIC, json.dumps(payload))
    print(f"Published to {TOPIC}: {json.dumps(payload)}")
    time.sleep(10)
```

Run with network access to the MQTT broker:

```bash
podman build -f Dockerfile.mqtt-publisher -t iot/mqtt-publisher:latest .

podman run -d --name publisher \
  --network host \
  -e MQTT_BROKER=localhost \
  -e DEVICE_ID=sensor-001 \
  --memory 64m \
  iot/mqtt-publisher:latest
```

---

## Accessing Hardware Sensors

IoT containers often need access to hardware interfaces like I2C, SPI, GPIO, and serial ports.

### I2C Devices

```bash
podman run -d --name i2c-sensor \
  --runtime crun \
  --device /dev/i2c-1:/dev/i2c-1 \
  --group-add keep-groups \
  -v sensor-data:/data:Z \
  iot/sensor-reader:latest
```

### GPIO Access

```bash
podman run -d --name gpio-controller \
  --device /dev/gpiochip0:/dev/gpiochip0 \
  -v /sys/class/gpio:/sys/class/gpio:rw \
  iot/gpio-app:latest
```

### Serial Port Access

```bash
podman run -d --name serial-reader \
  --device /dev/ttyUSB0:/dev/ttyUSB0 \
  iot/serial-app:latest
```

### Camera Access

```bash
podman run -d --name camera \
  --device /dev/video0:/dev/video0 \
  -v camera-data:/data:Z \
  --memory 256m \
  iot/camera-capture:latest
```

---

## Multi-Container IoT Stack

Create a complete IoT data pipeline using pods:

```bash
# Create a pod for the IoT stack
podman pod create --name iot-stack \
  -p 8080:8080

# MQTT Broker
podman run -d --pod iot-stack --name mqtt \
  --memory 128m \
  docker.io/library/eclipse-mosquitto:2

# Sensor Data Collector
podman run -d --pod iot-stack --name collector \
  --device /dev/i2c-1:/dev/i2c-1 \
  --memory 64m \
  -e MQTT_BROKER=localhost \
  iot/collector:latest

# Data Processor
podman run -d --pod iot-stack --name processor \
  --memory 256m \
  -e MQTT_BROKER=localhost \
  -v processed-data:/data:Z \
  iot/processor:latest

# Local Dashboard
podman run -d --pod iot-stack --name dashboard \
  --memory 128m \
  -v processed-data:/data:ro,Z \
  iot/dashboard:latest
```

---

## OTA (Over-The-Air) Updates

### Pull-Based Updates with Auto-Update

For devices with internet connectivity:

```bash
mkdir -p ~/.config/containers/systemd

cat > ~/.config/containers/systemd/iot-app.container <<EOF
[Unit]
Description=IoT Application
After=network-online.target

[Container]
Image=docker.io/myorg/iot-app:latest
PublishPort=8080:8080
Volume=iot-data:/data:Z
Device=/dev/i2c-1:/dev/i2c-1
Environment=DEVICE_ID=iot-001
AutoUpdate=registry

[Service]
Restart=always
TimeoutStartSec=120

[Install]
WantedBy=default.target
EOF

sudo loginctl enable-linger "$USER"
systemctl --user daemon-reload
systemctl --user enable --now iot-app
systemctl --user enable --now podman-auto-update.timer
```

### Push-Based Updates for Offline Devices

```bash
#!/bin/bash
# ota-update.sh - Push update to IoT device
DEVICE=$1
IMAGE_TAR=$2

echo "Pushing update to $DEVICE..."
scp "$IMAGE_TAR" iot@$DEVICE:/tmp/update.tar

ssh iot@$DEVICE bash <<'REMOTE'
  LOAD_OUTPUT=$(podman load -i /tmp/update.tar)
  systemctl --user restart iot-app
  rm /tmp/update.tar
  echo "Update applied: $LOAD_OUTPUT"
REMOTE
```

---

## Security Hardening for IoT

### Read-Only Containers

Run containers with a read-only filesystem:

```bash
podman run -d --name secure-iot \
  --read-only \
  -v iot-data:/data:Z \
  iot/sensor-reader:latest
```

### Drop Unnecessary Capabilities

```bash
podman run -d --name hardened \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --read-only \
  -v iot-data:/data:Z \
  iot/sensor-reader:latest
```

### Network Isolation

```bash
# Create an isolated network
podman network create --internal iot-internal

# Only the gateway container has external access
podman run -d --name gateway \
  --network bridge \
  --network iot-internal \
  -p 8443:8443 \
  iot/gateway:latest

# Sensor containers use internal network only
podman run -d --name sensor \
  --network iot-internal \
  --device /dev/i2c-1:/dev/i2c-1 \
  -v sensor-data:/data:Z \
  iot/sensor-reader:latest
```

---

Resource Monitoring

### Lightweight Monitoring Script

```bash
sudo tee /usr/local/bin/iot-monitor.sh > /dev/null <<'EOF'
#!/bin/bash
# Collect device and container metrics
DEVICE_ID=$(hostname)
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# System metrics
CPU_TEMP=$(cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo "0")
MEM_FREE=$(awk '/MemAvailable/ {print $2}' /proc/meminfo)
DISK_FREE=$(df / --output=avail | tail -1 | tr -d ' ')

# Container metrics
CONTAINER_COUNT=$(podman ps -q | wc -l)

echo "{\"device\":\"$DEVICE_ID\",\"timestamp\":\"$TIMESTAMP\",\"cpu_temp\":$((CPU_TEMP/1000)),\"mem_free_kb\":$MEM_FREE,\"disk_free_kb\":$DISK_FREE,\"containers\":$CONTAINER_COUNT}"
EOF

sudo chmod +x /usr/local/bin/iot-monitor.sh
```

---

## Conclusion

Podman on IoT devices provides container isolation and management capabilities without the resource overhead of a traditional container daemon. By building minimal Alpine-based images, accessing hardware sensors through device passthrough, and using MQTT for communication, you can create robust IoT data pipelines entirely within containers. OTA updates through Podman's auto-update feature or push-based image loading keep devices current without manual intervention. Security hardening with read-only filesystems, dropped capabilities, and network isolation protects devices that are often deployed in physically accessible locations. The combination of Podman's lightweight runtime and IoT-focused Linux distributions like Fedora IoT gives you a production-ready platform for containerized IoT workloads.
