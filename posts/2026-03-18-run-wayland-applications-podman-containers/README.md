# How to Run Wayland Applications in Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Wayland, GUI, Container, Linux Desktop

Description: Learn how to run Wayland-native and XWayland applications inside Podman containers, with support for GPU acceleration, input devices, and screen sharing.

---

> Wayland is the modern display protocol replacing X11 on Linux desktops. Running Wayland applications in Podman containers offers better security isolation than X11 while preserving native desktop integration.

Wayland addresses many of the security limitations of X11 by design. Each application gets its own rendering surface, and applications cannot snoop on each other's input or output. Running Wayland applications in containers adds another layer of isolation. This guide covers how to set up and run Wayland-native applications in Podman containers.

---

## Understanding Wayland Architecture

Wayland differs from X11 in several important ways:

- **Compositor-based**: The Wayland compositor handles both window management and display
- **Per-client isolation**: Applications cannot access each other's buffers
- **Socket-based**: Communication happens through a Unix socket in `$XDG_RUNTIME_DIR`
- **No network transparency**: Unlike X11, Wayland is designed for local use

The Wayland socket is typically at `$XDG_RUNTIME_DIR/wayland-0`.

### Checking Your Wayland Setup

```bash
# Verify Wayland is running

echo $WAYLAND_DISPLAY    # Should output: wayland-0 or similar
echo $XDG_RUNTIME_DIR    # Should output: /run/user/<uid>

# Check the socket exists
ls -la $XDG_RUNTIME_DIR/$WAYLAND_DISPLAY
```

## Basic Wayland Container Setup

### Sharing the Wayland Socket

The fundamental requirement is sharing the Wayland socket with the container:

```bash
podman run --rm -it \
  -e WAYLAND_DISPLAY=$WAYLAND_DISPLAY \
  -e XDG_RUNTIME_DIR=/tmp/runtime-dir \
  -v $XDG_RUNTIME_DIR/$WAYLAND_DISPLAY:/tmp/runtime-dir/$WAYLAND_DISPLAY:ro \
  fedora:latest \
  bash -c '
    dnf install -y foot  # Wayland-native terminal
    foot
  '
```

### With GPU Acceleration

Many Wayland applications need GPU access for accelerated rendering:

```bash
podman run --rm -it \
  -e WAYLAND_DISPLAY=$WAYLAND_DISPLAY \
  -e XDG_RUNTIME_DIR=/tmp/runtime-dir \
  -v $XDG_RUNTIME_DIR/$WAYLAND_DISPLAY:/tmp/runtime-dir/$WAYLAND_DISPLAY:ro \
  --device /dev/dri \
  fedora:latest \
  bash -c '
    dnf install -y mesa-dri-drivers wayland-utils
    wayland-info
  '
```

## Building Wayland-Ready Images

### Base Image for Wayland Applications

```dockerfile
# Containerfile.wayland-base
FROM fedora:latest

# Install Wayland libraries and common dependencies
RUN dnf install -y \
    wayland-devel \
    mesa-libwayland-egl \
    mesa-libEGL \
    mesa-libGL \
    mesa-dri-drivers \
    libxkbcommon \
    fontconfig \
    dejavu-sans-fonts \
    dejavu-serif-fonts \
    dejavu-sans-mono-fonts \
    dbus \
    at-spi2-core \
    && dnf clean all

# Create application user
RUN useradd -m -s /bin/bash appuser
USER appuser
WORKDIR /home/appuser

ENV XDG_RUNTIME_DIR=/tmp/runtime-dir
ENV WAYLAND_DISPLAY=wayland-0
```

### GTK4 Wayland Application

```dockerfile
# Containerfile.gtk4-wayland
FROM fedora:latest

RUN dnf install -y \
    gtk4 \
    adwaita-icon-theme \
    mesa-dri-drivers \
    mesa-libwayland-egl \
    libxkbcommon \
    dejavu-sans-fonts \
    dbus \
    gnome-text-editor \
    && dnf clean all

RUN useradd -m appuser
USER appuser

ENV GDK_BACKEND=wayland
ENV XDG_RUNTIME_DIR=/tmp/runtime-dir

ENTRYPOINT ["gnome-text-editor"]
```

### Qt6 Wayland Application

```dockerfile
# Containerfile.qt6-wayland
FROM fedora:latest

RUN dnf install -y \
    qt6-qtbase \
    qt6-qtwayland \
    mesa-dri-drivers \
    mesa-libwayland-egl \
    libxkbcommon \
    dejavu-sans-fonts \
    && dnf clean all

RUN useradd -m appuser
USER appuser

ENV QT_QPA_PLATFORM=wayland
ENV XDG_RUNTIME_DIR=/tmp/runtime-dir

ENTRYPOINT ["/bin/bash"]
```

## Running Specific Applications

### Firefox on Wayland

```bash
podman run --rm \
  -e WAYLAND_DISPLAY=$WAYLAND_DISPLAY \
  -e XDG_RUNTIME_DIR=/tmp/runtime-dir \
  -e MOZ_ENABLE_WAYLAND=1 \
  -v $XDG_RUNTIME_DIR/$WAYLAND_DISPLAY:/tmp/runtime-dir/$WAYLAND_DISPLAY:ro \
  --device /dev/dri \
  --shm-size=2g \
  -v firefox-wayland-profile:/home/appuser/.mozilla:Z \
  fedora:latest \
  bash -c '
    dnf install -y firefox mesa-dri-drivers dejavu-sans-fonts
    firefox --no-remote
  '
```

### Chromium on Wayland

```bash
podman run --rm \
  -e WAYLAND_DISPLAY=$WAYLAND_DISPLAY \
  -e XDG_RUNTIME_DIR=/tmp/runtime-dir \
  -v $XDG_RUNTIME_DIR/$WAYLAND_DISPLAY:/tmp/runtime-dir/$WAYLAND_DISPLAY:ro \
  --device /dev/dri \
  --shm-size=2g \
  fedora:latest \
  bash -c '
    dnf install -y chromium mesa-dri-drivers dejavu-sans-fonts
    chromium \
      --ozone-platform=wayland \
      --no-sandbox
  '
```

### Running weston-terminal

A lightweight test to verify your Wayland setup:

```bash
podman run --rm -it \
  -e WAYLAND_DISPLAY=$WAYLAND_DISPLAY \
  -e XDG_RUNTIME_DIR=/tmp/runtime-dir \
  -v $XDG_RUNTIME_DIR/$WAYLAND_DISPLAY:/tmp/runtime-dir/$WAYLAND_DISPLAY:ro \
  --device /dev/dri \
  fedora:latest \
  bash -c '
    dnf install -y weston
    weston-terminal
  '
```

## XWayland Compatibility

Many applications still require X11. On Wayland desktops, XWayland provides backward compatibility:

```bash
podman run --rm -it \
  -e DISPLAY=$DISPLAY \
  -e WAYLAND_DISPLAY=$WAYLAND_DISPLAY \
  -e XDG_RUNTIME_DIR=/tmp/runtime-dir \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  -v $XDG_RUNTIME_DIR/$WAYLAND_DISPLAY:/tmp/runtime-dir/$WAYLAND_DISPLAY:ro \
  --device /dev/dri \
  fedora:latest \
  bash -c '
    dnf install -y xeyes
    # This will use XWayland automatically
    xeyes
  '
```

### Forcing Wayland or X11 Backend

Control which backend an application uses:

```bash
# Force GTK to use Wayland
podman run --rm -e GDK_BACKEND=wayland ...

# Force GTK to use X11 (via XWayland)
podman run --rm -e GDK_BACKEND=x11 ...

# Force Qt to use Wayland
podman run --rm -e QT_QPA_PLATFORM=wayland ...

# Force Qt to use X11
podman run --rm -e QT_QPA_PLATFORM=xcb ...
```

## Input Device Access

For applications that need input device access (games, drawing applications):

```bash
podman run --rm -it \
  -e WAYLAND_DISPLAY=$WAYLAND_DISPLAY \
  -e XDG_RUNTIME_DIR=/tmp/runtime-dir \
  -v $XDG_RUNTIME_DIR/$WAYLAND_DISPLAY:/tmp/runtime-dir/$WAYLAND_DISPLAY:ro \
  --device /dev/dri \
  --device /dev/input \
  fedora:latest \
  bash
```

For specific input devices:

```bash
# Share only the drawing tablet
podman run --rm -it \
  --device /dev/input/event5 \
  ...
```

## Audio with PipeWire

Modern Wayland desktops typically use PipeWire for audio:

```bash
podman run --rm \
  -e WAYLAND_DISPLAY=$WAYLAND_DISPLAY \
  -e XDG_RUNTIME_DIR=/tmp/runtime-dir \
  -v $XDG_RUNTIME_DIR/$WAYLAND_DISPLAY:/tmp/runtime-dir/$WAYLAND_DISPLAY:ro \
  -v $XDG_RUNTIME_DIR/pipewire-0:/tmp/runtime-dir/pipewire-0:ro \
  --device /dev/dri \
  fedora:latest \
  bash -c '
    dnf install -y mpv pipewire-utils mesa-dri-drivers
    pw-cli info
    # mpv --ao=pipewire --vo=gpu --gpu-context=wayland video.mp4
  '
```

For applications that use the PulseAudio compatibility layer provided by PipeWire, mount the PulseAudio socket instead:

```bash
podman run --rm \
  -e WAYLAND_DISPLAY=$WAYLAND_DISPLAY \
  -e XDG_RUNTIME_DIR=/tmp/runtime-dir \
  -v $XDG_RUNTIME_DIR/$WAYLAND_DISPLAY:/tmp/runtime-dir/$WAYLAND_DISPLAY:ro \
  -v $XDG_RUNTIME_DIR/pulse/native:/tmp/runtime-dir/pulse/native:ro \
  --device /dev/dri \
  fedora:latest \
  bash -c '
    dnf install -y mpv mesa-dri-drivers
    mpv --ao=pulse --vo=gpu --gpu-context=wayland video.mp4
  '
```

## Screen Sharing and Portal Integration

Wayland uses the XDG Desktop Portal for screen sharing and file dialogs:

```bash
podman run --rm -it \
  -e WAYLAND_DISPLAY=$WAYLAND_DISPLAY \
  -e XDG_RUNTIME_DIR=/tmp/runtime-dir \
  -e DBUS_SESSION_BUS_ADDRESS=unix:path=/tmp/runtime-dir/bus \
  -v $XDG_RUNTIME_DIR/$WAYLAND_DISPLAY:/tmp/runtime-dir/$WAYLAND_DISPLAY:ro \
  -v $XDG_RUNTIME_DIR/bus:/tmp/runtime-dir/bus:ro \
  --device /dev/dri \
  fedora:latest \
  bash
```

## Wayland Security Compared to X11

Wayland provides better default isolation than X11 for containerized applications:

```bash
# With X11: access to the X11 socket can expose other windows and input
# With Wayland: clients do not get global access through the core protocol

# Verify isolation - this should fail on compositors that do not expose
# privileged screenshot protocols to regular clients
podman run --rm -it \
  -e WAYLAND_DISPLAY=$WAYLAND_DISPLAY \
  -e XDG_RUNTIME_DIR=/tmp/runtime-dir \
  -v $XDG_RUNTIME_DIR/$WAYLAND_DISPLAY:/tmp/runtime-dir/$WAYLAND_DISPLAY:ro \
  fedora:latest \
  bash -c '
    dnf install -y grim
    # grim requires compositor support for the screencopy protocol
    grim test.png 2>&1 || echo "Cannot capture the desktop without compositor support or permission"
  '
```

## High DPI and Fractional Scaling

Handle HiDPI displays with Wayland:

```bash
podman run --rm \
  -e WAYLAND_DISPLAY=$WAYLAND_DISPLAY \
  -e XDG_RUNTIME_DIR=/tmp/runtime-dir \
  -e GDK_SCALE=2 \
  -e QT_SCALE_FACTOR=2 \
  -v $XDG_RUNTIME_DIR/$WAYLAND_DISPLAY:/tmp/runtime-dir/$WAYLAND_DISPLAY:ro \
  --device /dev/dri \
  my-wayland-app
```

Wayland compositors handle scaling at the protocol level, so most applications scale correctly without environment variables.

## Launcher Script

Create a reusable launcher for Wayland containers:

```bash
#!/bin/bash
# wayland-podman-run.sh

set -e

IMAGE="${1:?Usage: $0 <image> [command...]}"
shift

RUNTIME_DIR="/tmp/runtime-dir"

podman run --rm -it \
  --userns=keep-id \
  -e WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}" \
  -e XDG_RUNTIME_DIR="$RUNTIME_DIR" \
  -e GDK_BACKEND=wayland \
  -e QT_QPA_PLATFORM=wayland \
  -e MOZ_ENABLE_WAYLAND=1 \
  -v "$XDG_RUNTIME_DIR/$WAYLAND_DISPLAY:$RUNTIME_DIR/$WAYLAND_DISPLAY:ro" \
  --device /dev/dri \
  --shm-size=256m \
  "$IMAGE" "$@"
```

Usage:

```bash
chmod +x wayland-podman-run.sh
./wayland-podman-run.sh fedora:latest bash
```

## Troubleshooting

### "Failed to connect to Wayland display"

Verify the socket is shared correctly:

```bash
# Check the socket exists on host
ls -la $XDG_RUNTIME_DIR/$WAYLAND_DISPLAY

# Verify it is mounted in the container
podman run --rm -it \
  -e XDG_RUNTIME_DIR=/tmp/runtime-dir \
  -v $XDG_RUNTIME_DIR/$WAYLAND_DISPLAY:/tmp/runtime-dir/$WAYLAND_DISPLAY:ro \
  fedora:latest \
  ls -la /tmp/runtime-dir/
```

### Blank or Black Window

This usually indicates missing GPU drivers:

```bash
podman run --rm -it \
  --device /dev/dri \
  fedora:latest \
  bash -c '
    dnf install -y mesa-dri-drivers
    ls -la /dev/dri/
  '
```

### Permission Issues

If the socket is not readable:

```bash
# Check socket permissions on host
ls -la $XDG_RUNTIME_DIR/$WAYLAND_DISPLAY

# Mount with appropriate permissions
podman run --rm -it \
  --userns=keep-id \
  -e WAYLAND_DISPLAY=$WAYLAND_DISPLAY \
  -e XDG_RUNTIME_DIR=/tmp/runtime-dir \
  -v $XDG_RUNTIME_DIR/$WAYLAND_DISPLAY:/tmp/runtime-dir/$WAYLAND_DISPLAY:ro \
  --device /dev/dri \
  fedora:latest bash
```

## Conclusion

Running Wayland applications in Podman containers combines the security benefits of both Wayland and container isolation. Wayland's per-client isolation prevents applications from snooping on each other, and Podman's container boundaries provide filesystem and process separation. As more desktop environments and applications adopt Wayland natively, containerized Wayland applications become an increasingly practical and secure approach to running graphical software.
