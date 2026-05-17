# Validation Summary: How to Use DKMS for Dynamic Kernel Module Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DKMS (Dynamic Kernel Module Support) — versions 2.x and 3.x
- Ubuntu (apt, dpkg, kernel packaging)
- Linux kernel module build system (`make -C` with `M=` for external modules)
- `dkms.conf` configuration file format
- `modprobe`, `lsmod`, `dmesg` for module loading and diagnostics
- Common DKMS-managed driver packages: NVIDIA proprietary drivers, VirtualBox, WireGuard, Broadcom WiFi
- Debian packaging helpers: `devscripts`, `dh-make`, `debhelper`, `dh-dkms`

## Sources Consulted
- Upstream DKMS project (dell/dkms): https://github.com/dell/dkms
- Ubuntu dkms(8) manpage (Noble): https://manpages.ubuntu.com/manpages/noble/en/man8/dkms.8.html
- dkms.conf(5) manpage
- Arch dkms(8) manpage: https://man.archlinux.org/man/extra/dkms/dkms.8.en
- Debian Wiki — DkmsPackaging: https://wiki.debian.org/DkmsPackaging
- DKMS issue #187 (removal of `mkdeb`/`mkrpm` in 3.0): https://github.com/dell/dkms/issues/187
- Ubuntu package index (packages.ubuntu.com) for verifying `linux-headers-generic`, `linux-headers-lowlatency`, `linux-headers-virtual`, `nvidia-dkms-550`, `virtualbox-dkms`, `wireguard-dkms`, `bcmwl-kernel-source`
- Local `apt-cache show dkms` confirming Ubuntu currently ships DKMS 3.0.11

## Issues Found
1. **Reference to nonexistent `mkdeb-dkms` tool** — The "Packaging DKMS Modules as Debian Packages" section contained the comment `# Create the package source structure manually or use mkdeb-dkms`. No such tool exists. The historical command was `dkms mkdeb` (a subcommand), and that subcommand (along with `mkdsc`, `mkbmdeb`, `mkrpm`) was removed in DKMS 3.0. Ubuntu's current DKMS is 3.0.11, so the recommendation was doubly stale. I replaced the comment with an accurate note explaining that `dkms mkdeb` was removed in 3.0 and that modern Ubuntu packaging should use the `dh-dkms` debhelper plugin alongside `dkms mktarball`. I also added `dh-dkms` to the `apt install` line and added `sudo` to the `dkms mktarball` invocation (which writes to `/var/lib/dkms`, requiring root).

## Review Notes
- The `dkms.conf` example uses the scalar `MAKE="..."` form rather than the more common array form `MAKE[0]="..."`. Both are accepted by DKMS, so this is correct but slightly non-idiomatic.
- `DEST_MODULE_LOCATION[0]="/kernel/drivers/misc"` is required by `dkms.conf(5)` but the value is effectively ignored on modern DKMS — installed modules end up under `/lib/modules/<kernelver>/updates/dkms/` regardless. The post does not call this out; not technically wrong, just an outdated detail of the spec.
- The `dkms status` output format shown (`name/version, kernel, arch: state`) is the modern DKMS 3.x format. Correct for current Ubuntu.
- `dkms remove -m mydriver -v 1.0 --all` is still the documented and supported syntax in DKMS 3.x. Not deprecated.
- `wireguard-dkms` is correctly described as only needed on older kernels — WireGuard has been in-tree since Linux 5.6 (2020).
- All `linux-headers-*` package names (`generic`, `lowlatency`, `virtual`) are still valid in current Ubuntu releases.
