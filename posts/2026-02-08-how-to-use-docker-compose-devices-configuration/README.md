# How to Use Docker Compose devices Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, Devices, Hardware Access, GPU, IoT, DevOps

Description: Configure Docker Compose devices to grant containers access to host hardware like GPUs, USB devices, and serial ports.

---

Containers are isolated from host hardware by default. That is normally a good thing, but some workloads need direct access to physical devices. Machine learning applications need GPUs. IoT platforms need USB sensors. Serial communication tools need COM ports. Docker Compose's `devices` configuration lets you map host devices into containers selectively.

## How Device Mapping Works

The `devices` directive in Docker Compose creates a mapping between a device file on the host system and a path inside the container. Linux represents hardware devices as special files in the `/dev` directory. When you map a device, you give the container permission to read from and write to that device file.

The basic syntax looks like this.

```yaml
# Basic device mapping syntax
services:
  myservice:
    image: myimage:latest
    devices:
      - "/dev/host-device:/dev/container-device"
```

The full format supports three components separated by colons.

```
host-path:container-path:permissions
```

The permissions string uses a combination of `r` (read), `w` (write), and `m` (mknod). If you omit permissions, the default is `rwm`.

## Mapping Specific Devices

### GPU Access

The most common device mapping is for NVIDIA GPUs. While the NVIDIA Container Toolkit provides a more sophisticated approach, basic device mapping works for many use cases.

```yaml
# Map NVIDIA GPU devices into a container
version: "3.8"

services:
  ml-training:
    image: tensorflow/tensorflow:latest-gpu
    devices:
      - "/dev/nvidia0:/dev/nvidia0"
      - "/dev/nvidiactl:/dev/nvidiactl"
      - "/dev/nvidia-uvm:/dev/nvidia-uvm"
      - "/dev/nvidia-uvm-tools:/dev/nvidia-uvm-tools"
```

For newer setups, Docker Compose supports the `deploy.resources.reservations.devices` syntax which is the preferred method for GPU access.

```yaml
# Modern GPU access using resource reservations
services:
  ml-training:
    image: tensorflow/tensorflow:latest-gpu
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

### USB Devices

IoT and embedded development often requires USB device access.

```yaml
# Map a USB serial device for IoT communication
services:
  iot-gateway:
    image: my-iot-app:latest
    devices:
      - "/dev/ttyUSB0:/dev/ttyUSB0"
    # Ensure the container has permission to use the device
    privileged: false
    group_add:
      - dialout
```

Finding the right USB device path requires a quick check on the host.

```bash
# List USB devices connected to the host
lsusb

# Find the device file for a specific USB device
ls -la /dev/ttyUSB*

# Get detailed information about a USB device
udevadm info --name=/dev/ttyUSB0 --attribute-walk
```

### Serial Ports

For serial communication, map the appropriate tty device.

```yaml
# Serial port access for embedded development
services:
  serial-monitor:
    image: my-serial-tool:latest
    devices:
      - "/dev/ttyS0:/dev/ttyS0:rw"
      - "/dev/ttyACM0:/dev/ttyACM0:rw"
```

### Sound Devices

Audio processing containers need access to sound hardware.

```yaml
# Map sound devices for audio processing
services:
  audio-processor:
    image: my-audio-app:latest
    devices:
      - "/dev/snd:/dev/snd"
    group_add:
      - audio
```

### Video Capture Devices

Webcams and video capture cards expose themselves as video devices.

```yaml
# Access a webcam from inside a container
services:
  video-capture:
    image: my-video-app:latest
    devices:
      - "/dev/video0:/dev/video0"
    group_add:
      - video
```

## Setting Device Permissions

You can restrict what operations a container can perform on a device by specifying permissions explicitly.

```yaml
# Read-only access to a device
services:
  sensor-reader:
    image: my-sensor-app:latest
    devices:
      - "/dev/ttyUSB0:/dev/ttyUSB0:r"

  # Read-write access without mknod
  sensor-writer:
    image: my-actuator-app:latest
    devices:
      - "/dev/ttyUSB0:/dev/ttyUSB0:rw"

  # Full access (read, write, mknod) - the default
  device-manager:
    image: my-device-manager:latest
    devices:
      - "/dev/ttyUSB0:/dev/ttyUSB0:rwm"
```

The `m` (mknod) permission allows the container to create device files. You rarely need this, so `rw` is usually sufficient.

## Using device_cgroup_rules

For more granular control, Docker Compose supports `device_cgroup_rules`, which lets you define access rules by device type and major/minor numbers rather than specific paths.

```yaml
# Grant access using cgroup rules
services:
  usb-handler:
    image: my-usb-app:latest
    device_cgroup_rules:
      # Allow read/write to all USB serial devices (major number 188)
      - "c 188:* rwm"
      # Allow read-only access to a specific device
      - "c 166:0 r"
```

The format is: `type major:minor permissions`
- `c` for character devices, `b` for block devices
- Major and minor numbers identify the device type
- Use `*` as a wildcard for the minor number

```bash
# Find the major and minor numbers for a device
ls -la /dev/ttyUSB0
# Output: crw-rw---- 1 root dialout 188, 0 Jan 15 10:30 /dev/ttyUSB0
# Major: 188, Minor: 0, Type: c (character)
```

## Practical Example: IoT Sensor Gateway

Here is a complete Compose setup for an IoT gateway that reads from multiple sensors and publishes data to an MQTT broker.

```yaml
# IoT sensor gateway with device access
version: "3.8"

services:
  # MQTT broker for sensor data
  mqtt:
    image: eclipse-mosquitto:2
    ports:
      - "1883:1883"
    volumes:
      - mosquitto-data:/mosquitto/data
      - ./mosquitto.conf:/mosquitto/config/mosquitto.conf

  # Sensor reader with access to USB devices
  sensor-reader:
    build: ./sensor-reader
    devices:
      - "/dev/ttyUSB0:/dev/ttyUSB0:rw"
      - "/dev/ttyUSB1:/dev/ttyUSB1:rw"
    group_add:
      - dialout
    depends_on:
      - mqtt
    environment:
      MQTT_HOST: mqtt
      MQTT_PORT: 1883
      SENSOR_BAUD_RATE: 9600
    restart: unless-stopped

  # Data processor
  processor:
    build: ./processor
    depends_on:
      - mqtt
    environment:
      MQTT_HOST: mqtt

volumes:
  mosquitto-data:
```

## Handling Dynamic Device Assignment

USB devices do not always get the same path when you plug them in. A device might be `/dev/ttyUSB0` one time and `/dev/ttyUSB1` the next. You can solve this with udev rules on the host.

```bash
# Create a udev rule to give your device a stable name
# /etc/udev/rules.d/99-mydevice.rules
# Find attributes with: udevadm info --name=/dev/ttyUSB0 --attribute-walk
SUBSYSTEM=="tty", ATTRS{idVendor}=="1a86", ATTRS{idProduct}=="7523", SYMLINK+="my-sensor"
```

Then reference the stable symlink in your Compose file.

```yaml
# Use the stable device name created by udev
services:
  sensor:
    image: my-sensor-app:latest
    devices:
      - "/dev/my-sensor:/dev/ttyUSB0:rw"
    group_add:
      - dialout
```

After creating the udev rule, reload and trigger it.

```bash
# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger

# Verify the symlink was created
ls -la /dev/my-sensor
```

## Devices vs Privileged Mode

You might be tempted to use `privileged: true` instead of mapping individual devices. Resist that temptation. Privileged mode gives the container access to every device on the host plus full capabilities, which is a serious security risk.

```yaml
# BAD - Avoid this unless absolutely necessary
services:
  dangerous:
    image: my-app:latest
    privileged: true

# GOOD - Map only the specific devices you need
services:
  safe:
    image: my-app:latest
    devices:
      - "/dev/ttyUSB0:/dev/ttyUSB0:rw"
    cap_drop:
      - ALL
```

## Troubleshooting Device Access

When device mapping does not work, check these common issues.

```bash
# Verify the device exists on the host
ls -la /dev/ttyUSB0

# Check device permissions on the host
stat /dev/ttyUSB0

# Verify the user/group inside the container matches
docker exec my-container id
docker exec my-container ls -la /dev/ttyUSB0

# Check if the container can actually access the device
docker exec my-container cat /proc/self/cgroup
```

Permission problems are the most common issue. The `group_add` directive is your friend here. Find out which group owns the device on the host, then add that group to the container.

```bash
# Find the group that owns the device
stat -c '%G' /dev/ttyUSB0
# Output: dialout

# Get the group ID
getent group dialout
# Output: dialout:x:20:
```

Then add it to your Compose configuration using either the group name or GID.

```yaml
# Add the device group to the container
services:
  my-service:
    image: my-app:latest
    devices:
      - "/dev/ttyUSB0:/dev/ttyUSB0"
    group_add:
      - "20"  # dialout group GID
```

Device mapping in Docker Compose opens up hardware access without sacrificing the isolation benefits of containers. Map only what you need, use the tightest permissions possible, and avoid privileged mode. Your containers will have the hardware access they require while staying secure.
