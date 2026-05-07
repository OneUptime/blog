# How to Use Podman on Fedora IoT

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Fedora IoT, Container, Edge Computing, IoT

Description: Learn how to use Podman on Fedora IoT to deploy and manage containerized applications on edge devices and IoT gateways.

---

> Fedora IoT brings container-native workflows to edge and IoT devices. This guide shows you how to use Podman on Fedora IoT for deploying, managing, and updating containerized applications on resource-constrained hardware.

Fedora IoT is an immutable operating system tailored for Internet of Things and edge computing devices. Built on the same OSTree technology as Fedora CoreOS, it provides atomic updates, rollback capabilities, and a container-first approach to application deployment. Podman ships as the default container engine, making it straightforward to deploy workloads on everything from Raspberry Pi boards to industrial edge gateways.

This guide covers installing Fedora IoT, configuring Podman, and running container workloads suited for IoT and edge scenarios.

---

## Getting Started with Fedora IoT

Fedora IoT supports ARM (aarch64) and x86_64 architectures. Download the raw image for your target device from the Fedora IoT website and write it to an SD card or USB drive:

```bash
# Write the image to an SD card (e.g., for Raspberry Pi)

sudo arm-image-installer \
  --image=Fedora-IoT-raw-44-20260427.0.aarch64.raw.xz \
  --target=rpi4 \
  --media=/dev/sdX \
  --addkey=/path/to/your/ssh-key.pub \
  --resizefs
```

For x86_64 devices, use the ISO installer or write the raw image directly:

```bash
xzcat Fedora-IoT-raw-44-20260427.0.x86_64.raw.xz | sudo dd of=/dev/sdX bs=4M status=progress
```

## Initial System Setup

After booting a raw-image-based device, connect via SSH and verify the system:

```bash
ssh root@fedora-iot-device
rpm-ostree status
podman --version
```

Fedora IoT uses rpm-ostree for system management. The base system is read-only, and Podman is included out of the box. Set the hostname for your device:

```bash
sudo hostnamectl set-hostname iot-gateway-01
```

## Verifying Podman on Fedora IoT

Check that Podman is properly configured:

```bash
podman info --format '{{.Host.Os}} {{.Host.Arch}}'
podman system info
```

On ARM devices, ensure you are pulling the correct architecture images:

```bash
podman pull --arch arm64 docker.io/library/alpine:latest
podman run --rm docker.io/library/alpine:latest uname -m
```

## Running Containers for IoT Workloads

IoT devices often run lightweight services. Here is an example running an MQTT broker for sensor data collection:

```bash
podman run -d \
  --name mqtt-broker \
  --restart=always \
  -p 1883:1883 \
  docker.io/library/eclipse-mosquitto:latest
```

Verify the broker is running:

```bash
podman ps
podman logs mqtt-broker
```

## Creating Systemd Services with Quadlet

For production IoT deployments, run containers as systemd services using Quadlet. Create a container unit file:

```ini
# /etc/containers/systemd/sensor-collector.container
[Container]
ContainerName=sensor-collector
Image=docker.io/library/python:3.12-slim
Exec=python3 -m http.server 5000 --directory /app/data
PublishPort=5000:5000
Volume=/var/data/sensors:/app/data:Z
Environment=DEVICE_ID=gateway-01
Environment=COLLECT_INTERVAL=30
AutoUpdate=registry

[Service]
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target default.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now sensor-collector.service
```

## Building Custom Images for IoT

Edge devices often need custom container images optimized for their hardware. Create a Containerfile for a lightweight sensor application:

```dockerfile
FROM docker.io/library/python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY sensor_reader.py .

ENV DEVICE_ID=default
ENV COLLECT_INTERVAL=60

CMD ["python", "sensor_reader.py"]
```

Build and run the image:

```bash
podman build -t sensor-app:latest .
podman run -d --name sensor \
  --device /dev/i2c-1 \
  -e DEVICE_ID=rpi-sensor-01 \
  sensor-app:latest
```

Note the `--device` flag, which passes host hardware devices into the container. This is essential for IoT workloads that interact with sensors and GPIO pins.

## Accessing Hardware from Containers

IoT containers frequently need access to hardware peripherals. Podman supports passing devices, GPIO pins, and serial ports into containers:

```bash
# Access GPIO pins
podman run -d --name gpio-controller \
  --device /dev/gpiochip0 \
  --group-add keep-groups \
  my-gpio-app:latest

# Access serial devices
podman run -d --name serial-reader \
  --device /dev/ttyUSB0 \
  --device /dev/ttyACM0 \
  my-serial-app:latest

# Access I2C bus
podman run -d --name i2c-sensor \
  --device /dev/i2c-1 \
  --privileged \
  my-i2c-app:latest
```

## Networking for IoT Devices

IoT devices often need specific network configurations. Set up a container with host networking for protocols like mDNS or Bluetooth:

```bash
podman run -d --name ble-gateway \
  --network host \
  --privileged \
  -v /var/run/dbus:/var/run/dbus \
  my-ble-gateway:latest
```

For containers that need to communicate with each other, create a Podman network:

```bash
podman network create iot-net
podman run -d --network iot-net --name mqtt docker.io/library/eclipse-mosquitto:latest
podman run -d --network iot-net --name app my-iot-app:latest
```

## Managing Updates on IoT Devices

Fedora IoT supports automatic OS updates through rpm-ostree, and Podman supports automatic container image updates for containers managed by systemd or Quadlet. Set `AutomaticUpdatePolicy=stage` in `/etc/rpm-ostreed.conf`, then enable both timers:

```bash
# Reload rpm-ostreed after setting AutomaticUpdatePolicy=stage
sudo rpm-ostree reload
sudo systemctl enable --now rpm-ostreed-automatic.timer

# Enable container auto-updates for systemd/Quadlet-managed containers
sudo systemctl enable --now podman-auto-update.timer
```

Check for available updates:

```bash
rpm-ostree upgrade --check
podman auto-update --dry-run
```

If an OS update causes issues, roll back to the previous version:

```bash
sudo rpm-ostree rollback
sudo systemctl reboot
```

Resource Management on Constrained Devices

IoT devices typically have limited CPU and memory. Use Podman resource limits to prevent containers from overwhelming the host:

```bash
podman run -d --name lightweight-app \
  --memory=128m \
  --cpus=0.5 \
  --memory-swap=256m \
  --pids-limit=50 \
  my-iot-app:latest
```

Monitor resource usage:

```bash
podman stats --no-stream
podman top lightweight-app
```

## Persistent Data and Volumes

IoT devices may use SD cards or eMMC storage with limited write endurance. Use named volumes and consider tmpfs for temporary data:

```bash
# Named volume for persistent data
podman volume create sensor-data
podman run -d -v sensor-data:/data:Z my-app:latest

# tmpfs for temporary data to reduce SD card wear
podman run -d --tmpfs /tmp:size=64m my-app:latest
```

## Multi-Container IoT Stack with Pods

Deploy a complete IoT gateway stack using a pod:

```bash
podman pod create --name iot-gateway -p 1883:1883 -p 3000:3000 -p 8086:8086

# MQTT Broker
podman run -d --pod iot-gateway --name mqtt \
  docker.io/library/eclipse-mosquitto:latest

# Time-series database
podman run -d --pod iot-gateway --name influxdb \
  -v influx-data:/var/lib/influxdb2:Z \
  docker.io/library/influxdb:2

# Dashboard
podman run -d --pod iot-gateway --name grafana \
  -v grafana-data:/var/lib/grafana:Z \
  docker.io/grafana/grafana:latest
```

## Monitoring and Logging

Inspect container logs:

```bash
sudo journalctl -u sensor-collector.service -f
podman logs --follow mqtt-broker
```

Inspect container state:

```bash
sudo systemctl status sensor-collector.service
sudo podman container inspect --format '{{.State.Status}}' sensor-collector
```

## Conclusion

Fedora IoT combined with Podman provides a robust platform for edge and IoT container deployments. The immutable OS base ensures system stability, while Podman enables lightweight, daemonless container management suited for resource-constrained devices. By using systemd integration through Quadlet, automatic updates, and hardware passthrough, you can build reliable IoT gateways and edge computing nodes that are easy to deploy and maintain at scale.
