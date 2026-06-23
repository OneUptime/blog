# Validation Summary: How to Run Docker Without Root (Rootless Mode)

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Docker (rootless mode / rootless daemon)
- RootlessKit
- Linux user namespaces (subuid/subgid)
- systemd user services
- slirp4netns / pasta (passt) networking backends
- cgroup v2 delegation
- overlay2 / fuse-overlayfs storage drivers

## Sources Consulted
- Docker Docs — Rootless mode: https://docs.docker.com/engine/security/rootless/
- Docker Docs — Rootless mode tips (cgroup v2 delegation): https://docs.docker.com/engine/security/rootless/tips/
- Docker Docs — Rootless troubleshooting: https://docs.docker.com/engine/security/rootless/troubleshoot/
- Rootless Containers — cgroup v2 setup: https://rootlesscontaine.rs/getting-started/common/cgroup2/
- Rootless Containers — Docker/Moby: https://rootlesscontaine.rs/getting-started/docker/
- RootlessKit network docs: https://github.com/rootless-containers/rootlesskit/blob/master/docs/network.md

## Issues Found

1. **Incorrect pasta networking configuration (factual error).**
   The post instructed readers to enable the pasta network backend by writing
   `{"features": {"containerd-snapshotter": true}}` to `~/.config/docker/daemon.json`.
   That `containerd-snapshotter` feature enables the containerd image store and has
   nothing to do with networking — it would not switch the backend to pasta. Per the
   Docker docs and RootlessKit, pasta is selected via the
   `DOCKERD_ROOTLESS_ROOTLESSKIT_NET=pasta` environment variable, set in a systemd
   user-service drop-in override. Replaced the JSON snippet with a correct
   `~/.config/systemd/user/docker.service.d/override.conf` example followed by
   `systemctl --user daemon-reload` and `systemctl --user restart docker`.

2. **Broken file-creation command in the cgroup delegation section (shell bug).**
   The post used `sudo cat > /etc/systemd/system/user@.service.d/delegate.conf << EOF`.
   With `sudo cat > file`, the output redirection (`>`) is performed by the calling
   shell as the *unprivileged* user, not by sudo, so it fails with "permission denied"
   on a root-owned directory. Replaced it with `sudo tee <file> > /dev/null << EOF`,
   which is the correct idiom for writing a root-owned file from a heredoc, and added a
   short clarifying comment. The delegated controllers (`cpu cpuset io memory pids`) and
   the subsequent `sudo systemctl daemon-reload` match the official docs.

## Review Notes
- The verification commands, install steps (`dockerd-rootless-setuptool.sh install`,
  `curl -fsSL https://get.docker.com/rootless | sh`), `usermod --add-subuids/--add-subgids`,
  systemd user-service management, `loginctl enable-linger`, the `setcap`/`sysctl
  net.ipv4.ip_unprivileged_port_start` low-port workarounds, the `~/.local/share/docker`
  data layout, `data-root` relocation, and `fuse-overlayfs` guidance are all accurate.
- `cat /proc/sys/kernel/unprivileged_userns_clone` is a Debian/Ubuntu/Arch-specific
  sysctl. On Fedora/RHEL this file typically does not exist (user namespaces are enabled
  by default and there is no such knob), so the command will report "No such file or
  directory" there. Not incorrect for the Debian/Ubuntu context shown, so left as-is.
- The `/proc/1/uid_map` example output `0 <your-uid> 1` is consistent with the default
  rootless setup where the container shares the RootlessKit user namespace and namespace
  UID 0 maps to the host user's UID for a range of 1.
- The "Privileged containers → Use `--security-opt` instead" table cell is a vague
  workaround; `--security-opt` does not replace `--privileged`. Left unchanged as it is
  an editorial simplification rather than an outright code/command error, but a future
  revision could clarify it.
