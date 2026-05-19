# Validation Summary: How to Run Docker Without sudo on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker (Docker Engine, Docker CLI, Docker contexts)
- Rootless Docker (`dockerd-rootless-setuptool.sh`, slirp4netns, uidmap)
- Ubuntu / Linux user-group management (`usermod`, `deluser`, `gpasswd`, `newgrp`, `groups`, `id`, `getent`)
- systemd user services (`systemctl --user`)
- SSH (Unix-socket forwarding with `ssh -NL`)
- CI/CD runners (GitLab Runner, Jenkins, GitHub Actions self-hosted runner)

## Sources Consulted
- Docker docs — Post-installation steps for Linux (manage Docker as a non-root user): https://docs.docker.com/engine/install/linux-postinstall/
- Docker docs — Run the Docker daemon as a non-root user (Rootless mode): https://docs.docker.com/engine/security/rootless/
- Docker docs — Docker contexts: https://docs.docker.com/engine/manage-resources/contexts/
- Docker CLI reference — `docker context create`: https://docs.docker.com/reference/cli/docker/context/create/
- Debian/Ubuntu `deluser(8)` manpage (used `deluser USER GROUP` form): https://manpages.ubuntu.com/manpages/jammy/man8/deluser.8.html
- `gpasswd(1)` manpage (used `gpasswd -d`): https://manpages.ubuntu.com/manpages/jammy/man1/gpasswd.1.html
- `newgrp(1)` manpage: https://manpages.ubuntu.com/manpages/jammy/man1/newgrp.1.html
- OpenSSH `ssh(1)` manpage (Unix-socket forwarding via `-L`): https://man.openbsd.org/ssh
- Local verification with `which deluser gpasswd` on Ubuntu

## Issues Found
- **Non-existent command `gdeluser`.** The "Removing Docker Group Membership" section showed `sudo gdeluser user docker`. There is no `gdeluser` binary on Ubuntu; the standard Debian/Ubuntu command for removing a user from a group is `deluser USER GROUP`. Changed `gdeluser` → `deluser`. The alternative `gpasswd -d $USER docker` line was already correct and was left as-is.

## Review Notes
- The security warning that "adding a user to the `docker` group is functionally equivalent to passwordless root" is accurate and matches Docker's own post-install documentation.
- The privilege-escalation demo (`docker run --rm -v /:/mnt alpine chroot /mnt sh`) is a correct and well-known illustration.
- `ssh -NL /tmp/docker.sock:/var/run/docker.sock user@dockerhost` is valid: OpenSSH supports forwarding to a local Unix socket path via `-L`. Worth noting (not corrected, since the post is fine as written) that the local socket file must not already exist when the tunnel starts; the user may need to `rm -f /tmp/docker.sock` between runs.
- The rootless-mode workflow (`uidmap` prerequisite, `dockerd-rootless-setuptool.sh install`, `systemctl --user enable/start docker`, `DOCKER_HOST=unix://$XDG_RUNTIME_DIR/docker.sock`) matches the official rootless documentation. For unattended user services to start at boot (rather than on first login) `loginctl enable-linger $USER` is normally also required — not mentioned, but outside the post's scope.
- The `docker context create ... --docker "host=ssh://..."` syntax is current and correct per the Docker CLI reference.
- `groups`, `id`, `getent group docker`, and the `newgrp docker` vs. logout explanation are all accurate.
- No version-specific concerns: the commands shown work on Ubuntu 22.04 and 24.04 with Docker Engine 24.x–28.x.
