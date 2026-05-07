# How to Use CDI (Container Device Interface) with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, CDI, Device, Container, GPU, Specification

Description: A complete guide to the Container Device Interface (CDI) specification in Podman, covering how to create CDI specs, use vendor-provided specs, and build custom device configurations.

---

> CDI standardizes how devices are made available to containers, replacing fragile manual device mappings with declarative specifications that are portable, version-controlled, and vendor-supported.

The Container Device Interface (CDI) is a specification that defines a standard way to describe how external devices should be made available inside containers. Before CDI, passing devices to containers required manually specifying device files, volume mounts for driver libraries, environment variables, and cgroup rules -- a fragile and error-prone process. CDI encapsulates all of this into a single JSON or YAML file that container runtimes like Podman can consume directly. This guide explains the CDI specification, how to use vendor-provided CDI specs, and how to write your own custom specs for any device.

---

## What Problem Does CDI Solve

Without CDI, passing a GPU to a container might look like this:

```bash
# The old way: manual device mapping (fragile and error-prone)

podman run --rm -it \
  --device /dev/nvidia0:/dev/nvidia0 \
  --device /dev/nvidiactl:/dev/nvidiactl \
  --device /dev/nvidia-modeset:/dev/nvidia-modeset \
  --device /dev/nvidia-uvm:/dev/nvidia-uvm \
  --device /dev/nvidia-uvm-tools:/dev/nvidia-uvm-tools \
  -v /usr/lib64/libnvidia-ml.so.1:/usr/lib64/libnvidia-ml.so.1:ro \
  -v /usr/lib64/libcuda.so.1:/usr/lib64/libcuda.so.1:ro \
  -v /usr/bin/nvidia-smi:/usr/bin/nvidia-smi:ro \
  --security-opt=label=disable \
  nvidia/cuda:12.3.0-base-ubuntu22.04 \
  nvidia-smi
```

With CDI, the same operation becomes:

```bash
# The CDI way: clean and declarative
podman run --rm -it \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  nvidia/cuda:12.3.0-base-ubuntu22.04 \
  nvidia-smi
```

CDI moves all the complexity into a specification file that is generated once and reused automatically.

## CDI Specification Locations

Podman looks for CDI specifications in configured spec directories. Common locations are:

```bash
# Static CDI specs
# /etc/cdi/

# Generated CDI specs
# /var/run/cdi/

# Podman's global option can be used to add or override spec directories
podman --cdi-spec-dir=/etc/cdi --cdi-spec-dir=/var/run/cdi run ...

# List all CDI specs on the system
ls -la /etc/cdi/ 2>/dev/null
ls -la /var/run/cdi/ 2>/dev/null
```

## CDI Specification Format

A CDI spec is a JSON or YAML file that follows the CDI schema. Here is the anatomy of a CDI spec:

```bash
# Create a minimal example CDI spec
sudo mkdir -p /etc/cdi
cat > /tmp/example-cdi-spec.yaml << 'EOF'
---
cdiVersion: "0.6.0"
kind: "example.com/device"
devices:
  - name: "mydevice"
    containerEdits:
      deviceNodes:
        - path: "/dev/mydevice0"
          hostPath: "/dev/mydevice0"
          permissions: "rw"
      mounts:
        - hostPath: "/usr/lib/libmydevice.so"
          containerPath: "/usr/lib/libmydevice.so"
          options:
            - "ro"
            - "nosuid"
            - "nodev"
            - "bind"
      env:
        - "MY_DEVICE_ENABLED=1"
        - "MY_DEVICE_PATH=/dev/mydevice0"
containerEdits:
  env:
    - "MY_DEVICE_VENDOR=example.com"
EOF

echo "Example CDI spec created at /tmp/example-cdi-spec.yaml"
```

The key sections are:

- **cdiVersion** - The CDI specification version
- **kind** - A vendor-specific identifier in the format `vendor.domain/class`
- **devices** - A list of named devices with their container modifications
- **containerEdits** - Global modifications applied to any container using devices from this spec
- **deviceNodes** - Device files to map into the container
- **mounts** - Files and directories to bind-mount
- **env** - Environment variables to set

## Using NVIDIA CDI Specs

The most common CDI use case is with NVIDIA GPUs:

```bash
# Generate the NVIDIA CDI specification manually
sudo nvidia-ctk cdi generate --output=/var/run/cdi/nvidia.yaml

# For a user-managed spec directory, add the directory with --cdi-spec-dir
mkdir -p ~/.config/cdi
nvidia-ctk cdi generate --output=$HOME/.config/cdi/nvidia.yaml

# List available CDI devices
nvidia-ctk cdi list
# Example output:
# INFO[0000] Found 3 CDI devices
# nvidia.com/gpu=0
# nvidia.com/gpu=1
# nvidia.com/gpu=all

# Use a CDI device in a container
podman run --rm -it \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  nvidia/cuda:12.3.0-base-ubuntu22.04 \
  nvidia-smi

# Use a specific GPU
podman run --rm -it \
  --device nvidia.com/gpu=0 \
  --security-opt=label=disable \
  nvidia/cuda:12.3.0-base-ubuntu22.04 \
  nvidia-smi
```

### Inspecting the Generated NVIDIA CDI Spec

```bash
# View the generated CDI spec (it is quite detailed)
cat /var/run/cdi/nvidia.yaml | head -60

# The spec includes:
# - All /dev/nvidia* device nodes
# - NVIDIA driver libraries from /usr/lib
# - NVIDIA utility binaries (nvidia-smi, etc.)
# - Required OCI edits for GPU initialization
# - Environment variables for CUDA
```

## Writing Custom CDI Specifications

You can create CDI specs for any device. Here are practical examples.

### CDI Spec for a USB Serial Device

```bash
cat > /tmp/usb-serial-cdi.yaml << 'EOF'
---
cdiVersion: "0.6.0"
kind: "custom.io/serial"
devices:
  - name: "arduino"
    containerEdits:
      deviceNodes:
        - path: "/dev/ttyACM0"
          hostPath: "/dev/ttyACM0"
          permissions: "rw"
      env:
        - "SERIAL_DEVICE=/dev/ttyACM0"
        - "SERIAL_BAUD=9600"

  - name: "ftdi"
    containerEdits:
      deviceNodes:
        - path: "/dev/ttyUSB0"
          hostPath: "/dev/ttyUSB0"
          permissions: "rw"
      env:
        - "SERIAL_DEVICE=/dev/ttyUSB0"
        - "SERIAL_BAUD=115200"

  - name: "all"
    containerEdits:
      deviceNodes:
        - path: "/dev/ttyACM0"
          hostPath: "/dev/ttyACM0"
          permissions: "rw"
        - path: "/dev/ttyUSB0"
          hostPath: "/dev/ttyUSB0"
          permissions: "rw"
containerEdits:
  env:
    - "SERIAL_DRIVER=custom.io"
EOF

# Install the CDI spec
sudo cp /tmp/usb-serial-cdi.yaml /etc/cdi/usb-serial.yaml

# Use it
podman run --rm -it \
  --device custom.io/serial=arduino \
  fedora:latest \
  bash -c "echo \$SERIAL_DEVICE && ls -la /dev/ttyACM0"
```

### CDI Spec for Camera Devices

```bash
cat > /tmp/camera-cdi.yaml << 'EOF'
---
cdiVersion: "0.6.0"
kind: "custom.io/camera"
devices:
  - name: "webcam0"
    containerEdits:
      deviceNodes:
        - path: "/dev/video0"
          hostPath: "/dev/video0"
          permissions: "rw"
        - path: "/dev/video1"
          hostPath: "/dev/video1"
          permissions: "rw"
      env:
        - "CAMERA_DEVICE=/dev/video0"
        - "CAMERA_INDEX=0"

  - name: "all"
    containerEdits:
      deviceNodes:
        - path: "/dev/video0"
          hostPath: "/dev/video0"
          permissions: "rw"
        - path: "/dev/video1"
          hostPath: "/dev/video1"
          permissions: "rw"
        - path: "/dev/video2"
          hostPath: "/dev/video2"
          permissions: "rw"
        - path: "/dev/video3"
          hostPath: "/dev/video3"
          permissions: "rw"
containerEdits:
  env:
    - "CAMERA_DRIVER=v4l2"
EOF

sudo cp /tmp/camera-cdi.yaml /etc/cdi/camera.yaml

# Use the camera CDI spec
podman run --rm -it \
  --device custom.io/camera=webcam0 \
  fedora:latest \
  bash -c "echo Camera: \$CAMERA_DEVICE && ls -la /dev/video*"
```

### CDI Spec for Audio Devices

```bash
cat > /tmp/audio-cdi.yaml << 'EOF'
---
cdiVersion: "0.6.0"
kind: "custom.io/audio"
devices:
  - name: "alsa"
    containerEdits:
      deviceNodes:
        - path: "/dev/snd/controlC0"
          hostPath: "/dev/snd/controlC0"
          permissions: "rw"
        - path: "/dev/snd/pcmC0D0p"
          hostPath: "/dev/snd/pcmC0D0p"
          permissions: "rw"
        - path: "/dev/snd/pcmC0D0c"
          hostPath: "/dev/snd/pcmC0D0c"
          permissions: "rw"
        - path: "/dev/snd/timer"
          hostPath: "/dev/snd/timer"
          permissions: "rw"
      env:
        - "AUDIO_DRIVER=alsa"

  - name: "pulseaudio"
    containerEdits:
      mounts:
        - hostPath: "/run/user/1000/pulse/native"
          containerPath: "/run/user/1000/pulse/native"
          options:
            - "rw"
            - "bind"
      env:
        - "PULSE_SERVER=unix:/run/user/1000/pulse/native"
        - "AUDIO_DRIVER=pulseaudio"
EOF

sudo cp /tmp/audio-cdi.yaml /etc/cdi/audio.yaml

# Use audio via PulseAudio CDI
podman run --rm -it \
  --device custom.io/audio=pulseaudio \
  fedora:latest \
  bash -c "echo \$PULSE_SERVER && ls -la /run/user/1000/pulse/native"
```

## Generating CDI Specs Programmatically

For dynamic environments, you can generate CDI specs with a script:

```bash
cat > /tmp/generate-cdi.sh << 'SCRIPT_EOF'
#!/bin/bash
# Generate a CDI spec for all connected USB serial devices

OUTPUT_FILE="${1:-/etc/cdi/usb-serial-dynamic.yaml}"

echo "---" > "$OUTPUT_FILE"
echo 'cdiVersion: "0.6.0"' >> "$OUTPUT_FILE"
echo 'kind: "auto.io/serial"' >> "$OUTPUT_FILE"
echo "devices:" >> "$OUTPUT_FILE"

# Find all ttyUSB and ttyACM devices
device_index=0
for dev in /dev/ttyUSB* /dev/ttyACM*; do
    if [ -e "$dev" ]; then
        devname=$(basename "$dev")
        echo "  - name: \"$devname\"" >> "$OUTPUT_FILE"
        echo "    containerEdits:" >> "$OUTPUT_FILE"
        echo "      deviceNodes:" >> "$OUTPUT_FILE"
        echo "        - path: \"$dev\"" >> "$OUTPUT_FILE"
        echo "          hostPath: \"$dev\"" >> "$OUTPUT_FILE"
        echo "          permissions: \"rw\"" >> "$OUTPUT_FILE"
        echo "      env:" >> "$OUTPUT_FILE"
        echo "        - \"SERIAL_PORT_$device_index=$dev\"" >> "$OUTPUT_FILE"
        device_index=$((device_index + 1))
    fi
done

# Create an "all" device that includes everything
if [ $device_index -gt 0 ]; then
    echo "  - name: \"all\"" >> "$OUTPUT_FILE"
    echo "    containerEdits:" >> "$OUTPUT_FILE"
    echo "      deviceNodes:" >> "$OUTPUT_FILE"
    for dev in /dev/ttyUSB* /dev/ttyACM*; do
        if [ -e "$dev" ]; then
            echo "        - path: \"$dev\"" >> "$OUTPUT_FILE"
            echo "          hostPath: \"$dev\"" >> "$OUTPUT_FILE"
            echo "          permissions: \"rw\"" >> "$OUTPUT_FILE"
        fi
    done
fi

echo "Generated CDI spec with $device_index devices at $OUTPUT_FILE"
cat "$OUTPUT_FILE"
SCRIPT_EOF

chmod +x /tmp/generate-cdi.sh

# Run the generator
# sudo /tmp/generate-cdi.sh /etc/cdi/usb-serial-dynamic.yaml
```

## Validating CDI Specifications

```bash
# Validate a CDI spec using Podman
# Podman will report errors when you try to use an invalid spec
podman run --rm -it \
  --device custom.io/serial=arduino \
  fedora:latest echo "CDI spec is valid"

# Check for syntax errors in YAML
python3 -c "
import yaml, sys
try:
    with open(sys.argv[1]) as f:
        spec = yaml.safe_load(f)
    print(f'Valid YAML. Kind: {spec.get(\"kind\")}, Devices: {len(spec.get(\"devices\", []))}')
except Exception as e:
    print(f'Error: {e}')
" /var/run/cdi/nvidia.yaml

# List NVIDIA CDI devices and any CDI spec loading errors
nvidia-ctk --debug cdi list
```

## CDI with Podman Compose

You can reference CDI devices in Podman Compose files:

```bash
cat > /tmp/compose-cdi.yaml << 'EOF'
version: "3"
services:
  gpu-worker:
    image: nvidia/cuda:12.3.0-base-ubuntu22.04
    devices:
      - nvidia.com/gpu=0
    command: nvidia-smi

  camera-processor:
    image: opencv-camera:latest
    devices:
      - custom.io/camera=webcam0
    volumes:
      - ./output:/output
    command: python3 capture.py
EOF

# Run with podman-compose
# podman-compose -f /tmp/compose-cdi.yaml up
```

## CDI with Kubernetes and CDI-Compatible Runtimes

CDI is also supported in Kubernetes environments through CRI implementations such as CRI-O and containerd. With NVIDIA GPUs, a device plugin or GPU Operator normally advertises the `nvidia.com/gpu` resource:

```bash
# Kubernetes pod spec requesting an NVIDIA GPU resource
cat > /tmp/cdi-pod.yaml << 'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: cuda-container
      image: nvidia/cuda:12.3.0-base-ubuntu22.04
      command: ["nvidia-smi"]
      resources:
        limits:
          nvidia.com/gpu: 1
EOF
```

## Managing CDI Specs Lifecycle

```bash
# List all installed CDI specs
ls -la /etc/cdi/ /var/run/cdi/ 2>/dev/null

# Regenerate NVIDIA CDI spec after driver update
sudo systemctl restart nvidia-cdi-refresh.service
# Or generate it manually:
sudo nvidia-ctk cdi generate --output=/var/run/cdi/nvidia.yaml

# Remove a CDI spec
sudo rm /etc/cdi/usb-serial.yaml

# Update a CDI spec (e.g., when hardware changes)
# Simply overwrite the file; Podman reads it fresh each time

# Back up CDI specs
sudo tar czf /tmp/cdi-specs-backup.tar.gz /etc/cdi/
```

## Troubleshooting

```bash
# "CDI device not found" error
# Check that the CDI spec file is in the correct directory
ls -la /etc/cdi/
# Verify the device name matches: vendor.domain/class=name
cat /etc/cdi/your-spec.yaml | grep -A 2 "name:"

# CDI spec syntax errors
# Validate the YAML syntax
python3 -c "import yaml; yaml.safe_load(open('/etc/cdi/your-spec.yaml'))"

# Device node does not exist
# CDI specs reference host device paths that must exist
ls -la /dev/your-device

# Permission denied for CDI device
# Check device file permissions on the host
ls -la /dev/your-device
# Ensure the user can read the CDI spec file
ls -la /etc/cdi/your-spec.yaml

# CDI spec in a custom directory is not picked up by Podman
# Add the directory with --cdi-spec-dir or configure cdi_spec_dirs in containers.conf
mkdir -p ~/.config/cdi
cp /etc/cdi/your-spec.yaml ~/.config/cdi/
podman --cdi-spec-dir=$HOME/.config/cdi run --rm \
  --device custom.io/serial=arduino \
  fedora:latest echo "CDI spec found"
```

## Conclusion

CDI (Container Device Interface) brings order to the previously ad-hoc process of device passthrough in containers. By encapsulating device nodes, library mounts, environment variables, and hooks into a declarative specification, CDI makes device access reproducible, portable, and maintainable. Vendor-provided tools like the NVIDIA Container Toolkit generate CDI specs automatically, and you can write custom specs for any device your containers need to access. Whether you are managing GPUs, serial devices, cameras, or custom hardware, CDI provides a clean abstraction that works with Podman, Kubernetes, and other CDI-compatible runtimes.
