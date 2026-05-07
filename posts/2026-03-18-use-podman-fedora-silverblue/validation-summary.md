# Validation Summary: How to Use Podman on Fedora Silverblue

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fedora Silverblue
- rpm-ostree
- Podman
- Toolbx / `toolbox`
- Distrobox
- systemd user services and Quadlet
- Compose / `podman compose`

## Sources Consulted
- Fedora Docs: Getting Started - https://docs.fedoraproject.org/en-US/fedora-silverblue/getting-started/
- Fedora Docs: Toolbx - https://docs.fedoraproject.org/en-US/fedora-silverblue/toolbox/
- Fedora Docs: Updates, Upgrades & Rollbacks - https://docs.fedoraproject.org/en-US/fedora-silverblue/updates-upgrades-rollbacks/
- Podman documentation: `podman(1)` - https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman documentation: `podman-run(1)` - https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman documentation: `podman-compose(1)` - https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Podman documentation: `podman-systemd.unit(5)` - https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Fedora Packages: `distrobox` - https://packages.fedoraproject.org/pkgs/distrobox/distrobox
- Fedora Packages: `podman-compose` - https://packages.fedoraproject.org/pkgs/podman-compose/podman-compose/
- `containers-storage.conf(5)` man page - https://www.mankier.com/5/containers-storage.conf
- Compose Specification: Version and name top-level elements - https://compose-spec.github.io/compose-spec/04-version-and-name.html

## Issues Found
- The intro and Silverblue overview overstated containers and Podman as the primary application-management path. Fedora's Silverblue documentation distinguishes Flatpak for GUI apps, Toolbx for mutable CLI/development environments, and rpm-ostree package layering for host-level packages. The wording was corrected to match that model while still describing Podman accurately.
- The GUI container example mixed Wayland and X11 details and mounted the Wayland socket inconsistently with the `XDG_RUNTIME_DIR` seen inside the container. It was corrected to a Wayland-focused example that mounts the runtime directory at the same path inside the container, and the GPU example was updated to match.
- The Quadlet section instructed readers to run `systemctl --user enable dev-database.service`. Quadlet's generator applies the `[Install]` section during generation, so the post was corrected to reload the user systemd instance and start the generated service instead.
- The storage configuration example claimed to move container data but showed the default-style rootless storage path and omitted the SELinux implication of changing `graphroot`. It was corrected to a real custom rootless `graphroot` example and now notes that the new path must be relabeled on SELinux systems.
- The compose section used `pip install podman-compose` inside a Fedora toolbox and invoked `podman-compose` directly. It was updated to install Fedora's packaged `podman-compose` provider with `dnf`, use Podman's documented `podman compose` wrapper, and remove the obsolete top-level `version` key from the compose file.

## Review Notes
- The GUI example now assumes a Wayland session, which is the default on current Fedora Silverblue systems. X11 container setups typically need additional authentication handling that is outside the scope of this post.
- The Quadlet example is a user service. If the goal is to keep the service running without an active login session or to start it before login, additional systemd configuration such as user lingering would be needed.
