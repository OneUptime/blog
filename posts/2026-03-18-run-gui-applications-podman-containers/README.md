# How to Run GUI Applications in Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, GUI, Container, Desktop, Linux

Description: A complete guide to running graphical desktop applications inside Podman containers, covering X11, Wayland, GPU acceleration, and audio support.

---

> Running GUI applications in containers provides isolation, reproducibility, and easy distribution of desktop software. Podman makes it possible to containerize graphical applications while maintaining display and audio access.

Containerizing GUI applications is useful for running untrusted software in isolation, testing applications across different Linux distributions, distributing complex software with all its dependencies, and creating reproducible development environments. This guide covers the techniques needed to run graphical applications in Podman containers.

---

## Understanding Display Protocols

Linux GUI applications communicate with the display server through one of two protocols:

- **X11 (X Window System)**: The traditional display protocol, widely supported
- **Wayland**: The modern replacement, used by default in recent GNOME and KDE

The approach for containerizing GUI applications differs depending on which protocol your host system uses.

### Detecting Your Display Server

```bash
# Check the current display server

echo $XDG_SESSION_TYPE

# X11 will show: x11
# Wayland will show: wayland
```

## Running X11 Applications in Podman

### Basic X11 Forwarding

The simplest approach shares the X11 socket with the container:

```bash
podman run --rm -it \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  fedora:latest \
  bash -c '
    dnf install -y xeyes
    xeyes
  '
```

### Handling X11 Authentication

For proper X11 authentication, share the Xauthority file:

```bash
podman run --rm -it \
  -e DISPLAY=$DISPLAY \
  -e XAUTHORITY=/tmp/.Xauthority \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  -v ${XAUTHORITY:-$HOME/.Xauthority}:/tmp/.Xauthority:ro \
  fedora:latest \
  bash -c '
    dnf install -y xclock
    xclock
  '
```

### Building a GUI-Ready Base Image

Create a reusable base image with common GUI dependencies:

```dockerfile
# Containerfile.gui-base
FROM fedora:latest

# Install common GUI dependencies
RUN dnf install -y \
    mesa-dri-drivers \
    mesa-libGL \
    mesa-libEGL \
    libX11 \
    libXext \
    libXrender \
    libXi \
    libXtst \
    dbus-x11 \
    xdg-utils \
    fontconfig \
    dejavu-sans-fonts \
    dejavu-serif-fonts \
    dejavu-sans-mono-fonts \
    && dnf clean all

# Set up a non-root user
RUN useradd -m -s /bin/bash appuser
USER appuser
WORKDIR /home/appuser

ENV DISPLAY=:0
```

Build it:

```bash
podman build -t gui-base -f Containerfile.gui-base .
```

## Running Wayland Applications

### Direct Wayland Socket Sharing

For native Wayland applications:

```bash
podman run --rm -it \
  -e WAYLAND_DISPLAY=$WAYLAND_DISPLAY \
  -e XDG_RUNTIME_DIR=/tmp/runtime \
  -v $XDG_RUNTIME_DIR/$WAYLAND_DISPLAY:/tmp/runtime/$WAYLAND_DISPLAY:ro \
  fedora:latest \
  bash -c '
    dnf install -y foot  # Wayland-native terminal
    foot
  '
```

### XWayland for X11 Apps on Wayland

Most Wayland compositors include XWayland for backward compatibility:

```bash
podman run --rm -it \
  -e DISPLAY=$DISPLAY \
  -e WAYLAND_DISPLAY=$WAYLAND_DISPLAY \
  -e XDG_RUNTIME_DIR=/tmp/runtime \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  -v $XDG_RUNTIME_DIR/$WAYLAND_DISPLAY:/tmp/runtime/$WAYLAND_DISPLAY:ro \
  fedora:latest \
  bash -c '
    dnf install -y firefox
    firefox --no-remote
  '
```

## GPU Acceleration

### Intel GPU

```bash
podman run --rm -it \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  --device /dev/dri \
  --group-add keep-groups \
  fedora:latest \
  bash -c '
    dnf install -y glx-utils mesa-dri-drivers
    glxinfo | head -20
    glxgears
  '
```

### NVIDIA GPU

For NVIDIA GPUs, use the NVIDIA Container Toolkit with Podman:

```bash
# Install nvidia-container-toolkit
sudo dnf install -y nvidia-container-toolkit

# Configure Podman for NVIDIA
sudo nvidia-ctk cdi generate --output=/var/run/cdi/nvidia.yaml

# Run with GPU access
podman run --rm -it \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  ubuntu:24.04 \
  bash -c '
    nvidia-smi
  '
```

### AMD GPU

```bash
podman run --rm -it \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  --device /dev/dri \
  --device /dev/kfd \
  --group-add keep-groups \
  fedora:latest \
  bash -c '
    dnf install -y mesa-dri-drivers glx-utils
    glxgears
  '
```

## Audio Support

### PulseAudio

Share PulseAudio for sound inside containers:

```bash
podman run --rm -it \
  -e DISPLAY=$DISPLAY \
  -e PULSE_SERVER=unix:/tmp/pulse/native \
  -e PULSE_COOKIE=/tmp/pulse/cookie \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  -v $XDG_RUNTIME_DIR/pulse/native:/tmp/pulse/native:ro \
  -v ~/.config/pulse/cookie:/tmp/pulse/cookie:ro \
  fedora:latest \
  bash -c '
    dnf install -y pulseaudio-utils
    paplay /usr/share/sounds/freedesktop/stereo/bell.oga
  '
```

### PipeWire

For systems using PipeWire:

```bash
podman run --rm -it \
  -e DISPLAY=$DISPLAY \
  -e XDG_RUNTIME_DIR=/tmp/runtime \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  -v $XDG_RUNTIME_DIR/pipewire-0:/tmp/runtime/pipewire-0:ro \
  fedora:latest \
  bash -c '
    dnf install -y pipewire-utils
    pw-cli info
  '
```

## Practical Examples

### Running Firefox in a Container

```dockerfile
# Containerfile.firefox
FROM fedora:latest

RUN dnf install -y \
    firefox \
    mesa-dri-drivers \
    mesa-libGL \
    libX11 \
    pulseaudio-libs \
    dbus-x11 \
    dejavu-sans-fonts \
    && dnf clean all

RUN useradd -m -s /bin/bash firefox
USER firefox
WORKDIR /home/firefox

ENTRYPOINT ["firefox", "--no-remote"]
```

```bash
podman build -t firefox-container -f Containerfile.firefox .

podman run --rm \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  --device /dev/dri \
  --group-add keep-groups \
  -v firefox-profile:/home/firefox/.mozilla:Z \
  --shm-size=2g \
  firefox-container
```

### Running VS Code in a Container

```dockerfile
# Containerfile.vscode
FROM fedora:latest

RUN rpm --import https://packages.microsoft.com/keys/microsoft.asc && \
    echo -e "[code]\nname=Visual Studio Code\nbaseurl=https://packages.microsoft.com/yumrepos/vscode\nenabled=1\ngpgcheck=1\ngpgkey=https://packages.microsoft.com/keys/microsoft.asc" > /etc/yum.repos.d/vscode.repo && \
    dnf install -y code mesa-dri-drivers libX11 libXScrnSaver && \
    dnf clean all

RUN useradd -m developer
USER developer
WORKDIR /home/developer

ENTRYPOINT ["code", "--no-sandbox"]
```

```bash
podman build -t vscode-container -f Containerfile.vscode .

podman run --rm \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  --device /dev/dri \
  --group-add keep-groups \
  -v vscode-config:/home/developer/.config/Code:Z \
  -v $(pwd):/home/developer/workspace:Z \
  --shm-size=2g \
  vscode-container
```

### Running GIMP in a Container

```dockerfile
# Containerfile.gimp
FROM fedora:latest

RUN dnf install -y gimp mesa-dri-drivers dejavu-sans-fonts && dnf clean all

RUN useradd -m artist
USER artist
WORKDIR /home/artist

ENTRYPOINT ["gimp"]
```

```bash
podman build -t gimp-container -f Containerfile.gimp .

podman run --rm \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  --device /dev/dri \
  --group-add keep-groups \
  -v ~/Pictures:/home/artist/Pictures:Z \
  gimp-container
```

## Shared Memory for Browser Performance

Browsers and Electron apps need larger shared memory:

```bash
podman run --rm \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  --shm-size=2g \
  my-browser-app
```

Without increased `--shm-size`, browsers may crash or display rendering errors.

## Creating Desktop Shortcuts

Create `.desktop` files to launch containerized apps like native applications:

```ini
# ~/.local/share/applications/podman-firefox.desktop
[Desktop Entry]
Name=Firefox (Container)
Comment=Firefox running in a Podman container
Exec=bash -c "podman run --rm -e DISPLAY=\\$DISPLAY -v /tmp/.X11-unix:/tmp/.X11-unix:ro --device /dev/dri --group-add keep-groups -v firefox-profile:/home/firefox/.mozilla:Z --shm-size=2g firefox-container"
Icon=firefox
Type=Application
Categories=Network;WebBrowser;
```

## Conclusion

Running GUI applications in Podman containers provides isolation and portability for desktop software. Whether you need to run a browser in a sandbox, test applications across distributions, or distribute complex software, Podman's support for X11, Wayland, GPU passthrough, and audio makes containerized GUI applications practical. The key is matching the display protocol and providing the right device access for your specific setup.
