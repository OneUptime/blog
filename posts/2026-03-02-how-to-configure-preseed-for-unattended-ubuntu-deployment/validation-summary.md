# Validation Summary: How to Configure preseed for Unattended Ubuntu Deployment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu debian-installer
- Debian preseed
- partman-auto partitioning
- tasksel and pkgsel
- GRUB/isolinux installer boot parameters
- xorriso ISO creation
- OpenSSL password hashing
- Python HTTP server
- virt-install/QEMU/KVM

## Sources Consulted
- Ubuntu Server installation documentation: https://ubuntu.com/server/docs/how-to/installation/
- Ubuntu autoinstall documentation: https://canonical-subiquity.readthedocs-hosted.com/en/latest/intro-to-autoinstall.html
- Ubuntu autoinstall quick start: https://canonical-subiquity.readthedocs-hosted.com/en/latest/howto/autoinstall-quickstart.html
- Debian Installer preseed documentation: https://www.debian.org/releases/stable/amd64/apbs02.en.html
- Debian Installer preconfiguration examples: https://www.debian.org/releases/stable/amd64/apbs04.en.html
- Debian virt-install man page: https://manpages.debian.org/virt-install
- Local command help: `openssl passwd -help`, `python3 -m http.server --help`, `xorriso -as mkisofs -help`

## Issues Found
- The post claimed the example was for Ubuntu 22.04 and used `ubuntu-22.04-live-server-amd64.iso`. Ubuntu Server 20.04 and later use Subiquity autoinstall YAML for the standard live-server installer, while preseed applies to debian-installer based media. Added a scope note and changed examples to d-i based Ubuntu media.
- The package selection used task names `server, openssh-server`, but d-i/tasksel expects task names such as `standard` and `ssh-server`; individual packages belong in `pkgsel/include`. Updated the tasksel line accordingly.
- The custom partitioning example claimed to create `/` but only defined an LVM physical volume and did not create a root filesystem. Changed it to a valid regular partman recipe with `/boot`, swap, and `/`.
- The embedded ISO example used live-server `/casper` paths. Updated the example to use d-i installer paths (`/install/vmlinuz` and `/install/initrd.gz`) and an older d-i based Ubuntu server ISO name.
- The debugging section used `debconf-get-selections` without installing the package that provides it. Added `sudo apt install -y debconf-utils` before the command.
- The VM test command combined `virt-install --cdrom` with `--extra-args`; `--extra-args` is supported with `--location` style installs. Changed the example to use `--location`.

## Review Notes
Preseed remains useful for debian-installer based workflows, but new Ubuntu Server deployments should generally use Subiquity autoinstall. The article now calls out that version-specific caveat without converting the post into an autoinstall guide.
