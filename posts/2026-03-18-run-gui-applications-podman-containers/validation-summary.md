# Validation Summary: How to Run GUI Applications in Podman Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux containers
- X11 and Xauthority
- Wayland and XWayland
- Intel, AMD, and NVIDIA GPU device access
- NVIDIA Container Toolkit and CDI
- PulseAudio
- PipeWire
- freedesktop.org desktop entries
- Fedora package management with dnf

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/v4.3/markdown/podman-run.1.html
- Podman `podman-build` documentation: https://docs.podman.io/en/v4.1.1/markdown/podman-build.1.html
- NVIDIA Container Toolkit CDI support documentation: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.18.0/cdi-support.html
- XDG Base Directory Specification: https://specifications.freedesktop.org/basedir-spec/latest/
- Desktop Entry Specification: https://specifications.freedesktop.org/desktop-entry-spec/latest-single/
- PipeWire daemon documentation: https://docs.pipewire.org/page_daemon.html
- PulseAudio network documentation: https://www.freedesktop.org/wiki/Software/PulseAudio/Documentation/User/Network/
- PulseAudio environment variable documentation: https://man.archlinux.org/man/pulseaudio.1
- X.Org X manual and Xsecurity notes: https://www.x.org/docs/man/man.pdf
- Fedora package listings for xeyes and glx-utils: https://packages.fedoraproject.org/
- Docker Hub NVIDIA CUDA image tags: https://hub.docker.com/r/nvidia/cuda/tags

## Issues Found
- The Xauthority bind mount used `$XAUTHORITY` directly, which fails when the variable is unset even though Xlib defaults to `$HOME/.Xauthority`. Changed it to `${XAUTHORITY:-$HOME/.Xauthority}`.
- GPU examples passed `/dev/dri` or `/dev/kfd` into containers without preserving supplementary groups. Podman documents that rootless device access can fail when the user has device permissions through a group, so `--group-add keep-groups` was added to the Intel, AMD, Firefox, VS Code, GIMP, and desktop shortcut examples.
- The NVIDIA CDI generation path used `/etc/cdi/nvidia.yaml`. Current NVIDIA Container Toolkit documentation recommends `/var/run/cdi/nvidia.yaml` for manual CDI generation, so the command was updated.
- The NVIDIA example used `nvidia/cuda:12.0-base`, which is not a reliable current NVIDIA CUDA image tag format. Changed the verification container to `ubuntu:24.04`, matching NVIDIA's CDI documentation pattern for running `nvidia-smi` with injected devices.
- The PulseAudio example mounted the authentication cookie but did not tell PulseAudio clients to use that path. Added `PULSE_COOKIE=/tmp/pulse/cookie`.
- The `.desktop` file used shell-style single quotes in the `Exec` key. The Desktop Entry Specification requires arguments containing reserved characters to be double-quoted with proper escaping, so the command was updated accordingly.

## Review Notes
The remaining examples are Linux-desktop-specific and may still need local adjustment for SELinux policy, host compositor security policy, or distributions with different package names. Podman was not installed in the local review environment, so CLI flags were verified against official documentation rather than executed locally.
