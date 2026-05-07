# How to Run X11 Applications in Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, X11, GUI, Container, Linux Desktop

Description: A detailed guide to running X11 graphical applications inside Podman containers, covering socket sharing, authentication, security considerations, and practical application examples.

---

> X11 is the most widely supported display protocol on Linux. Running X11 applications in Podman containers lets you isolate graphical software while maintaining a native look and feel on your desktop.

The X Window System (X11) has been the standard display protocol on Linux for decades. Its client-server architecture makes it naturally suited to containerization. The X server runs on the host, and containerized applications act as X clients, rendering their windows through the host display. This guide covers everything you need to know about running X11 applications in Podman containers.

---

## How X11 Forwarding Works with Containers

X11 uses a client-server model:

1. The X server manages the display hardware and runs on the host
2. X clients (applications) connect to the server via a Unix socket
3. The socket is located at `/tmp/.X11-unix/X0` (for display :0)
4. Authentication is handled through Xauthority cookies

To run an X11 application in a container, you share the X socket and provide the appropriate environment variables.

## Basic X11 Setup

### Minimal Configuration

The minimum required to run an X11 application in a container:

```bash
# Allow local connections to X server

xhost +local:

# Run an X11 application
podman run --rm -it \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  fedora:latest \
  bash -c 'dnf install -y xeyes && xeyes'
```

The `xhost +local:` command allows any local user to connect to the X server. This is sufficient for development but has security implications discussed later.

### With Xauthority Authentication

A more secure approach uses Xauthority cookies:

```bash
podman run --rm -it \
  -e DISPLAY=$DISPLAY \
  -e XAUTHORITY=/tmp/.Xauthority \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  -v $HOME/.Xauthority:/tmp/.Xauthority:ro \
  fedora:latest \
  bash -c 'dnf install -y xclock && xclock'
```

This passes the authentication token so the container can prove it is authorized to connect to the X server.

### Generating a Container-Specific Xauthority

For better isolation, create an Xauthority file specific to the container:

```bash
#!/bin/bash
# generate-xauth.sh

XAUTH_FILE=$(mktemp /tmp/.podman-xauth-XXXXXX)

# Extract and modify the auth entry
xauth nlist "$DISPLAY" | sed 's/^..../ffff/' | xauth -f "$XAUTH_FILE" nmerge -
chmod 644 "$XAUTH_FILE"

echo "Generated Xauthority: $XAUTH_FILE"

podman run --rm -it \
  -e DISPLAY=$DISPLAY \
  -e XAUTHORITY=/tmp/.Xauthority \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  -v "$XAUTH_FILE":/tmp/.Xauthority:ro \
  fedora:latest \
  bash -c 'dnf install -y xeyes && xeyes'

# Clean up
rm -f "$XAUTH_FILE"
```

## Building X11-Ready Container Images

### Base Image for X11 Applications

```dockerfile
# Containerfile.x11-base
FROM fedora:latest

# Install X11 libraries and common dependencies
RUN dnf install -y \
    libX11 \
    libXext \
    libXrender \
    libXrandr \
    libXcursor \
    libXi \
    libXtst \
    libXcomposite \
    libXdamage \
    libXfixes \
    libXScrnSaver \
    mesa-libGL \
    mesa-dri-drivers \
    fontconfig \
    dejavu-sans-fonts \
    dejavu-serif-fonts \
    dejavu-sans-mono-fonts \
    google-noto-emoji-fonts \
    dbus-x11 \
    at-spi2-core \
    && dnf clean all

# Create application user
RUN useradd -m -s /bin/bash appuser
USER appuser
WORKDIR /home/appuser

ENV DISPLAY=:0
```

### GTK Application Image

```dockerfile
# Containerfile.gtk-app
FROM fedora:latest

RUN dnf install -y \
    gtk3 \
    adwaita-icon-theme \
    mesa-dri-drivers \
    libX11 \
    dejavu-sans-fonts \
    dbus-x11 \
    && dnf clean all

# Install your GTK application
RUN dnf install -y gedit && dnf clean all

RUN useradd -m appuser
USER appuser

ENTRYPOINT ["gedit"]
```

### Qt Application Image

```dockerfile
# Containerfile.qt-app
FROM fedora:latest

RUN dnf install -y \
    qt5-qtbase \
    qt5-qtbase-gui \
    qt5-qtsvg \
    qt5-qtx11extras \
    mesa-dri-drivers \
    libX11 \
    dejavu-sans-fonts \
    && dnf clean all

RUN useradd -m appuser
USER appuser

# Qt platform plugin
ENV QT_QPA_PLATFORM=xcb
```

## Practical Application Examples

### Running LibreOffice

```bash
podman run --rm \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  --device /dev/dri \
  --group-add keep-groups \
  -v ~/Documents:/home/appuser/Documents:Z \
  fedora:latest \
  bash -c '
    dnf install -y libreoffice-writer dejavu-sans-fonts mesa-dri-drivers
    libreoffice --writer
  '
```

### Running Inkscape

```dockerfile
# Containerfile.inkscape
FROM fedora:latest

RUN dnf install -y inkscape mesa-dri-drivers dejavu-sans-fonts && dnf clean all

RUN useradd -m artist
USER artist
WORKDIR /home/artist

ENTRYPOINT ["inkscape"]
```

```bash
podman build -t inkscape-pod -f Containerfile.inkscape .

podman run --rm \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  --device /dev/dri \
  --group-add keep-groups \
  -v ~/Pictures:/home/artist/Pictures:Z \
  inkscape-pod
```

### Running a Terminal Emulator

```bash
podman run --rm -it \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  fedora:latest \
  bash -c '
    dnf install -y xterm dejavu-sans-mono-fonts
    xterm -fa "DejaVu Sans Mono" -fs 12
  '
```

## X11 Security Considerations

### The Risks of X11 Sharing

Sharing the X11 socket gives the container access to:

- All keystrokes on all windows (keylogging potential)
- Screen capture of all windows
- Window manipulation (moving, resizing, closing other windows)
- Clipboard contents

### Mitigating X11 Risks

#### Use Xephyr for Nested Display

Xephyr creates an isolated X server inside a window:

```bash
# Install Xephyr
sudo dnf install -y xorg-x11-server-Xephyr

# Start a nested X display
Xephyr :1 -screen 1280x800 &

# Run the container on the nested display
podman run --rm -it \
  -e DISPLAY=:1 \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  fedora:latest \
  bash -c 'dnf install -y xeyes && xeyes'
```

Applications in the container can only see the Xephyr window, not your full desktop.

#### Use Xpra for Better Isolation

Xpra provides seamless window integration with better security:

```bash
# Install Xpra on the host
sudo dnf install -y xpra

# Start Xpra server
xpra start :100

# Run container with Xpra display
podman run --rm -it \
  -e DISPLAY=:100 \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  fedora:latest \
  bash -c 'dnf install -y xclock && xclock'

# Attach to see the windows
xpra attach :100
```

#### Restrict X11 Access with xhost

Limit which users can connect:

```bash
# Remove blanket access
xhost -

# Allow only the host user that the container process maps to
xhost +si:localuser:$(id -un)
```

## Hardware Acceleration

### OpenGL with DRI

Share the DRI device for hardware-accelerated rendering:

```bash
podman run --rm -it \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  --device /dev/dri \
  --group-add keep-groups \
  fedora:latest \
  bash -c '
    dnf install -y glx-utils mesa-dri-drivers
    echo "Renderer: $(glxinfo | grep "OpenGL renderer")"
    glxgears -info
  '
```

### Verifying GPU Access

```bash
podman run --rm -it \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  --device /dev/dri \
  --group-add keep-groups \
  fedora:latest \
  bash -c '
    dnf install -y glx-utils mesa-dri-drivers
    echo "=== GPU Info ==="
    glxinfo | grep -E "vendor|renderer|version"
    echo ""
    echo "=== Direct Rendering ==="
    glxinfo | grep "direct rendering"
  '
```

## Font Configuration

Ensure proper font rendering inside containers:

```bash
podman run --rm -it \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  -v /usr/share/fonts:/usr/share/fonts:ro \
  -v ~/.config/fontconfig:/home/appuser/.config/fontconfig:ro \
  fedora:latest \
  bash -c '
    fc-cache -f
    fc-list | head -20
  '
```

## DPI and Scaling

Handle high-DPI displays:

```bash
podman run --rm -it \
  -e DISPLAY=$DISPLAY \
  -e GDK_SCALE=2 \
  -e GDK_DPI_SCALE=0.5 \
  -e QT_SCALE_FACTOR=2 \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  my-gui-app
```

## Helper Script for X11 Containers

Create a reusable launcher script:

```bash
#!/bin/bash
# x11-podman-run.sh - Launch X11 applications in Podman containers

set -e

IMAGE="${1:?Usage: $0 <image> [command...]}"
shift

# Generate container-specific Xauth
XAUTH_FILE=$(mktemp /tmp/.podman-xauth-XXXXXX)
trap "rm -f $XAUTH_FILE" EXIT

xauth nlist "$DISPLAY" 2>/dev/null | sed 's/^..../ffff/' | \
  xauth -f "$XAUTH_FILE" nmerge - 2>/dev/null
chmod 644 "$XAUTH_FILE"

podman run --rm -it \
  -e DISPLAY=$DISPLAY \
  -e XAUTHORITY=/tmp/.Xauthority \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  -v "$XAUTH_FILE":/tmp/.Xauthority:ro \
  --device /dev/dri \
  --group-add keep-groups \
  --shm-size=256m \
  "$IMAGE" "$@"
```

Usage:

```bash
chmod +x x11-podman-run.sh
./x11-podman-run.sh fedora:latest bash
./x11-podman-run.sh firefox-container
```

## Conclusion

Running X11 applications in Podman containers is a well-established pattern that works with the vast majority of Linux graphical applications. The key requirements are sharing the X11 socket, providing display environment variables, and handling authentication. For security-sensitive use cases, tools like Xephyr and Xpra provide isolation between the container and your desktop. With GPU passthrough and proper font configuration, containerized X11 applications can perform and look just like native ones.
