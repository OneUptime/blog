# Validation Summary: How to Set Up Sysdig for Container and System Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Sysdig (open-source kernel-level instrumentation tool)
- csysdig (ncurses-based interactive UI)
- Falco (CNCF security alerting project derived from sysdig)
- Docker (container runtime, used both as a target for monitoring and as a delivery method for sysdig)
- Ubuntu apt package management (including modern signed-by keyring approach)
- Linux kernel modules / eBPF probes

## Sources Consulted
- [Sysdig Wiki — How to Install Sysdig for Linux](https://github.com/draios/sysdig/wiki/How-to-Install-Sysdig-for-Linux)
- [Sysdig Wiki — Sysdig User Guide](https://github.com/draios/sysdig/wiki/Sysdig-User-Guide)
- [Sysdig Wiki — Chisels User Guide](https://github.com/draios/sysdig/wiki/Chisels-User-Guide)
- [Sysdig Wiki — Container Enabled Chisels](https://github.com/draios/sysdig/wiki/Container-Enabled-Chisels)
- [sysdig(8) man page](https://www.man7.org/linux/man-pages/man8/sysdig.8.html)
- [csysdig(8) man page](https://www.man7.org/linux/man-pages/man8/csysdig.8.html)
- [Official draios.list repository file](https://download.sysdig.com/stable/deb/draios.list)
- [DigitalOcean — apt-key deprecation and signed-by repositories on Ubuntu 22.04](https://www.digitalocean.com/community/tutorials/how-to-handle-apt-key-and-add-apt-repository-deprecation-using-gpg-to-add-external-repositories-on-ubuntu-22-04)

## Issues Found

1. **Legacy install-script URL.** The post originally used `https://s3.amazonaws.com/download.draios.com/stable/install-sysdig`. The current canonical URL per the upstream wiki is `https://download.sysdig.com/stable/install-sysdig`. Updated to the current URL.

2. **Deprecated `apt-key add` usage.** The original manual install steps piped the GPG key into `sudo apt-key add -`. `apt-key` is deprecated on Ubuntu 22.04+ and removed in 24.04 — it produces deprecation warnings and breaks entirely on newer releases. Replaced with the modern pattern: `gpg --dearmor` into `/usr/share/keyrings/draios-archive-keyring.gpg`, then a `signed-by=` pinned `deb` line written to `/etc/apt/sources.list.d/draios.list`. Also fixed the repository line itself: the upstream `draios.list` file uses the placeholder `stable-$(ARCH)/`, which needs to be expanded with `$(dpkg --print-architecture)` when authored by hand.

3. **Misleading comment on `sysdig -l | grep container`.** The original comment ("List all running containers sysdig can see") misrepresented what the command does. `sysdig -l` lists available filter fields (verified against the man page), not running containers. Rewrote the comment to accurately describe the output ("List all container-aware filter fields sysdig supports").

## Review Notes

- All chisel names referenced (`netstat`, `topprocs_net`, `topfiles_bytes`, `topscalls`, `scallslower`, `fileslower`, `netlower`, `topfiles_time`, `spy_users`, `spy_ip`) are valid against the upstream sysdig chisels catalog.
- Flag semantics for `-l`, `-pc`, `-c`, `-cl`, `-n`, `-j`, `-w`, `-r`, `-C`, `-G` match the official man page.
- Filter language constructs used in the post (`evt.type=`, `proc.name=`, `fd.name=`, `fd.port=`, `container.id != host`, `container.name=`, `in (...)`, `startswith`, `and`/`or`/`not`, `evt.latency` in nanoseconds, `evt.arg.count`, `evt.arg.uid`) all match sysdig's filter syntax.
- The `sysdig-probe` kernel module name is correct for the legacy/classic open-source sysdig path that this post documents. Modern installations are increasingly moving toward the eBPF probe (`SYSDIG_BPF_PROBE` env var) and the newer `scap` kernel module distributed via Falco's `driverkit`, but the `sysdig-probe` name remains valid for the standalone open-source sysdig package and matches the upstream wiki — left as-is.
- The Docker-based install in Method 2 mounts host paths under `/host/...` which is the convention `sysdig/sysdig` expects; verified against the upstream image.
- Falco is indeed a CNCF project (graduated in 2024), and the claim about it using sysdig's capture engine is accurate — they share libsinsp/libscap.
- `csysdig -pc` is valid (container-friendly format). Users can additionally pass `-v containers` to launch directly in the containers view, but the post's reference to F2 for view switching is correct.
