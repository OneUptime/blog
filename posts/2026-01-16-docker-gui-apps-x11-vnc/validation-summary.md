# Validation Summary: How to Run GUI Applications in Docker (X11 Forwarding and VNC)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker and Docker Compose
- Linux X11 forwarding and xhost
- XQuartz on macOS
- WSL2 and WSLg on Windows
- TigerVNC
- noVNC and websockify
- PulseAudio
- NVIDIA Container Toolkit and OpenGL
- Ubuntu, XFCE, Firefox, VS Code

## Sources Consulted
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker CLI `docker run` reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Desktop host networking documentation: https://docs.docker.com/desktop/features/networking/networking-how-tos/
- X.Org xhost manual: https://www.x.org/releases/current/doc/man/man1/xhost.1.xhtml
- X.Org Xsecurity manual: https://www.x.org/archive/X11R6.8.0/doc/Xsecurity.7.html
- Microsoft WSLg container guidance: https://github.com/microsoft/wslg/blob/main/samples/container/Containers.md
- TigerVNC project and Ubuntu package metadata: https://github.com/TigerVNC/tigervnc and local `apt-cache show tigervnc-standalone-server`
- noVNC README: https://github.com/novnc/noVNC
- NVIDIA Container Toolkit Docker documentation: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/docker-specialized.html
- NVIDIA Container Toolkit install guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- Local Docker CLI help output: `docker run --help`

## Issues Found
- The "Secure X11 Forwarding" example started the GUI container before granting X server access and tried to grant access using the container hostname. Changed it to grant access to the current local user with `xhost +SI:localuser:$(id -un)` before running the container as that UID/GID, matching X.Org's server-interpreted local user access model.
- Several Docker Compose examples used the obsolete top-level `version` field. Removed `version: '3.8'` from the Compose snippets because current Compose treats it as informative only and warns that it is obsolete.
- The WSLg Docker example omitted `XDG_RUNTIME_DIR` and `PULSE_SERVER`, which WSLg documents for Wayland and PulseAudio access. Added both environment variables while keeping the existing X11 and `/mnt/wslg` mounts.
- The full desktop Dockerfile configured TigerVNC to run `startxfce4` but did not install XFCE or `dbus-x11`. Added `xfce4`, `xfce4-goodies`, and `dbus-x11`.
- The VS Code development Dockerfile used `gpg --dearmor` and added a sudoers rule but did not install `gnupg`, `sudo`, or `ca-certificates`. Added those packages to the development tools install step.
- The PulseAudio Compose example used `host.docker.internal` without defining it for Linux Docker Engine. Added `extra_hosts: ["host.docker.internal:host-gateway"]` so the name resolves outside Docker Desktop environments that require explicit host-gateway mapping.
- The OpenGL `docker run` example ran `glxgears` from an NVIDIA OpenGL runtime image without installing `mesa-utils`, which provides `glxgears` on Ubuntu. Updated the command to install `mesa-utils` before running `glxgears`.

## Review Notes
The remaining examples are broadly correct as illustrative snippets, but several use placeholder images such as `firefox`, `my-gui-app`, and `my-multimedia-app`; readers still need a suitable image or the provided Dockerfile examples. The VNC/noVNC examples expose remote desktop services and use demonstration passwords, so production deployments should replace those with secrets, strong authentication, and TLS as the post already notes.
