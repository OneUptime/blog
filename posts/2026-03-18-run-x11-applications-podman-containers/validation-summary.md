# Validation Summary: How to Run X11 Applications in Podman Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- X11 / X.Org
- Xauthority and xhost
- Fedora container images and packages
- Xephyr
- Xpra
- OpenGL / DRI
- GTK and Qt GUI applications

## Sources Consulted
- Podman `podman run` official documentation: https://docs.podman.io/en/stable/markdown/podman-run.1.html
- Podman `podman build` official documentation: https://docs.podman.io/en/stable/markdown/podman-build.1.html
- X.Org Xsecurity manual: https://www.x.org/archive/X11R7.5/doc/man/man7/Xsecurity.7.html
- Local `xhost(1)` man page from xhost 1.0.9
- Local `xauth(1)` man page from xauth 1.1.2
- Fedora package page for `xeyes`: https://packages.fedoraproject.org/pkgs/xeyes/xeyes/
- Fedora package page for `xclock`: https://packages.fedoraproject.org/pkgs/xclock/xclock/
- Fedora package page for `glx-utils`: https://packages.fedoraproject.org/pkgs/mesa-demos/glx-utils/
- Fedora package page for `xorg-x11-server-Xephyr`: https://packages.fedoraproject.org/pkgs/xorg-x11-server/xorg-x11-server-Xephyr/
- Xpra project documentation / README: https://github.com/Xpra-org/xpra

## Issues Found
- The container-specific Xauthority examples parsed `DISPLAY` manually into `:${DISPLAY_NUM}`. That is brittle for displays such as `localhost:10.0`. Changed the commands to pass `"$DISPLAY"` directly to `xauth nlist`, which `xauth` supports.
- The generated Xauthority file was left with `mktemp`'s default restrictive permissions. That can prevent images running as a non-root container user from reading `/tmp/.Xauthority`. Added `chmod 644 "$XAUTH_FILE"` after generating the temporary file.
- GPU examples shared `/dev/dri` but did not preserve the host user's supplementary groups. Podman's documentation notes that rootless containers can fail to access group-restricted devices unless `--group-add keep-groups` is used. Added that option to the DRI examples and helper script.
- The `xhost` restriction example said it allowed the container UID. `xhost +si:localuser:$(id -un)` allows the host local user that the process maps to, not a container UID in the abstract. Updated the comment.

## Review Notes
Podman was not installed in the review environment, so Podman CLI behavior was verified against the official Podman documentation rather than local `podman --help` output. The post remains focused on local Linux/X11 use; Podman remote clients and non-Linux hosts have different constraints for GUI applications and device access.
