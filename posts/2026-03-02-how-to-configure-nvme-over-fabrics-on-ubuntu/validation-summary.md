# Validation Summary: How to Configure NVMe over Fabrics on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux NVMe over Fabrics
- NVMe/TCP
- Linux NVMe target configfs
- nvme-cli
- nvmetcli
- systemd
- fio
- XFS

## Sources Consulted
- Linux kernel documentation: Configfs - Userspace-driven Kernel Object Configuration, https://docs.kernel.org/filesystems/configfs.html
- Linux kernel documentation: NVMe PCI Endpoint Function Target, for nvmet configfs subsystem/namespace/port examples, https://docs.kernel.org/next/nvme/nvme-pci-endpoint-target.html
- Ubuntu manpage: nvme-connect(1), https://manpages.ubuntu.com/manpages/noble/man1/nvme-connect.1.html
- Ubuntu manpage: nvme-discover(1), https://manpages.ubuntu.com/manpages/noble/man1/nvme-discover.1.html
- Ubuntu manpage: nvme-connect-all(1), https://manpages.ubuntu.com/manpages/noble/man1/nvme-connect-all.1.html
- Ubuntu package file list: nvme-cli on Ubuntu 24.04 LTS, https://packages.ubuntu.com/noble/amd64/nvme-cli/filelist
- nvme-cli upstream README, https://github.com/linux-nvme/nvme-cli
- nvmetcli manual page, https://man.archlinux.org/man/nvmetcli.8.en
- nvmetcli manual page mirror, https://www.mankier.com/8/nvmetcli
- nvmetcli upstream source mirror, for command-line `save`/`restore` behavior, https://raw.githubusercontent.com/JunxiongGuan/nvmetcli/master/nvmetcli

## Issues Found
- The nvmetcli installation command assumed an Ubuntu `nvmetcli` package. Ubuntu's standard package listing for `nvme-cli` does not include `nvmetcli`, so the post now says to install nvmetcli from a distribution repository or upstream if it is not packaged for the Ubuntu release.
- The nvmetcli interactive examples used configfs-style names such as `set device_path` and `set addr_trtype`. nvmetcli documents `set device path=...`, `set addr trtype=...`, `set addr adrfam=...`, and similar commands, so those examples were corrected.
- The nvmetcli example omitted setting `allow_any_host`, while the manual configfs path explicitly allowed connections. Added `set attr allow_any_host=1` to keep the two configuration paths equivalent.
- The persistence section used `nvmetcli saveconfig` as a command-line invocation. `saveconfig` is an interactive nvmetcli shell command; command-line mode uses `nvmetcli save`. Updated the command.
- The host setup used `nvme` commands without first installing `nvme-cli`. Added `sudo apt install nvme-cli -y`.
- The `/etc/nvme/discovery.conf` example split one discovery command across three lines. nvme-cli treats entries in this file as command lines, so the example was changed to a single line.
- The persistent host connection section enabled `nvme-connect-all.service`, but Ubuntu's `nvme-cli` package ships `nvmf-autoconnect.service`. Updated the service name.
- The monitoring section used `/sys/class/nvme/nvme1/transport_type`, but Linux NVMe controllers expose the transport at `/sys/class/nvme/nvme1/transport`. Updated the path.
- The target monitoring comment said it checked connected hosts, but the command lists configured subsystems exported on a port. Updated the comment.
- The subsystem NQN comment incorrectly described the subsystem as a namespace identifier. Updated it to "subsystem NQN".
- The fstab guidance referred to a "device path approach" while recommending UUIDs. Reworded it to recommend stable identifiers such as UUIDs.

## Review Notes
The raw-device `fio` examples should only be run before creating a filesystem or on a disposable namespace because write workloads such as `randrw` modify the target block device. The post's order already runs the I/O tests before filesystem creation.
