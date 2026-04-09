# Validation Summary: How to Install Ceph on Raspberry Pi (ARM)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (Squid release / 19.x)
- cephadm (container-based Ceph deployment)
- Raspberry Pi 4/5 (ARM64/aarch64)
- Raspberry Pi OS Bookworm (64-bit)
- Ubuntu 22.04 ARM64
- Podman (container runtime)
- NetworkManager (nmcli)

## Sources Consulted
- Ceph official documentation — cephadm install guide: https://docs.ceph.com/en/squid/cephadm/install/
- Ceph official documentation — OSD service: https://docs.ceph.com/en/reef/cephadm/services/osd/
- Ceph official documentation — Get Packages / GPG keys: https://docs.ceph.com/en/reef/install/get-packages/
- cephadm man page (Debian): https://manpages.debian.org/experimental/cephadm/cephadm.8.en.html
- Ceph download repository (debian-squid): https://download.ceph.com/debian-squid/ — verified ARM64 package availability
- Ceph GPG key directory: https://download.ceph.com/keys/
- Raspberry Pi Forums — Bookworm networking changes (dhcpcd to NetworkManager): https://forums.raspberrypi.com/viewtopic.php?t=357623
- Jeff Geerling — Static IP on RPi OS Bookworm: https://www.jeffgeerling.com/blog/2024/set-static-ip-address-nmtui-on-raspberry-pi-os-12-bookworm

## Issues Found

1. **Static IP configuration uses deprecated dhcpcd.conf (INCORRECT)**
   - **What was wrong:** The post configured static IPs by appending to `/etc/dhcpcd.conf`. Raspberry Pi OS Bookworm switched from dhcpcd to NetworkManager; dhcpcd is not installed on Bookworm and `/etc/dhcpcd.conf` has no effect.
   - **What was changed:** Replaced dhcpcd.conf configuration with `nmcli` commands for NetworkManager. Added a note about using netplan on Ubuntu 22.04.

2. **Full `ceph` package installed alongside cephadm (INCORRECT)**
   - **What was wrong:** `apt install -y ceph cephadm` installs the full Ceph daemon packages (ceph-mon, ceph-mgr, ceph-osd, ceph-mds) on the host. In a cephadm deployment, all daemons run inside containers, making the `ceph` metapackage unnecessary.
   - **What was changed:** Replaced the apt-based installation with the standalone cephadm script download approach (officially documented). Added a `cephadm install ceph-common` step after bootstrap for CLI access.

3. **ARM64 repository line pointed to bookworm (INCORRECT/INCOMPLETE)**
   - **What was wrong:** The Ceph `debian-squid` repository has full ARM64 binary packages only for `jammy` (Ubuntu 22.04), not for `bookworm` (Debian 12). The bookworm repo contains only architecture-independent packages, lacking core ARM64 binaries like ceph-osd and ceph-mon.
   - **What was changed:** Replaced the manual apt repository setup with the standalone cephadm download approach, which works on both Raspberry Pi OS and Ubuntu ARM64 regardless of repo availability. cephadm handles repository configuration via `cephadm add-repo`.

4. **Podman installed manually before bootstrap (UNNECESSARY)**
   - **What was wrong:** Step 3 instructed users to `apt install -y podman` manually. cephadm automatically installs Podman (or uses Docker if present) during the bootstrap process.
   - **What was changed:** Replaced the manual install instruction with a note that cephadm handles container runtime installation automatically. Kept the ARM64 verification command as a post-bootstrap check.

5. **ssh-copy-id missing `-f` flag (INCORRECT)**
   - **What was wrong:** `ssh-copy-id -i /etc/ceph/ceph.pub` without `-f` requires the corresponding private key to exist alongside the public key. cephadm manages the private key internally, so the command would fail without `-f`.
   - **What was changed:** Added `-f` flag to both `ssh-copy-id` commands.

## Review Notes
- The `ceph orch apply mon 3` command is valid but less commonly documented than the `--placement` syntax (e.g., `ceph orch apply mon --placement="3"`). Both work correctly; the current form was left as-is.
- The GPG key URL `release.gpg` works but official docs prefer `release.asc`. This is now moot since the manual repo setup was replaced with `cephadm add-repo`.
- Performance expectations (50-100 MB/s, 3000-8000 IOPS) are reasonable estimates for USB 3.0 SSDs on Raspberry Pi 4/5, though actual results vary significantly by SSD model and USB enclosure.
- The `--single-host-defaults` flag is used during bootstrap but the guide proceeds to add multiple hosts. This flag adjusts defaults for single-node operation (e.g., reduced replication). Users may want to adjust replication settings after expanding to 3 nodes. This was left as-is since it's a valid initial bootstrap approach.
