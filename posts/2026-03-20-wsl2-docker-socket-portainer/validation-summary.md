# Validation Summary: How to Troubleshoot WSL2 Docker Socket Issues with Portainer - Part 3

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- WSL2 (Windows Subsystem for Linux 2)
- Docker Engine / Docker Desktop
- Docker Unix socket (`/var/run/docker.sock`)
- Portainer CE
- systemd (in WSL2 via `/etc/wsl.conf`)
- Ubuntu / Linux shell utilities (`usermod`, `newgrp`, `service`, `systemctl`, `pgrep`, `chmod`, `chown`)

## Sources Consulted
- Microsoft WSL documentation — systemd support via `/etc/wsl.conf` (https://learn.microsoft.com/en-us/windows/wsl/systemd)
- Microsoft WSL docs — `wsl --shutdown` command (https://learn.microsoft.com/en-us/windows/wsl/basic-commands)
- Docker Engine post-install docs — manage Docker as non-root user, `usermod -aG docker` (https://docs.docker.com/engine/install/linux-postinstall/)
- Docker Engine install on Ubuntu — `docker-ce` package removal (https://docs.docker.com/engine/install/ubuntu/)
- Docker Engine API docs — Unix socket at `/var/run/docker.sock`, `GET /version` endpoint (https://docs.docker.com/reference/api/engine/)
- Docker Desktop WSL integration settings docs (https://docs.docker.com/desktop/wsl/)
- Portainer CE deployment docs — socket bind-mount `/var/run/docker.sock:/var/run/docker.sock` (https://docs.portainer.io/start/install-ce/server/docker/linux)
- `curl` manpage — `--unix-socket <path>` option (https://curl.se/docs/manpage.html)
- GNU `wget` manpage — confirmed `--unix-socket` is NOT a supported flag (https://www.gnu.org/software/wget/manual/wget.html)
- Verified on the local system with `wget --help` and `curl --help all`

## Issues Found
- **Invalid `wget --unix-socket` flag.** In Issue 4 the post suggested testing Docker socket connectivity with `docker exec portainer wget -q --spider --unix-socket /var/run/docker.sock http://localhost/version`. Neither GNU `wget` nor BusyBox `wget` supports `--unix-socket`; only `curl` does. Running that command would fail with an "unrecognized option" error. Replaced it with a host-side `curl --unix-socket /var/run/docker.sock http://localhost/version` command, which is the standard way to hit the Docker Engine API over the Unix socket, and added a brief note explaining why `wget` was not used.

## Review Notes
- The `/etc/wsl.conf` systemd boot option requires WSL 0.67.6 or later (bundled with Windows 11 22H2 and available on Windows 10 via the Microsoft Store WSL package). Readers on older WSL builds will need to update WSL (`wsl --update`) for the `[boot] systemd=true` stanza to take effect. The post's "Ubuntu 22.04+ with WSL2" phrasing is a reasonable approximation, though the gating factor is the WSL version rather than the distro version.
- `sudo chmod 666 /var/run/docker.sock` (Issue 6) is widely suggested but is a real security concern: it grants any local user full control of the Docker daemon, which is effectively root on the host. The post already recommends the group-based alternative (`chown root:docker` + `chmod 660`), which is the correct approach, so this is fine as written.
- `sudo apt remove docker-ce` (Issue 5) removes only the Engine package; users who installed via Docker's convenience script may also want to remove `docker-ce-cli`, `containerd.io`, `docker-buildx-plugin`, and `docker-compose-plugin` for a full uninstall. Not an error, just a minor completeness note.
- The "Window" tag appears to be a typo for "Windows" but tags are metadata rather than a technical claim, so I left it alone per the instructions to only fix technical errors.
