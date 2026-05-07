# Validation Summary: How to Run Wayland Applications in Podman Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Wayland
- XWayland
- Fedora containers
- Mesa / DRI GPU devices
- GTK4
- Qt6
- Firefox
- Chromium
- PipeWire and PulseAudio compatibility
- XDG Desktop Portal

## Sources Consulted
- Podman run documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Wayland `wl_display` documentation: https://man.archlinux.org/man/extra/wayland-docs/wl_display.3.en
- XDG Desktop Portal ScreenCast API: https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.ScreenCast.html
- PipeWire native protocol documentation: https://docs.pipewire.org/page_module_protocol_native.html
- grim manual page: https://man.archlinux.org/man/grim.1.en
- Fedora `wayland-utils` package information: https://packages.fedoraproject.org/pkgs/wayland-utils/wayland-utils/index.html
- Fedora `gnome-text-editor` package information: https://packages.fedoraproject.org/pkgs/gnome-text-editor/
- mpv manual: https://mpv.io/manual/stable/

## Issues Found
- The introduction claimed containerized Wayland applications deliver smoother graphics performance. This is not guaranteed by the Wayland or Podman model, so it was changed to say that the setup preserves native desktop integration.
- The GPU section said most Wayland applications need GPU access. Some simple clients can run without direct DRI access or with software rendering, so this was softened to "many" applications need GPU access for accelerated rendering.
- The GPU verification example installed `weston` and ran `weston-info`. `weston-info` is deprecated/superseded by `wayland-info`, and Fedora provides it in `wayland-utils`, so the command was updated.
- The PipeWire audio example used `mpv` without forcing the PipeWire audio output. The example now uses `mpv --ao=pipewire`, matching mpv's documented PipeWire audio driver.
- The audio section did not distinguish native PipeWire clients from applications using PipeWire's PulseAudio compatibility layer. A corrected PulseAudio-compatible socket example was added for those applications.
- The Wayland security example said a container can see all X11 windows and keystrokes and that Wayland can only see its own surface. This was too absolute, especially with XWayland, portals, compositor-specific protocols, and explicitly shared devices. The wording now describes default isolation more accurately.
- The `grim` example claimed screenshots would only capture the app window. `grim` can capture a Wayland desktop when the compositor supports the screencopy protocol, so the example now states that it fails only without compositor support or permission.
- The launcher script did not preserve the host user's UID/GID mapping, which can cause Wayland socket permission problems with rootless Podman and non-root container users. It now includes `--userns=keep-id`.

## Review Notes
Podman was not installed in the local validation environment, so CLI checks were performed against official Podman documentation rather than local `podman --help` output. The examples remain distribution- and compositor-dependent: SELinux labeling, NVIDIA drivers, compositor support for screenshot protocols, and portal backend configuration can still affect behavior.
