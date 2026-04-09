# Validation Summary: How to Install Ceph on Arch Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (distributed storage system)
- Arch Linux (rolling-release Linux distribution)
- pacman (Arch Linux package manager)
- AUR (Arch User Repository) with yay helper
- cephadm (Ceph orchestration/deployment tool)
- Podman (container runtime)
- systemd (service management)
- losetup (loop device management)
- rados (Ceph object storage CLI)

## Sources Consulted
- Ceph official documentation: https://docs.ceph.com/en/latest/cephadm/install/
- Ceph cephadm bootstrap documentation: https://docs.ceph.com/en/latest/cephadm/install/#running-the-bootstrap-command
- Ceph orchestrator CLI reference: https://docs.ceph.com/en/latest/cephadm/services/osd/
- Arch Linux Wiki - Ceph: https://wiki.archlinux.org/title/Ceph
- Arch Linux package database (ceph, ceph-libs packages in extra repository)
- AUR package: https://aur.archlinux.org/packages/cephadm
- losetup(8) man page
- systemd.service(5) man page
- rados CLI documentation: https://docs.ceph.com/en/latest/man/8/rados/

## Issues Found

### Issue 1: Hardcoded loop device in systemd ExecStop (Step 3, line 79)
- **What was wrong:** The systemd service `ExecStop` was hardcoded to `/usr/bin/losetup -d /dev/loop0`, but the `ExecStart` uses `losetup -f` which dynamically assigns the first available loop device. If `/dev/loop0` is already in use, a different device (e.g., `/dev/loop1`) would be assigned, and the ExecStop would detach the wrong device or fail.
- **What was changed:** Replaced with `ExecStop=/bin/sh -c 'losetup -d $(losetup -j /var/lib/ceph-osd.img | cut -d: -f1)'` which dynamically finds and detaches the correct loop device associated with the backing file.
- **Why:** The original command would fail or cause data corruption if the loop device was not `/dev/loop0`.

### Issue 2: Incorrect hostname in OSD add command (Step 6, line 129)
- **What was wrong:** The command `ceph orch daemon add osd localhost:$LOOP` used `localhost` as the hostname. However, `cephadm bootstrap` registers the host by its actual system hostname (what `hostname` returns), not `localhost`. The orchestrator would reject the command with a "host not found" error.
- **What was changed:** Replaced `localhost` with `$(hostname)` to dynamically use the correct registered hostname.
- **Why:** The orchestrator tracks hosts by their actual hostname, so `localhost` would not match any registered host.

## Review Notes
- **Steps 4 and 5 present overlapping approaches:** Step 4 creates a manual `ceph.conf`, while Step 5 uses `cephadm bootstrap` which generates its own configuration. The bootstrap command will read an existing `/etc/ceph/ceph.conf` if present and merge settings, so the sequential flow can work, but readers may be confused about why both steps are needed. Adding `--config /etc/ceph/ceph.conf` to the bootstrap command in Step 5 would make the intent explicit.
- **`osd journal size` config option (Step 4):** This is a FileStore-era option. Since BlueStore has been the default OSD backend since Ceph Luminous (12.x), this setting has no effect on modern deployments. It is not harmful but is unnecessary.
- **curl URL in Step 2:** The alternative download URL `https://download.ceph.com/rpm-squid/el9/noarch/cephadm` references an EL9 (RHEL 9) path. While cephadm is a Python script that is distribution-agnostic, pointing Arch Linux users to an EL9-specific path is potentially confusing and the URL may not resolve correctly depending on the Ceph release infrastructure. The AUR approach (shown first) is the recommended method for Arch.
- **`python-cephfs` package:** This package may already be pulled in as a dependency of the `ceph` package on Arch Linux. Listing it explicitly is not wrong but may be redundant.
