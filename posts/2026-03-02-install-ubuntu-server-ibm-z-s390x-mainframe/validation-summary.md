# Validation Summary: How to Install Ubuntu Server on an IBM Z (s390x) Mainframe

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Ubuntu 24.04 LTS (s390x architecture)
- IBM Z / zSeries / z/Architecture
- z/VM hypervisor (USER DIRECTORY entries, IPL from reader)
- KVM on IBM Z (qemu-kvm, libvirt, virt-install with `s390-ccw-virtio` machine type)
- LPAR (Logical Partition), HMC, SE
- DASD (3390) storage with `dasdfmt`, `fdasd`
- zipl bootloader and `/etc/zipl.conf`
- s390-tools package (`lsdasd`, `lszcrypt`, `chreipl`, `zipl`, `dbginfo.sh`)
- Netplan networking for OSA-Express and HiperSockets (`enc600`, `enc900`)
- IBM Z cryptographic acceleration (CPACF, AP adapters, `libica`, `libica-utils`, `openssl-ibmca`)
- TFTP / netboot for s390x install

## Sources Consulted
- Ubuntu Server documentation, "Interactive live server installation on IBM z/VM (s390x)": https://documentation.ubuntu.com/server/how-to/installation/interactive-live-server-installation-on-ibm-z-vm-s390x/
- Ubuntu Server documentation, "Non-interactive IBM z/VM autoinstall (s390x)": https://documentation.ubuntu.com/server/how-to/installation/non-interactive-ibm-z-vm-autoinstall-s390x/
- Ubuntu wiki, "S390X - Ubuntu Server for IBM zSystems and LinuxONE": https://wiki.ubuntu.com/S390X
- Ubuntu Noble package metadata for `s390-tools` (file list, paths): https://packages.ubuntu.com/noble/s390x/s390-tools/filelist
- IBM `s390-tools` upstream (tool inventory, dbginfo.sh): https://github.com/ibm-s390-linux/s390-tools
- Debian `zipl.conf(5)` manpage: https://manpages.debian.org/testing/s390-tools/zipl.conf.5
- IBM Knowledge Center, "Device and console names" (Linux on IBM Z console mappings — ttysclp0, sclp_line0, ttyS0/3215): https://www.ibm.com/docs/linuxonibm/com.ibm.linux.z.lhdd/lhdd_r_console_sum.html
- SLES Deployment Guide, "Installation on IBM Z and LinuxONE" (z/VM IPL / reader / parmfile flow): https://documentation.suse.com/sles/15-SP6/html/SLES-all/cha-zseries.html
- Ubuntu cdimage release index (s390x live-server ISO naming): https://cdimage.ubuntu.com/releases/24.04/release/

## Issues Found

1. **Wrong kernel/initrd paths inside the s390x ISO.** The post extracted boot files from `/mnt/casper/vmlinuz` and `/mnt/casper/initrd`. The s390x live-server ISO doesn't use the casper layout for boot artifacts; the actual paths are `/boot/kernel.ubuntu` and `/boot/initrd.ubuntu`, and the ISO also ships a ready-made `/boot/parmfile.ubuntu`. Updated the `cp` commands accordingly and added the parmfile copy.

2. **Incorrect description of SCLP.** The post said SCLP stands for "System Console for Linux on POWER and Z". SCLP is the **Service-Call Logical Processor**, an architectural facility specific to IBM Z (s390x). POWER systems use HVC, not SCLP. Corrected the expansion and tightened the description.

3. **Fabricated z/VM IPL command.** The post used `VMFIPLD UBUNTU1 PROFILE EXEC`, which is not a real z/VM command. The standard z/VM flow for booting an installer is to punch the kernel, parmfile, and initrd into the guest's virtual reader (device `00C`) and then `IPL 00C CLEAR`. Replaced the example with the correct `CP SPOOL PUN * RDR` / `PUNCH` / `CP IPL 00C CLEAR` sequence.

4. **Wrong `dbginfo.sh` path.** The post invoked `/usr/share/s390-tools/dbginfo.sh`. On Ubuntu the `s390-tools` package installs it at `/sbin/dbginfo.sh` (verified against the Noble package file list). Corrected the path.

5. **`parmfile` listed as an s390-tools command.** `parmfile` is the name of a file type (the kernel parameter file used by zipl/the IPL boot loader), not a command shipped by `s390-tools`. Replaced the bullet with `chreipl`, which is a real tool in the package.

6. **Wrong kernel package name for the zipl post-install hook.** The post said the hook runs from the `linux-s390x` package; that package doesn't exist on Ubuntu. The zipl invocation comes from the `zz-zipl` hook installed by the `linux-image-generic` (kernel) package. Corrected.

7. **"z/VM LPAR" phrasing for the KVM host.** The post described the KVM-on-Z host as "A z/VM LPAR running Linux with KVM". KVM on IBM Z runs as Linux directly in an LPAR — it is not a z/VM guest. Changed to "An IBM Z LPAR running Linux with KVM".

8. **`IDENTITY` directory entry used for a single guest.** The directory example used `IDENTITY UBUNTU1 …`. `IDENTITY` entries are specifically for multi-configuration virtual machines in z/VM SSI clusters; the conventional definition for a standalone guest is a `USER` entry. Switched to `USER` and removed the now-redundant `MEMORY DEFINE 4096M` (the virtual storage is already specified by the `512M 4G` fields on the `USER` line).

## Review Notes

- The `console=ttyS0` parameter in the parmfile is valid in the z/VM context (where 3215 is mapped to `/dev/ttyS0`), but for LPAR ASCII-console installs the more universal choice is `console=ttysclp0` or `console=sclp_line0`. Left as-is because the parmfile sits inside the z/VM section, but a reader doing an LPAR install via HMC may want to substitute.
- `target=/boot/zipl` in the `zipl.conf` example is valid but reflects the SUSE convention; Ubuntu's installer-generated configuration typically uses `target=/boot`. Both work as long as the directory exists and matches the disk layout, so left unchanged.
- The IBM Z RAS marketing claim of "sub-millisecond failover" in the closing paragraph is a vendor figure rather than a Linux-on-Z technical statement; it is not strictly wrong but should be read as marketing.
- The `openssl speed -engine ibmca` invocation requires the separately packaged `openssl-ibmca` engine; the post does not call this out explicitly. Not corrected since the command itself is accurate when the engine is present.
- `cat /sys/hypervisor/type` returns `xen` / `kvm` / `vmware` etc. on most platforms; on Linux running under z/VM it returns `zvm`. The example is correct.
- The `MACID 111111` in the `NICDEF` is a placeholder; in a real definition this would be a unique six-hex-digit suffix for the locally-administered MAC. The post implies this is illustrative, which is fine.
